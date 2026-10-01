import { Router, type Request, type Response } from 'express'
import jwt from 'jsonwebtoken'
import type { DbEcritureComptable } from './db'
import {
  agences,
  users,
  articles,
  prixArticlesAgence,
  tauxChanges,
  stocksAgence,
  clients,
  comptesCaisse,
  transactions,
  ventes,
  planComptable,
  ecrituresComptables,
  correctionsStock,
  ordresProduction,
  recettes,
  auditLogs,
  fournisseurs,
  achats,
  transfertsStock,
  agents,
  avancesSalaire,
  bulletinsPaie,
  operationsSync,
  categories,
} from './seed'

const router = Router()
const JWT_SECRET = 'matabishi_secure_token_secret_mvg_2026'

function toInt(val: unknown, defaultVal = 0): number {
  if (typeof val === 'number') return val
  if (typeof val === 'string') {
    const parsed = parseInt(val, 10)
    return isNaN(parsed) ? defaultVal : parsed
  }
  return defaultVal
}

function getUserFromToken(req: Request) {
  const authHeader = req.headers.authorization
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null
  try {
    const token = authHeader.substring(7)
    const decoded = jwt.verify(token, JWT_SECRET) as any
    return users.find((u) => u.email === decoded.sub) || null
  } catch {
    return null
  }
}

function logAudit(utilisateur: string, action: string, details: string, agenceId?: number) {
  auditLogs.unshift({
    id: auditLogs.length + 1,
    dateHeure: new Date().toISOString(),
    utilisateur,
    action,
    details,
    agenceId,
  })
}

// ----------------- AUTHENTICATION -----------------
router.post('/auth/login', (req: Request, res: Response) => {
  const { email } = req.body
  const user = users.find((u) => u.email === email)

  if (!user) {
    return res.status(401).json({ message: 'Identifiants invalides' })
  }

  const token = jwt.sign(
    {
      sub: user.email,
      nom: user.nom,
      role: user.role,
      agenceId: user.agenceId,
      permissions: user.permissions,
    },
    JWT_SECRET,
    { expiresIn: '24h' }
  )

  logAudit(user.nom, 'CONNEXION', `Connexion réussie sur le canal ${req.body.deviceType || 'WEB'}`)
  res.json({ token })
})

router.get('/auth/users', (_req: Request, res: Response) => {
  res.json(users.map(({ id, email, nom, role, agenceId, actif }) => ({ id, email, nom, role, agenceId, actif })))
})

// ----------------- AGENCES -----------------
router.get('/agences', (_req: Request, res: Response) => {
  res.json(agences)
})

// ----------------- REPORTING -----------------
router.get('/reporting/siege/global', (_req: Request, res: Response) => {
  let totalRecettesUsd = 0
  let totalRecettesCdf = 0

  ventes.forEach((v) => {
    if (v.statutCredit !== 'REJETE' && v.statutAnnulation !== 'ANNULEE') {
      if (v.devise === 'USD') {
        totalRecettesUsd += v.montantTotal
      } else {
        totalRecettesCdf += v.montantCdf || v.montantTotal
      }
    }
  })

  const tauxRef = tauxChanges.find((t) => t.agenceId === 1 && t.actif)?.taux || 2850
  const totalConsolideUsd = totalRecettesUsd + totalRecettesCdf / tauxRef

  res.json({
    totalRecettesUsd: Math.round(totalRecettesUsd * 100) / 100,
    totalRecettesCdf: Math.round(totalRecettesCdf),
    totalConsolideUsd: Math.round(totalConsolideUsd * 100) / 100,
    nombreTransactions: transactions.length + ventes.length,
  })
})

// ----------------- STOCKS & CORRECTIONS -----------------
router.get('/stocks/agence/:agenceId', (req: Request, res: Response) => {
  const agenceId = toInt(req.params.agenceId)
  const items = stocksAgence
    .filter((s) => s.agenceId === agenceId)
    .map((s) => {
      const art = articles.find((a) => a.id === s.articleId)
      const ag = agences.find((a) => a.id === s.agenceId)
      return {
        id: s.id,
        quantite: s.quantite,
        numeroLot: s.numeroLot,
        dateExpiration: s.dateExpiration,
        seuilAlerte: s.seuilAlerte,
        article: art,
        agence: ag,
      }
    })
  res.json(items)
})

router.get('/stocks/corrections', (req: Request, res: Response) => {
  const agenceId = req.query.agenceId ? toInt(req.query.agenceId) : undefined
  const list = correctionsStock
    .filter((c) => !agenceId || c.agenceId === agenceId)
    .map((c) => {
      const art = articles.find((a) => a.id === c.articleId)
      const dem = users.find((u) => u.id === c.demandeurId)
      const val = users.find((u) => u.id === c.validateurId)
      return {
        ...c,
        article: art,
        demandeur: dem?.nom || 'Inconnu',
        validateur: val?.nom,
      }
    })
  res.json(list)
})

router.post('/stocks/corrections', (req: Request, res: Response) => {
  const currentUser = getUserFromToken(req)
  if (!currentUser) return res.status(401).json({ message: 'Non autorisé' })

  const { agenceId, articleId, numeroLot, quantiteNouvelle, motif } = req.body
  const numAg = toInt(agenceId)
  const numArt = toInt(articleId)
  const stock = stocksAgence.find((s) => s.agenceId === numAg && s.articleId === numArt && s.numeroLot === numeroLot)
  const quantiteActuelle = stock ? stock.quantite : 0

  const nouvelleCorrection = {
    id: correctionsStock.length + 1,
    agenceId: numAg,
    articleId: numArt,
    numeroLot,
    quantiteActuelle,
    quantiteNouvelle: Number(quantiteNouvelle),
    motif,
    demandeurId: currentUser.id,
    statut: 'EN_ATTENTE' as const,
    dateDemande: new Date().toISOString(),
  }

  correctionsStock.unshift(nouvelleCorrection)
  logAudit(currentUser.nom, 'DEMANDE_CORRECTION_STOCK', `Correction demandée lot ${numeroLot} de ${quantiteActuelle} vers ${quantiteNouvelle}`, numAg)
  res.json(nouvelleCorrection)
})

router.post('/stocks/corrections/:id/valider', (req: Request, res: Response) => {
  const currentUser = getUserFromToken(req)
  if (!currentUser) return res.status(401).json({ message: 'Non autorisé' })

  const correction = correctionsStock.find((c) => c.id === toInt(req.params.id))
  if (!correction) return res.status(404).json({ message: 'Demande non trouvée' })

  if (correction.demandeurId === currentUser.id) {
    return res.status(400).json({ message: 'Règle des deux personnes: Vous ne pouvez pas valider votre propre demande de correction.' })
  }

  const stock = stocksAgence.find((s) => s.agenceId === correction.agenceId && s.articleId === correction.articleId && s.numeroLot === correction.numeroLot)
  if (stock) {
    stock.quantite = correction.quantiteNouvelle
  } else {
    stocksAgence.push({
      id: stocksAgence.length + 1,
      agenceId: correction.agenceId,
      articleId: correction.articleId,
      quantite: correction.quantiteNouvelle,
      numeroLot: correction.numeroLot,
      dateExpiration: '2027-12-31',
      seuilAlerte: 20,
    })
  }

  correction.statut = 'VALIDE'
  correction.validateurId = currentUser.id

  logAudit(currentUser.nom, 'VALIDATION_CORRECTION_STOCK', `Validation ajustement stock #${correction.id} lot ${correction.numeroLot}`, correction.agenceId)
  res.json(correction)
})

router.post('/stocks/corrections/:id/rejeter', (req: Request, res: Response) => {
  const currentUser = getUserFromToken(req)
  if (!currentUser) return res.status(401).json({ message: 'Non autorisé' })

  const correction = correctionsStock.find((c) => c.id === toInt(req.params.id))
  if (!correction) return res.status(404).json({ message: 'Demande non trouvée' })

  if (correction.demandeurId === currentUser.id) {
    return res.status(400).json({ message: 'Règle des deux personnes: Vous ne pouvez pas rejeter votre propre demande.' })
  }

  correction.statut = 'REJETE'
  correction.validateurId = currentUser.id

  logAudit(currentUser.nom, 'REJET_CORRECTION_STOCK', `Rejet ajustement stock #${correction.id}`, correction.agenceId)
  res.json(correction)
})

// ----------------- TAUX DE CHANGE -----------------
router.get('/parametrage/agences/:agenceId/taux/actif', (req: Request, res: Response) => {
  const agenceId = toInt(req.params.agenceId)
  const taux = tauxChanges.find((t) => t.agenceId === agenceId && t.statut === 'VALIDE' && t.actif) || {
    id: 999,
    agenceId,
    taux: 2850,
    statut: 'VALIDE',
    actif: true,
  }
  const ag = agences.find((a) => a.id === agenceId)
  res.json({
    id: taux.id,
    agence: ag,
    taux: taux.taux,
    deviseSource: 'USD',
    deviseCible: 'CDF',
    actif: taux.actif,
  })
})

router.get('/parametrage/agences/:agenceId/taux', (req: Request, res: Response) => {
  const agenceId = toInt(req.params.agenceId)
  const list = tauxChanges.filter((t) => t.agenceId === agenceId)
  res.json(list)
})

router.post('/parametrage/agences/:agenceId/taux', (req: Request, res: Response) => {
  const currentUser = getUserFromToken(req)
  if (!currentUser) return res.status(401).json({ message: 'Non autorisé' })

  const agenceId = toInt(req.params.agenceId)
  const { taux } = req.body

  const nouveauTaux = {
    id: tauxChanges.length + 1,
    agenceId,
    taux: Number(taux),
    statut: 'PROPOSE' as const,
    proposePar: currentUser.nom,
    dateDebut: new Date().toISOString(),
    actif: false,
  }

  tauxChanges.unshift(nouveauTaux)
  logAudit(currentUser.nom, 'PROPOSITION_TAUX', `Taux proposé: ${taux} CDF pour 1 USD`, agenceId)
  res.json(nouveauTaux)
})

