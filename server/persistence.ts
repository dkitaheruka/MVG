import { readFile } from 'node:fs/promises'
import path from 'node:path'
import type { NextFunction, Request, Response } from 'express'
import { Pool, type PoolClient } from 'pg'
import * as seed from './seed.ts'
import type { DbAgence, DbParametresEntreprise, DbParametresFiscauxSociaux, DbTauxChange, DbUser } from './db.ts'
import { isPasswordHash } from './passwords.ts'
import { hashPassword } from './passwords.ts'

type StateObject = Record<string, unknown>
type StateCollection = StateObject[] | StateObject
type StateEntry = { name: string; value: StateCollection }
type PersistedRecord = { payload: string; position: number }
type StateSnapshot = Map<string, Map<string, PersistedRecord>>
type LockMode = 'read' | 'write'

export const PERSISTENCE_ADVISORY_LOCK_NAMESPACE = 1379958016
export const PERSISTENCE_ADVISORY_LOCK_ID = 1

const stateEntries: StateEntry[] = Object.entries(seed)
  .filter(([, value]) => Array.isArray(value) || isPlainObject(value))
  .map(([name, value]) => ({ name, value: value as unknown as StateCollection }))

class ReadWriteLock {
  private readers = 0
  private writing = false
  private queue: Array<{ mode: LockMode; resolve: (release: () => void) => void }> = []

  acquire(mode: LockMode): Promise<() => void> {
    if (mode === 'read' && !this.writing && !this.queue.some((waiter) => waiter.mode === 'write')) {
      this.readers += 1
      return Promise.resolve(this.makeRelease('read'))
    }
    if (mode === 'write' && !this.writing && this.readers === 0 && this.queue.length === 0) {
      this.writing = true
      return Promise.resolve(this.makeRelease('write'))
    }

    return new Promise((resolve) => {
      this.queue.push({ mode, resolve })
      this.drain()
    })
  }

  private makeRelease(mode: LockMode) {
    let released = false
    return () => {
      if (released) return
      released = true
      if (mode === 'write') this.writing = false
      else this.readers -= 1
      this.drain()
    }
  }

  private drain() {
    if (this.writing || this.queue.length === 0) return
    if (this.readers > 0 && this.queue[0].mode === 'write') return

    if (this.queue[0].mode === 'write') {
      if (this.readers > 0) return
      const waiter = this.queue.shift()!
      this.writing = true
      waiter.resolve(this.makeRelease('write'))
      return
    }

    while (this.queue[0]?.mode === 'read') {
      const waiter = this.queue.shift()!
      this.readers += 1
      waiter.resolve(this.makeRelease('read'))
    }
  }
}

const requestLock = new ReadWriteLock()
let pool: Pool | null = null
let leadershipClient: PoolClient | null = null
let lastPersistedState: StateSnapshot | null = null
let persistenceFailure: Error | null = null

