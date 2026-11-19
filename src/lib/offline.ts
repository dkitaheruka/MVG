import { openDB } from 'idb'
import { apiRequest, HttpError } from './api'
import type { SyncOperation } from '../types'

export type OfflineOperation = {
  id: string
  ownerEmail?: string
  type: 'VENTE' | 'LIVRAISON' | 'STOCK_CORRECTION'
  payload: unknown
  createdAt: string
  status: 'LOCAL' | 'SYNCING' | 'FAILED'
  syncStartedAt?: string
  errorMessage?: string
}

const STALE_SYNC_TIMEOUT_MS = 5 * 60 * 1000
let activeSync: Promise<SyncResult> | null = null

function tokenSubject(token?: string): string | undefined {
  try {
    const payload = token?.split('.')[1]
    if (!payload) return undefined
    const decoded = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/'))) as { sub?: string }
    return decoded.sub?.trim().toLowerCase()
  } catch {
    return undefined
  }
}

function operationOwner(operation: OfflineOperation): string | undefined {
  if (operation.ownerEmail) return operation.ownerEmail.trim().toLowerCase()
  const payload = operation.payload as { vendeur?: { email?: string } } | undefined
  return payload?.vendeur?.email?.trim().toLowerCase()
}

const dbPromise = openDB('matabishi-offline', 2, {
  upgrade(db) {
    if (!db.objectStoreNames.contains('operations')) {
      db.createObjectStore('operations', { keyPath: 'id' })
    }
    if (!db.objectStoreNames.contains('referenceData')) {
      db.createObjectStore('referenceData', { keyPath: 'key' })
    }
  },
})

export async function loadReferenceData<T>(key: string, fetchOnline: () => Promise<T>): Promise<T> {
  const db = await dbPromise
  if (navigator.onLine) {
    try {
      const value = await fetchOnline()
      await db.put('referenceData', { key, value, updatedAt: new Date().toISOString() })
      return value
    } catch (error) {
      if (error instanceof HttpError) throw error
    }
  }
  const cached = await db.get('referenceData', key) as { value: T } | undefined
  if (cached) return cached.value
  throw new Error('Aucune donnée POS enregistrée sur cet appareil. Connectez-vous au réseau et ouvrez le POS avant la prochaine coupure.')
}

export async function saveOfflineOperation(operation: OfflineOperation) {
  const db = await dbPromise
  await db.put('operations', operation)
}

export async function listOfflineOperations(): Promise<OfflineOperation[]> {
  const db = await dbPromise
  return db.getAll('operations')
}

export async function removeOfflineOperation(id: string) {
  const db = await dbPromise
  await db.delete('operations', id)
}

export async function clearAllOfflineOperations() {
  const db = await dbPromise
  await db.clear('operations')
}

export type SyncResult = {
  synces: number
  echecs: number
  operations: Array<{
    id: string
    statut: string
    stockNegatif: boolean
    message?: string
  }>
}

/**
 * Parcourt les opérations stockées localement dans IndexedDB et tente de les soumettre au serveur.
 * Supprime les opérations validées avec succès et conserve celles en échec pour nouvelle tentative.
 */
export function syncPendingOperations(token?: string): Promise<SyncResult> {
  if (activeSync) return activeSync
  activeSync = processPendingOperations(token).finally(() => {
    activeSync = null
  })
  return activeSync
}

async function processPendingOperations(token?: string): Promise<SyncResult> {
  const operations = await listOfflineOperations()
  const currentOwner = tokenSubject(token)
  const now = Date.now()
  const pending = operations.filter((op) => {
    if (!currentOwner || operationOwner(op) !== currentOwner) return false
    if (op.status === 'LOCAL' || op.status === 'FAILED') return true
    if (op.status !== 'SYNCING') return false
    const startedAt = Date.parse(op.syncStartedAt ?? '')
    return !Number.isFinite(startedAt) || now - startedAt >= STALE_SYNC_TIMEOUT_MS
  })

  const result: SyncResult = {
    synces: 0,
    echecs: 0,
    operations: [],
  }

  const db = await dbPromise

  for (const op of pending) {
    try {
      // Marquer en cours de synchronisation
      op.status = 'SYNCING'
      op.syncStartedAt = new Date().toISOString()
      await db.put('operations', op)

      const payloadJson = typeof op.payload === 'string' ? op.payload : JSON.stringify(op.payload)

      const serverResponse = await apiRequest<SyncOperation>('/api/sync/operations', {
        method: 'POST',
        token,
        body: JSON.stringify({
          clientOperationId: op.id,
          typeOperation: op.type,
          payloadJson,
        }),
      })

      // Succès : l'opération a été acceptée (ou acceptée avec alerte stock négatif)
      if (
        serverResponse.statut === 'ACCEPTEE' ||
        serverResponse.statut === 'ACCEPTEE_STOCK_NEGATIF'
      ) {
        await db.delete('operations', op.id)
        result.synces += 1
        result.operations.push({
          id: op.id,
          statut: serverResponse.statut,
          stockNegatif: serverResponse.stockNegatifSignale,
          message: serverResponse.message,
        })
      } else {
        // Conflit ou rejeté par le serveur
        op.status = 'FAILED'
        op.syncStartedAt = undefined
        op.errorMessage = serverResponse.message ?? 'Rejet serveur'
        await db.put('operations', op)
        result.echecs += 1
        result.operations.push({
          id: op.id,
          statut: serverResponse.statut,
          stockNegatif: false,
          message: serverResponse.message,
        })
      }
    } catch (err: any) {
      // Erreur réseau ou timeout
      op.status = 'FAILED'
      op.syncStartedAt = undefined
      op.errorMessage = err.message || 'Erreur réseau lors de la synchronisation'
      await db.put('operations', op)
      result.echecs += 1
      result.operations.push({
        id: op.id,
        statut: 'FAILED',
        stockNegatif: false,
        message: op.errorMessage,
      })
    }
  }

  return result
}

/**
 * Configure un écouteur automatique sur le statut en ligne du navigateur
 */
export function setupAutoSync(getToken: () => string | null | undefined, onSyncComplete?: (res: SyncResult) => void) {
  const handler = async () => {
    if (navigator.onLine) {
      const token = getToken() ?? undefined
      const result = await syncPendingOperations(token)
      if (onSyncComplete) {
        onSyncComplete(result)
      }
    }
  }

  const safeHandler = () => {
    void handler().catch((error) => console.error('Synchronisation hors ligne automatique impossible :', error))
  }

  window.addEventListener('online', safeHandler)
  safeHandler()
  return () => window.removeEventListener('online', safeHandler)
}