router.post('/parametrage/taux/:id/valider', (req: Request, res: Response) => {
  const currentUser = getUserFromToken(req)
  if (!currentUser) return res.status(401).json({ message: 'Non autorisé' })

  const tauxObj = tauxChanges.find((t) => t.id === toInt(req.params.id))
  if (!tauxObj) return res.status(404).json({ message: 'Taux non trouvé' })

  if (currentUser.role !== 'SUPER_ADMIN' && currentUser.role !== 'ADMIN_SIEGE') {
    return res.status(403).json({ message: 'Seul le Siège peut valider un nouveau taux de change.' })
  }

  tauxChanges.forEach((t) => {
    if (t.agenceId === tauxObj.agenceId) t.actif = false
  })

  tauxObj.statut = 'VALIDE'
  tauxObj.validePar = currentUser.nom
  tauxObj.actif = true

  logAudit(currentUser.nom, 'VALIDATION_TAUX', `Validation taux ${tauxObj.taux} CDF pour agence #${tauxObj.agenceId}`, tauxObj.agenceId)
  res.json(tauxObj)
})

// ----------------- PRIX ARTICLES & PROPOSITIONS -----------------
router.get('/parametrage/articles/prix', (req: Request, res: Response) => {
  const agenceId = req.query.agenceId ? toInt(req.query.agenceId) : undefined
  const list = prixArticlesAgence
    .filter((p) => !agenceId || p.agenceId === agenceId)
    .map((p) => {
      const art = articles.find((a) => a.id === p.articleId)
      const ag = agences.find((a) => a.id === p.agenceId)
      return {
        ...p,
        article: art,
        agence: ag,
      }
    })
  res.json(list)
})

router.post('/parametrage/articles/prix', (req: Request, res: Response) => {
  const currentUser = getUserFromToken(req)
  if (!currentUser) return res.status(401).json({ message: 'Non autorisé' })

  const { agenceId, articleId, prix, devise } = req.body
  const nouveauPrix = {
    id: prixArticlesAgence.length + 1,
    agenceId: Number(agenceId),
    articleId: Number(articleId),
    prix: Number(prix),
    devise: devise || 'USD',
    statut: 'PROPOSE' as const,
    proposePar: currentUser.nom,
    actif: false,
  }

  prixArticlesAgence.unshift(nouveauPrix)
  logAudit(currentUser.nom, 'PROPOSITION_PRIX', `Prix proposé ${prix} ${devise} article #${articleId}`, Number(agenceId))
  res.json(nouveauPrix)
})

router.post('/parametrage/articles/prix/:id/valider', (req: Request, res: Response) => {
  const currentUser = getUserFromToken(req)
  if (!currentUser) return res.status(401).json({ message: 'Non autorisé' })

  if (currentUser.role !== 'SUPER_ADMIN' && currentUser.role !== 'ADMIN_SIEGE') {
    return res.status(403).json({ message: 'Seul le Siège peut valider la modification des prix.' })
  }

  const item = prixArticlesAgence.find((p) => p.id === toInt(req.params.id))
  if (!item) return res.status(404).json({ message: 'Prix introuvable' })

  prixArticlesAgence.forEach((p) => {
    if (p.agenceId === item.agenceId && p.articleId === item.articleId && p.id !== item.id) {
      p.actif = false
    }
  })

  item.statut = 'VALIDE'
  item.validePar = currentUser.nom
  item.actif = true

  logAudit(currentUser.nom, 'VALIDATION_PRIX', `Validation du prix ${item.prix} ${item.devise} pour article #${item.articleId}`, item.agenceId)
  res.json(item)
})

// ----------------- CLIENTS -----------------
router.get('/clients', (_req: Request, res: Response) => {
  res.json(clients)
})

router.post('/clients', (req: Request, res: Response) => {
  const currentUser = getUserFromToken(req)
  const { nom, telephone, adresse, limiteCredit } = req.body

  const nouveauClient = {
    id: clients.length + 1,
    nom,
    telephone: telephone || '',
    adresse: adresse || '',
    soldeDette: 0,
    limiteCredit: limiteCredit ? Number(limiteCredit) : 1000,
    bloque: false,
  }

  clients.unshift(nouveauClient)
  logAudit(currentUser?.nom || 'Utilisateur', 'CREATION_CLIENT', `Nouveau client: ${nom}`)
  res.json(nouveauClient)
})

router.post('/clients/:id/rembourser', (req: Request, res: Response) => {
  const currentUser = getUserFromToken(req)
  if (!currentUser) return res.status(401).json({ message: 'Non autorisé' })

  const clientId = toInt(req.params.id)
  const client = clients.find((c) => c.id === clientId)
  if (!client) return res.status(404).json({ message: 'Client non trouvé' })

  const { montant, devise, caisseId, agenceId } = req.body
  const numMontant = Number(montant)
  const numAg = agenceId ? toInt(agenceId) : 1

  if (numMontant <= 0) {
    return res.status(400).json({ message: 'Montant invalide' })
  }

  const activeRate = tauxChanges.find((t) => t.agenceId === numAg && t.statut === 'VALIDE' && t.actif)?.taux || 2850
  const deductionUsd = devise === 'USD' ? numMontant : numMontant / activeRate

  client.soldeDette = Math.max(0, Math.round((client.soldeDette - deductionUsd) * 100) / 100)
  if (client.soldeDette <= client.limiteCredit) {
    client.bloque = false
  }

  const caisse = comptesCaisse.find((c) => c.id === (caisseId ? Number(caisseId) : 1))
  if (caisse) {
    if (devise === 'USD') caisse.soldeUsd += numMontant
    else caisse.soldeCdf += numMontant
  }

  const ref = `RMB-${Date.now()}`
  ecrituresComptables.push(
    {
      id: ecrituresComptables.length + 1,
      referenceOperation: ref,
      agenceId: numAg,
      compteNumero: devise === 'USD' ? '571' : '572',
      sens: 'DEBIT',
      montant: numMontant,
      devise,
      tauxApplique: activeRate,
      libelle: `Règlement créance client ${client.nom}`,
      sourceModule: 'VENTES',
      sourceType: 'RECOUVREMENT',
      sourceId: String(clientId),
      annulee: false,
      statutValidation: 'VALIDE',
      dateEcriture: new Date().toISOString(),
    },
    {
      id: ecrituresComptables.length + 2,
      referenceOperation: ref,
      agenceId: numAg,
      compteNumero: '411',
      sens: 'CREDIT',
      montant: numMontant,
      devise,
      tauxApplique: activeRate,
      libelle: `Apurement compte client ${client.nom}`,
      sourceModule: 'VENTES',
      sourceType: 'RECOUVREMENT',
      sourceId: String(clientId),
      annulee: false,
      statutValidation: 'VALIDE',
      dateEcriture: new Date().toISOString(),
    }
  )

  logAudit(currentUser.nom, 'REMBOURSEMENT_DETTE', `Encaissement dette de ${numMontant} ${devise} pour ${client.nom}`, numAg)
  res.json({ message: 'Remboursement enregistré avec succès', client })
})

// ----------------- VENTES & POS -----------------
router.get('/ventes', (req: Request, res: Response) => {
  const agenceId = req.query.agenceId ? toInt(req.query.agenceId) : undefined
  const statutCredit = req.query.statutCredit as string | undefined

  let list = ventes.filter((v) => !agenceId || v.agenceId === agenceId)
  if (statutCredit) {
    list = list.filter((v) => v.statutCredit === statutCredit)
  }

  const enriched = list.map((v) => {
    const ag = agences.find((a) => a.id === v.agenceId)
    const vend = users.find((u) => u.id === v.vendeurId)
    const cli = clients.find((c) => c.id === v.clientId)
    const details = v.details.map((d) => ({
      ...d,
      article: articles.find((a) => a.id === d.articleId),
    }))
    return {
      ...v,
      agence: ag,
      vendeur: vend,
      client: cli,
      details,
    }
  })

  res.json(enriched)
})