function isPlainObject(value: unknown): value is StateObject {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function recordKey(value: unknown, collection: string, position: number): string {
  if (!isPlainObject(value)) return String(position)
  const identity = value.id ?? value.numero ?? value.code ?? value.email
  if (identity === undefined || identity === null || identity === '') {
    throw new Error(`A record in ${collection} has no stable id or numero.`)
  }
  return String(identity)
}

function captureState(): StateSnapshot {
  const snapshot: StateSnapshot = new Map()
  for (const { name, value } of stateEntries) {
    const records = new Map<string, PersistedRecord>()
    const values = Array.isArray(value) ? value : [value]
    values.forEach((record, position) => {
      const key = Array.isArray(value) ? recordKey(record, name, position) : '__singleton__'
      if (records.has(key)) throw new Error(`Duplicate record key ${key} in ${name}.`)
      const payload = JSON.stringify(record)
      if (payload === undefined) throw new Error(`A record in ${name} cannot be serialized.`)
      records.set(key, { payload, position })
    })
    snapshot.set(name, records)
  }
  return snapshot
}

function hydrateState(snapshot: StateSnapshot) {
  for (const { name, value } of stateEntries) {
    const records = [...(snapshot.get(name) ?? new Map()).entries()]
      .sort((left, right) => left[1].position - right[1].position)
      .map(([, record]) => JSON.parse(record.payload) as StateObject)

    if (Array.isArray(value)) {
      value.splice(0, value.length, ...records)
      continue
    }

    for (const key of Object.keys(value)) delete value[key]
    if (records[0]) Object.assign(value, records[0])
  }
}

async function writeWholeSnapshot(client: PoolClient, snapshot: StateSnapshot) {
  const rows = [...snapshot].flatMap(([collection, records]) =>
    [...records].map(([record_key, record]) => ({
      collection,
      record_key,
      position: record.position,
      payload: JSON.parse(record.payload),
    })),
  )
  if (rows.length === 0) return
  await client.query(
    `INSERT INTO mvg_business_records (collection, record_key, position, payload)
     SELECT collection, record_key, position, payload
     FROM jsonb_to_recordset($1::jsonb) AS row_data(collection TEXT, record_key TEXT, position INTEGER, payload JSONB)
     ON CONFLICT (collection, record_key) DO UPDATE
     SET position = EXCLUDED.position, payload = EXCLUDED.payload, updated_at = NOW()`,
    [JSON.stringify(rows)],
  )
}

async function loadState(client: PoolClient): Promise<StateSnapshot> {
  const result = await client.query<{
    collection: string
    record_key: string
    position: number
    payload: StateObject
  }>(
    'SELECT collection, record_key, position, payload FROM mvg_business_records ORDER BY collection, position',
  )
  const snapshot: StateSnapshot = new Map()
  for (const row of result.rows) {
    const records = snapshot.get(row.collection) ?? new Map<string, PersistedRecord>()
    records.set(row.record_key, {
      payload: JSON.stringify(row.payload),
      position: row.position,
    })
    snapshot.set(row.collection, records)
  }
  return snapshot
}

async function saveChanges(snapshot: StateSnapshot) {
  if (!pool || !lastPersistedState) return

  const changes: Array<{ collection: string; key: string; record: PersistedRecord }> = []
  const deletions: Array<{ collection: string; key: string }> = []

  for (const [collection, records] of snapshot) {
    const previous = lastPersistedState.get(collection) ?? new Map<string, PersistedRecord>()
    for (const [key, record] of records) {
      const oldRecord = previous.get(key)
      if (!oldRecord || oldRecord.payload !== record.payload || oldRecord.position !== record.position) {
        changes.push({ collection, key, record })
      }
    }
    for (const key of previous.keys()) {
      if (!records.has(key)) deletions.push({ collection, key })
    }
  }

  if (changes.length === 0 && deletions.length === 0) return

  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    if (deletions.length > 0) {
      await client.query(
        `DELETE FROM mvg_business_records AS stored
         USING jsonb_to_recordset($1::jsonb) AS removed(collection TEXT, record_key TEXT)
         WHERE stored.collection = removed.collection AND stored.record_key = removed.record_key`,
        [JSON.stringify(deletions.map(({ collection, key }) => ({ collection, record_key: key })))],
      )
    }
    if (changes.length > 0) {
      await client.query(
        `INSERT INTO mvg_business_records (collection, record_key, position, payload)
         SELECT collection, record_key, position, payload
         FROM jsonb_to_recordset($1::jsonb) AS row_data(collection TEXT, record_key TEXT, position INTEGER, payload JSONB)
         ON CONFLICT (collection, record_key) DO UPDATE
         SET position = EXCLUDED.position, payload = EXCLUDED.payload, updated_at = NOW()`,
        [JSON.stringify(changes.map(({ collection, key, record }) => ({
          collection,
          record_key: key,
          position: record.position,
          payload: JSON.parse(record.payload),
        })))],
      )
    }
    await client.query('COMMIT')
    lastPersistedState = snapshot
  } catch (error) {
    await client.query('ROLLBACK').catch(() => undefined)
    throw error
  } finally {
    client.release()
  }
}