router.post('/ventes/nouvelle', (req: Request, res: Response) => {
  const currentUser = getUserFromToken(req)
  const { agenceId, items, estCredit, clientId, devise, montantTotal, montantCdf, caisseId } = req.body

  const agId = Number(agenceId) || 1
  const clientObj = clientId ? clients.find((c) => c.id === Number(clientId)) : undefined
  const detailsLignes: any[] = []

  for (let idx = 0; idx < items.length; idx++) {
    const item = items[idx]
    const artId = Number(item.articleId)
    let remainingQty = Number(item.quantite)
    let lotUtilise = item.numeroLot || ''

    // Strict FEFO: Sort lots by dateExpiration ascending (earliest expiring first)
    const availableLots = stocksAgence
      .filter((s) => s.agenceId === agId && s.articleId === artId && s.quantite > 0)
      .sort((a, b) => new Date(a.dateExpiration).getTime() - new Date(b.dateExpiration).getTime())

    if (item.numeroLot) {
      const specificLot = stocksAgence.find((s) => s.agenceId === agId && s.articleId === artId && s.numeroLot === item.numeroLot)
      if (specificLot) {
        specificLot.quantite = Math.max(0, specificLot.quantite - remainingQty)
      }
    } else if (availableLots.length > 0) {
      lotUtilise = availableLots[0].numeroLot
      for (const lot of availableLots) {
        if (remainingQty <= 0) break
        const deduct = Math.min(lot.quantite, remainingQty)
        lot.quantite -= deduct
        remainingQty -= deduct
      }
    } else {
      // Fallback if no positive stock
      const anyStock = stocksAgence.find((s) => s.agenceId === agId && s.articleId === artId)
      if (anyStock) {
        anyStock.quantite = Math.max(0, anyStock.quantite - remainingQty)
        lotUtilise = anyStock.numeroLot
      }
    }

    detailsLignes.push({
      id: idx + 1,
      articleId: artId,
      quantite: Number(item.quantite),
      prixUnitaireApplique: Number(item.prix),
      numeroLot: lotUtilise || 'LOT-STD',
    })
  }

  const activeRate = tauxChanges.find((t) => t.agenceId === agId && t.statut === 'VALIDE' && t.actif)?.taux || 2850

  // Credit check: is limit exceeded?
  let statutCreditInit: 'AUCUN' | 'EN_ATTENTE' | 'DEPASSEMENT_PLAFOND' = 'AUCUN'
  if (estCredit) {
    statutCreditInit = 'EN_ATTENTE'
    if (clientObj) {
      const montantUsd = devise === 'USD' ? Number(montantTotal) : Number(montantTotal) / activeRate
      if (clientObj.soldeDette + montantUsd > clientObj.limiteCredit) {
        statutCreditInit = 'DEPASSEMENT_PLAFOND'
        logAudit(
          currentUser?.nom || 'Vendeur',
          'ALERTE_CREDIT_DEPASSEMENT',
          `Vente à crédit en dépassement de plafond client (${clientObj.soldeDette + montantUsd} $ > ${clientObj.limiteCredit} $). Soumise pour arbitrage Siège.`,
          agId
        )
      }
    }
  }

  const nouvelleVente: any = {
    id: ventes.length + 1,
    referenceVente: `VNT-${agId}-${Date.now().toString().slice(-6)}`,
    agenceId: agId,
    vendeurId: currentUser ? currentUser.id : 4,
    clientId: clientObj ? clientObj.id : undefined,
    montantTotal: Number(montantTotal),
    montantCdf: montantCdf ? Number(montantCdf) : undefined,
    devise: devise || 'USD',
    estCredit: Boolean(estCredit),
    statutCredit: statutCreditInit,
    statutAnnulation: 'AUCUNE',
    dateVente: new Date().toISOString(),
    details: detailsLignes,
  }

  ventes.unshift(nouvelleVente)

  if (!estCredit) {
    const caisse = comptesCaisse.find((c) => c.id === (caisseId ? Number(caisseId) : 1)) || comptesCaisse[0]
    if (devise === 'USD') {
      caisse.soldeUsd += Number(montantTotal)
    } else {
      caisse.soldeCdf += Number(montantCdf || montantTotal)
    }

    const ref = nouvelleVente.referenceVente
    ecrituresComptables.push(
      {
        id: ecrituresComptables.length + 1,
        referenceOperation: ref,
        agenceId: agId,
        compteNumero: devise === 'USD' ? '571' : '572',
        sens: 'DEBIT',
        montant: Number(montantTotal),
        devise: devise || 'USD',
        tauxApplique: activeRate,
        libelle: `Encaissement vente au comptant ${ref}`,
        sourceModule: 'VENTES',
        sourceType: 'VENTE_COMPTANT',
        sourceId: String(nouvelleVente.id),
        annulee: false,
        statutValidation: 'VALIDE',
        dateEcriture: new Date().toISOString(),
      },
      {
        id: ecrituresComptables.length + 2,
        referenceOperation: ref,
        agenceId: agId,
        compteNumero: '701',
        sens: 'CREDIT',
        montant: Number(montantTotal),
        devise: devise || 'USD',
        tauxApplique: activeRate,
        libelle: `Produit des ventes ${ref}`,
        sourceModule: 'VENTES',
        sourceType: 'VENTE_COMPTANT',
        sourceId: String(nouvelleVente.id),
        annulee: false,
        statutValidation: 'VALIDE',
        dateEcriture: new Date().toISOString(),
      }
    )
  }

  logAudit(currentUser?.nom || 'Vendeur', 'NOUVELLE_VENTE', `Vente ${nouvelleVente.referenceVente} - ${montantTotal} ${devise} (${estCredit ? 'Crédit' : 'Comptant'})`, agId)

  const ag = agences.find((a) => a.id === agId)
  const vend = users.find((u) => u.id === nouvelleVente.vendeurId)
  res.json({
    ...nouvelleVente,
    agence: ag,
    vendeur: vend,
    client: clientObj,
    details: nouvelleVente.details.map((d: any) => ({
      ...d,
      article: articles.find((a) => a.id === d.articleId),
    })),
  })
})

router.post('/ventes/credits/:id/valider', (req: Request, res: Response) => {
  const currentUser = getUserFromToken(req)
  if (!currentUser) return res.status(401).json({ message: 'Non autorisé' })

  const vente = ventes.find((v) => v.id === toInt(req.params.id))
  if (!vente) return res.status(404).json({ message: 'Vente non trouvée' })

  if (vente.vendeurId === currentUser.id) {
    return res.status(400).json({ message: 'Règle des deux personnes: Le vendeur ne peut pas valider sa propre vente à crédit.' })
  }

  const client = clients.find((c) => c.id === vente.clientId)
  if (client) {
    const activeRate = tauxChanges.find((t) => t.agenceId === vente.agenceId && t.statut === 'VALIDE' && t.actif)?.taux || 2850
    const detteUsd = vente.devise === 'USD' ? vente.montantTotal : (vente.montantCdf || vente.montantTotal) / activeRate

    if (client.soldeDette + detteUsd > client.limiteCredit) {
      if (currentUser.role !== 'SUPER_ADMIN' && currentUser.role !== 'ADMIN_SIEGE') {
        return res.status(403).json({
          message: `Dépassement de limite de crédit (${client.soldeDette + detteUsd} > ${client.limiteCredit} $). Seul le Siège peut déroger et valider ce crédit.`,
        })
      }
    }

    client.soldeDette = Math.round((client.soldeDette + detteUsd) * 100) / 100
  }

  vente.statutCredit = 'VALIDE'

  const ref = vente.referenceVente
  ecrituresComptables.push(
    {
      id: ecrituresComptables.length + 1,
      referenceOperation: ref,
      agenceId: vente.agenceId,
      compteNumero: '411',
      sens: 'DEBIT',
      montant: vente.montantTotal,
      devise: vente.devise,
      libelle: `Créance client vente à crédit ${ref}`,
      sourceModule: 'VENTES',
      sourceType: 'VENTE_CREDIT',
      sourceId: String(vente.id),
      annulee: false,
      statutValidation: 'VALIDE',
      dateEcriture: new Date().toISOString(),
    },
    {
      id: ecrituresComptables.length + 2,
      referenceOperation: ref,
      agenceId: vente.agenceId,
      compteNumero: '701',
      sens: 'CREDIT',
      montant: vente.montantTotal,
      devise: vente.devise,
      libelle: `Produit vente crédit ${ref}`,
      sourceModule: 'VENTES',
      sourceType: 'VENTE_CREDIT',
      sourceId: String(vente.id),
      annulee: false,
      statutValidation: 'VALIDE',
      dateEcriture: new Date().toISOString(),
    }
  )

  logAudit(currentUser.nom, 'VALIDATION_CREDIT', `Validation vente à crédit ${vente.referenceVente}`, vente.agenceId)
  res.json(vente)
})

router.post('/ventes/credits/:id/rejeter', (req: Request, res: Response) => {
  const currentUser = getUserFromToken(req)
  if (!currentUser) return res.status(401).json({ message: 'Non autorisé' })

  const vente = ventes.find((v) => v.id === toInt(req.params.id))
  if (!vente) return res.status(404).json({ message: 'Vente non trouvée' })

  if (vente.vendeurId === currentUser.id) {
    return res.status(400).json({ message: 'Règle des deux personnes: Vous ne pouvez pas rejeter votre propre vente.' })
  }

  for (const detail of vente.details) {
    const stock = stocksAgence.find((s) => s.agenceId === vente.agenceId && s.articleId === detail.articleId)
    if (stock) {
      stock.quantite += detail.quantite
    }
  }

  vente.statutCredit = 'REJETE'
  logAudit(currentUser.nom, 'REJET_CREDIT', `Rejet vente à crédit ${vente.referenceVente} et restauration de stock`, vente.agenceId)
  res.json(vente)
})

router.post('/ventes/:id/demande-annulation', (req: Request, res: Response) => {
  const currentUser = getUserFromToken(req)
  if (!currentUser) return res.status(401).json({ message: 'Non autorisé' })

  const vente = ventes.find((v) => v.id === toInt(req.params.id))
  if (!vente) return res.status(404).json({ message: 'Vente non trouvée' })

  vente.statutAnnulation = 'EN_ATTENTE'
  vente.demandeurAnnulation = currentUser.nom

  logAudit(currentUser.nom, 'DEMANDE_ANNULATION_VENTE', `Demande annulation vente ${vente.referenceVente}`, vente.agenceId)
  res.json({ message: 'Demande d annulation soumise pour validation par le chef', vente })
})

router.post('/ventes/:id/valider-annulation', (req: Request, res: Response) => {
  const currentUser = getUserFromToken(req)
  if (!currentUser) return res.status(401).json({ message: 'Non autorisé' })

  const vente = ventes.find((v) => v.id === toInt(req.params.id))
  if (!vente) return res.status(404).json({ message: 'Vente non trouvée' })

  if (vente.demandeurAnnulation === currentUser.nom) {
    return res.status(400).json({ message: 'Règle des deux personnes: L initiateur de l annulation ne peut pas la valider.' })
  }

  for (const detail of vente.details) {
    const stock =
      stocksAgence.find((s) => s.agenceId === vente.agenceId && s.articleId === detail.articleId && s.numeroLot === detail.numeroLot) ||
      stocksAgence.find((s) => s.agenceId === vente.agenceId && s.articleId === detail.articleId)
    if (stock) stock.quantite += detail.quantite
  }

  if (vente.estCredit && vente.clientId) {
    const client = clients.find((c) => c.id === vente.clientId)
    if (client) {
      client.soldeDette = Math.max(0, client.soldeDette - vente.montantTotal)
    }
  } else {
    const caisse = comptesCaisse.find((c) => c.agenceId === vente.agenceId) || comptesCaisse[0]
    if (vente.devise === 'USD') caisse.soldeUsd = Math.max(0, caisse.soldeUsd - vente.montantTotal)
    else caisse.soldeCdf = Math.max(0, caisse.soldeCdf - (vente.montantCdf || vente.montantTotal))
  }

  ecrituresComptables.forEach((e) => {
    if (e.referenceOperation === vente.referenceVente) {
      e.annulee = true
    }
  })

  // Explicit OHADA extourne entry
  const refAnnul = `EXT-${vente.referenceVente}`
  ecrituresComptables.push(
    {
      id: ecrituresComptables.length + 1,
      referenceOperation: refAnnul,
      agenceId: vente.agenceId,
      compteNumero: '701',
      sens: 'DEBIT',
      montant: vente.montantTotal,
      devise: vente.devise,
      libelle: `Extourne vente annulée ${vente.referenceVente}`,
      sourceModule: 'VENTES',
      sourceType: 'ANNULATION_VENTE',
      sourceId: String(vente.id),
      annulee: false,
      statutValidation: 'VALIDE',
      dateEcriture: new Date().toISOString(),
    },
    {
      id: ecrituresComptables.length + 2,
      referenceOperation: refAnnul,
      agenceId: vente.agenceId,
      compteNumero: vente.devise === 'USD' ? '571' : '572',
      sens: 'CREDIT',
      montant: vente.montantTotal,
      devise: vente.devise,
      libelle: `Remboursement caisse vente annulée ${vente.referenceVente}`,
      sourceModule: 'VENTES',
      sourceType: 'ANNULATION_VENTE',
      sourceId: String(vente.id),
      annulee: false,
      statutValidation: 'VALIDE',
      dateEcriture: new Date().toISOString(),
    }
  )

  vente.statutAnnulation = 'ANNULEE'
  logAudit(currentUser.nom, 'VALIDATION_ANNULATION_VENTE', `Annulation validée pour la vente ${vente.referenceVente}`, vente.agenceId)
  res.json({ message: 'Vente annulée avec succès, stocks restaurés', vente })
})

// ----------------- TRESORERIE -----------------
router.get('/tresorerie/caisses', (req: Request, res: Response) => {
  const agenceId = req.query.agenceId ? toInt(req.query.agenceId) : undefined
  const list = comptesCaisse
    .filter((c) => !agenceId || c.agenceId === agenceId)
    .map((c) => ({
      ...c,
      agence: agences.find((a) => a.id === c.agenceId),
    }))
  res.json(list)
})

router.get('/tresorerie', (req: Request, res: Response) => {
  const agenceId = req.query.agenceId ? toInt(req.query.agenceId) : undefined
  const list = transactions
    .filter((t) => !agenceId || t.agenceId === agenceId)
    .map((t) => ({
      ...t,
      agence: agences.find((a) => a.id === t.agenceId),
      caisse: comptesCaisse.find((c) => c.id === t.caisseId),
      createur: users.find((u) => u.id === t.createurId),
      validateur: users.find((u) => u.id === t.validateurId),
    }))
  res.json(list)
})

router.post('/tresorerie/demande', (req: Request, res: Response) => {
  const currentUser = getUserFromToken(req)
  if (!currentUser) return res.status(401).json({ message: 'Non autorisé' })

  const { agenceId, caisseId, montant, devise, type, libelle } = req.body
  const agId = Number(agenceId) || 1

  const activeRate = tauxChanges.find((t) => t.agenceId === agId && t.statut === 'VALIDE' && t.actif)?.taux || 2850

  const nouvelleTransaction: any = {
    id: `TX-${Date.now().toString().slice(-8)}`,
    referenceInterne: `MOV-${Date.now().toString().slice(-6)}`,
    agenceId: agId,
    caisseId: caisseId ? Number(caisseId) : 1,
    montant: Number(montant),
    devise: devise || 'USD',
    tauxApplique: activeRate,
    type: type || 'SORTIE',
    libelle,
    statut: 'EN_ATTENTE',
    createurId: currentUser.id,
    dateCreation: new Date().toISOString(),
  }

  transactions.unshift(nouvelleTransaction)
  logAudit(currentUser.nom, 'DEMANDE_TRESORERIE', `${type} demandée de ${montant} ${devise} : ${libelle}`, agId)

  res.json({
    ...nouvelleTransaction,
    agence: agences.find((a) => a.id === agId),
    caisse: comptesCaisse.find((c) => c.id === nouvelleTransaction.caisseId),
    createur: currentUser,
  })
})

router.post('/tresorerie/valider/:id', (req: Request, res: Response) => {
  const currentUser = getUserFromToken(req)
  if (!currentUser) return res.status(401).json({ message: 'Non autorisé' })

  const tx = transactions.find((t) => t.id === req.params.id)
  if (!tx) return res.status(404).json({ message: 'Transaction non trouvée' })

  if (tx.createurId === currentUser.id) {
    return res.status(400).json({ message: 'Règle des deux personnes: L initiateur de la transaction ne peut pas la valider.' })
  }

  const creator = users.find((u) => u.id === tx.createurId)
  if (creator?.role === 'CHEF_AGENCE' && currentUser.role !== 'SUPER_ADMIN' && currentUser.role !== 'ADMIN_SIEGE') {
    return res.status(403).json({ message: 'Cette transaction a été initiée par le Chef d agence: seule la Direction Siège peut la valider.' })
  }

  const caisse = comptesCaisse.find((c) => c.id === tx.caisseId)
  if (caisse) {
    if (tx.type === 'ENTREE') {
      if (tx.devise === 'USD') caisse.soldeUsd += tx.montant
      else caisse.soldeCdf += tx.montant
    } else {
      if (tx.devise === 'USD') {
        if (caisse.soldeUsd < tx.montant) return res.status(400).json({ message: 'Solde USD insuffisant dans la caisse.' })
        caisse.soldeUsd -= tx.montant
      } else {
        if (caisse.soldeCdf < tx.montant) return res.status(400).json({ message: 'Solde CDF insuffisant dans la caisse.' })
        caisse.soldeCdf -= tx.montant
      }
    }
  }

  tx.statut = 'VALIDE'
  tx.validateurId = currentUser.id
  tx.dateValidation = new Date().toISOString()

  const compteContrepartie = tx.type === 'SORTIE' ? '605' : '706'
  const compteCaisse = tx.devise === 'USD' ? '571' : '572'
  ecrituresComptables.push(
    {
      id: ecrituresComptables.length + 1,
      referenceOperation: tx.referenceInterne,
      agenceId: tx.agenceId,
      compteNumero: tx.type === 'SORTIE' ? compteContrepartie : compteCaisse,
      sens: 'DEBIT',
      montant: tx.montant,
      devise: tx.devise,
      tauxApplique: tx.tauxApplique,
      libelle: tx.libelle,
      sourceModule: 'TRESORERIE',
      sourceType: 'MOUVEMENT_CAISSE',
      sourceId: tx.id,
      annulee: false,
      statutValidation: 'VALIDE',
      dateEcriture: new Date().toISOString(),
    },
    {
      id: ecrituresComptables.length + 2,
      referenceOperation: tx.referenceInterne,
      agenceId: tx.agenceId,
      compteNumero: tx.type === 'SORTIE' ? compteCaisse : compteContrepartie,
      sens: 'CREDIT',
      montant: tx.montant,
      devise: tx.devise,
      tauxApplique: tx.tauxApplique,
      libelle: tx.libelle,
      sourceModule: 'TRESORERIE',
      sourceType: 'MOUVEMENT_CAISSE',
      sourceId: tx.id,
      annulee: false,
      statutValidation: 'VALIDE',
      dateEcriture: new Date().toISOString(),
    }
  )

  logAudit(currentUser.nom, 'VALIDATION_TRESORERIE', `Validation de ${tx.type} ${tx.montant} ${tx.devise}`, tx.agenceId)
  res.json(tx)
})

router.post('/tresorerie/rejeter/:id', (req: Request, res: Response) => {
  const currentUser = getUserFromToken(req)
  if (!currentUser) return res.status(401).json({ message: 'Non autorisé' })

  const tx = transactions.find((t) => t.id === req.params.id)
  if (!tx) return res.status(404).json({ message: 'Transaction non trouvée' })

  if (tx.createurId === currentUser.id) {
    return res.status(400).json({ message: 'Règle des deux personnes: L initiateur ne peut pas rejeter sa propre transaction.' })
  }

  tx.statut = 'REJETE'
  tx.validateurId = currentUser.id

  logAudit(currentUser.nom, 'REJET_TRESORERIE', `Rejet transaction ${tx.id}`, tx.agenceId)
  res.json(tx)
})

// ----------------- COMPTABILITE OHADA -----------------
router.get('/comptabilite/services', (_req: Request, res: Response) => {
  res.json([
    { id: 1, nom: 'Commercial & Ventes' },
    { id: 2, nom: 'Production & Meunerie' },
    { id: 3, nom: 'Logistique & Approvisionnement' },
    { id: 4, nom: 'Administration Générale' },
  ])
})

router.get('/comptabilite/plan', (_req: Request, res: Response) => {
  res.json(planComptable)
})

router.post('/comptabilite/plan', (req: Request, res: Response) => {
  const currentUser = getUserFromToken(req)
  const { numero, libelle, parentNumero } = req.body

  if (planComptable.some((p) => p.numero === numero)) {
    return res.status(400).json({ message: 'Ce numéro de compte existe déjà.' })
  }

  const nouveauCompte = {
    numero,
    libelle,
    estModifiable: true,
    parentNumero,
  }

  planComptable.push(nouveauCompte)
  logAudit(currentUser?.nom || 'Comptable', 'CREATION_COMPTE', `Compte ${numero} - ${libelle}`)
  res.json(nouveauCompte)
})

router.get('/comptabilite/ecritures', (req: Request, res: Response) => {
  const agenceId = req.query.agenceId ? toInt(req.query.agenceId) : undefined
  const list = ecrituresComptables
    .filter((e) => !agenceId || e.agenceId === agenceId)
    .map((e) => ({
      ...e,
      agence: agences.find((a) => a.id === e.agenceId),
      compte: planComptable.find((p) => p.numero === e.compteNumero),
    }))
  res.json(list)
})

router.post('/comptabilite/ecritures/manuelle', (req: Request, res: Response) => {
  const currentUser = getUserFromToken(req)
  if (!currentUser) return res.status(401).json({ message: 'Non autorisé' })

  const { agenceId, compteDebit, compteCredit, montant, devise, libelle } = req.body
  const numAg = agenceId ? toInt(agenceId) : 1
  const ref = `MAN-${Date.now().toString().slice(-6)}`
  const activeRate = tauxChanges.find((t) => t.agenceId === numAg && t.statut === 'VALIDE' && t.actif)?.taux || 2850

  const debitEntry: DbEcritureComptable = {
    id: ecrituresComptables.length + 1,
    referenceOperation: ref,
    agenceId: numAg,
    compteNumero: compteDebit,
    sens: 'DEBIT',
    montant: Number(montant),
    devise: devise || 'USD',
    tauxApplique: activeRate,
    libelle,
    sourceModule: 'COMPTABILITE',
    sourceType: 'SAISIE_MANUELLE',
    sourceId: ref,
    annulee: false,
    statutValidation: 'VALIDE',
    demandeurId: currentUser.id,
    dateEcriture: new Date().toISOString(),
  }

  const creditEntry: DbEcritureComptable = {
    id: ecrituresComptables.length + 2,
    referenceOperation: ref,
    agenceId: numAg,
    compteNumero: compteCredit,
    sens: 'CREDIT',
    montant: Number(montant),
    devise: devise || 'USD',
    tauxApplique: activeRate,
    libelle,
    sourceModule: 'COMPTABILITE',
    sourceType: 'SAISIE_MANUELLE',
    sourceId: ref,
    annulee: false,
    statutValidation: 'VALIDE',
    demandeurId: currentUser.id,
    dateEcriture: new Date().toISOString(),
  }

  ecrituresComptables.push(debitEntry, creditEntry)
  logAudit(currentUser.nom, 'ECRITURE_MANUELLE', `Écriture ${ref}: Débit ${compteDebit} / Crédit ${compteCredit} pour ${montant} ${devise}`, numAg)

  res.json({ message: 'Écriture manuelle enregistrée', reference: ref })
})