export async function initializePersistence() {
  const connectionString = process.env.DATABASE_URL?.trim()
  if (!connectionString) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('DATABASE_URL is required in production; refusing to start with in-memory business data.')
    }
    return
  }

  pool = new Pool({ connectionString, max: 10, connectionTimeoutMillis: 5000 })
  try {
    leadershipClient = await pool.connect()
    const lockResult = await leadershipClient.query<{ locked: boolean }>(
      'SELECT pg_try_advisory_lock($1, $2) AS locked',
      [PERSISTENCE_ADVISORY_LOCK_NAMESPACE, PERSISTENCE_ADVISORY_LOCK_ID],
    )
    if (!lockResult.rows[0]?.locked) {
      throw new Error('Another MVG API process already owns this database. Run one application instance per database.')
    }

    const migrationPath = path.resolve(process.cwd(), 'server/migrations/001_business_records.sql')
    await pool.query(await readFile(migrationPath, 'utf8'))

    const marker = await pool.query<{ value: string }>(
      "SELECT value FROM mvg_metadata WHERE key = 'state_initialized'",
    )
    if (marker.rowCount === 0) {
      if (process.env.NODE_ENV === 'production') {
        throw new Error('The production database has not been initialized. Provision reviewed records before starting MVG.')
      }
      const initialState = captureState()
      const client = await pool.connect()
      try {
        await client.query('BEGIN')
        await writeWholeSnapshot(client, initialState)
        await client.query(
          "INSERT INTO mvg_metadata (key, value) VALUES ('state_initialized', 'development-seed')",
        )
        await client.query('COMMIT')
      } catch (error) {
        await client.query('ROLLBACK').catch(() => undefined)
        throw error
      } finally {
        client.release()
      }
      lastPersistedState = initialState
      return
    }

    if (process.env.NODE_ENV === 'production' && marker.rows[0]?.value !== 'production-provisioned') {
      throw new Error('The production database is marked as development data. Provision real accounts and records before starting MVG.')
    }

    const persistedState = await loadState(leadershipClient)
    if (persistedState.size === 0 && process.env.NODE_ENV === 'production') {
      throw new Error('The production database contains no business records. Refusing to load demo seed data.')
    }
    hydrateState(persistedState)
    if (process.env.NODE_ENV === 'production') {
      const accountUsers = seed.users as Array<{ email?: string; password?: string; role?: string; actif?: boolean }>
      const invalidAccounts = accountUsers.filter((user) => user.actif !== false && !isPasswordHash(user.password))
      if (invalidAccounts.length > 0) {
        throw new Error(`Production accounts must have scrypt password hashes. Invalid accounts: ${invalidAccounts.map((user) => user.email || user.role || 'unknown').join(', ')}`)
      }
      if (!accountUsers.some((user) => user.actif !== false && user.role === 'SUPER_ADMIN')) {
        throw new Error('The production database must contain an active SUPER_ADMIN account.')
      }
      if (!accountUsers.some((user) => user.actif !== false && user.role === 'ADMIN_SIEGE')) {
        throw new Error('The production database must contain an active ADMIN_SIEGE account.')
      }
    }
    lastPersistedState = captureState()
  } catch (error) {
    await closePersistence()
    throw error
  }
}

export async function checkPersistenceHealth(): Promise<{ ready: boolean; database: string; initialized: boolean }> {
  if (!pool) {
    return {
      ready: process.env.NODE_ENV !== 'production',
      database: process.env.NODE_ENV === 'production' ? 'not_configured' : 'in_memory_development',
      initialized: process.env.NODE_ENV !== 'production',
    }
  }
  const result = await pool.query<{ value: string }>(
    "SELECT value FROM mvg_metadata WHERE key = 'state_initialized'",
  )
  const initialized = result.rows[0]?.value === 'production-provisioned' ||
    (process.env.NODE_ENV !== 'production' && result.rows[0]?.value === 'development-seed')
  return { ready: initialized, database: 'connected', initialized }
}

type ProductionProvisioningConfig = {
  agency: Pick<DbAgence, 'nom' | 'ville' | 'adresse'>
  companySettings: DbParametresEntreprise
  payrollSettings: DbParametresFiscauxSociaux
  legalAndPayrollRatesReviewed: boolean
  initialExchangeRate: {
    cdfPerUsd: number
    proposedBy: string
    approvedBy: string
    approvedAt: string
  }
}

function requireValue(name: string, value: unknown): asserts value is string {
  if (typeof value !== 'string' || !value.trim()) throw new Error(`The production provisioning config must provide ${name}.`)
  const normalized = value.normalize('NFD').replace(/\p{Diacritic}/gu, '')
  if (/a renseigner|replace|todo|example/i.test(normalized)) throw new Error(`${name} still contains a placeholder value.`)
}