router.get('/comptabilite/balance', (req: Request, res: Response) => {
  const agenceId = req.query.agenceId ? toInt(req.query.agenceId) : undefined
  const activeRate = tauxChanges.find((t) => t.agenceId === (agenceId || 1) && t.actif)?.taux || 2850

  const lines = planComptable.map((p) => {
    let debitUsd = 0
    let creditUsd = 0
    let debitCdf = 0
    let creditCdf = 0

    ecrituresComptables
      .filter((e) => !e.annulee && e.compteNumero === p.numero && (!agenceId || e.agenceId === agenceId))
      .forEach((e) => {
        if (e.devise === 'USD') {
          if (e.sens === 'DEBIT') debitUsd += e.montant
          else creditUsd += e.montant
        } else {
          if (e.sens === 'DEBIT') debitCdf += e.montant
          else creditCdf += e.montant
        }
      })

    const totalConsolideUsd = Math.round((debitUsd - creditUsd + (debitCdf - creditCdf) / activeRate) * 100) / 100

    return {
      numeroCompte: p.numero,
      libelle: p.libelle,
      debitUsd,
      creditUsd,
      debitCdf,
      creditCdf,
      totalConsolideUsd,
    }
  })

  res.json(lines)
})

router.get('/comptabilite/performance-services', (_req: Request, res: Response) => {
  res.json([
    { nomService: 'Commercial & Ventes', charges: 1250.0, produits: 14200.0, resultatNet: 12950.0 },
    { nomService: 'Production & Meunerie', charges: 6800.0, produits: 0.0, resultatNet: -6800.0 },
    { nomService: 'Logistique & Transport', charges: 940.0, produits: 0.0, resultatNet: -940.0 },
    { nomService: 'Direction & Administration', charges: 2100.0, produits: 0.0, resultatNet: -2100.0 },
  ])
})

// ----------------- PRODUCTION -----------------
router.get('/production/ordres', (_req: Request, res: Response) => {
  const enriched = ordresProduction.map((op) => ({
    ...op,
    articleFini: articles.find((a) => a.id === op.articleFiniId),
    agence: agences.find((a) => a.id === op.agenceId),
  }))
  res.json(enriched)
})

router.get('/production/recettes', (_req: Request, res: Response) => {
  const enriched = recettes.map((r) => ({
    ...r,
    articleFini: articles.find((a) => a.id === r.articleFiniId),
    articleMatiere: articles.find((a) => a.id === r.articleMatiereId),
  }))
  res.json(enriched)
})

router.post('/production/ordres', (req: Request, res: Response) => {
  const currentUser = getUserFromToken(req)
  const { agenceId, articleFiniId, quantitePrevue } = req.body

  const numAg = agenceId ? toInt(agenceId) : 1
  const ordre = {
    id: ordresProduction.length + 1,
    codeOrdre: `OP-${Date.now().toString().slice(-6)}`,
    agenceId: numAg,
    articleFiniId: Number(articleFiniId),
    quantitePrevue: Number(quantitePrevue),
    statut: 'EN_COURS' as const,
    dateCreation: new Date().toISOString(),
  }

  ordresProduction.unshift(ordre)
  logAudit(currentUser?.nom || 'Production', 'CREATION_ORDRE_PRODUCTION', `Nouvel ordre ${ordre.codeOrdre}`, numAg)
  res.json(ordre)
})

router.post('/production/ordres/:id/cloturer', (req: Request, res: Response) => {
  const currentUser = getUserFromToken(req)
  const ordre = ordresProduction.find((o) => o.id === toInt(req.params.id))
  if (!ordre) return res.status(404).json({ message: 'Ordre de production non trouvé' })

  const { quantiteReelle, pertes } = req.body
  const numReelle = Number(quantiteReelle) || ordre.quantitePrevue
  const numeroLot = `LOT-${new Date().toISOString().slice(2, 7).replace('-', '')}-${Math.floor(100 + Math.random() * 900)}`

  ordre.statut = 'TERMINE'
  ordre.quantiteReelle = numReelle
  ordre.dateCloture = new Date().toISOString()
  ordre.lotCree = numeroLot

  const existStock = stocksAgence.find((s) => s.agenceId === ordre.agenceId && s.articleId === ordre.articleFiniId && s.numeroLot === numeroLot)
  if (existStock) {
    existStock.quantite += numReelle
  } else {
    stocksAgence.push({
      id: stocksAgence.length + 1,
      agenceId: ordre.agenceId,
      articleId: ordre.articleFiniId,
      quantite: numReelle,
      numeroLot,
      dateExpiration: '2027-06-30',
      seuilAlerte: 25,
    })
  }

  // Raw materials consumption according to Bill of Materials (recettes)
  const matchingRecettes = recettes.filter((r) => r.articleFiniId === ordre.articleFiniId)
  for (const r of matchingRecettes) {
    const rawNeeded = Math.round(r.quantiteRequise * numReelle * 1000) / 1000
    const rawStock = stocksAgence.find((s) => s.agenceId === ordre.agenceId && s.articleId === r.articleMatiereId)
    if (rawStock) {
      rawStock.quantite = Math.max(0, Math.round((rawStock.quantite - rawNeeded) * 1000) / 1000)
    }
  }

  // Accounting double entry OHADA: Stock entry finished goods
  const refProd = `PRD-${ordre.codeOrdre}`
  ecrituresComptables.push(
    {
      id: ecrituresComptables.length + 1,
      referenceOperation: refProd,
      agenceId: ordre.agenceId,
      compteNumero: '701',
      sens: 'CREDIT',
      montant: numReelle * 20, // Valuation standard
      devise: 'USD',
      libelle: `Entrée stock production ${ordre.codeOrdre} (Lot ${numeroLot})`,
      sourceModule: 'PRODUCTION',
      sourceType: 'ORDRE_FABRICATION',
      sourceId: String(ordre.id),
      annulee: false,
      statutValidation: 'VALIDE',
      dateEcriture: new Date().toISOString(),
    }
  )

  logAudit(currentUser?.nom || 'Chef Usine', 'CLOTURE_PRODUCTION', `Clôture ${ordre.codeOrdre}: Lot ${numeroLot} créé (+${numReelle} unités, pertes: ${pertes || 0})`, ordre.agenceId)
  res.json({ message: 'Ordre clôturé et lot généré avec succès', ordre, numeroLot })
})

// ----------------- FOURNISSEURS & ACHATS -----------------
router.get('/fournisseurs', (_req: Request, res: Response) => {
  res.json(fournisseurs)
})

router.post('/fournisseurs', (req: Request, res: Response) => {
  const currentUser = getUserFromToken(req)
  const { nom, contact, telephone, adresse } = req.body
  const nouveau = {
    id: fournisseurs.length + 1,
    nom,
    contact: contact || '',
    telephone: telephone || '',
    adresse: adresse || '',
    soldeDette: 0,
  }
  fournisseurs.unshift(nouveau)
  logAudit(currentUser?.nom || 'Chef', 'CREATION_FOURNISSEUR', `Nouveau fournisseur: ${nom}`)
  res.json(nouveau)
})

router.get('/achats', (req: Request, res: Response) => {
  const agenceId = req.query.agenceId ? toInt(req.query.agenceId) : undefined
  const list = achats
    .filter((a) => !agenceId || a.agenceId === agenceId)
    .map((a) => ({
      ...a,
      agence: agences.find((ag) => ag.id === a.agenceId),
      fournisseur: fournisseurs.find((f) => f.id === a.fournisseurId),
      lignes: a.lignes.map((l) => ({
        ...l,
        article: articles.find((art) => art.id === l.articleId),
      })),
    }))
  res.json(list)
})

router.post('/achats', (req: Request, res: Response) => {
  const currentUser = getUserFromToken(req)
  const { agenceId, fournisseurId, montantTotal, montantPaye, devise, lignes } = req.body
  const numAg = toInt(agenceId) || 1
  const numFourn = toInt(fournisseurId)
  const four = fournisseurs.find((f) => f.id === numFourn)

  const numTotal = Number(montantTotal)
  const numPaye = Number(montantPaye) || 0
  const resteDette = Math.max(0, numTotal - numPaye)

  if (four) {
    four.soldeDette = Math.round((four.soldeDette + resteDette) * 100) / 100
  }

  // Stock integration with lot and FEFO
  for (const ligne of (lignes || [])) {
    const lot = ligne.numeroLot || `LOT-ACH-${Date.now().toString().slice(-4)}`
    const exist = stocksAgence.find((s) => s.agenceId === numAg && s.articleId === Number(ligne.articleId) && s.numeroLot === lot)
    if (exist) {
      exist.quantite += Number(ligne.quantite)
    } else {
      stocksAgence.push({
        id: stocksAgence.length + 1,
        agenceId: numAg,
        articleId: Number(ligne.articleId),
        quantite: Number(ligne.quantite),
        numeroLot: lot,
        dateExpiration: ligne.dateExpiration || '2027-12-31',
        seuilAlerte: 25,
      })
    }
  }

  const nouvelAchat = {
    id: achats.length + 1,
    referenceAchat: `ACH-${numAg}-${Date.now().toString().slice(-6)}`,
    agenceId: numAg,
    fournisseurId: numFourn,
    montantTotal: numTotal,
    montantPaye: numPaye,
    devise: devise || 'USD',
    statut: 'RECU' as const,
    dateAchat: new Date().toISOString(),
    lignes: (lignes || []).map((l: any, idx: number) => ({
      id: idx + 1,
      articleId: Number(l.articleId),
      quantite: Number(l.quantite),
      prixUnitaire: Number(l.prixUnitaire),
      numeroLot: l.numeroLot || `LOT-ACH-${Date.now().toString().slice(-4)}`,
      dateExpiration: l.dateExpiration || '2027-12-31',
    })),
  }

  achats.unshift(nouvelAchat)

  // Accounting double entry: Debit 601 (Achats), Credit 401 (Fournisseurs)
  const ref = nouvelAchat.referenceAchat
  ecrituresComptables.push(
    {
      id: ecrituresComptables.length + 1,
      referenceOperation: ref,
      agenceId: numAg,
      compteNumero: '601',
      sens: 'DEBIT',
      montant: numTotal,
      devise: devise || 'USD',
      libelle: `Achat matières / marchandises ${ref} chez ${four?.nom || 'Fournisseur'}`,
      sourceModule: 'ACHATS',
      sourceType: 'FACTURE_FOURNISSEUR',
      sourceId: String(nouvelAchat.id),
      annulee: false,
      statutValidation: 'VALIDE',
      dateEcriture: new Date().toISOString(),
    },
    {
      id: ecrituresComptables.length + 2,
      referenceOperation: ref,
      agenceId: numAg,
      compteNumero: '401',
      sens: 'CREDIT',
      montant: numTotal,
      devise: devise || 'USD',
      libelle: `Dette fournisseur ${four?.nom || 'Fournisseur'} - ${ref}`,
      sourceModule: 'ACHATS',
      sourceType: 'FACTURE_FOURNISSEUR',
      sourceId: String(nouvelAchat.id),
      annulee: false,
      statutValidation: 'VALIDE',
      dateEcriture: new Date().toISOString(),
    }
  )

  logAudit(currentUser?.nom || 'Chef', 'COMMANDE_ACHAT_RECUE', `Achat ${ref} : ${numTotal} ${devise} reçu en stock`, numAg)
  res.json(nouvelAchat)
})

router.post('/achats/:id/payer', (req: Request, res: Response) => {
  const currentUser = getUserFromToken(req)
  if (!currentUser) return res.status(401).json({ message: 'Non autorisé' })

  const achat = achats.find((a) => a.id === toInt(req.params.id))
  if (!achat) return res.status(404).json({ message: 'Achat non trouvé' })

  const { montant, caisseId } = req.body
  const numMontant = Number(montant)
  const four = fournisseurs.find((f) => f.id === achat.fournisseurId)
  if (four) {
    four.soldeDette = Math.max(0, Math.round((four.soldeDette - numMontant) * 100) / 100)
  }

  achat.montantPaye += numMontant
  if (achat.montantPaye >= achat.montantTotal) {
    achat.statut = 'CLOTURE'
  }

  const caisse = comptesCaisse.find((c) => c.id === (caisseId ? Number(caisseId) : 1)) || comptesCaisse[0]
  if (achat.devise === 'USD') caisse.soldeUsd = Math.max(0, caisse.soldeUsd - numMontant)
  else caisse.soldeCdf = Math.max(0, caisse.soldeCdf - numMontant)

  const ref = `REG-${achat.referenceAchat}`
  ecrituresComptables.push(
    {
      id: ecrituresComptables.length + 1,
      referenceOperation: ref,
      agenceId: achat.agenceId,
      compteNumero: '401',
      sens: 'DEBIT',
      montant: numMontant,
      devise: achat.devise,
      libelle: `Règlement dette fournisseur ${four?.nom} (${achat.referenceAchat})`,
      sourceModule: 'ACHATS',
      sourceType: 'PAIEMENT_FOURNISSEUR',
      sourceId: String(achat.id),
      annulee: false,
      statutValidation: 'VALIDE',
      dateEcriture: new Date().toISOString(),
    },
    {
      id: ecrituresComptables.length + 2,
      referenceOperation: ref,
      agenceId: achat.agenceId,
      compteNumero: achat.devise === 'USD' ? '571' : '572',
      sens: 'CREDIT',
      montant: numMontant,
      devise: achat.devise,
      libelle: `Décaissement règlement fournisseur ${four?.nom}`,
      sourceModule: 'ACHATS',
      sourceType: 'PAIEMENT_FOURNISSEUR',
      sourceId: String(achat.id),
      annulee: false,
      statutValidation: 'VALIDE',
      dateEcriture: new Date().toISOString(),
    }
  )

  logAudit(currentUser.nom, 'REGLEMENT_FOURNISSEUR', `Paiement ${numMontant} ${achat.devise} au fournisseur ${four?.nom}`, achat.agenceId)
  res.json({ message: 'Paiement fournisseur enregistré avec succès', achat })
})

// ----------------- TRANSFERTS DE STOCK INTER-AGENCES -----------------
router.get('/stocks/transferts', (req: Request, res: Response) => {
  const agenceId = req.query.agenceId ? toInt(req.query.agenceId) : undefined
  const list = transfertsStock
    .filter((t) => !agenceId || t.agenceSourceId === agenceId || t.agenceDestId === agenceId)
    .map((t) => ({
      ...t,
      agenceSource: agences.find((a) => a.id === t.agenceSourceId),
      agenceDest: agences.find((a) => a.id === t.agenceDestId),
      lignes: t.lignes.map((l) => ({
        ...l,
        article: articles.find((art) => art.id === l.articleId),
      })),
    }))
  res.json(list)
})

router.post('/stocks/transferts', (req: Request, res: Response) => {
  const currentUser = getUserFromToken(req)
  if (!currentUser) return res.status(401).json({ message: 'Non autorisé' })

  const { agenceSourceId, agenceDestId, lignes } = req.body
  const numSrc = toInt(agenceSourceId)
  const numDest = toInt(agenceDestId)

  if (numSrc === numDest) {
    return res.status(400).json({ message: 'L agence de destination doit être différente de l agence source.' })
  }

  // Deduct from source agency
  for (const ligne of (lignes || [])) {
    const stock = stocksAgence.find((s) => s.agenceId === numSrc && s.articleId === Number(ligne.articleId) && s.numeroLot === ligne.numeroLot)
    if (stock) {
      stock.quantite = Math.max(0, stock.quantite - Number(ligne.quantite))
    }
  }

  const nouveauTransfert = {
    id: transfertsStock.length + 1,
    referenceTransfert: `TRF-${numSrc}-${numDest}-${Date.now().toString().slice(-4)}`,
    agenceSourceId: numSrc,
    agenceDestId: numDest,
    dateExpedition: new Date().toISOString(),
    statut: 'EN_TRANSIT' as const,
    initiateurNom: currentUser.nom,
    lignes: (lignes || []).map((l: any, idx: number) => ({
      id: idx + 1,
      articleId: Number(l.articleId),
      quantite: Number(l.quantite),
      numeroLot: l.numeroLot,
    })),
  }

  transfertsStock.unshift(nouveauTransfert)
  logAudit(currentUser.nom, 'EXPEDITION_TRANSFERT_STOCK', `Expédition transfert ${nouveauTransfert.referenceTransfert} vers agence #${numDest}`, numSrc)
  res.json(nouveauTransfert)
})

router.post('/stocks/transferts/:id/recevoir', (req: Request, res: Response) => {
  const currentUser = getUserFromToken(req)
  if (!currentUser) return res.status(401).json({ message: 'Non autorisé' })

  const transfert = transfertsStock.find((t) => t.id === toInt(req.params.id))
  if (!transfert) return res.status(404).json({ message: 'Transfert non trouvé' })

  const { motifEcart, ecartConstate } = req.body

  // Credit destination stock
  for (const ligne of transfert.lignes) {
    const exist = stocksAgence.find((s) => s.agenceId === transfert.agenceDestId && s.articleId === ligne.articleId && s.numeroLot === ligne.numeroLot)
    if (exist) {
      exist.quantite += ligne.quantite
    } else {
      stocksAgence.push({
        id: stocksAgence.length + 1,
        agenceId: transfert.agenceDestId,
        articleId: ligne.articleId,
        quantite: ligne.quantite,
        numeroLot: ligne.numeroLot,
        dateExpiration: '2027-06-30',
        seuilAlerte: 25,
      })
    }
  }

  transfert.statut = ecartConstate ? 'LITIGE' : 'RECU'
  transfert.recepteurNom = currentUser.nom
  transfert.dateReception = new Date().toISOString()
  transfert.motifEcart = motifEcart

  logAudit(currentUser.nom, 'RECEPTION_TRANSFERT_STOCK', `Réception ${transfert.referenceTransfert} par agence #${transfert.agenceDestId} (${transfert.statut})`, transfert.agenceDestId)
  res.json(transfert)
})

// ----------------- RESSOURCES HUMAINES & PAIE -----------------
router.get('/rh/agents', (req: Request, res: Response) => {
  const agenceId = req.query.agenceId ? toInt(req.query.agenceId) : undefined
  const list = agents
    .filter((a) => !agenceId || a.agenceId === agenceId)
    .map((a) => ({
      ...a,
      agence: agences.find((ag) => ag.id === a.agenceId),
    }))
  res.json(list)
})

router.post('/rh/agents', (req: Request, res: Response) => {
  const currentUser = getUserFromToken(req)
  const { nom, telephone, poste, agenceId, salaireBase, tauxCommission } = req.body
  const numAg = toInt(agenceId) || 1
  const nouvelAgent = {
    id: agents.length + 1,
    matricule: `AGT-${numAg}-${Date.now().toString().slice(-4)}`,
    nom,
    telephone: telephone || '',
    poste: poste || 'Collaborateur',
    agenceId: numAg,
    salaireBase: Number(salaireBase) || 300,
    tauxCommission: Number(tauxCommission) || 0,
    actif: true,
  }
  agents.push(nouvelAgent)
  logAudit(currentUser?.nom || 'RH', 'CREATION_AGENT', `Création agent ${nom} (${nouvelAgent.matricule})`, numAg)
  res.json(nouvelAgent)
})

router.get('/rh/avances', (req: Request, res: Response) => {
  const agenceId = req.query.agenceId ? toInt(req.query.agenceId) : undefined
  const list = avancesSalaire
    .filter((av) => !agenceId || av.agenceId === agenceId)
    .map((av) => ({
      ...av,
      agent: agents.find((a) => a.id === av.agentId),
    }))
  res.json(list)
})