function validateProvisioningConfig(config: ProductionProvisioningConfig) {
  if (!config || !config.agency || !config.companySettings || !config.payrollSettings || !config.initialExchangeRate) {
    throw new Error('Provisioning config must include agency, companySettings, payrollSettings, and initialExchangeRate objects.')
  }
  if (config.legalAndPayrollRatesReviewed !== true) {
    throw new Error('Set legalAndPayrollRatesReviewed to true only after the pilot tax and payroll rates have been checked by the responsible accountant.')
  }
  for (const key of ['nom', 'ville', 'adresse'] as const) requireValue(`agency.${key}`, config.agency[key])
  for (const key of [
    'nomSociete', 'slogan', 'rccm', 'idNat', 'nif', 'siegeAdresse', 'telephone', 'emailContact',
    'mentionsPiedFacture', 'mentionsPiedLivraison',
  ] as const) requireValue(`companySettings.${key}`, config.companySettings[key])
  const company = config.companySettings
  if (!Number.isFinite(company.tauxTvaPourcent) || company.tauxTvaPourcent < 0 || company.tauxTvaPourcent > 100) {
    throw new Error('companySettings.tauxTvaPourcent must be between 0 and 100; provide the rate approved for the pilot.')
  }
  if (!Number.isFinite(company.plafondAutonomieEtatBesoinAgenceUsd) || company.plafondAutonomieEtatBesoinAgenceUsd! < 0 ||
      !Number.isFinite(company.plafondDepenseDirecteAgenceUsd) || company.plafondDepenseDirecteAgenceUsd! < 0) {
    throw new Error('Company approval thresholds must be valid non-negative USD values.')
  }
  if (typeof company.doubleValidationTransfertObligatoire !== 'boolean') {
    throw new Error('companySettings.doubleValidationTransfertObligatoire must explicitly preserve or disable the existing two-step transfer validation rule.')
  }

  const payroll = config.payrollSettings
  for (const key of ['cnssQpoPourcent', 'cnssQppPourcent', 'inppPourcent', 'onemPourcent', 'deductionEnfantPourcent', 'plafondIprPourcent'] as const) {
    const rate = payroll[key]
    if (!Number.isFinite(rate) || rate < 0 || rate > 100) throw new Error(`payrollSettings.${key} must be between 0 and 100.`)
  }
  if (!Number.isInteger(payroll.maxEnfantsDeductibles) || payroll.maxEnfantsDeductibles < 0) {
    throw new Error('payrollSettings.maxEnfantsDeductibles must be a non-negative integer.')
  }
  if (!['CDF', 'USD'].includes(payroll.deviseReferenceBareme)) {
    throw new Error('payrollSettings.deviseReferenceBareme must be CDF or USD.')
  }
  if (!Array.isArray(payroll.tranchesIpr) || payroll.tranchesIpr.length === 0) {
    throw new Error('payrollSettings.tranchesIpr must contain the approved IPR tax brackets.')
  }
  let previousLimit = 0
  for (const [index, bracket] of payroll.tranchesIpr.entries()) {
    requireValue(`payrollSettings.tranchesIpr[${index}].id`, bracket.id)
    requireValue(`payrollSettings.tranchesIpr[${index}].description`, bracket.description)
    if (!Number.isInteger(bracket.ordre) || bracket.ordre !== index + 1 ||
        !Number.isFinite(bracket.limiteInferieureCdf) || bracket.limiteInferieureCdf !== previousLimit ||
        (bracket.limiteSuperieureCdf !== null && (!Number.isFinite(bracket.limiteSuperieureCdf) || bracket.limiteSuperieureCdf <= bracket.limiteInferieureCdf)) ||
        !Number.isFinite(bracket.tauxPourcent) || bracket.tauxPourcent < 0 || bracket.tauxPourcent > 100) {
      throw new Error(`payrollSettings.tranchesIpr[${index}] has invalid bounds or tax rate.`)
    }
    previousLimit = bracket.limiteSuperieureCdf ?? bracket.limiteInferieureCdf
  }
  if (payroll.tranchesIpr[payroll.tranchesIpr.length - 1]?.limiteSuperieureCdf !== null) {
    throw new Error('The final IPR tax bracket must use limiteSuperieureCdf: null for the open-ended range.')
  }
  if (payroll.smigJournalierCdf !== undefined && (!Number.isFinite(payroll.smigJournalierCdf) || payroll.smigJournalierCdf < 0)) {
    throw new Error('payrollSettings.smigJournalierCdf must be a non-negative number when provided.')
  }

  const rate = config.initialExchangeRate
  if (!Number.isFinite(rate.cdfPerUsd) || rate.cdfPerUsd <= 0) {
    throw new Error('initialExchangeRate.cdfPerUsd must be the approved positive CDF rate for one USD.')
  }
  requireValue('initialExchangeRate.proposedBy', rate.proposedBy)
  requireValue('initialExchangeRate.approvedBy', rate.approvedBy)
  if (rate.proposedBy.trim().toLowerCase() === rate.approvedBy.trim().toLowerCase()) {
    throw new Error('The initial exchange rate must be proposed and approved by two different people.')
  }
  if (!Number.isFinite(Date.parse(rate.approvedAt))) {
    throw new Error('initialExchangeRate.approvedAt must be a valid ISO date and time.')
  }
}