router.post('/rh/avances', (req: Request, res: Response) => {
  const currentUser = getUserFromToken(req)
  const { agentId, agenceId, montant, devise, motif } = req.body
  const numAg = toInt(agenceId) || 1

  const nouvelleAvance = {
    id: avancesSalaire.length + 1,
    agentId: toInt(agentId),
    agenceId: numAg,
    montant: Number(montant),
    devise: devise || 'USD',
    motif: motif || 'Avance ponctuelle',
    statut: 'EN_ATTENTE' as const,
    demandeurNom: currentUser?.nom || 'Agent',
    dateDemande: new Date().toISOString(),
  }

  avancesSalaire.unshift(nouvelleAvance)
  logAudit(currentUser?.nom || 'Agent', 'DEMANDE_AVANCE_SALAIRE', `Avance de ${montant} ${devise} demandée pour agent #${agentId}`, numAg)
  res.json(nouvelleAvance)
})

router.post('/rh/avances/:id/valider', (req: Request, res: Response) => {
  const currentUser = getUserFromToken(req)
  if (!currentUser) return res.status(401).json({ message: 'Non autorisé' })

  const avance = avancesSalaire.find((av) => av.id === toInt(req.params.id))
  if (!avance) return res.status(404).json({ message: 'Demande non trouvée' })

  if (avance.demandeurNom === currentUser.nom) {
    return res.status(400).json({ message: 'Règle des deux personnes: L initiateur de la demande ne peut pas valider sa propre avance.' })
  }

  avance.statut = 'VALIDE'
  avance.validateurNom = currentUser.nom

  logAudit(currentUser.nom, 'VALIDATION_AVANCE_SALAIRE', `Avance #${avance.id} validée pour agent #${avance.agentId}`, avance.agenceId)
  res.json(avance)
})

router.post('/rh/avances/:id/decaisser', (req: Request, res: Response) => {
  const currentUser = getUserFromToken(req)
  if (!currentUser) return res.status(401).json({ message: 'Non autorisé' })

  const avance = avancesSalaire.find((av) => av.id === toInt(req.params.id))
  if (!avance) return res.status(404).json({ message: 'Demande non trouvée' })

  const caisse = comptesCaisse.find((c) => c.agenceId === avance.agenceId) || comptesCaisse[0]
  if (avance.devise === 'USD') caisse.soldeUsd = Math.max(0, caisse.soldeUsd - avance.montant)
  else caisse.soldeCdf = Math.max(0, caisse.soldeCdf - avance.montant)

  avance.statut = 'DECAISSE'
  avance.dateDecaissement = new Date().toISOString()

  // Accounting OHADA: Debit 421 (Personnel - Avances et acomptes), Credit 571 (Caisse)
  const ref = `AVS-${avance.id}`
  ecrituresComptables.push(
    {
      id: ecrituresComptables.length + 1,
      referenceOperation: ref,
      agenceId: avance.agenceId,
      compteNumero: '421',
      sens: 'DEBIT',
      montant: avance.montant,
      devise: avance.devise,
      libelle: `Avance sur salaire versée (${avance.motif})`,
      sourceModule: 'RH',
      sourceType: 'AVANCE_SALAIRE',
      sourceId: String(avance.id),
      annulee: false,
      statutValidation: 'VALIDE',
      dateEcriture: new Date().toISOString(),
    },
    {
      id: ecrituresComptables.length + 2,
      referenceOperation: ref,
      agenceId: avance.agenceId,
      compteNumero: avance.devise === 'USD' ? '571' : '572',
      sens: 'CREDIT',
      montant: avance.montant,
      devise: avance.devise,
      libelle: `Décaissement caisse avance sur salaire ${ref}`,
      sourceModule: 'RH',
      sourceType: 'AVANCE_SALAIRE',
      sourceId: String(avance.id),
      annulee: false,
      statutValidation: 'VALIDE',
      dateEcriture: new Date().toISOString(),
    }
  )

  logAudit(currentUser.nom, 'DECAISSEMENT_AVANCE_SALAIRE', `Avance de ${avance.montant} ${avance.devise} décaissée en caisse`, avance.agenceId)
  res.json(avance)
})

router.get('/rh/bulletins', (req: Request, res: Response) => {
  const agenceId = req.query.agenceId ? toInt(req.query.agenceId) : undefined
  const list = bulletinsPaie
    .filter((b) => !agenceId || b.agenceId === agenceId)
    .map((b) => ({
      ...b,
      agent: agents.find((a) => a.id === b.agentId),
      agence: agences.find((ag) => ag.id === b.agenceId),
    }))
  res.json(list)
})

router.post('/rh/bulletins/generer', (req: Request, res: Response) => {
  const currentUser = getUserFromToken(req)
  const { agentId, mois, annee } = req.body
  const agent = agents.find((a) => a.id === toInt(agentId))
  if (!agent) return res.status(404).json({ message: 'Agent non trouvé' })

  // Calculate commissions on sales for this agent if commercial
  let totalVentesAgent = 0
  ventes.forEach((v) => {
    if (v.vendeurId === agent.id && v.statutAnnulation !== 'ANNULEE' && v.statutCredit !== 'REJETE') {
      totalVentesAgent += v.montantTotal
    }
  })

  const commissionsVentes = Math.round(((totalVentesAgent * (agent.tauxCommission || 0)) / 100) * 100) / 100

  // Calculate disbursed advances for this agent
  let avancesDeduites = 0
  avancesSalaire.forEach((av) => {
    if (av.agentId === agent.id && av.statut === 'DECAISSE') {
      avancesDeduites += av.montant
    }
  })

  const netAPayer = Math.max(0, Math.round((agent.salaireBase + commissionsVentes - avancesDeduites) * 100) / 100)

  const nouveauBulletin = {
    id: bulletinsPaie.length + 1,
    referenceBulletin: `PAY-${agent.agenceId}-${annee}${String(mois).padStart(2, '0')}-${agent.id}`,
    agentId: agent.id,
    agenceId: agent.agenceId,
    mois: Number(mois),
    annee: Number(annee),
    salaireBase: agent.salaireBase,
    commissionsVentes,
    avancesDeduites,
    netAPayer,
    devise: 'USD' as const,
    statut: 'BROUILLON' as const,
    preparateurNom: currentUser?.nom || 'Responsable RH',
    dateGeneration: new Date().toISOString(),
  }

  bulletinsPaie.unshift(nouveauBulletin)
  logAudit(currentUser?.nom || 'RH', 'GENERATION_BULLETIN_PAIE', `Bulletin ${nouveauBulletin.referenceBulletin} généré pour ${agent.nom}`, agent.agenceId)
  res.json(nouveauBulletin)
})

router.post('/rh/bulletins/:id/valider', (req: Request, res: Response) => {
  const currentUser = getUserFromToken(req)
  if (!currentUser) return res.status(401).json({ message: 'Non autorisé' })

  // 2-person rule: must be validated by COMPTABLE_SENIOR or SUPER_ADMIN
  if (currentUser.role !== 'COMPTABLE_SENIOR' && currentUser.role !== 'SUPER_ADMIN') {
    return res.status(403).json({ message: 'Règle de contrôle : Le bulletin de paie doit obligatoirement être validé par un Comptable Senior distinct.' })
  }

  const bulletin = bulletinsPaie.find((b) => b.id === toInt(req.params.id))
  if (!bulletin) return res.status(404).json({ message: 'Bulletin non trouvé' })

  bulletin.statut = 'VALIDE'
  bulletin.comptableSeniorNom = currentUser.nom

  logAudit(currentUser.nom, 'VALIDATION_BULLETIN_PAIE', `Bulletin ${bulletin.referenceBulletin} validé par Comptable Senior`, bulletin.agenceId)
  res.json(bulletin)
})

router.post('/rh/bulletins/:id/payer', (req: Request, res: Response) => {
  const currentUser = getUserFromToken(req)
  if (!currentUser) return res.status(401).json({ message: 'Non autorisé' })

  const bulletin = bulletinsPaie.find((b) => b.id === toInt(req.params.id))
  if (!bulletin) return res.status(404).json({ message: 'Bulletin non trouvé' })

  if (bulletin.statut !== 'VALIDE') {
    return res.status(400).json({ message: 'Le bulletin doit d abord être validé par le Comptable Senior avant paiement.' })
  }

  const caisse = comptesCaisse.find((c) => c.agenceId === bulletin.agenceId) || comptesCaisse[0]
  if (bulletin.devise === 'USD') {
    if (caisse.soldeUsd < bulletin.netAPayer) return res.status(400).json({ message: 'Solde insuffisant en caisse USD pour payer ce salaire.' })
    caisse.soldeUsd -= bulletin.netAPayer
  } else {
    if (caisse.soldeCdf < bulletin.netAPayer) return res.status(400).json({ message: 'Solde insuffisant en caisse CDF pour payer ce salaire.' })
    caisse.soldeCdf -= bulletin.netAPayer
  }

  bulletin.statut = 'PAYE'
  bulletin.datePaiement = new Date().toISOString()

  // Accounting OHADA: Debit 661 (Rémunérations du personnel), Credit 571 (Caisse)
  const ref = `SAL-${bulletin.referenceBulletin}`
  ecrituresComptables.push(
    {
      id: ecrituresComptables.length + 1,
      referenceOperation: ref,
      agenceId: bulletin.agenceId,
      compteNumero: '661',
      sens: 'DEBIT',
      montant: bulletin.netAPayer,
      devise: bulletin.devise,
      libelle: `Paiement salaire net ${bulletin.referenceBulletin}`,
      sourceModule: 'RH',
      sourceType: 'PAIEMENT_SALAIRE',
      sourceId: String(bulletin.id),
      annulee: false,
      statutValidation: 'VALIDE',
      dateEcriture: new Date().toISOString(),
    },
    {
      id: ecrituresComptables.length + 2,
      referenceOperation: ref,
      agenceId: bulletin.agenceId,
      compteNumero: bulletin.devise === 'USD' ? '571' : '572',
      sens: 'CREDIT',
      montant: bulletin.netAPayer,
      devise: bulletin.devise,
      libelle: `Décaissement salaires caisse ${ref}`,
      sourceModule: 'RH',
      sourceType: 'PAIEMENT_SALAIRE',
      sourceId: String(bulletin.id),
      annulee: false,
      statutValidation: 'VALIDE',
      dateEcriture: new Date().toISOString(),
    }
  )

  logAudit(currentUser.nom, 'PAIEMENT_BULLETIN_PAIE', `Paiement salaire net de ${bulletin.netAPayer} ${bulletin.devise} (${bulletin.referenceBulletin})`, bulletin.agenceId)
  res.json({ message: 'Bulletin payé avec succès et caisse décaissée', bulletin })
})