export async function provisionProductionDatabase(config: ProductionProvisioningConfig) {
  validateProvisioningConfig(config)
  if (process.env.NODE_ENV !== 'production') {
    throw new Error('Set NODE_ENV=production explicitly before running the production provisioning command.')
  }
  const connectionString = process.env.DATABASE_URL?.trim()
  if (!connectionString) throw new Error('DATABASE_URL is required to provision the production database.')

  const adminInputs = [
    {
      role: 'SUPER_ADMIN',
      email: process.env.MVG_BOOTSTRAP_SUPER_ADMIN_EMAIL?.trim() || '',
      nom: process.env.MVG_BOOTSTRAP_SUPER_ADMIN_NAME?.trim() || '',
      password: process.env.MVG_BOOTSTRAP_SUPER_ADMIN_PASSWORD || '',
    },
    {
      role: 'ADMIN_SIEGE',
      email: process.env.MVG_BOOTSTRAP_ADMIN_SIEGE_EMAIL?.trim() || '',
      nom: process.env.MVG_BOOTSTRAP_ADMIN_SIEGE_NAME?.trim() || '',
      password: process.env.MVG_BOOTSTRAP_ADMIN_SIEGE_PASSWORD || '',
    },
  ]
  for (const admin of adminInputs) {
    requireValue(`${admin.role} email`, admin.email)
    requireValue(`${admin.role} name`, admin.nom)
    requireValue(`${admin.role} password`, admin.password)
    if (!/^\S+@\S+\.\S+$/.test(admin.email)) throw new Error(`${admin.role} email is invalid.`)
    if (admin.password.length < 12) throw new Error(`${admin.role} password must contain at least 12 characters.`)
  }
  if (adminInputs[0]!.email.toLowerCase() === adminInputs[1]!.email.toLowerCase()) {
    throw new Error('The Super Admin and Admin Siège must use different email addresses.')
  }
  if (adminInputs[0]!.password === adminInputs[1]!.password) {
    throw new Error('The Super Admin and Admin Siège must use different passwords.')
  }

  const pool = new Pool({ connectionString, max: 2, connectionTimeoutMillis: 5000 })
  let lockClient: PoolClient | null = null
  try {
    lockClient = await pool.connect()
    const lock = await lockClient.query<{ locked: boolean }>(
      'SELECT pg_try_advisory_lock($1, $2) AS locked',
      [PERSISTENCE_ADVISORY_LOCK_NAMESPACE, PERSISTENCE_ADVISORY_LOCK_ID],
    )
    if (!lock.rows[0]?.locked) throw new Error('MVG already has an API process or provisioning task connected to this database.')

    const migrationPath = path.resolve(process.cwd(), 'server/migrations/001_business_records.sql')
    await pool.query(await readFile(migrationPath, 'utf8'))
    const existing = await pool.query<{ count: string }>('SELECT COUNT(*)::text AS count FROM mvg_business_records')
    const marker = await pool.query("SELECT value FROM mvg_metadata WHERE key = 'state_initialized'")
    if (existing.rows[0]?.count !== '0' || marker.rowCount !== 0) {
      throw new Error('Provisioning only runs against an empty database with no initialization marker. No data was changed.')
    }

    const superAdminPermissions = structuredClone(seed.users.find((user) => user.role === 'SUPER_ADMIN')?.permissions ?? [])
    const headOfficePermissions = structuredClone(seed.users.find((user) => user.role === 'ADMIN_SIEGE')?.permissions ?? [])
    if (!superAdminPermissions.length || !headOfficePermissions.length) throw new Error('Role permission templates are missing from the application.')

    // Keep the complete reference chart, but discard every fixture business record.
    const approvedSingletons = new Set(['baremesFiscauxSociauxParDefaut', 'parametresEntreprise', 'parametresFiscauxSociaux', 'permissionsParRole'])
    for (const entry of stateEntries) {
      if (Array.isArray(entry.value)) {
        if (entry.name !== 'planComptable') entry.value.splice(0, entry.value.length)
        continue
      }
      if (!approvedSingletons.has(entry.name)) {
        throw new Error(`Provisioning must explicitly define the initial value of ${entry.name} before this export can be used in production.`)
      }
    }
    const accountNumbers = new Set(seed.planComptable.map((account) => account.numero))
    if (accountNumbers.size !== seed.planComptable.length ||
        seed.planComptable.some((account) => !account.numero || !account.libelle || (account.parentNumero && !accountNumbers.has(account.parentNumero)))) {
      throw new Error('The reference chart of accounts has duplicate, incomplete, or unresolved parent entries.')
    }
    const genericSubaccountLabels: Record<string, string> = {
      '411001': 'Client auxiliaire - Compte 001',
      '411002': 'Client auxiliaire - Compte 002',
      '411003': 'Client auxiliaire - Compte 003',
      '5211': 'Banque locale CDF - Auxiliaire 1',
      '5212': 'Banque locale CDF - Auxiliaire 2',
      '5221': 'Banque en devises USD - Auxiliaire 1',
      '5222': 'Banque en devises USD - Auxiliaire 2',
    }
    for (const account of seed.planComptable) {
      if (genericSubaccountLabels[account.numero]) account.libelle = genericSubaccountLabels[account.numero]
    }
    const agency: DbAgence = { id: 1, ...config.agency, estSiege: true }
    seed.agences.push(agency)
    seed.comptesCaisse.push(
      {
        id: 1,
        nom: `Caisse principale USD - ${agency.nom}`,
        agenceId: agency.id,
        soldeUsd: 0,
        soldeCdf: 0,
        type: 'CAISSE',
        numeroCompteComptable: '571',
        deviseDefaut: 'USD',
        actif: true,
      },
      {
        id: 2,
        nom: `Caisse principale CDF - ${agency.nom}`,
        agenceId: agency.id,
        soldeUsd: 0,
        soldeCdf: 0,
        type: 'CAISSE',
        numeroCompteComptable: '572',
        deviseDefaut: 'CDF',
        actif: true,
      },
    )
    const initialRate: DbTauxChange = {
      id: 1,
      agenceId: agency.id,
      taux: config.initialExchangeRate.cdfPerUsd,
      statut: 'VALIDE',
      actif: true,
      proposePar: config.initialExchangeRate.proposedBy.trim(),
      validePar: config.initialExchangeRate.approvedBy.trim(),
      dateDebut: new Date(config.initialExchangeRate.approvedAt).toISOString(),
    }
    seed.tauxChanges.push(initialRate)
    const createdAt = new Date().toISOString()
    const usersToCreate: DbUser[] = await Promise.all(adminInputs.map(async (admin, index) => ({
      id: index + 1,
      email: admin.email.trim().toLowerCase(),
      nom: admin.nom.trim(),
      role: admin.role,
      agenceId: agency.id,
      permissions: index === 0 ? superAdminPermissions : headOfficePermissions,
      actif: true,
      password: await hashPassword(admin.password),
      tentativesEchouees: 0,
      estBloque: false,
      doitChangerMotDePasse: true,
      estVip: true,
    })))
    seed.users.push(...usersToCreate)
    seed.auditLogs.push({
      id: 1,
      dateHeure: createdAt,
      utilisateur: 'SYSTEME',
      action: 'AMORCAGE_PRODUCTION',
      details: 'Base initialisée avec une agence pilote et les comptes de gouvernance requis.',
      agenceId: agency.id,
    })

    const companySettings = {
      ...config.companySettings,
      plafondAutonomieEtatBesoinAgenceUsd: config.companySettings.plafondAutonomieEtatBesoinAgenceUsd,
      plafondDepenseDirecteAgenceUsd: config.companySettings.plafondDepenseDirecteAgenceUsd,
    }
    Object.assign(seed.parametresEntreprise, companySettings)
    Object.assign(seed.parametresFiscauxSociaux, config.payrollSettings)
    Object.assign(seed.baremesFiscauxSociauxParDefaut, config.payrollSettings)

    const initialState = captureState()
    const client = await pool.connect()
    try {
      await client.query('BEGIN')
      await writeWholeSnapshot(client, initialState)
      await client.query(
        "INSERT INTO mvg_metadata (key, value) VALUES ('state_initialized', 'production-provisioned'), ('provisioning_version', '1'), ('provisioned_at', $1)",
        [createdAt],
      )
      await client.query('COMMIT')
    } catch (error) {
      await client.query('ROLLBACK').catch(() => undefined)
      throw error
    } finally {
      client.release()
    }

    return { agencyId: agency.id, accountsCreated: usersToCreate.length, createdAt }
  } finally {
    if (lockClient) {
      await lockClient.query('SELECT pg_advisory_unlock($1, $2)', [PERSISTENCE_ADVISORY_LOCK_NAMESPACE, PERSISTENCE_ADVISORY_LOCK_ID]).catch(() => undefined)
      lockClient.release()
    }
    await pool.end()
  }
}

export function persistenceMiddleware(req: Request, res: Response, next: NextFunction) {
  if (!pool) return next()
  if (persistenceFailure) {
    return res.status(503).json({ message: 'Le stockage est indisponible. Redémarrez le service après rétablissement de PostgreSQL.' })
  }

  const writeRequest = !['GET', 'HEAD', 'OPTIONS'].includes(req.method)
  void requestLock.acquire(writeRequest ? 'write' : 'read').then((release) => {
    let responseEnded = false
    const originalEnd = res.end.bind(res)
    const releaseOnce = () => release()

    res.once('close', () => {
      if (!responseEnded) {
        responseEnded = true
        if (writeRequest) {
          void saveChanges(captureState())
            .catch((error: unknown) => {
              persistenceFailure = error instanceof Error ? error : new Error(String(error))
              console.error('Database persistence failed after a disconnected client:', persistenceFailure.message)
            })
            .finally(releaseOnce)
        } else {
          releaseOnce()
        }
      }
    })

    res.end = ((...args: any[]) => {
      if (responseEnded) return res
      responseEnded = true

      const finish = async () => {
        if (writeRequest) await saveChanges(captureState())
        originalEnd(...args)
      }

      void finish().catch((error: unknown) => {
        persistenceFailure = error instanceof Error ? error : new Error(String(error))
        console.error('Database persistence failed; API requests are disabled until restart:', persistenceFailure.message)
        res.statusCode = 503
        res.removeHeader('Content-Length')
        res.removeHeader('ETag')
        res.setHeader('Content-Type', 'application/json; charset=utf-8')
        const body = JSON.stringify({ message: 'Les données n’ont pas pu être enregistrées. Le service doit être redémarré.' })
        res.setHeader('Content-Length', Buffer.byteLength(body))
        originalEnd(body)
      }).finally(releaseOnce)

      return res
    }) as typeof res.end

    next()
  }).catch(next)
}

export async function closePersistence() {
  if (leadershipClient) {
    try {
      await leadershipClient.query('SELECT pg_advisory_unlock($1, $2)', [PERSISTENCE_ADVISORY_LOCK_NAMESPACE, PERSISTENCE_ADVISORY_LOCK_ID])
    } catch {
      // The database may already be unavailable during shutdown.
    }
    leadershipClient.release()
    leadershipClient = null
  }
  if (pool) {
    await pool.end()
    pool = null
  }
}