// ----------------- ADMIN & ROLES -----------------
router.get('/admin/users', (_req: Request, res: Response) => {
  const enriched = users.map((u) => ({
    ...u,
    agence: agences.find((a) => a.id === u.agenceId),
  }))
  res.json(enriched)
})

router.post('/admin/users', (req: Request, res: Response) => {
  const currentUser = getUserFromToken(req)
  const { nom, email, role, agenceId, permissions } = req.body

  if (!email || !nom || !role) {
    return res.status(400).json({ message: 'Nom, email et rôle sont obligatoires' })
  }

  const existing = users.find((u) => u.email.toLowerCase() === email.toLowerCase())
  if (existing) {
    return res.status(400).json({ message: 'Un utilisateur avec cet email existe déjà' })
  }

  const defaultPerms = permissions && Array.isArray(permissions) ? permissions : ['dashboard.voir', 'ventes.voir', 'stocks.voir']

  const nouvelUtilisateur = {
    id: users.length + 1,
    email,
    nom,
    role,
    agenceId: agenceId ? Number(agenceId) : 1,
    permissions: defaultPerms,
    actif: true,
  }

  users.push(nouvelUtilisateur)
  logAudit(currentUser?.nom || 'Admin', 'CREATION_UTILISATEUR', `Création du compte ${email} (${role}) affecté à agence #${nouvelUtilisateur.agenceId}`)
  res.json(nouvelUtilisateur)
})

router.get('/categories', (_req: Request, res: Response) => {
  res.json(categories)
})

router.post('/categories', (req: Request, res: Response) => {
  const currentUser = getUserFromToken(req)
  const { nom, description } = req.body

  if (!nom) {
    return res.status(400).json({ message: 'Le nom de la catégorie est obligatoire' })
  }

  const nouvelleCat = {
    id: categories.length + 1,
    nom,
    description: description || '',
  }

  categories.push(nouvelleCat)
  logAudit(currentUser?.nom || 'Admin', 'CREATION_CATEGORIE', `Création catégorie: ${nom}`)
  res.json(nouvelleCat)
})

router.get('/admin/roles', (_req: Request, res: Response) => {
  res.json([
    { id: 1, code: 'SUPER_ADMIN', nom: 'Super Administrateur', systeme: true, actif: true },
    { id: 2, code: 'ADMIN_SIEGE', nom: 'Administrateur Siège', systeme: true, actif: true },
    { id: 3, code: 'CHEF_AGENCE', nom: 'Chef d Agence', systeme: true, actif: true },
    { id: 4, code: 'COMPTABLE_SENIOR', nom: 'Comptable Senior', systeme: true, actif: true },
    { id: 5, code: 'COMPTABLE', nom: 'Comptable', systeme: true, actif: true },
    { id: 6, code: 'VENDEUR', nom: 'Vendeur / Commercial', systeme: true, actif: true },
    { id: 7, code: 'CAISSIER', nom: 'Caissier', systeme: true, actif: true },
    { id: 8, code: 'MAGASINIER', nom: 'Magasinier / Gestionnaire Stock', systeme: true, actif: true },
    { id: 9, code: 'RESPONSABLE_ACHATS', nom: 'Responsable Achats', systeme: true, actif: true },
    { id: 10, code: 'RESPONSABLE_RH', nom: 'Responsable RH & Paie', systeme: true, actif: true },
    { id: 11, code: 'PRODUCTION', nom: 'Responsable Production', systeme: true, actif: true },
    { id: 12, code: 'AUDITEUR', nom: 'Auditeur & Contrôle de Gestion', systeme: true, actif: true },
  ])
})

router.get('/admin/roles/permissions', (_req: Request, res: Response) => {
  const permCodes = [
    'dashboard.voir', 'agences.gerer', 'utilisateurs.gerer', 'roles.gerer', 'appareils.gerer',
    'audit.voir', 'articles.gerer', 'stocks.voir', 'stocks.corriger', 'stocks.valider_correction',
    'ventes.creer', 'ventes.voir', 'ventes.annuler', 'credits.valider', 'clients.gerer',
    'clients.credit_gerer', 'tresorerie.demande', 'tresorerie.valider', 'tresorerie.voir',
    'production.gerer', 'production.qr_generer', 'comptabilite.plan_gerer', 'comptabilite.ecritures_voir',
    'reporting.voir', 'reporting.exporter', 'sync.voir', 'documents.gerer',
  ]
  res.json(permCodes.map((code, idx) => ({ id: idx + 1, code, module: code.split('.')[0], libelle: code })))
})

router.get('/audit', (_req: Request, res: Response) => {
  res.json(auditLogs)
})

// ----------------- OFFLINE SYNC -----------------
router.get('/sync/operations', (_req: Request, res: Response) => {
  res.json(operationsSync)
})

router.post('/sync/operations', (req: Request, res: Response) => {
  const op = req.body
  const clientOpId = op.clientOperationId || `SYNC-${Date.now()}`
  const typeOp = op.typeOperation || 'VENTE'

  let payload: any = {}
  try {
    if (typeof op.payloadJson === 'string') {
      payload = JSON.parse(op.payloadJson)
    } else if (op.payload) {
      payload = typeof op.payload === 'string' ? JSON.parse(op.payload) : op.payload
    }
  } catch (_e) {
    payload = {}
  }

  let stockNegatifSignale = false
  let detailMessage = 'Opération synchronisée avec succès.'

  if (typeOp === 'VENTE' || typeOp === 'VENTE_OFFLINE') {
    const agenceId = toInt(payload.agenceId || 1)
    const vendeurId = toInt(payload.vendeurId || 4)
    const clientId = toInt(payload.clientId || 1)
    const devise = (payload.devise || 'USD') as 'USD' | 'CDF'
    const items = payload.items || payload.cart || payload.details || []

    const refVente = `VNT-OFF-${agenceId}-${Date.now().toString().slice(-6)}`
    const detailsLignes: any[] = []
    let totalVente = 0

    for (let i = 0; i < items.length; i++) {
      const it = items[i]
      const artId = Number(it.articleId || it.id)
      const qte = Number(it.quantite || 1)
      const pu = Number(it.prix || it.prixUnitaireApplique || 0)
      totalVente += qte * pu

      // Check stock in agency
      const stock = stocksAgence.find((s) => s.agenceId === agenceId && s.articleId === artId)
      if (stock) {
        if (stock.quantite < qte) {
          stockNegatifSignale = true
          logAudit(
            'Vendeur Hors-Ligne',
            'ALERTE_STOCK_NEGATIF',
            `Vente hors ligne synchronisée avec stock négatif sur article #${artId} (demandé: ${qte}, disponible: ${stock.quantite}). Régularisation physique requise par le Chef d agence.`,
            agenceId
          )
        }
        stock.quantite -= qte
      } else {
        stockNegatifSignale = true
        stocksAgence.push({
          id: stocksAgence.length + 1,
          agenceId,
          articleId: artId,
          quantite: -qte,
          numeroLot: 'LOT-OFFLINE-REG',
          dateExpiration: '2027-12-31',
          seuilAlerte: 25,
        })
        logAudit(
          'Vendeur Hors-Ligne',
          'ALERTE_STOCK_NEGATIF',
          `Vente hors ligne d un article sans stock référencé #${artId} (quantité: ${qte}). Régularisation physique requise par le Chef d agence.`,
          agenceId
        )
      }

      detailsLignes.push({
        id: i + 1,
        articleId: artId,
        quantite: qte,
        prixUnitaireApplique: pu,
      })
    }

    // Register sale
    const nouvelleVente = {
      id: ventes.length + 1,
      referenceVente: refVente,
      agenceId,
      vendeurId,
      clientId,
      montantTotal: totalVente,
      devise,
      estCredit: false,
      statutCredit: 'AUCUN' as const,
      dateVente: payload.dateVente || new Date().toISOString(),
      details: detailsLignes,
    }
    ventes.unshift(nouvelleVente)

    // Credit cash register
    const caisse = comptesCaisse.find((c) => c.agenceId === agenceId) || comptesCaisse[0]
    if (devise === 'USD') caisse.soldeUsd += totalVente
    else caisse.soldeCdf += totalVente

    // Double-entry bookkeeping OHADA: Debit 571/572, Credit 701
    ecrituresComptables.push(
      {
        id: ecrituresComptables.length + 1,
        referenceOperation: refVente,
        agenceId,
        compteNumero: devise === 'USD' ? '571' : '572',
        sens: 'DEBIT',
        montant: totalVente,
        devise,
        libelle: `Encaissement vente hors-ligne ${refVente}`,
        sourceModule: 'VENTES',
        sourceType: 'VENTE_OFFLINE',
        sourceId: String(nouvelleVente.id),
        annulee: false,
        statutValidation: 'VALIDE',
        dateEcriture: new Date().toISOString(),
      },
      {
        id: ecrituresComptables.length + 2,
        referenceOperation: refVente,
        agenceId,
        compteNumero: '701',
        sens: 'CREDIT',
        montant: totalVente,
        devise,
        libelle: `Chiffre d affaires vente ${refVente}`,
        sourceModule: 'VENTES',
        sourceType: 'VENTE_OFFLINE',
        sourceId: String(nouvelleVente.id),
        annulee: false,
        statutValidation: 'VALIDE',
        dateEcriture: new Date().toISOString(),
      }
    )

    detailMessage = stockNegatifSignale
      ? 'Vente synchronisée avec succès. Alerte : stock négatif constaté et signalé au chef d agence pour régularisation.'
      : 'Vente synchronisée, stock déduit et encaissement comptabilisé.'
  }

  const syncRecord = {
    id: operationsSync.length + 1,
    clientOperationId: clientOpId,
    typeOperation: typeOp,
    statut: stockNegatifSignale ? ('ACCEPTEE_STOCK_NEGATIF' as const) : ('ACCEPTEE' as const),
    message: detailMessage,
    stockNegatifSignale,
    dateReception: new Date().toISOString(),
  }

  operationsSync.unshift(syncRecord)
  logAudit('Client Hors-ligne', 'SYNC_OPERATION', `Synchronisation traitée: ${typeOp} (${syncRecord.statut})`)

  res.json(syncRecord)
})

export default router
