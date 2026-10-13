import { Router, type Request, type Response } from 'express'
import jwt from 'jsonwebtoken'
import type { DbEcritureComptable, DbArticle } from './db'
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
  parametresEntreprise,
  vehicules,
  rapprochementsBancaires,
  bonsLivraison,
  commandesAchat,
  receptionsPontBascule,
  immobilisations,
  etatsBesoin,
  entretiensTechniques,
  equipementsParc,
  appareils,
} from './seed'
import {
  renderFactureHtml,
  renderBonLivraisonHtml,
  renderBalanceHtml,
  renderInventaireHtml,
  renderFeuilleRouteTransfertHtml,
  renderBonProductionHtml,
  renderBulletinPaieHtml,
  renderGrandLivreHtml,
  renderCompteResultatHtml,
  renderBonCommandeHtml,
  renderTicketPontBasculeHtml,
  renderTableauImmobilisationsHtml,
  renderEtatBesoinBonDecaissementHtml,
  renderFicheMaintenanceTechniqueHtml,
  renderRapportOfficielHtml,
  renderPlancheEtiquettesQrLotHtml,
  generateMvgQrSvg,
} from './documents'

const router = Router()
const JWT_SECRET = 'matabishi_secure_token_secret_mvg_2026'

// Récupération dynamique du taux de change actif par agence (ou par défaut)
export function getActiveExchangeRate(agenceId?: number): number {
  if (agenceId) {
    const agenceTaux = tauxChanges.find((t) => t.agenceId === agenceId && t.statut === 'VALIDE' && t.actif)
    if (agenceTaux?.taux && agenceTaux.taux > 0) return agenceTaux.taux
  }
  const defaultTaux = tauxChanges.find((t) => t.actif && t.statut === 'VALIDE')?.taux
  return defaultTaux || 2850
}

// Paramétrage dynamique des schémas d'écritures comptables automatiques
export const parametresComptables = {
  compteVenteMarchandises: '701',
  compteTvaCollectee: '443',
  compteClientOrdinaire: '411',
  compteCaisseUsd: '571',
  compteCaisseCdf: '572',
  compteBanque: '521',
  compteVirementsInternes: '585',
  compteFournisseurs: '401',
  compteAchatsMatieres: '601',
  compteChargesExploitation: '605',
  compteProduitsAccessoires: '706',
  compteStocksProduitsFinis: '31',
  compteVariationStocks: '713',
  compteLiaisonInterAgences: '181',
  comptePersonnelRemuneration: '421',
  compteChargesPersonnel: '661',
  compteChargesSocialesPatronales: '664',
}

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
    const u = users.find((user) => user.email === decoded.sub)
    if (!u) return null
    if (u.actif === false || u.estBloque) return null
    // Si l'administrateur a déconnecté de force l'utilisateur
    if (decoded.sessionId && u.sessionActiveId && decoded.sessionId !== u.sessionActiveId) {
      return null
    }
    return u
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

// ----------------- AUTHENTICATION & SINGLE-DEVICE SECURITY -----------------
router.post('/auth/login', (req: Request, res: Response) => {
  const { email, password, deviceId, deviceName, deviceType } = req.body
  const cleanEmail = String(email || '').trim().toLowerCase()
  const user = users.find((u) => u.email.toLowerCase() === cleanEmail)

  if (!user) {
    return res.status(401).json({ message: 'Identifiants invalides' })
  }

  // 1. Vérification si le compte est bloqué (5 tentatives infructueuses ou alerte multi-appareils)
  if (user.estBloque || user.actif === false) {
    const motifTexte =
      user.motifBlocage === 'TENTATIVES_EXCESSIVES'
        ? 'Compte bloqué après plus de 5 tentatives de mot de passe incorrectes.'
        : user.motifBlocage === 'CONNEXION_MULTI_APPAREILS'
        ? 'Compte verrouillé : tentative de connexion détectée sur un autre appareil non autorisé.'
        : 'Compte désactivé ou suspendu par l administrateur.'
    return res.status(403).json({
      message: `${motifTexte} Veuillez contacter le Super Administrateur pour débloquer votre compte et obtenir un mot de passe temporaire.`,
      bloque: true,
      motif: user.motifBlocage,
    })
  }

  // 2. Vérification du mot de passe
  const expectedPassword = user.password || 'admin123'
  if (password !== expectedPassword) {
    user.tentativesEchouees = (user.tentativesEchouees || 0) + 1
    if (user.tentativesEchouees >= 5) {
      user.estBloque = true
      user.motifBlocage = 'TENTATIVES_EXCESSIVES'
      logAudit(user.nom, 'BLOCAGE_SECURITE', 'Compte bloqué suite à 5 tentatives de mot de passe erronées', user.agenceId)
      return res.status(403).json({
        message: 'Sécurité : 5 tentatives infructueuses atteintes. Votre compte a été automatiquement BLOQUÉ. Veuillez contacter le Super Administrateur pour débloquer votre compte et recevoir un mot de passe temporaire.',
        bloque: true,
        motif: 'TENTATIVES_EXCESSIVES',
      })
    }
    const rest = 5 - user.tentativesEchouees
    return res.status(401).json({
      message: `Mot de passe incorrect. Attention : il vous reste ${rest} tentative(s) avant le blocage de sécurité de votre compte.`,
      tentativesRestantes: rest,
    })
  }

  // Mot de passe correct : Réinitialiser le compteur de tentatives échouées
  user.tentativesEchouees = 0

  // 3. Règle mono-appareil (seuls les comptes déclarés VIP par le Super Admin peuvent se connecter sur plusieurs appareils)
  const incomingDeviceId = String(deviceId || req.body.deviceFingerprint || 'DEV-WEB-' + cleanEmail.replace(/[^a-z0-9]/g, '')).trim()
  const incomingDeviceName = String(deviceName || (deviceType === 'MOBILE' ? 'Appareil Mobile POS' : 'Poste Navigateur Web')).trim()

  if (!user.estVip) {
    // Si l'utilisateur a déjà un appareil lié ET qu'il se connecte depuis un appareil différent
    if (user.appareilActifId && user.appareilActifId !== incomingDeviceId) {
      user.estBloque = true
      user.motifBlocage = 'CONNEXION_MULTI_APPAREILS'
      logAudit(
        user.nom,
        'ALERTE_MULTI_APPAREIL',
        `Tentative de connexion sur un second appareil (${incomingDeviceName} [${incomingDeviceId}]). Appareil enregistré: ${user.appareilActifNom || user.appareilActifId}. Compte bloqué (politique mono-appareil non-VIP).`,
        user.agenceId
      )
      return res.status(403).json({
        message: 'Alerte Sécurité : Les utilisateurs standards ne peuvent se connecter que sur un seul appareil désigné. Une tentative de connexion sur un autre appareil a été détectée et votre compte a été bloqué. Contactez le Super Admin pour déblocage ou pour déclarer votre compte VIP.',
        bloque: true,
        motif: 'CONNEXION_MULTI_APPAREILS',
      })
    }

    // Lier l'appareil si non lié
    user.appareilActifId = incomingDeviceId
    user.appareilActifNom = incomingDeviceName
  }

  // Enregistrer ou mettre à jour dans le registre des appareils
  let appareilObj = appareils.find((a) => a.deviceId === incomingDeviceId)
  if (!appareilObj) {
    appareilObj = {
      id: appareils.length + 1,
      deviceId: incomingDeviceId,
      nom: incomingDeviceName,
      type: deviceType === 'MOBILE' ? 'MOBILE' : 'PC_BUREAU',
      agenceId: user.agenceId || 1,
      userId: user.id,
      userNom: user.nom,
      statut: 'AUTORISE',
      adresseIp: req.ip || '127.0.0.1',
      userAgent: (req.headers['user-agent'] as string) || 'Web',
      derniereConnexion: new Date().toISOString(),
      dateEnregistrement: new Date().toISOString(),
    }
    appareils.push(appareilObj)
  } else {
    appareilObj.derniereConnexion = new Date().toISOString()
    appareilObj.userId = user.id
    appareilObj.userNom = user.nom
  }

  // 4. Session unique pour déconnexion par l'administrateur
  const sessionId = 'SES-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7)
  user.sessionActiveId = sessionId
  user.derniereConnexion = new Date().toISOString()

  const token = jwt.sign(
    {
      sub: user.email,
      nom: user.nom,
      role: user.role,
      agenceId: user.agenceId,
      permissions: user.permissions,
      sessionId,
      estVip: Boolean(user.estVip),
      doitChangerMotDePasse: Boolean(user.doitChangerMotDePasse),
    },
    JWT_SECRET,
    { expiresIn: '24h' }
  )

  logAudit(
    user.nom,
    'CONNEXION',
    `Connexion réussie sur ${incomingDeviceName} (${incomingDeviceId}) - ${user.estVip ? 'Compte VIP (Multi-appareils)' : 'Mono-appareil'}`,
    user.agenceId
  )

  res.json({
    token,
    mustChangePassword: Boolean(user.doitChangerMotDePasse),
    user: {
      id: user.id,
      email: user.email,
      nom: user.nom,
      role: user.role,
      agenceId: user.agenceId,
      estVip: Boolean(user.estVip),
      doitChangerMotDePasse: Boolean(user.doitChangerMotDePasse),
      appareilActifNom: user.appareilActifNom || incomingDeviceName,
    },
  })
})

router.post('/auth/change-password', (req: Request, res: Response) => {
  const currentUser = getUserFromToken(req)
  if (!currentUser) return res.status(401).json({ message: 'Non autorisé' })

  const { newPassword } = req.body
  if (!newPassword || String(newPassword).trim().length < 4) {
    return res.status(400).json({ message: 'Le mot de passe doit comporter au moins 4 caractères' })
  }

  currentUser.password = String(newPassword).trim()
  currentUser.doitChangerMotDePasse = false
  currentUser.tentativesEchouees = 0

  logAudit(currentUser.nom, 'CHANGEMENT_MOT_DE_PASSE', 'Mot de passe mis à jour avec succès par l utilisateur', currentUser.agenceId)

  const token = jwt.sign(
    {
      sub: currentUser.email,
      nom: currentUser.nom,
      role: currentUser.role,
      agenceId: currentUser.agenceId,
      permissions: currentUser.permissions,
      sessionId: currentUser.sessionActiveId,
      estVip: Boolean(currentUser.estVip),
      doitChangerMotDePasse: false,
    },
    JWT_SECRET,
    { expiresIn: '24h' }
  )

  res.json({ message: 'Mot de passe changé avec succès !', token })
})

router.get('/auth/users', (_req: Request, res: Response) => {
  res.json(users.map(({ id, email, nom, role, agenceId, actif, permissions, estBloque, doitChangerMotDePasse, estVip, appareilActifNom, tentativesEchouees, motifBlocage }) => ({
    id, email, nom, role, agenceId, actif, permissions: permissions || [],
    estBloque: Boolean(estBloque),
    doitChangerMotDePasse: Boolean(doitChangerMotDePasse),
    estVip: Boolean(estVip),
    appareilActifNom,
    tentativesEchouees: tentativesEchouees || 0,
    motifBlocage,
  })))
})

// ----------------- AGENCES -----------------
router.get('/agences', (_req: Request, res: Response) => {
  res.json(agences)
})

router.post('/agences', (req: Request, res: Response) => {
  const currentUser = getUserFromToken(req)
  if (!currentUser) return res.status(401).json({ message: 'Non autorisé' })

  const { nom, ville, adresse, estSiege } = req.body
  if (!nom || !ville) {
    return res.status(400).json({ message: 'Le nom et la ville de l agence sont obligatoires' })
  }

  const nouvelleAgence = {
    id: agences.length + 1,
    nom: String(nom).trim(),
    ville: String(ville).trim(),
    adresse: String(adresse || `Centre-ville, ${ville}`).trim(),
    estSiege: Boolean(estSiege),
  }

  agences.push(nouvelleAgence)

  // 1. Initialiser une Caisse comptoir principale pour cette nouvelle agence
  const caisseInitiale = {
    id: comptesCaisse.length + 1,
    nom: `Caisse Comptoir - ${nouvelleAgence.nom}`,
    agenceId: nouvelleAgence.id,
    soldeUsd: 0,
    soldeCdf: 0,
    deviseDefaut: 'USD' as const,
    type: 'CAISSE' as const,
  }
  comptesCaisse.push(caisseInitiale)

  // 2. Initialiser un taux de change par défaut pour l'agence
  tauxChanges.push({
    id: tauxChanges.length + 1,
    agenceId: nouvelleAgence.id,
    taux: 2850,
    statut: 'VALIDE',
    proposePar: currentUser.nom,
    validePar: 'Direction Siège',
    dateDebut: new Date().toISOString(),
    actif: true,
  })

  // 3. Initialiser les stocks de l'agence pour chaque article existant
  articles.forEach((art) => {
    stocksAgence.push({
      id: stocksAgence.length + 1,
      agenceId: nouvelleAgence.id,
      articleId: art.id,
      quantite: 0,
      numeroLot: `INIT-${nouvelleAgence.id}-${art.id}`,
      dateExpiration: '2027-12-31',
      seuilAlerte: 50,
    })
  })

  logAudit(
    currentUser.nom,
    'CREATION_AGENCE',
    `Ouverture de la succursale #${nouvelleAgence.id}: ${nouvelleAgence.nom} (${nouvelleAgence.ville}, ${nouvelleAgence.adresse})`,
    nouvelleAgence.id
  )

  res.json({ message: 'Agence créée avec succès et initialisée', agence: nouvelleAgence })
})

router.put('/agences/:id', (req: Request, res: Response) => {
  const currentUser = getUserFromToken(req)
  if (!currentUser) return res.status(401).json({ message: 'Non autorisé' })

  const agenceId = toInt(req.params.id)
  const ag = agences.find((a) => a.id === agenceId)
  if (!ag) return res.status(404).json({ message: 'Agence introuvable' })

  const { nom, ville, adresse, estSiege } = req.body
  if (nom) ag.nom = String(nom).trim()
  if (ville) ag.ville = String(ville).trim()
  if (adresse) ag.adresse = String(adresse).trim()
  if (estSiege !== undefined) ag.estSiege = Boolean(estSiege)

  logAudit(
    currentUser.nom,
    'MODIFICATION_AGENCE',
    `Mise à jour des coordonnées de l agence #${agenceId} (${ag.nom}, ${ag.ville})`,
    agenceId
  )

  res.json({ message: 'Informations de l agence mises à jour avec succès', agence: ag })
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

// ----------------- TABLEAU DE BORD DYNAMIQUE SELON LES SERVICES & GOUVERNANCE -----------------
router.get('/dashboard/service-summary', (req: Request, res: Response) => {
  const currentUser = getUserFromToken(req)
  if (!currentUser) return res.status(401).json({ message: 'Non autorisé' })

  const isSuperOrAdminSiege = currentUser.role === 'SUPER_ADMIN' || currentUser.role === 'ADMIN_SIEGE'
  const isChefAgence = currentUser.role === 'CHEF_AGENCE'

  // Détermination du service actif
  let requestedService = (req.query.service as string) || ''
  let activeService = 'DIRECTION_SIEGE'

  if (currentUser.role === 'RESPONSABLE_PRODUCTION' || (!currentUser.permissions.includes('ventes.voir') && currentUser.permissions.includes('production.gerer'))) {
    activeService = 'PRODUCTION'
  } else if (currentUser.role === 'TECHNICIEN_MAINTENANCE' || (!currentUser.permissions.includes('ventes.voir') && currentUser.permissions.includes('flotte.gerer'))) {
    activeService = 'MAINTENANCE'
  } else if (currentUser.role === 'MAGASINIER' || (!currentUser.permissions.includes('ventes.voir') && currentUser.permissions.includes('stocks.voir'))) {
    activeService = 'STOCKS'
  } else if (currentUser.role === 'CAISSIER' || (!currentUser.permissions.includes('ventes.voir') && currentUser.permissions.includes('tresorerie.voir'))) {
    activeService = 'TRESORERIE'
  } else if (currentUser.role === 'VENDEUR') {
    activeService = 'VENTES'
  } else if (currentUser.role === 'CHEF_AGENCE') {
    activeService = (requestedService && ['PRODUCTION', 'VENTES', 'STOCKS', 'TRESORERIE', 'MAINTENANCE', 'AGENCE'].includes(requestedService))
      ? requestedService
      : 'AGENCE'
  } else if (isSuperOrAdminSiege) {
    activeService = requestedService || 'DIRECTION_SIEGE'
  }

  // Agence autorisée : Seul l'Admin Siège et Super Admin peuvent interroger les autres agences ou le consolidé
  const agenceId = isSuperOrAdminSiege
    ? (req.query.agenceId && req.query.agenceId !== 'CONSOLIDE' ? toInt(req.query.agenceId) : undefined)
    : currentUser.agenceId

  const userAgence = agences.find((a) => a.id === currentUser.agenceId)
  const currentAgence = agenceId ? agences.find((a) => a.id === agenceId) : null

  // Payload selon le métier du collaborateur (Respect strict de la confidentialité)
  if (activeService === 'PRODUCTION') {
    const ordres = ordresProduction.filter((o) => !agenceId || o.agenceId === agenceId)
    const ordresActifs = ordres.filter((o) => o.statut !== 'TERMINE').length
    const ordresTermines = ordres.filter((o) => o.statut === 'TERMINE').length
    const quantiteFabriquee = ordres.filter((o) => o.statut === 'TERMINE').reduce((sum, o) => sum + (o.quantiteReelle || o.quantitePrevue || 0), 0)
    const matieresConsommeesKg = ordres.filter((o) => o.statut === 'TERMINE').reduce((sum, o) => sum + (o.quantitePrevue || 0) * 32, 0)

    // Calcul de répartition par produit fabriqué
    const prodMap: Record<string, number> = {}
    ordres.forEach((o) => {
      const art = articles.find((a) => a.id === o.articleFiniId)
      const nom = art?.designation || `Produit #${o.articleFiniId}`
      prodMap[nom] = (prodMap[nom] || 0) + (o.quantiteReelle || o.quantitePrevue || 0)
    })
    const diagrammeProduits = Object.entries(prodMap).map(([nom, quantite]) => ({
      label: nom,
      valeur: quantite,
      unite: 'unités/sacs',
    }))

    const machinesProd = equipementsParc.filter((e) => (!agenceId || e.agenceId === agenceId) && (e.type === 'MOULIN_BROYEUR' || e.type === 'SILO' || e.type === 'PONT_BASCULE'))
    const machinesDispo = machinesProd.filter((e) => e.statut === 'OPERATIONNEL').length
    const machinesPanne = machinesProd.filter((e) => e.statut !== 'OPERATIONNEL').length

    return res.json({
      activeService: 'PRODUCTION',
      serviceLibelle: 'Atelier de Production & Transformation Industrielle',
      agenceNom: currentAgence?.nom || userAgence?.nom || 'Site de Production',
      isConsolide: !agenceId,
      canSwitchService: isSuperOrAdminSiege || isChefAgence,
      kpis: [
        { label: 'Ordres de fabrication actifs', valeur: ordresActifs, icon: 'Gear', color: '#059669', detail: 'En cours d exécution' },
        { label: 'Produits finis fabriqués', valeur: `${quantiteFabriquee.toLocaleString()} unités/sacs`, icon: 'Package', color: '#059669', detail: 'Conformes et stockés' },
        { label: 'Matières premières consommées', valeur: `${Math.round(matieresConsommeesKg / 1000)} T`, icon: 'ChartBar', color: '#059669', detail: 'Transformées' },
        { label: 'Machines opérationnelles', valeur: `${machinesDispo} / ${machinesProd.length || 1}`, icon: 'CheckCircle', color: '#059669', detail: `${machinesPanne} en révision` },
      ],
      diagramme: {
        titre: 'Répartition des Fabrications par Produit Fini',
        type: 'BAR',
        series: diagrammeProduits.length > 0 ? diagrammeProduits : [{ label: 'Production générale', valeur: quantiteFabriquee || 10, unite: 'unités' }],
        vuesSecondaires: [
          {
            titre: 'Statut des Ordres de Travail (En cours, Planifié, Terminé)',
            series: [
              { label: 'En cours d exécution', valeur: ordres.filter((o) => o.statut === 'EN_COURS').length, unite: 'ordres' },
              { label: 'Planifiés en attente', valeur: ordres.filter((o) => o.statut === 'PLANIFIE').length, unite: 'ordres' },
              { label: 'Terminés & Stockés', valeur: ordresTermines, unite: 'ordres' },
              { label: 'Annulés / Rejetés', valeur: ordres.filter((o) => o.statut === 'ANNULE').length, unite: 'ordres' },
            ],
          },
        ],
      },
      recents: ordres.slice(0, 5).map((o) => {
        const art = articles.find((a) => a.id === o.articleFiniId)
        return {
          id: o.id,
          reference: o.codeOrdre,
          titre: art?.designation || 'Fabrication',
          date: (o.dateCreation || '').slice(0, 10),
          statut: o.statut,
          quantite: `${o.quantiteReelle || o.quantitePrevue} ${art?.uniteMesure || 'unités'}`,
        }
      }),
    })
  }

  if (activeService === 'STOCKS') {
    const stList = stocksAgence.filter((s) => !agenceId || s.agenceId === agenceId)
    const alertes = stList.filter((s) => s.quantite <= s.seuilAlerte)
    const qteTotale = stList.reduce((acc, s) => acc + s.quantite, 0)
    const convois = transfertsStock.filter((t) => t.statut === 'EN_TRANSIT' && (!agenceId || t.agenceSourceId === agenceId || t.agenceDestId === agenceId)).length

    const stockGroup: Record<string, number> = {}
    stList.forEach((s) => {
      const art = articles.find((a) => a.id === s.articleId)
      const cat = art?.type === 'PRODUIT_FINI' ? 'Produits Finis' : 'Matières Premières'
      stockGroup[cat] = (stockGroup[cat] || 0) + s.quantite
    })

    return res.json({
      activeService: 'STOCKS',
      serviceLibelle: 'Magasin Général & Gestion des Stocks',
      agenceNom: currentAgence?.nom || userAgence?.nom || 'Dépôt',
      isConsolide: !agenceId,
      canSwitchService: isSuperOrAdminSiege || isChefAgence,
      kpis: [
        { label: 'Articles enregistrés', valeur: stList.length, icon: 'Package', color: '#059669', detail: 'Références gérées' },
        { label: 'Volume total en stock', valeur: `${qteTotale.toLocaleString()} unités`, icon: 'ChartBar', color: '#059669', detail: 'Physique disponible' },
        { label: 'Alertes stock critique', valeur: alertes.length, icon: 'Warning', color: '#059669', detail: 'À réapprovisionner' },
        { label: 'Convois en transit', valeur: convois, icon: 'Truck', color: '#059669', detail: 'Transferts en route' },
      ],
      diagramme: {
        titre: 'Répartition des Volumes par Catégorie de Stock',
        type: 'PIE',
        series: Object.entries(stockGroup).map(([label, valeur]) => ({ label, valeur, unite: 'unités' })),
      },
      recents: alertes.slice(0, 5).map((s) => {
        const art = articles.find((a) => a.id === s.articleId)
        return {
          id: s.id,
          reference: s.numeroLot,
          titre: art?.designation || 'Article',
          date: s.dateExpiration || '2026-12-31',
          statut: s.quantite === 0 ? 'RUPTURE' : 'CRITIQUE',
          quantite: `${s.quantite} dispo (Seuil: ${s.seuilAlerte})`,
        }
      }),
    })
  }

  if (activeService === 'VENTES') {
    const vList = ventes.filter((v) => (!agenceId || v.agenceId === agenceId) && v.statutAnnulation !== 'ANNULEE')
    const totalCaUsd = vList.reduce((s, v) => s + (v.devise === 'USD' ? v.montantTotal : v.montantTotal / 2850), 0)
    const comptantUsd = vList.filter((v) => !v.estCredit).reduce((s, v) => s + (v.devise === 'USD' ? v.montantTotal : v.montantTotal / 2850), 0)
    const creditUsd = vList.filter((v) => v.estCredit).reduce((s, v) => s + (v.devise === 'USD' ? v.montantTotal : v.montantTotal / 2850), 0)
    const creditsEnAttente = vList.filter((v) => v.statutCredit === 'EN_ATTENTE').length

    return res.json({
      activeService: 'VENTES',
      serviceLibelle: 'Pôle Commercial & Facturation',
      agenceNom: currentAgence?.nom || userAgence?.nom || 'Comptoir Ventes',
      isConsolide: !agenceId,
      canSwitchService: isSuperOrAdminSiege || isChefAgence,
      kpis: [
        { label: 'Factures & Ventes émises', valeur: vList.length, icon: 'Receipt', color: '#059669', detail: 'Transactions comptoir' },
        { label: 'Chiffre d affaires réalisé', valeur: `$${Math.round(totalCaUsd).toLocaleString()}`, icon: 'CurrencyCircleDollar', color: '#059669', detail: 'Equivalent USD' },
        { label: 'Ventes au comptant (Cash)', valeur: `$${Math.round(comptantUsd).toLocaleString()}`, icon: 'Wallet', color: '#059669', detail: 'Encaissé en caisse' },
        { label: 'Crédits accordés', valeur: `$${Math.round(creditUsd).toLocaleString()}`, icon: 'WarningCircle', color: '#059669', detail: `${creditsEnAttente} en attente visa` },
      ],
      diagramme: {
        titre: 'Répartition des Ventes : Comptant vs Vente à Crédit',
        type: 'PIE',
        series: [
          { label: 'Comptant (Cash)', valeur: Math.round(comptantUsd), unite: 'USD' },
          { label: 'Vente à Crédit', valeur: Math.round(creditUsd), unite: 'USD' },
        ],
      },
      recents: vList.slice(0, 5).map((v) => {
        const cli = clients.find((c) => c.id === v.clientId)
        return {
          id: v.id,
          reference: v.referenceVente,
          titre: cli?.nom || 'Client Comptoir',
          date: (v.dateVente || '').slice(0, 10),
          statut: v.estCredit ? (v.statutCredit === 'VALIDE' ? 'CRÉDIT VALIDÉ' : 'EN ATTENTE VISA') : 'PAYÉ CASH',
          quantite: `$${v.montantTotal.toFixed(2)} ${v.devise}`,
        }
      }),
    })
  }

  if (activeService === 'TRESORERIE') {
    const csList = comptesCaisse.filter((c) => !agenceId || c.agenceId === agenceId)
    const soldeUsd = csList.reduce((s, c) => s + (c.soldeUsd || 0), 0)
    const soldeCdf = csList.reduce((s, c) => s + (c.soldeCdf || 0), 0)
    const ebPrets = etatsBesoin.filter((eb) => (!agenceId || eb.agenceId === agenceId) && (eb.statut === 'APPROUVE_CHEF' || eb.statut === 'APPROUVE_SIEGE')).length
    const decaissementsJour = transactions.filter((t) => (!agenceId || t.agenceId === agenceId) && t.type === 'SORTIE').reduce((s, t) => s + (t.devise === 'USD' ? t.montant : t.montant / 2850), 0)
    const encaissementsJour = transactions.filter((t) => (!agenceId || t.agenceId === agenceId) && t.type === 'ENTREE').reduce((s, t) => s + (t.devise === 'USD' ? t.montant : t.montant / 2850), 0)

    return res.json({
      activeService: 'TRESORERIE',
      serviceLibelle: 'Guichet Caisse & Trésorerie Bidevise',
      agenceNom: currentAgence?.nom || userAgence?.nom || 'Caisse Agence',
      isConsolide: !agenceId,
      canSwitchService: isSuperOrAdminSiege || isChefAgence,
      kpis: [
        { label: 'Solde Disponible USD', valeur: `$${Math.round(soldeUsd).toLocaleString()}`, icon: 'CurrencyCircleDollar', color: '#059669', detail: 'Espèces physiques' },
        { label: 'Solde Disponible CDF', valeur: `${Math.round(soldeCdf).toLocaleString()} FC`, icon: 'Coins', color: '#059669', detail: 'Francs Congolais' },
        { label: 'États de besoin prêts à payer', valeur: ebPrets, icon: 'CheckCircle', color: '#059669', detail: 'Visas hiérarchiques reçus' },
        { label: 'Décaissements de la période', valeur: `$${Math.round(decaissementsJour).toLocaleString()}`, icon: 'Wallet', color: '#059669', detail: 'Sorties de fonds' },
      ],
      diagramme: {
        titre: 'Mouvements de Caisse : Encaissements vs Décaissements',
        type: 'BAR',
        series: [
          { label: 'Encaissements (Entrées)', valeur: Math.round(encaissementsJour), unite: 'USD' },
          { label: 'Décaissements (Sorties)', valeur: Math.round(decaissementsJour), unite: 'USD' },
        ],
      },
      recents: transactions.slice(0, 5).map((t) => ({
        id: t.id,
        reference: t.referenceInterne || `TX-${t.id}`,
        titre: t.libelle,
        date: (t.dateCreation || '').slice(0, 10),
        statut: t.type === 'SORTIE' ? 'DÉCAISSEMENT' : 'ENCAISSEMENT',
        quantite: `${t.montant.toFixed(2)} ${t.devise}`,
      })),
    })
  }

  if (activeService === 'MAINTENANCE') {
    const eqList = equipementsParc.filter((e) => !agenceId || e.agenceId === agenceId)
    const opCount = eqList.filter((e) => e.statut === 'OPERATIONNEL').length
    const panCount = eqList.filter((e) => e.statut !== 'OPERATIONNEL').length
    const intList = entretiensTechniques.filter((m) => !agenceId || m.agenceId === agenceId)
    const intPlanifiees = intList.filter((m) => m.statut === 'PLANIFIE').length

    const groupTypes: Record<string, number> = {}
    eqList.forEach((e) => {
      groupTypes[e.type] = (groupTypes[e.type] || 0) + 1
    })

    return res.json({
      activeService: 'MAINTENANCE',
      serviceLibelle: 'Parc Matériel & Maintenance Technique',
      agenceNom: currentAgence?.nom || userAgence?.nom || 'Atelier Technique',
      isConsolide: !agenceId,
      canSwitchService: isSuperOrAdminSiege || isChefAgence,
      kpis: [
        { label: 'Équipements du parc', valeur: eqList.length, icon: 'Wrench', color: '#059669', detail: 'Machines et flotte' },
        { label: 'Matériel opérationnel', valeur: opCount, icon: 'CheckCircle', color: '#059669', detail: 'Disponibles 100%' },
        { label: 'En panne / immobilisés', valeur: panCount, icon: 'WarningCircle', color: '#059669', detail: 'Intervention requise' },
        { label: 'Interventions planifiées', valeur: intPlanifiees, icon: 'ClockCounterClockwise', color: '#059669', detail: 'Carnet d atelier' },
      ],
      diagramme: {
        titre: 'Répartition du Parc d Équipements par Type',
        type: 'PIE',
        series: Object.entries(groupTypes).map(([type, cnt]) => ({
          label: type.replace('_', ' '),
          valeur: cnt,
          unite: 'engins',
        })),
      },
      recents: intList.slice(0, 5).map((m) => ({
        id: m.id,
        reference: m.numeroIntervention,
        titre: `${m.nomEquipement} (${m.natureTravaux})`,
        date: (m.dateIntervention || '').slice(0, 10),
        statut: m.statut,
        quantite: `$${m.coutTotalUsd.toFixed(2)} USD`,
      })),
    })
  }

  if (activeService === 'AGENCE') {
    const agId = currentUser.agenceId
    const ag = agences.find((a) => a.id === agId)
    const vAg = ventes.filter((v) => v.agenceId === agId && v.statutAnnulation !== 'ANNULEE')
    const vAgUsd = vAg.filter((v) => v.devise === 'USD').reduce((s, v) => s + v.montantTotal, 0)
    const vAgCdf = vAg.filter((v) => v.devise === 'CDF').reduce((s, v) => s + v.montantTotal, 0)
    const totalAgConsolideUsd = vAgUsd + (vAgCdf / 2850)
    const csAg = comptesCaisse.filter((c) => c.agenceId === agId)
    const soldeUsd = csAg.reduce((s, c) => s + (c.soldeUsd || 0), 0)
    const opAg = ordresProduction.filter((o) => o.agenceId === agId && o.statut === 'TERMINE')
    const sacsProduits = opAg.reduce((s, o) => s + (o.quantiteReelle || 0), 0)
    const ebAttente = etatsBesoin.filter((eb) => eb.agenceId === agId && (eb.statut === 'SOUMIS' || eb.statut === 'ATTENTE_VISA_SIEGE')).length
    const creditAttente = ventes.filter((v) => v.agenceId === agId && v.statutCredit === 'EN_ATTENTE').length

    return res.json({
      activeService: 'AGENCE',
      serviceLibelle: `Pilotage opérationnel (${ag?.nom || 'Agence locale'})`,
      agenceNom: ag?.nom || 'Agence Locale',
      isConsolide: false,
      canSwitchService: true,
      badgeTitre: `Vue agence`,
      titrePrincipal: `Pilotage opérationnel - ${ag?.nom || 'Agence locale'}`,
      description: `Suivez ventes, stock, caisse, production, crédits, audit et synchronisation depuis un tableau de bord unique.`,
      validationsCount: Math.max(ebAttente + creditAttente, 1),
      validationsSousTitre: 'Crédits, sorties de caisse, stocks négatifs',
      kpis: [
        { label: 'Recettes USD', valeur: `${vAgUsd.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} $US`, icon: 'CurrencyCircleDollar' },
        { label: 'Recettes CDF', valeur: `${Math.round(vAgCdf).toLocaleString('fr-FR')} CDF`, icon: 'Calculator' },
        { label: 'Consolidé USD', valeur: `${totalAgConsolideUsd.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} $US`, icon: 'TrendUp' },
        { label: 'Transactions', valeur: String(vAg.length), icon: 'ClipboardText' },
      ],
      fluxValidations: [
        { type: 'Vente crédit', initiateur: ag?.nom || 'Chef agence', statut: 'En attente' },
        { type: 'Sortie caisse', initiateur: ag?.nom || 'Chef agence', statut: 'Contrôle solde' },
      ],
      architectureTerrain: 'Vente hors ligne jusqu\'à deux semaines avec file locale IndexedDB.',
      diagramme: {
        titre: 'Indicateurs d Activité de l Agence',
        type: 'BAR',
        series: [
          { label: 'Ventes Agence', valeur: Math.round(totalAgConsolideUsd), unite: 'USD' },
          { label: 'Caisse Locale', valeur: Math.round(soldeUsd), unite: 'USD' },
          { label: 'Sacs Fabriqués', valeur: sacsProduits, unite: 'sacs' },
        ],
      },
      recents: vAg.slice(0, 5).map((v) => ({
        id: v.id,
        reference: v.referenceVente,
        titre: `Vente #${v.id}`,
        date: (v.dateVente || '').slice(0, 10),
        statut: v.estCredit ? 'CRÉDIT' : 'PAYÉ',
        quantite: `$${v.montantTotal.toFixed(2)}`,
      })),
    })
  }

  // DIRECTION_SIEGE (Admin Siège & Super Admin)
  const vActives = ventes.filter((v) => v.statutAnnulation !== 'ANNULEE')
  const vUsd = vActives.filter((v) => v.devise === 'USD').reduce((s, v) => s + v.montantTotal, 0)
  const vCdf = vActives.filter((v) => v.devise === 'CDF').reduce((s, v) => s + v.montantTotal, 0)
  const totalConsolideUsd = vUsd + (vCdf / 2850)
  const transactionsCount = vActives.length

  const dossiersSiege = etatsBesoin.filter((eb) => eb.statut === 'ATTENTE_VISA_SIEGE').length + transfertsStock.filter((t) => t.statut === 'EN_ATTENTE_VISA_SIEGE').length

  const seriesAgences = agences.map((ag) => {
    const vAg = ventes.filter((v) => v.agenceId === ag.id && v.statutAnnulation !== 'ANNULEE')
    const ca = vAg.reduce((s, v) => s + (v.devise === 'USD' ? v.montantTotal : v.montantTotal / 2850), 0)
    return {
      label: ag.nom,
      valeur: Math.round(ca),
      unite: 'USD',
    }
  })

  const seriesProdAgences = agences.map((ag) => {
    const opAg = ordresProduction.filter((o) => o.agenceId === ag.id && o.statut === 'TERMINE')
    const total = opAg.reduce((s, o) => s + (o.quantiteReelle || 0), 0)
    return {
      label: ag.nom,
      valeur: total,
      unite: 'unités/sacs',
    }
  })

  const seriesTresorAgences = agences.map((ag) => {
    const csAg = comptesCaisse.filter((c) => c.agenceId === ag.id)
    const solde = csAg.reduce((s, c) => s + (c.soldeUsd || 0), 0)
    return {
      label: ag.nom,
      valeur: Math.round(solde),
      unite: 'USD',
    }
  })

  return res.json({
    activeService: 'DIRECTION_SIEGE',
    serviceLibelle: 'Pilotage opérationnel multi-agences',
    agenceNom: currentAgence?.nom || 'Réseau Consolidé Siège',
    isConsolide: !agenceId,
    canSwitchService: true,
    badgeTitre: 'Vue siège',
    titrePrincipal: 'Pilotage opérationnel multi-agences',
    description: 'Suivez ventes, stock, caisse, production, crédits, audit et synchronisation depuis un tableau de bord unique.',
    validationsCount: Math.max(dossiersSiege, 3),
    validationsSousTitre: 'Crédits, sorties de caisse, stocks négatifs',
    kpis: [
      { label: 'Recettes USD', valeur: `${vUsd.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} $US`, icon: 'CurrencyCircleDollar' },
      { label: 'Recettes CDF', valeur: `${Math.round(vCdf).toLocaleString('fr-FR')} CDF`, icon: 'Calculator' },
      { label: 'Consolidé USD', valeur: `${totalConsolideUsd.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} $US`, icon: 'TrendUp' },
      { label: 'Transactions', valeur: String(transactionsCount), icon: 'ClipboardText' },
    ],
    fluxValidations: [
      { type: 'Vente crédit', initiateur: 'Chef agence', statut: 'En attente' },
      { type: 'Sortie caisse', initiateur: 'Chef agence', statut: 'Contrôle solde' },
    ],
    architectureTerrain: 'Vente hors ligne jusqu\'à deux semaines avec file locale IndexedDB.',
    diagramme: {
      titre: 'Chiffre d Affaires par Agence (Comparatif Réseau)',
      type: 'BAR',
      series: seriesAgences,
      vuesSecondaires: [
        {
          titre: 'Production Industrielle par Agence (Volume)',
          series: seriesProdAgences,
        },
        {
          titre: 'Disponibilité de Trésorerie par Agence (USD)',
          series: seriesTresorAgences,
        },
      ],
    },
    recents: agences.map((ag) => {
      const vAg = ventes.filter((v) => v.agenceId === ag.id && v.statutAnnulation !== 'ANNULEE')
      const ca = vAg.reduce((s, v) => s + (v.devise === 'USD' ? v.montantTotal : v.montantTotal / 2850), 0)
      return {
        id: ag.id,
        reference: `AG-${ag.id}`,
        titre: `${ag.nom} (${ag.ville})`,
        date: ag.estSiege ? 'Siège Principal' : 'Succursale',
        statut: 'ACTIF',
        quantite: `$${Math.round(ca).toLocaleString()} USD`,
      }
    }),
  })
})

// ----------------- SUPERVISION TRANSACTIONS MULTI-AGENCES (POUR ADMIN SIÈGE & SUPER ADMIN) -----------------
router.get('/reporting/siege/transactions-multi-agences', (req: Request, res: Response) => {
  const currentUser = getUserFromToken(req)
  if (!currentUser) return res.status(401).json({ message: 'Non autorisé' })

  // RÈGLE STRICTE DE CONFIDENTIALITÉ & ISOLATION :
  // Seul l'Admin du Siège et le Super Admin ont le droit de voir toutes les agences et le consolidé.
  // Les autres utilisateurs (Chefs d'agence locale, vendeurs, etc.) sont STRICTEMENT limités à leur propre agence.
  const isSuperOrAdminSiege = currentUser.role === 'SUPER_ADMIN' || currentUser.role === 'ADMIN_SIEGE'
  const agenceId = isSuperOrAdminSiege
    ? (req.query.agenceId ? (req.query.agenceId === 'CONSOLIDE' ? undefined : toInt(req.query.agenceId)) : undefined)
    : currentUser.agenceId

  const typeFiltre = req.query.type as string | undefined
  const allFlux: any[] = []

  // 1. Ventes
  ventes.forEach((v) => {
    if (!agenceId || v.agenceId === agenceId) {
      const ag = agences.find((a) => a.id === v.agenceId)
      const cli = clients.find((c) => c.id === v.clientId)
      const ven = users.find((u) => u.id === v.vendeurId)
      allFlux.push({
        id: `VNT-${v.id}`,
        reference: v.referenceVente || `VNT-${v.id}`,
        date: v.dateVente || new Date().toISOString(),
        agenceId: v.agenceId,
        agenceNom: ag?.nom || `Agence #${v.agenceId}`,
        module: 'VENTES',
        typeFlux: v.estCredit ? 'VENTE_CREDIT' : 'VENTE_COMPTANT',
        libelle: `Vente client ${cli?.nom || 'Comptoir'} (${v.details?.length || 1} article(s))`,
        montant: v.montantTotal,
        devise: v.devise,
        operateurNom: ven?.nom || 'Vendeur',
        statut: v.statutAnnulation === 'ANNULEE' ? 'ANNULEE' : (v.statutCredit === 'EN_ATTENTE' ? 'EN_ATTENTE_VISA' : 'VALIDE'),
        documentUrl: `/api/ventes/${v.id}/facture`,
        documentNom: 'Facture / Ticket',
      })
    }
  })

  // 2. Décaissements & Encaissements de caisse
  transactions.forEach((t) => {
    if (!agenceId || t.agenceId === agenceId) {
      const ag = agences.find((a) => a.id === t.agenceId)
      const cs = comptesCaisse.find((c) => c.id === t.caisseId)
      const cr = users.find((u) => u.id === t.createurId)
      allFlux.push({
        id: `CAI-${t.id}`,
        reference: t.referenceInterne || t.id,
        date: t.dateCreation || new Date().toISOString(),
        agenceId: t.agenceId,
        agenceNom: ag?.nom || `Agence #${t.agenceId}`,
        module: 'TRESORERIE',
        typeFlux: t.type === 'SORTIE' ? 'DECAISSEMENT_CAISSE' : 'ENCAISSEMENT_CAISSE',
        libelle: `${cs?.nom || 'Caisse'}: ${t.libelle || 'Opération caisse'}`,
        montant: t.montant,
        devise: t.devise,
        operateurNom: cr?.nom || 'Caissier',
        statut: t.statut,
        documentUrl: `/api/export/excel/tresorerie?agenceId=${t.agenceId}`,
        documentNom: 'Pièce Caisse',
      })
    }
  })

  // 3. États de besoin
  etatsBesoin.forEach((eb) => {
    if (!agenceId || eb.agenceId === agenceId) {
      const ag = agences.find((a) => a.id === eb.agenceId)
      allFlux.push({
        id: `EB-${eb.id}`,
        reference: eb.numeroEB,
        date: eb.dateDemande || new Date().toISOString(),
        agenceId: eb.agenceId,
        agenceNom: ag?.nom || `Agence #${eb.agenceId}`,
        module: 'ETAT_BESOIN',
        typeFlux: 'DEMANDE_DE_FONDS',
        libelle: `${eb.serviceDemandeur}: ${eb.motif}`,
        montant: eb.montant,
        devise: eb.devise,
        operateurNom: eb.demandeurNom,
        statut: eb.statut,
        documentUrl: `/api/etats-besoin/${eb.id}/bon-decaissement`,
        documentNom: 'Bon de Décaissement',
      })
    }
  })

  // 4. Ordres de production
  ordresProduction.forEach((op) => {
    if (!agenceId || op.agenceId === agenceId) {
      const ag = agences.find((a) => a.id === op.agenceId)
      const art = articles.find((a) => a.id === op.articleFiniId)
      allFlux.push({
        id: `OP-${op.id}`,
        reference: op.codeOrdre,
        date: op.dateCreation || new Date().toISOString(),
        agenceId: op.agenceId,
        agenceNom: ag?.nom || `Agence #${op.agenceId}`,
        module: 'PRODUCTION',
        typeFlux: 'ORDRE_FABRICATION',
        libelle: `Fabrication ${art?.designation || 'Produits Finis'}: ${op.quantiteReelle || op.quantitePrevue} ${art?.uniteMesure || 'unités/sacs'}`,
        montant: (op.quantiteReelle || op.quantitePrevue) * (art?.prixVenteStandard || 20),
        devise: 'USD',
        operateurNom: 'Équipe Production',
        statut: op.statut,
        documentUrl: `/api/production/ordres/${op.id}/fiche-a4`,
        documentNom: 'Fiche Production',
      })
    }
  })

  // 5. Transferts convois inter-agences
  transfertsStock.forEach((tr) => {
    if (!agenceId || tr.agenceSourceId === agenceId || tr.agenceDestId === agenceId) {
      const agSrc = agences.find((a) => a.id === tr.agenceSourceId)
      const agDst = agences.find((a) => a.id === tr.agenceDestId)
      const totalColis = tr.lignes?.reduce((s: number, l: any) => s + (l.quantite || 0), 0) || 0
      const firstArt = tr.lignes?.[0]?.articleId ? articles.find((a) => a.id === tr.lignes[0].articleId) : null
      const libelleLigne = firstArt?.designation ? `${firstArt.designation} (${totalColis} unités)` : `${totalColis} articles/colis`
      allFlux.push({
        id: `TRF-${tr.id}`,
        reference: tr.referenceTransfert || `TRF-${tr.id}`,
        date: tr.dateExpedition || new Date().toISOString(),
        agenceId: tr.agenceSourceId,
        agenceNom: `${agSrc?.nom || tr.agenceSourceId} ➔ ${agDst?.nom || tr.agenceDestId}`,
        module: 'LOGISTIQUE',
        typeFlux: 'TRANSFERT_INTER_AGENCES',
        libelle: `Convoi Marchandises : ${libelleLigne} vers ${agDst?.nom}`,
        montant: tr.lignes?.reduce((s: number, l: any) => s + (l.quantite || 0) * 20, 0) || 0,
        devise: 'USD',
        operateurNom: tr.chauffeurNom || 'Chauffeur',
        statut: tr.statut,
        documentUrl: `/api/stocks/transferts/${tr.id}/feuille-route`,
        documentNom: 'Feuille de Route',
      })
    }
  })

  // 6. Maintenance
  entretiensTechniques.forEach((m) => {
    if (!agenceId || m.agenceId === agenceId) {
      const ag = agences.find((a) => a.id === m.agenceId)
      allFlux.push({
        id: `MNT-${m.id}`,
        reference: m.numeroIntervention,
        date: m.dateIntervention || new Date().toISOString(),
        agenceId: m.agenceId,
        agenceNom: ag?.nom || `Agence #${m.agenceId}`,
        module: 'MAINTENANCE',
        typeFlux: m.typeMaintenance === 'PREVENTIF' ? 'ENTRETIEN_PREVENTIF' : 'DEPANNAGE_CURATIF',
        libelle: `${m.nomEquipement}: ${m.natureTravaux}`,
        montant: m.coutTotalUsd,
        devise: 'USD',
        operateurNom: m.technicienOuGarage,
        statut: m.statut,
        documentUrl: `/api/maintenance/entretiens/${m.id}/fiche`,
        documentNom: 'Fiche Technique',
      })
    }
  })

  // 7. Pesées Pont-Bascule & Réceptions grains
  receptionsPontBascule.forEach((pb) => {
    if (!agenceId || pb.agenceId === agenceId) {
      const ag = agences.find((a) => a.id === pb.agenceId)
      allFlux.push({
        id: `PB-${pb.id}`,
        reference: pb.numeroBR || `BR-${pb.id}`,
        date: pb.datePeseeBrute || new Date().toISOString(),
        agenceId: pb.agenceId,
        agenceNom: ag?.nom || `Agence #${pb.agenceId}`,
        module: 'ACHATS',
        typeFlux: 'PESEE_PONT_BASCULE',
        libelle: `Pesée Pont-Bascule: ${pb.poidsNetKg} kg ${pb.produit} (${pb.fournisseurNom || 'Fournisseur'})`,
        montant: pb.montantTotalFactureUsd || pb.poidsNetKg * 0.35,
        devise: 'USD',
        operateurNom: pb.magasinierNom || 'Pont-Bascule',
        statut: pb.statut || 'VALIDE',
        documentUrl: `/api/achats/receptions/${pb.id}/document`,
        documentNom: 'Ticket Pesée',
      })
    }
  })

  // 8. Commandes Fournisseurs
  commandesAchat.forEach((cmd) => {
    if (!agenceId || cmd.agenceId === agenceId) {
      const ag = agences.find((a) => a.id === cmd.agenceId)
      allFlux.push({
        id: `CMD-${cmd.id}`,
        reference: cmd.numeroBC,
        date: cmd.dateCommande || new Date().toISOString(),
        agenceId: cmd.agenceId,
        agenceNom: ag?.nom || `Agence #${cmd.agenceId}`,
        module: 'ACHATS',
        typeFlux: 'COMMANDE_FOURNISSEUR',
        libelle: `Bon de Commande ${cmd.fournisseurNom} (${cmd.produit || 'Matière'})`,
        montant: cmd.montantTotalUsd,
        devise: 'USD',
        operateurNom: 'Responsable Achats',
        statut: cmd.statut,
        documentUrl: `/api/achats/commandes/${cmd.id}/document`,
        documentNom: 'Bon de Commande',
      })
    }
  })

  // Tri antéchronologique
  let filteredFlux = allFlux.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  if (typeFiltre && typeFiltre !== 'TOUS') {
    filteredFlux = filteredFlux.filter((f) => f.module === typeFiltre)
  }

  // Synthèse par agence
  const resumeAgences = agences.map((ag) => {
    const vAg = ventes.filter((v) => v.agenceId === ag.id && v.statutAnnulation !== 'ANNULEE')
    const tVentesUsd = vAg.filter((v) => v.devise === 'USD').reduce((s, v) => s + v.montantTotal, 0)
    const tVentesCdf = vAg.filter((v) => v.devise === 'CDF').reduce((s, v) => s + (v.montantCdf || v.montantTotal), 0)
    
    const csAg = comptesCaisse.filter((c) => c.agenceId === ag.id)
    const soldeUsd = csAg.reduce((s, c) => s + (c.soldeUsd || 0), 0)
    const soldeCdf = csAg.reduce((s, c) => s + (c.soldeCdf || 0), 0)

    const opAg = ordresProduction.filter((o) => o.agenceId === ag.id && o.statut === 'TERMINE')
    const sacsProduits = opAg.reduce((s, o) => s + (o.quantiteReelle || 0), 0)

    const ebEnAttente = etatsBesoin.filter((eb) => eb.agenceId === ag.id && eb.statut === 'SOUMIS').length
    const creditsEnAttente = ventes.filter((v) => v.agenceId === ag.id && v.statutCredit === 'EN_ATTENTE').length

    return {
      agenceId: ag.id,
      agenceNom: ag.nom,
      ville: ag.ville,
      estSiege: ag.estSiege,
      totalVentesUsd: Math.round(tVentesUsd * 100) / 100,
      totalVentesCdf: Math.round(tVentesCdf),
      nbVentes: vAg.length,
      soldeCaisseUsd: Math.round(soldeUsd * 100) / 100,
      soldeCaisseCdf: Math.round(soldeCdf),
      sacsProduits,
      validationsEnAttente: ebEnAttente + creditsEnAttente,
    }
  })

  const resumeAgencesFiltre = isSuperOrAdminSiege
    ? resumeAgences
    : resumeAgences.filter((ag) => ag.agenceId === currentUser.agenceId)

  res.json({
    transactions: filteredFlux,
    resumeAgences: resumeAgencesFiltre,
    totalTransactionsCount: filteredFlux.length,
    isSuperOrAdminSiege,
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
  const { taux, appliquerImmediatement } = req.body
  const numTaux = Number(taux)
  if (!numTaux || numTaux <= 0) {
    return res.status(400).json({ message: 'Taux invalide' })
  }

  const isSuperOrAdmin = currentUser.role === 'SUPER_ADMIN' || currentUser.role === 'ADMIN_SIEGE'
  const isChefAgence = currentUser.role === 'CHEF_AGENCE' && (!currentUser.agenceId || currentUser.agenceId === agenceId)

  // Le chef d'agence ou l'admin peut activer immédiatement ou soumettre à validation
  const shouldActivate = isSuperOrAdmin || (isChefAgence && appliquerImmediatement)

  if (shouldActivate) {
    tauxChanges.forEach((t) => {
      if (t.agenceId === agenceId) t.actif = false
    })
  }

  const nouveauTaux = {
    id: tauxChanges.length + 1,
    agenceId,
    taux: numTaux,
    statut: (shouldActivate ? 'VALIDE' : 'PROPOSE') as 'VALIDE' | 'PROPOSE',
    proposePar: currentUser.nom,
    validePar: shouldActivate ? currentUser.nom : undefined,
    dateDebut: new Date().toISOString(),
    actif: shouldActivate,
  }

  tauxChanges.unshift(nouveauTaux)
  logAudit(
    currentUser.nom,
    shouldActivate ? 'ACTIVATION_TAUX' : 'PROPOSITION_TAUX',
    `Taux ${shouldActivate ? 'appliqué' : 'proposé'}: ${numTaux} CDF pour 1 USD (Agence #${agenceId})`,
    agenceId
  )
  res.json(nouveauTaux)
})

router.post('/parametrage/taux/:id/valider', (req: Request, res: Response) => {
  const currentUser = getUserFromToken(req)
  if (!currentUser) return res.status(401).json({ message: 'Non autorisé' })

  const tauxObj = tauxChanges.find((t) => t.id === toInt(req.params.id))
  if (!tauxObj) return res.status(404).json({ message: 'Taux non trouvé' })

  const isSuperOrAdmin = currentUser.role === 'SUPER_ADMIN' || currentUser.role === 'ADMIN_SIEGE'
  const isChefAgence = currentUser.role === 'CHEF_AGENCE' && currentUser.agenceId === tauxObj.agenceId

  if (!isSuperOrAdmin && !isChefAgence) {
    return res.status(403).json({ message: 'Seul le Siège ou le Chef d\'Agence concerné peut valider un taux de change.' })
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

// ----------------- CATALOGUE ARTICLES & PRODUITS -----------------
router.get('/articles', (_req: Request, res: Response) => {
  res.json(articles)
})

router.post('/articles', (req: Request, res: Response) => {
  const currentUser = getUserFromToken(req)
  if (!currentUser) return res.status(401).json({ message: 'Non autorisé' })

  const { codeUnique, designation, type, uniteMesure, prixVenteStandard, alerteExpiration } = req.body
  if (!designation || !uniteMesure) {
    return res.status(400).json({ message: 'Désignation et unité de mesure requises' })
  }

  const code = codeUnique
    ? String(codeUnique).trim().toUpperCase()
    : `ART-${Date.now().toString().slice(-4)}`

  const nouvelArticle: DbArticle = {
    id: articles.length + 1,
    codeUnique: code,
    designation: String(designation).trim(),
    type: type === 'MATIERE_PREMIERE' ? 'MATIERE_PREMIERE' : 'PRODUIT_FINI',
    uniteMesure: String(uniteMesure).trim(),
    prixVenteStandard: Number(prixVenteStandard) || 0,
    alerteExpiration: Boolean(alerteExpiration),
  }

  articles.push(nouvelArticle)

  // Initialiser le prix de vente standard pour les agences
  if (nouvelArticle.type === 'PRODUIT_FINI' && nouvelArticle.prixVenteStandard > 0) {
    prixArticlesAgence.push({
      id: prixArticlesAgence.length + 1,
      agenceId: 1,
      articleId: nouvelArticle.id,
      prix: nouvelArticle.prixVenteStandard,
      devise: 'USD',
      statut: 'VALIDE',
      actif: true,
    })
  }

  // Initialiser les fiches de stock à zéro pour toutes les agences
  for (const ag of agences) {
    stocksAgence.push({
      id: stocksAgence.length + 1,
      agenceId: ag.id,
      articleId: nouvelArticle.id,
      quantite: 0,
      numeroLot: `LOT-${nouvelArticle.codeUnique}-INIT`,
      dateExpiration: '2028-12-31',
      seuilAlerte: 25,
    })
  }

  logAudit(currentUser.nom, 'CREATION_ARTICLE', `Nouvel article créé: ${nouvelArticle.designation} (${nouvelArticle.codeUnique}, Type: ${nouvelArticle.type})`, 1)
  res.json(nouvelArticle)
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
        compteNumero: devise === 'USD' ? parametresComptables.compteCaisseUsd : parametresComptables.compteCaisseCdf,
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
        compteNumero: parametresComptables.compteVenteMarchandises,
        sens: 'CREDIT',
        montant: Number(montantTotal),
        devise: devise || 'USD',
        tauxApplique: activeRate,
        libelle: `Produit des ventes marchandises ${ref}`,
        sourceModule: 'VENTES',
        sourceType: 'VENTE_COMPTANT',
        sourceId: String(nouvelleVente.id),
        annulee: false,
        statutValidation: 'VALIDE',
        dateEcriture: new Date().toISOString(),
      }
    )
  } else {
    // Vente à crédit : Débit Compte Client, Crédit Compte Vente
    const ref = nouvelleVente.referenceVente
    ecrituresComptables.push(
      {
        id: ecrituresComptables.length + 1,
        referenceOperation: ref,
        agenceId: agId,
        compteNumero: parametresComptables.compteClientOrdinaire,
        sens: 'DEBIT',
        montant: Number(montantTotal),
        devise: devise || 'USD',
        tauxApplique: activeRate,
        libelle: `Créance client vente à crédit ${ref} (${clientObj?.nom || 'Client'})`,
        sourceModule: 'VENTES',
        sourceType: 'VENTE_CREDIT',
        sourceId: String(nouvelleVente.id),
        annulee: false,
        statutValidation: 'VALIDE',
        dateEcriture: new Date().toISOString(),
      },
      {
        id: ecrituresComptables.length + 2,
        referenceOperation: ref,
        agenceId: agId,
        compteNumero: parametresComptables.compteVenteMarchandises,
        sens: 'CREDIT',
        montant: Number(montantTotal),
        devise: devise || 'USD',
        tauxApplique: activeRate,
        libelle: `Produit des ventes à terme ${ref}`,
        sourceModule: 'VENTES',
        sourceType: 'VENTE_CREDIT',
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

// ----------------- DOCUMENTS & IMPRESSIONS NORMALISEES -----------------
router.get(['/ventes/:id/facture', '/ventes/:id/recu-pdf'], async (req: Request, res: Response) => {
  const venteId = toInt(req.params.id)
  const vente = ventes.find((v) => v.id === venteId)
  if (!vente) return res.status(404).send('Vente introuvable')

  const agence = agences.find((a) => a.id === vente.agenceId)
  const client = clients.find((c) => c.id === vente.clientId)
  const details = vente.details.map((d: any) => ({
    ...d,
    article: articles.find((a) => a.id === d.articleId),
  }))
  const activeRate = tauxChanges.find((t) => t.agenceId === vente.agenceId && t.statut === 'VALIDE' && t.actif)?.taux || 2850
  const format = req.query.format === 'thermal' ? 'thermal' : 'a4'

  const qrPayload = {
    type: 'VENTE',
    reference: vente.referenceVente || `VNT-${vente.id}`,
    agenceId: vente.agenceId,
    nomAgence: agence?.nom || `Agence #${vente.agenceId}`,
    montantTotal: Number(vente.montantTotal || 0),
    montantCdf: Math.round(Number(vente.montantTotal || 0) * activeRate),
    devise: vente.devise || 'USD',
    taux: activeRate,
    date: vente.dateVente,
  }
  const qrSvg = await generateMvgQrSvg(qrPayload)

  const html = renderFactureHtml(vente, agence, client, details, activeRate, format, parametresEntreprise, qrSvg)
  res.setHeader('Content-Type', 'text/html; charset=utf-8')
  res.send(html)
})

router.get(['/ventes/:id/bon-livraison', '/livraisons/:id/document', '/logistique/livraisons/:id/document'], (req: Request, res: Response) => {
  const venteId = toInt(req.params.id)
  const vente = ventes.find((v) => v.id === venteId)
  if (!vente) return res.status(404).send('Vente introuvable')

  const agence = agences.find((a) => a.id === vente.agenceId)
  const client = clients.find((c) => c.id === vente.clientId)
  const details = vente.details.map((d: any) => ({
    ...d,
    article: articles.find((a) => a.id === d.articleId),
  }))

  const modeTransport = (req.query.modeTransport as string) || (vente as any).modeTransport || 'ENLEVEMENT_MAGASIN'
  const clientVehicule = (req.query.clientVehicule as string) || (vente as any).clientVehicule
  const clientChauffeur = (req.query.clientChauffeur as string) || (vente as any).clientChauffeur

  const vehiculeId = req.query.vehiculeId ? toInt(req.query.vehiculeId) : (vente as any).vehiculeId
  const vehicule = (modeTransport === 'FLOTTE_ENTREPRISE' && vehiculeId)
    ? vehicules.find((v) => v.id === vehiculeId)
    : (modeTransport === 'FLOTTE_ENTREPRISE' ? (vehicules.find((v) => v.agenceId === vente.agenceId) || vehicules[0]) : undefined)

  const transportInfo = {
    modeTransport,
    clientVehicule,
    clientChauffeur,
    vehicule,
  }

  const html = renderBonLivraisonHtml(vente, agence, client, details, transportInfo, parametresEntreprise)
  res.setHeader('Content-Type', 'text/html; charset=utf-8')
  res.send(html)
})

router.get(['/comptabilite/balance/document', '/reporting/export/balance'], (req: Request, res: Response) => {
  const agenceId = req.query.agenceId ? toInt(req.query.agenceId) : undefined
  const mois = req.query.mois ? Number(req.query.mois) : new Date().getMonth() + 1
  const annee = req.query.annee ? Number(req.query.annee) : new Date().getFullYear()

  const agence = agenceId ? agences.find((a) => a.id === agenceId) : null
  const agenceNom = agence ? agence.nom : (parametresEntreprise.nomSociete + ' - Consolidation Siège')

  const grouped: Record<string, { numeroCompte: string; libelle: string; debitUsd: number; creditUsd: number }> = {}

  ecrituresComptables
    .filter((e) => !agenceId || e.agenceId === agenceId)
    .forEach((e) => {
      if (!grouped[e.compteNumero]) {
        const cp = planComptable.find((p) => p.numero === e.compteNumero)
        grouped[e.compteNumero] = {
          numeroCompte: e.compteNumero,
          libelle: cp?.libelle || e.libelle || `Compte ${e.compteNumero}`,
          debitUsd: 0,
          creditUsd: 0,
        }
      }
      if (e.sens === 'DEBIT') {
        grouped[e.compteNumero].debitUsd += e.montant
      } else {
        grouped[e.compteNumero].creditUsd += e.montant
      }
    })

  const balanceLines = Object.values(grouped).sort((a, b) => a.numeroCompte.localeCompare(b.numeroCompte))
  const totalDebitUsd = balanceLines.reduce((acc, l) => acc + l.debitUsd, 0)
  const totalCreditUsd = balanceLines.reduce((acc, l) => acc + l.creditUsd, 0)

  const html = renderBalanceHtml(balanceLines, agenceNom, mois, annee, totalDebitUsd, totalCreditUsd, parametresEntreprise)
  res.setHeader('Content-Type', 'text/html; charset=utf-8')
  res.send(html)
})

router.get(['/stock/inventaire/document', '/stocks/export/inventaire'], (req: Request, res: Response) => {
  const agenceId = req.query.agenceId ? toInt(req.query.agenceId) : 1
  const agence = agences.find((a) => a.id === agenceId)
  const agenceNom = agence ? agence.nom : 'Dépôt Central'

  const items = stocksAgence
    .filter((s) => s.agenceId === agenceId)
    .map((s) => ({
      ...s,
      article: articles.find((a) => a.id === s.articleId),
    }))

  const html = renderInventaireHtml(items, agenceNom, parametresEntreprise)
  res.setHeader('Content-Type', 'text/html; charset=utf-8')
  res.send(html)
})

// ----------------- TABLEAU DE BORD DIRECTION GÉNÉRALE & REPORTING AGENCES -----------------
router.get('/reporting/direction-kpis', (req: Request, res: Response) => {
  const currentUser = getUserFromToken(req)
  const isSuperOrAdminSiege = currentUser?.role === 'SUPER_ADMIN' || currentUser?.role === 'ADMIN_SIEGE'
  // Seul le Super Admin et l'Admin du Siège peuvent demander le consolidé ou une autre agence
  const agenceId = isSuperOrAdminSiege
    ? (req.query.agenceId ? toInt(req.query.agenceId) : undefined)
    : (currentUser?.agenceId ?? 1)

  // 1. Chiffre d'Affaires consolidé ou agence
  const ventesAg = ventes.filter((v) => (!agenceId || v.agenceId === agenceId) && v.statutAnnulation !== 'ANNULEE')
  const caMoisUsd = ventesAg.reduce((acc, v) => acc + (v.montantTotal || 0), 0)
  const caMoisCdf = ventesAg.reduce((acc, v) => acc + (v.montantCdf || ((v.montantTotal || 0) * 2850)), 0)

  // 2. Marge Brute par sac / unité
  const sacsVendus = ventesAg.reduce((acc, v) => {
    return acc + (v.details || []).reduce((sum: number, d: any) => sum + (d.quantite || 0), 0)
  }, 0)
  const margeBruteParSacUsd = 7.30
  const tauxMargeMoyen = 34.0

  // 3. Tonnage et Rendement Usine / Atelier
  const prodAg = ordresProduction.filter((p) => (!agenceId || p.agenceId === agenceId) && p.statut === 'TERMINE')
  const farineExtraiteKg = prodAg.reduce((acc, p) => acc + (p.quantiteReelle || 0) * 25, 0)
  const maisConsommeKg = prodAg.reduce((acc, p) => acc + (p.quantitePrevue || 0) * 32, 0)
  const rendementMeunerie = maisConsommeKg > 0 ? Math.round((farineExtraiteKg / maisConsommeKg) * 1000) / 10 : 78.4

  // 4. Trésorerie Nette Consolidée
  const caissesAg = comptesCaisse.filter((c) => !agenceId || c.agenceId === agenceId)
  const totalCaisseUsd = caissesAg.filter((c) => c.type === 'CAISSE').reduce((acc, c) => acc + c.soldeUsd, 0)
  const totalBanqueUsd = caissesAg.filter((c) => c.type === 'BANQUE').reduce((acc, c) => acc + c.soldeUsd, 0)
  const totalTresorerieCdf = caissesAg.reduce((acc, c) => acc + c.soldeCdf, 0)

  // 5. Créances Clients
  const creancesTotalUsd = clients.reduce((acc, c) => acc + (c.soldeDette || 0), 0)
  const creancesEchuesUsd = Math.round(creancesTotalUsd * 0.28 * 100) / 100

  // 6. Historique des 6 derniers mois pour graphiques
  const evolutionVentes6Mois = [
    { mois: 'Mai', caUsd: 14200, margeUsd: 4800, tonnageT: 34 },
    { mois: 'Juin', caUsd: 16800, margeUsd: 5700, tonnageT: 41 },
    { mois: 'Juil', caUsd: 19500, margeUsd: 6600, tonnageT: 48 },
    { mois: 'Août', caUsd: 22100, margeUsd: 7500, tonnageT: 55 },
    { mois: 'Sept', caUsd: 24800, margeUsd: 8400, tonnageT: 62 },
    { mois: 'Oct', caUsd: Math.max(caMoisUsd, 27500), margeUsd: Math.round(Math.max(caMoisUsd, 27500) * 0.34), tonnageT: Math.round((sacsVendus * 25) / 1000) || 68 },
  ]

  res.json({
    caMoisUsd,
    caMoisCdf,
    sacsVendus,
    margeBruteParSacUsd,
    tauxMargeMoyen,
    farineExtraiteKg,
    maisConsommeKg,
    rendementMeunerie,
    totalCaisseUsd,
    totalBanqueUsd,
    totalTresorerieCdf,
    tresorerieNetteConsolideeUsd: totalCaisseUsd + totalBanqueUsd,
    creancesTotalUsd,
    creancesEchuesUsd,
    evolutionVentes6Mois,
  })
})

// ----------------- PARAMETRAGE ENTREPRISE & MENTIONS LEGALES -----------------
router.get('/parametrage/entreprise', (_req: Request, res: Response) => {
  res.json(parametresEntreprise)
})

router.get('/entreprise', (_req: Request, res: Response) => {
  res.json(parametresEntreprise)
})

router.put('/parametrage/entreprise', (req: Request, res: Response) => {
  const currentUser = getUserFromToken(req)
  if (!currentUser || (currentUser.role !== 'SUPER_ADMIN' && currentUser.role !== 'ADMIN_SIEGE')) {
    return res.status(403).json({ message: 'Seul un Administrateur peut modifier les mentions légales et informations de la société.' })
  }

  const {
    nomSociete,
    slogan,
    rccm,
    idNat,
    nif,
    siegeAdresse,
    telephone,
    emailContact,
    siteWeb,
    tauxTvaPourcent,
    mentionsPiedFacture,
    mentionsPiedLivraison,
    plafondAutonomieEtatBesoinAgenceUsd,
    plafondDepenseDirecteAgenceUsd,
    doubleValidationTransfertObligatoire,
  } = req.body

  if (nomSociete) parametresEntreprise.nomSociete = String(nomSociete).trim()
  if (req.body.sigle !== undefined) parametresEntreprise.sigle = String(req.body.sigle).trim()
  if (slogan !== undefined) parametresEntreprise.slogan = String(slogan).trim()
  if (rccm) parametresEntreprise.rccm = String(rccm).trim()
  if (idNat) parametresEntreprise.idNat = String(idNat).trim()
  if (nif) parametresEntreprise.nif = String(nif).trim()
  if (siegeAdresse) parametresEntreprise.siegeAdresse = String(siegeAdresse).trim()
  if (telephone) parametresEntreprise.telephone = String(telephone).trim()
  if (emailContact) parametresEntreprise.emailContact = String(emailContact).trim()
  if (siteWeb !== undefined) parametresEntreprise.siteWeb = String(siteWeb).trim()
  if (tauxTvaPourcent !== undefined) parametresEntreprise.tauxTvaPourcent = Number(tauxTvaPourcent)
  if (mentionsPiedFacture !== undefined) parametresEntreprise.mentionsPiedFacture = String(mentionsPiedFacture).trim()
  if (mentionsPiedLivraison !== undefined) parametresEntreprise.mentionsPiedLivraison = String(mentionsPiedLivraison).trim()
  if (req.body.logoUrl !== undefined) parametresEntreprise.logoUrl = String(req.body.logoUrl).trim()
  if (req.body.logoDroiteUrl !== undefined) parametresEntreprise.logoDroiteUrl = String(req.body.logoDroiteUrl).trim()
  if (req.body.logoFiligraneUrl !== undefined) parametresEntreprise.logoFiligraneUrl = String(req.body.logoFiligraneUrl).trim()
  if (req.body.filigraneOpacite !== undefined) parametresEntreprise.filigraneOpacite = Number(req.body.filigraneOpacite)
  if (req.body.filigraneTexte !== undefined) parametresEntreprise.filigraneTexte = String(req.body.filigraneTexte).trim()
  if (plafondAutonomieEtatBesoinAgenceUsd !== undefined) parametresEntreprise.plafondAutonomieEtatBesoinAgenceUsd = Number(plafondAutonomieEtatBesoinAgenceUsd)
  if (plafondDepenseDirecteAgenceUsd !== undefined) parametresEntreprise.plafondDepenseDirecteAgenceUsd = Number(plafondDepenseDirecteAgenceUsd)
  if (doubleValidationTransfertObligatoire !== undefined) parametresEntreprise.doubleValidationTransfertObligatoire = Boolean(doubleValidationTransfertObligatoire)

  logAudit(
    currentUser.nom,
    'MAJ_PARAMETRES_GOUVERNANCE',
    `Mise à jour des paramètres et gouvernance siège (Plafond EB agences: $${parametresEntreprise.plafondAutonomieEtatBesoinAgenceUsd || 200} USD, Double validation transfert: ${parametresEntreprise.doubleValidationTransfertObligatoire ? 'OUI' : 'NON'})`,
    1
  )

  res.json({ message: 'Paramètres et règles de gouvernance mis à jour avec succès', entreprise: parametresEntreprise })
})

// ----------------- BACKUP & EXPORTS COMPLETS -----------------
router.get('/admin/backup/export', (req: Request, res: Response) => {
  const currentUser = getUserFromToken(req)
  if (!currentUser || (currentUser.role !== 'SUPER_ADMIN' && currentUser.role !== 'ADMIN_SIEGE')) {
    return res.status(403).json({ message: 'Seul un Administrateur peut exporter la sauvegarde globale.' })
  }

  const dump = {
    metadata: {
      logiciel: parametresEntreprise.sigle ? `${parametresEntreprise.sigle} ERP` : 'Système ERP Industriel',
      societe: parametresEntreprise.nomSociete,
      dateExport: new Date().toISOString(),
      exportePar: currentUser.nom,
      version: '2.5.0-PROD',
    },
    parametresEntreprise,
    agences,
    users: users.map(({ id, email, nom, role, agenceId, actif, permissions }) => ({ id, email, nom, role, agenceId, actif, permissions })),
    articles,
    stocksAgence,
    ventes,
    achats,
    commandesAchat,
    receptionsPontBascule,
    fournisseurs,
    clients,
    comptesCaisse,
    transactions,
    planComptable,
    ecrituresComptables,
    ordresProduction,
    vehicules,
    agents,
    avancesSalaire,
    bulletinsPaie,
    tauxChanges,
    categories,
    auditLogs,
    immobilisations,
    etatsBesoin,
    entretiensTechniques,
  }

  const filename = `backup-matabishi-erp-${new Date().toISOString().slice(0, 10)}.json`
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
  res.send(JSON.stringify(dump, null, 2))
})

router.post('/admin/backup/restore', (req: Request, res: Response) => {
  const currentUser = getUserFromToken(req)
  if (!currentUser || (currentUser.role !== 'SUPER_ADMIN' && currentUser.role !== 'ADMIN_SIEGE')) {
    return res.status(403).json({ message: 'Seul un Administrateur peut restaurer la base de données.' })
  }

  const payload = req.body
  if (!payload || typeof payload !== 'object') {
    return res.status(400).json({ message: 'Données de sauvegarde invalides ou corrompues.' })
  }

  const restoredCounts: Record<string, number> = {}

  if (payload.parametresEntreprise && typeof payload.parametresEntreprise === 'object') {
    Object.assign(parametresEntreprise, payload.parametresEntreprise)
    restoredCounts.parametres = 1
  }

  if (Array.isArray(payload.agences)) {
    agences.length = 0
    agences.push(...payload.agences)
    restoredCounts.agences = agences.length
  }

  if (Array.isArray(payload.articles)) {
    articles.length = 0
    articles.push(...payload.articles)
    restoredCounts.articles = articles.length
  }

  if (Array.isArray(payload.stocksAgence)) {
    stocksAgence.length = 0
    stocksAgence.push(...payload.stocksAgence)
    restoredCounts.stocks = stocksAgence.length
  }

  if (Array.isArray(payload.ecrituresComptables)) {
    ecrituresComptables.length = 0
    ecrituresComptables.push(...payload.ecrituresComptables)
    restoredCounts.ecritures = ecrituresComptables.length
  }

  if (Array.isArray(payload.ventes)) {
    ventes.length = 0
    ventes.push(...payload.ventes)
    restoredCounts.ventes = ventes.length
  }

  if (Array.isArray(payload.achats)) {
    achats.length = 0
    achats.push(...payload.achats)
    restoredCounts.achats = achats.length
  }

  if (Array.isArray(payload.commandesAchat)) {
    commandesAchat.length = 0
    commandesAchat.push(...payload.commandesAchat)
    restoredCounts.commandesAchat = commandesAchat.length
  }

  if (Array.isArray(payload.receptionsPontBascule)) {
    receptionsPontBascule.length = 0
    receptionsPontBascule.push(...payload.receptionsPontBascule)
    restoredCounts.pontBascule = receptionsPontBascule.length
  }

  if (Array.isArray(payload.vehicules)) {
    vehicules.length = 0
    vehicules.push(...payload.vehicules)
    restoredCounts.vehicules = vehicules.length
  }

  if (Array.isArray(payload.agents)) {
    agents.length = 0
    agents.push(...payload.agents)
    restoredCounts.agents = agents.length
  }

  if (Array.isArray(payload.bulletinsPaie)) {
    bulletinsPaie.length = 0
    bulletinsPaie.push(...payload.bulletinsPaie)
    restoredCounts.bulletinsPaie = bulletinsPaie.length
  }

  if (Array.isArray(payload.immobilisations)) {
    immobilisations.length = 0
    immobilisations.push(...payload.immobilisations)
    restoredCounts.immobilisations = immobilisations.length
  }

  if (Array.isArray(payload.etatsBesoin)) {
    etatsBesoin.length = 0
    etatsBesoin.push(...payload.etatsBesoin)
    restoredCounts.etatsBesoin = etatsBesoin.length
  }

  if (Array.isArray(payload.entretiensTechniques)) {
    entretiensTechniques.length = 0
    entretiensTechniques.push(...payload.entretiensTechniques)
    restoredCounts.entretiensTechniques = entretiensTechniques.length
  }

  logAudit(
    currentUser.nom,
    'RESTAURATION_BACKUP',
    `Restauration complète de la base de données ERP effectuée avec succès (${Object.entries(restoredCounts).map(([k, v]) => `${k}: ${v}`).join(', ')})`,
    1
  )

  res.json({
    message: 'Base de données restaurée avec succès',
    restoredCounts,
  })
})

router.get('/admin/export/csv/:type', (req: Request, res: Response) => {
  const type = req.params.type
  let csv = ''
  let filename = `export-${type}-${new Date().toISOString().slice(0, 10)}.csv`

  if (type === 'ventes') {
    csv = 'Reference,Date,Client,Devise,MontantTotal,MontantCDF,Credit,Statut\n'
    ventes.forEach((v) => {
      const client = clients.find((c) => c.id === v.clientId)
      csv += `"${v.referenceVente}","${v.dateVente}","${client?.nom || 'Client'}","${v.devise}",${v.montantTotal},${v.montantCdf || 0},${v.estCredit ? 'OUI' : 'NON'},"${v.statutAnnulation || 'VALIDE'}"\n`
    })
  } else if (type === 'stocks') {
    csv = 'Agence,Article,Code,Quantite,Unite,SeuilAlerte,Lot,Expiration\n'
    stocksAgence.forEach((s) => {
      const ag = agences.find((a) => a.id === s.agenceId)
      const art = articles.find((a) => a.id === s.articleId)
      csv += `"${ag?.nom || s.agenceId}","${art?.designation || s.articleId}","${art?.codeUnique || ''}",${s.quantite},"${art?.uniteMesure || 'Sac'}",${s.seuilAlerte || 0},"${s.numeroLot || ''}","${s.dateExpiration || ''}"\n`
    })
  } else if (type === 'ecritures') {
    csv = 'Piece,Date,CompteNumero,Libelle,Sens,Montant,Devise,Agence\n'
    ecrituresComptables.forEach((e) => {
      csv += `"${e.referenceOperation}","${e.dateEcriture}","${e.compteNumero}","${e.libelle}","${e.sens}",${e.montant},"${e.devise}",${e.agenceId}\n`
    })
  } else if (type === 'audit') {
    csv = 'Horodatage,Utilisateur,Action,Details,Agence\n'
    auditLogs.forEach((a) => {
      csv += `"${a.dateHeure}","${a.utilisateur}","${a.action}","${(a.details || '').replace(/"/g, '""')}",${a.agenceId || 1}\n`
    })
  } else {
    return res.status(400).send('Type d export inconnu')
  }

  res.setHeader('Content-Type', 'text/csv; charset=utf-8')
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
  res.send('\uFEFF' + csv)
})

// ----------------- EXPORTS EXCEL OFFICIELS (.CSV UTF-8 BOM POUR TABLEUR) -----------------
router.get('/export/excel/:type', (req: Request, res: Response) => {
  const type = req.params.type
  const currentUser = getUserFromToken(req)
  const isSuperOrAdminSiege = currentUser?.role === 'SUPER_ADMIN' || currentUser?.role === 'ADMIN_SIEGE'
  const agenceId = isSuperOrAdminSiege
    ? (req.query.agenceId ? toInt(req.query.agenceId) : undefined)
    : (currentUser?.agenceId ?? (req.query.agenceId ? toInt(req.query.agenceId) : 1))
  const annee = req.query.annee ? toInt(req.query.annee) : new Date().getFullYear()
  const mois = req.query.mois ? toInt(req.query.mois) : new Date().getMonth() + 1
  let csv = ''
  let filename = `matabishi-excel-${type}-${new Date().toISOString().slice(0, 10)}.csv`

  if (type === 'balance') {
    filename = `balance-generale-${annee}-${mois}.csv`
    csv = 'N° COMPTE;INTITULÉ COMPTE SYSCOHADA;TOTAL DÉBIT USD;TOTAL CRÉDIT USD;SOLDE DÉBITEUR USD;SOLDE CRÉDITEUR USD\n'
    const grouped: Record<string, { num: string; lib: string; debit: number; credit: number }> = {}
    ecrituresComptables.forEach((e) => {
      if (!e.annulee && (!agenceId || e.agenceId === agenceId)) {
        if (!grouped[e.compteNumero]) {
          const cp = planComptable.find((p) => p.numero === e.compteNumero)
          grouped[e.compteNumero] = {
            num: e.compteNumero,
            lib: cp?.libelle || e.libelle || `Compte ${e.compteNumero}`,
            debit: 0,
            credit: 0,
          }
        }
        if (e.sens === 'DEBIT') grouped[e.compteNumero].debit += e.montant
        else grouped[e.compteNumero].credit += e.montant
      }
    })
    const list = Object.values(grouped).sort((a, b) => a.num.localeCompare(b.num))
    list.forEach((l) => {
      const solde = l.debit - l.credit
      const soldeDeb = solde > 0 ? solde.toFixed(2) : '0.00'
      const soldeCred = solde < 0 ? Math.abs(solde).toFixed(2) : '0.00'
      csv += `"${l.num}";"${l.lib.replace(/"/g, '""')}";${l.debit.toFixed(2)};${l.credit.toFixed(2)};${soldeDeb};${soldeCred}\n`
    })
  } else if (type === 'compte-resultat') {
    filename = `compte-de-resultat-${annee}.csv`
    csv = 'N° COMPTE;CLASSE SYSCOHADA;LIBELLÉ DU POSTE;CHARGES USD;PRODUITS USD;SOLDE NET USD\n'
    const grouped: Record<string, { num: string; lib: string; charges: number; produits: number }> = {}
    ecrituresComptables.forEach((e) => {
      if (!e.annulee && (!agenceId || e.agenceId === agenceId)) {
        if (e.compteNumero.startsWith('6') || e.compteNumero.startsWith('7')) {
          if (!grouped[e.compteNumero]) {
            const cp = planComptable.find((p) => p.numero === e.compteNumero)
            grouped[e.compteNumero] = {
              num: e.compteNumero,
              lib: cp?.libelle || e.libelle || `Compte ${e.compteNumero}`,
              charges: 0,
              produits: 0,
            }
          }
          if (e.compteNumero.startsWith('6')) {
            if (e.sens === 'DEBIT') grouped[e.compteNumero].charges += e.montant
            else grouped[e.compteNumero].charges -= e.montant
          } else {
            if (e.sens === 'CREDIT') grouped[e.compteNumero].produits += e.montant
            else grouped[e.compteNumero].produits -= e.montant
          }
        }
      }
    })
    Object.values(grouped).sort((a, b) => a.num.localeCompare(b.num)).forEach((l) => {
      const classe = l.num.startsWith('6') ? 'CHARGES (CLASSE 6)' : 'PRODUITS (CLASSE 7)'
      const solde = l.produits - l.charges
      csv += `"${l.num}";"${classe}";"${l.lib.replace(/"/g, '""')}";${l.charges.toFixed(2)};${l.produits.toFixed(2)};${solde.toFixed(2)}\n`
    })
  } else if (type === 'grand-livre') {
    filename = `grand-livre-ecritures-${annee}.csv`
    csv = 'PIÈCE / RÉFÉRENCE;DATE;N° COMPTE;INTITULÉ / LIBELLÉ;SENS;MONTANT;DEVISE;MODULE SOURCE;AGENCE\n'
    ecrituresComptables.forEach((e) => {
      if (!e.annulee && (!agenceId || e.agenceId === agenceId)) {
        const ag = agences.find((a) => a.id === e.agenceId)
        csv += `"${e.referenceOperation}";"${e.dateEcriture.slice(0, 10)}";"${e.compteNumero}";"${(e.libelle || '').replace(/"/g, '""')}";"${e.sens}";${e.montant.toFixed(2)};"${e.devise}";"${e.sourceModule}";"${ag?.nom || e.agenceId}"\n`
      }
    })
  } else if (type === 'immobilisations') {
    filename = `tableau-immobilisations-amortissements-${annee}.csv`
    csv = 'CODE IMMO;DÉSIGNATION DU BIEN;EMPLACEMENT;COMPTE IMMO;DATE ACQUISITION;DURÉE (ANS);VALEUR ACQUISITION USD;AMORTISSEMENTS ANTÉRIEURS USD;DOTATION EXERCICE USD;CUMUL AMORTISSEMENTS USD;VALEUR NETTE COMPTABLE (VNC) USD\n'
    immobilisations.forEach((immo) => {
      if (!agenceId || immo.agenceId === agenceId) {
        csv += `"${immo.code}";"${immo.nom.replace(/"/g, '""')}";"${immo.emplacement || 'Usine'}";"${immo.compteImmo}";"${immo.dateAcquisition}";${immo.dureeAnnees};${immo.valeurAcquisitionUsd.toFixed(2)};${(immo.amortissementCumuleUsd - immo.dotationAnnuelleUsd).toFixed(2)};${immo.dotationAnnuelleUsd.toFixed(2)};${immo.amortissementCumuleUsd.toFixed(2)};${immo.valeurNetteComptableUsd.toFixed(2)}\n`
      }
    })
  } else if (type === 'inventaire' || type === 'stocks') {
    filename = `inventaire-stocks-valorise.csv`
    csv = 'AGENCE;ARTICLE / FARINE;CODE UNIQUE;N° LOT;DATE EXPIRATION;QUANTITÉ EN STOCK;UNITÉ;PRIX UNITAIRE USD;VALEUR STOCK ESTIMÉE USD;STATUT SEUIL\n'
    stocksAgence.forEach((s) => {
      if (!agenceId || s.agenceId === agenceId) {
        const ag = agences.find((a) => a.id === s.agenceId)
        const art = articles.find((a) => a.id === s.articleId)
        const pu = art?.prixVenteStandard || 20
        const valTot = (s.quantite || 0) * pu
        const seuilStat = (s.quantite || 0) <= (s.seuilAlerte || 0) ? 'ALERTE SEUIL BAS' : 'NORMAL'
        csv += `"${ag?.nom || s.agenceId}";"${(art?.designation || '').replace(/"/g, '""')}";"${art?.codeUnique || ''}";"${s.numeroLot || ''}";"${s.dateExpiration || ''}";${s.quantite};"${art?.uniteMesure || 'Sac'}";${pu.toFixed(2)};${valTot.toFixed(2)};"${seuilStat}"\n`
      }
    })
  } else if (type === 'ventes') {
    filename = `journal-des-ventes.csv`
    csv = 'RÉFÉRENCE FACTURE;DATE VENTE;AGENCE;CLIENT;TÉLÉPHONE CLIENT;VENDEUR;MONTANT TOTAL USD;CONTRE-VALEUR CDF;CRÉDIT ACCORDÉ;STATUT CRÉDIT;STATUT VENTE\n'
    ventes.forEach((v) => {
      if (!agenceId || v.agenceId === agenceId) {
        const ag = agences.find((a) => a.id === v.agenceId)
        const client = clients.find((c) => c.id === v.clientId)
        const vendeur = users.find((u) => u.id === v.vendeurId)
        csv += `"${v.referenceVente}";"${(v.dateVente || '').slice(0, 10)}";"${ag?.nom || v.agenceId}";"${(client?.nom || 'Client Comptoir').replace(/"/g, '""')}";"${client?.telephone || ''}";"${vendeur?.nom || 'Vendeur'}";${v.montantTotal.toFixed(2)};${v.montantCdf || Math.round(v.montantTotal * 2850)};"${v.estCredit ? 'OUI' : 'NON'}";"${v.statutCredit || 'AUCUN'}";"${v.statutAnnulation || 'VALIDE'}"\n`
      }
    })
  } else if (type === 'tresorerie') {
    filename = `journal-tresorerie-caisses.csv`
    csv = 'RÉFÉRENCE INTERNE;DATE;AGENCE;COMPTE DE CAISSE;SENS / TYPE;MOTIF & LIBELLÉ;MONTANT;DEVISE;STATUT VALIDATION\n'
    transactions.forEach((t) => {
      if (!agenceId || t.agenceId === agenceId) {
        const ag = agences.find((a) => a.id === t.agenceId)
        const caisse = comptesCaisse.find((c) => c.id === t.caisseId)
        csv += `"${t.referenceInterne || t.id}";"${(t.dateCreation || '').slice(0, 10)}";"${ag?.nom || t.agenceId}";"${caisse?.nom || 'Caisse'}";"${t.type}";"${(t.libelle || '').replace(/"/g, '""')}";${t.montant.toFixed(2)};"${t.devise}";"${t.statut}"\n`
      }
    })
  } else if (type === 'etats-besoin') {
    filename = `etats-de-besoin-requisitions.csv`
    csv = 'N° ÉTAT DE BESOIN;DATE DEMANDE;AGENCE;SERVICE DEMANDEUR;DEMANDEUR;MOTIF & OBJET DU BESOIN;MONTANT;DEVISE;STATUT WORKFLOW;VALIDÉ PAR CHEF LE;DÉCAISSÉ PAR CAISSIER;PIÈCE DE CAISSE BDEC;JUSTIFICATIF DÉPOSÉ\n'
    etatsBesoin.forEach((eb) => {
      if (!agenceId || eb.agenceId === agenceId) {
        const ag = agences.find((a) => a.id === eb.agenceId)
        csv += `"${eb.numeroEB}";"${(eb.dateDemande || '').slice(0, 10)}";"${ag?.nom || eb.agenceId}";"${eb.serviceDemandeur}";"${eb.demandeurNom}";"${(eb.motif || '').replace(/"/g, '""')}";${eb.montant.toFixed(2)};"${eb.devise}";"${eb.statut}";"${eb.dateValidationChef ? eb.dateValidationChef.slice(0, 10) : '-'}";"${eb.caissierNom || '-'}";"${eb.numeroPieceCaisse || '-'}";"${eb.justificatifFourni ? 'OUI' : 'NON'}"\n`
      }
    })
  } else if (type === 'maintenance') {
    filename = `carnet-maintenance-technique.csv`
    csv = 'N° INTERVENTION;DATE;AGENCE;TYPE MATÉRIEL;NOM DU MATÉRIEL;IMMATRICULATION / SÉRIE;TYPE MAINTENANCE;NATURE DES TRAVAUX;TECHNICIEN / ATELIER;COÛT PIÈCES USD;MAIN D OEUVRE USD;COÛT TOTAL USD;STATUT;PROCHAINE MAINTENANCE;ÉTAT DE BESOIN LIÉ\n'
    entretiensTechniques.forEach((m) => {
      if (!agenceId || m.agenceId === agenceId) {
        const ag = agences.find((a) => a.id === m.agenceId)
        csv += `"${m.numeroIntervention}";"${m.dateIntervention}";"${ag?.nom || m.agenceId}";"${m.typeEquipement}";"${m.nomEquipement.replace(/"/g, '""')}";"${m.immatriculationOuSerie || '-'}";"${m.typeMaintenance}";"${m.natureTravaux.replace(/"/g, '""')}";"${m.technicienOuGarage.replace(/"/g, '""')}";${m.coutPiecesUsd.toFixed(2)};${m.coutMainOeuvreUsd.toFixed(2)};${m.coutTotalUsd.toFixed(2)};"${m.statut}";"${m.prochaineMaintenancePrevue || '-'}";"${m.etatBesoinId ? `EB #${m.etatBesoinId}` : '-'}"\n`
      }
    })
  } else if (type === 'transactions-consolidees' || type === 'supervision-siege') {
    filename = `transactions-multi-agences-${annee}-${mois}.csv`
    csv = 'RÉFÉRENCE;DATE;AGENCE;MODULE;TYPE FLUX;LIBELLÉ / DÉSIGNATION;MONTANT;DEVISE;OPÉRATEUR / RESPONSABLE;STATUT\n'
    // 1. Ventes
    ventes.forEach((v) => {
      if (!agenceId || v.agenceId === agenceId) {
        const ag = agences.find((a) => a.id === v.agenceId)
        const cli = clients.find((c) => c.id === v.clientId)
        const ven = users.find((u) => u.id === v.vendeurId)
        csv += `"${v.referenceVente || `VNT-${v.id}`}";"${(v.dateVente || '').slice(0, 10)}";"${ag?.nom || v.agenceId}";"VENTES";"${v.estCredit ? 'VENTE_CREDIT' : 'VENTE_COMPTANT'}";"Vente client ${cli?.nom || 'Comptoir'}";${v.montantTotal.toFixed(2)};"${v.devise}";"${ven?.nom || 'Vendeur'}";"${v.statutAnnulation === 'ANNULEE' ? 'ANNULEE' : 'VALIDE'}"\n`
      }
    })
    // 2. Décaissements & Encaissements de caisse
    transactions.forEach((t) => {
      if (!agenceId || t.agenceId === agenceId) {
        const ag = agences.find((a) => a.id === t.agenceId)
        const cr = users.find((u) => u.id === t.createurId)
        csv += `"${t.referenceInterne || `CAI-${t.id}`}";"${(t.dateCreation || '').slice(0, 10)}";"${ag?.nom || t.agenceId}";"TRESORERIE";"${t.type}";"${(t.libelle || 'Opération caisse').replace(/"/g, '""')}";${t.montant.toFixed(2)};"${t.devise}";"${cr?.nom || 'Caissier'}";"${t.statut}"\n`
      }
    })
    // 3. États de besoin
    etatsBesoin.forEach((eb) => {
      if (!agenceId || eb.agenceId === agenceId) {
        const ag = agences.find((a) => a.id === eb.agenceId)
        csv += `"${eb.numeroEB}";"${(eb.dateDemande || '').slice(0, 10)}";"${ag?.nom || eb.agenceId}";"ETAT_BESOIN";"DEMANDE_DE_FONDS";"${(eb.serviceDemandeur + ': ' + (eb.motif || '')).replace(/"/g, '""')}";${eb.montant.toFixed(2)};"${eb.devise}";"${eb.demandeurNom}";"${eb.statut}"\n`
      }
    })
    // 4. Production
    ordresProduction.forEach((op) => {
      if (!agenceId || op.agenceId === agenceId) {
        const ag = agences.find((a) => a.id === op.agenceId)
        const art = articles.find((a) => a.id === op.articleFiniId)
        csv += `"${op.codeOrdre}";"${(op.dateCreation || '').slice(0, 10)}";"${ag?.nom || op.agenceId}";"PRODUCTION";"ORDRE_MEUNERIE";"Mouture ${art?.designation || 'Farine'} (${op.quantiteReelle || op.quantitePrevue} sacs)";${((op.quantiteReelle || op.quantitePrevue) * 20).toFixed(2)};"USD";"Équipe Meunerie";"${op.statut}"\n`
      }
    })
    // 5. Transferts
    transfertsStock.forEach((tr) => {
      if (!agenceId || tr.agenceSourceId === agenceId || tr.agenceDestId === agenceId) {
        const agSrc = agences.find((a) => a.id === tr.agenceSourceId)
        const agDst = agences.find((a) => a.id === tr.agenceDestId)
        csv += `"${tr.referenceTransfert || `TRF-${tr.id}`}";"${(tr.dateExpedition || '').slice(0, 10)}";"${agSrc?.nom || tr.agenceSourceId} -> ${agDst?.nom || tr.agenceDestId}";"LOGISTIQUE";"TRANSFERT_INTER_AGENCES";"Transfert de farine vers ${agDst?.nom}";${(tr.lignes?.reduce((s: number, l: any) => s + (l.quantite || 0), 0) * 20).toFixed(2)};"USD";"${tr.chauffeurNom || 'Chauffeur'}";"${tr.statut}"\n`
      }
    })
    // 6. Pont-Bascule
    receptionsPontBascule.forEach((pb) => {
      if (!agenceId || pb.agenceId === agenceId) {
        const ag = agences.find((a) => a.id === pb.agenceId)
        csv += `"${pb.numeroBR || `BR-${pb.id}`}";"${(pb.datePeseeBrute || '').slice(0, 10)}";"${ag?.nom || pb.agenceId}";"ACHATS";"PESEE_PONT_BASCULE";"Pesée ${pb.poidsNetKg} kg ${pb.produit}";${(pb.montantTotalFactureUsd || pb.poidsNetKg * 0.35).toFixed(2)};"USD";"${pb.magasinierNom || 'Pont-Bascule'}";"${pb.statut || 'VALIDE'}"\n`
      }
    })
    // 7. Maintenance
    entretiensTechniques.forEach((m) => {
      if (!agenceId || m.agenceId === agenceId) {
        const ag = agences.find((a) => a.id === m.agenceId)
        csv += `"${m.numeroIntervention}";"${(m.dateIntervention || '').slice(0, 10)}";"${ag?.nom || m.agenceId}";"MAINTENANCE";"${m.typeMaintenance}";"${(m.nomEquipement + ': ' + m.natureTravaux).replace(/"/g, '""')}";${m.coutTotalUsd.toFixed(2)};"USD";"${m.technicienOuGarage}";"${m.statut}"\n`
      }
    })
  } else {
    return res.status(400).send('Type d export Excel inconnu')
  }

  res.setHeader('Content-Type', 'text/csv; charset=utf-8')
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
  res.send('\uFEFF' + csv)
})

// ----------------- PARAMÉTRAGE DES COMPTES COMPTABLES AUTOMATIQUES -----------------
router.get('/comptabilite/parametrage-schemas', (_req: Request, res: Response) => {
  res.json(parametresComptables)
})

router.put('/comptabilite/parametrage-schemas', (req: Request, res: Response) => {
  const currentUser = getUserFromToken(req)
  if (!currentUser) return res.status(401).json({ message: 'Non autorisé' })
  if (currentUser.role !== 'SUPER_ADMIN' && currentUser.role !== 'ADMIN_SIEGE' && currentUser.role !== 'COMPTABLE' && currentUser.role !== 'COMPTABLE_SENIOR') {
    return res.status(403).json({ message: 'Accès réservé au service comptabilité et direction.' })
  }
  Object.assign(parametresComptables, req.body)
  logAudit(currentUser.nom, 'PARAMETRAGE_COMPTABLE', 'Mise à jour des comptes automatiques SYSCOHADA')
  res.json({ message: 'Paramétrage des comptes mis à jour avec succès', parametres: parametresComptables })
})

// ----------------- IMPRESSIONS OFFICIELLES (PDF / A4 AVEC TITRE EN BLEU) POUR LES EXPORTS -----------------
router.get('/export/print/:type', (req: Request, res: Response) => {
  const type = req.params.type
  const currentUser = getUserFromToken(req)
  const isSuperOrAdminSiege = currentUser?.role === 'SUPER_ADMIN' || currentUser?.role === 'ADMIN_SIEGE'
  const agenceId = isSuperOrAdminSiege
    ? (req.query.agenceId ? toInt(req.query.agenceId) : undefined)
    : (currentUser?.agenceId ?? (req.query.agenceId ? toInt(req.query.agenceId) : 1))
  const agence = agenceId ? agences.find((a) => a.id === agenceId) : undefined
  const annee = req.query.annee ? toInt(req.query.annee) : new Date().getFullYear()
  const mois = req.query.mois ? toInt(req.query.mois) : new Date().getMonth() + 1

  let docTitle = 'DOCUMENT OFFICIEL MATABISHI ERP'
  let colonnes: string[] = []
  let lignes: (string | number)[][] = []
  let totaux: { label: string; valeur: string }[] | undefined = undefined

  if (type === 'balance') {
    docTitle = `BALANCE GÉNÉRALE DES COMPTES SYSCOHADA (${mois}/${annee})`
    colonnes = ['N° Compte', 'Intitulé Compte OHADA', 'Débit USD', 'Crédit USD', 'Solde Débiteur', 'Solde Créditeur']
    const grouped: Record<string, { num: string; lib: string; debit: number; credit: number }> = {}
    ecrituresComptables.forEach((e) => {
      if (!e.annulee && (!agenceId || e.agenceId === agenceId)) {
        if (!grouped[e.compteNumero]) {
          const cp = planComptable.find((p) => p.numero === e.compteNumero)
          grouped[e.compteNumero] = {
            num: e.compteNumero,
            lib: cp?.libelle || e.libelle || `Compte ${e.compteNumero}`,
            debit: 0,
            credit: 0,
          }
        }
        if (e.sens === 'DEBIT') grouped[e.compteNumero].debit += e.montant
        else grouped[e.compteNumero].credit += e.montant
      }
    })
    const list = Object.values(grouped).sort((a, b) => a.num.localeCompare(b.num))
    let tDeb = 0
    let tCred = 0
    lignes = list.map((l) => {
      const solde = l.debit - l.credit
      tDeb += l.debit
      tCred += l.credit
      return [
        `<strong>${l.num}</strong>`,
        l.lib,
        `$${l.debit.toFixed(2)}`,
        `$${l.credit.toFixed(2)}`,
        solde > 0 ? `$${solde.toFixed(2)}` : '-',
        solde < 0 ? `$${Math.abs(solde).toFixed(2)}` : '-',
      ]
    })
    totaux = [
      { label: 'Débit', valeur: `$${tDeb.toFixed(2)}` },
      { label: 'Crédit', valeur: `$${tCred.toFixed(2)}` },
    ]
  } else if (type === 'compte-resultat') {
    docTitle = `COMPTE DE RÉSULTAT OFFICIEL (EXERCICE ${annee})`
    colonnes = ['N° Compte', 'Classe SYSCOHADA', 'Poste & Libellé', 'Charges USD', 'Produits USD', 'Solde Net USD']
    const grouped: Record<string, { num: string; lib: string; charges: number; produits: number }> = {}
    ecrituresComptables.forEach((e) => {
      if (!e.annulee && (!agenceId || e.agenceId === agenceId)) {
        if (e.compteNumero.startsWith('6') || e.compteNumero.startsWith('7')) {
          if (!grouped[e.compteNumero]) {
            const cp = planComptable.find((p) => p.numero === e.compteNumero)
            grouped[e.compteNumero] = {
              num: e.compteNumero,
              lib: cp?.libelle || e.libelle || `Compte ${e.compteNumero}`,
              charges: 0,
              produits: 0,
            }
          }
          if (e.compteNumero.startsWith('6')) {
            if (e.sens === 'DEBIT') grouped[e.compteNumero].charges += e.montant
            else grouped[e.compteNumero].charges -= e.montant
          } else {
            if (e.sens === 'CREDIT') grouped[e.compteNumero].produits += e.montant
            else grouped[e.compteNumero].produits -= e.montant
          }
        }
      }
    })
    let totalCh = 0
    let totalPr = 0
    lignes = Object.values(grouped).sort((a, b) => a.num.localeCompare(b.num)).map((l) => {
      const classe = l.num.startsWith('6') ? 'CHARGES (CL. 6)' : 'PRODUITS (CL. 7)'
      const solde = l.produits - l.charges
      totalCh += l.charges
      totalPr += l.produits
      return [
        `<strong>${l.num}</strong>`,
        classe,
        l.lib,
        `$${l.charges.toFixed(2)}`,
        `$${l.produits.toFixed(2)}`,
        `<strong>$${solde.toFixed(2)}</strong>`,
      ]
    })
    totaux = [
      { label: 'Charges', valeur: `$${totalCh.toFixed(2)}` },
      { label: 'Produits', valeur: `$${totalPr.toFixed(2)}` },
    ]
  } else if (type === 'grand-livre') {
    docTitle = `GRAND LIVRE DES ÉCRITURES COMPTABLES (${annee})`
    colonnes = ['Réf. Pièce', 'Date', 'N° Compte', 'Libellé de l\'écriture', 'Sens', 'Montant', 'Devise', 'Agence']
    lignes = ecrituresComptables
      .filter((e) => !e.annulee && (!agenceId || e.agenceId === agenceId))
      .map((e) => {
        const ag = agences.find((a) => a.id === e.agenceId)
        return [
          `<strong>${e.referenceOperation}</strong>`,
          e.dateEcriture.slice(0, 10),
          `<code>${e.compteNumero}</code>`,
          e.libelle,
          `<span style="color: ${e.sens === 'DEBIT' ? '#0284c7' : '#16a34a'}; font-weight: 700;">${e.sens}</span>`,
          `<strong>${e.montant.toFixed(2)}</strong>`,
          e.devise,
          ag?.nom || String(e.agenceId),
        ]
      })
  } else if (type === 'immobilisations') {
    docTitle = `TABLEAU DES IMMOBILISATIONS ET AMORTISSEMENTS (${annee})`
    colonnes = ['Code', 'Désignation du Bien', 'Emplacement', 'Compte', 'Date Acquis.', 'Durée', 'V. Acquis. USD', 'Amort. Cumulés', 'VNC USD']
    lignes = immobilisations
      .filter((immo) => !agenceId || immo.agenceId === agenceId)
      .map((immo) => [
        `<strong>${immo.code}</strong>`,
        immo.nom,
        immo.emplacement || 'Usine',
        immo.compteImmo,
        immo.dateAcquisition,
        `${immo.dureeAnnees} ans`,
        `$${immo.valeurAcquisitionUsd.toFixed(2)}`,
        `$${immo.amortissementCumuleUsd.toFixed(2)}`,
        `<strong>$${immo.valeurNetteComptableUsd.toFixed(2)}</strong>`,
      ])
  } else if (type === 'inventaire' || type === 'stocks') {
    docTitle = `INVENTAIRE OFFICIEL & ÉTAT DES STOCKS PHYSIQUES`
    colonnes = ['Agence', 'Désignation Farine / Article', 'Code Unique', 'N° Lot', 'Expiration', 'Stock Disponible', 'Unité', 'P.U (USD)', 'Valeur Stock']
    let totalVal = 0
    lignes = stocksAgence
      .filter((s) => !agenceId || s.agenceId === agenceId)
      .map((s) => {
        const ag = agences.find((a) => a.id === s.agenceId)
        const art = articles.find((a) => a.id === s.articleId)
        const pu = art?.prixVenteStandard || 20
        const valTot = (s.quantite || 0) * pu
        totalVal += valTot
        return [
          ag?.nom || String(s.agenceId),
          `<strong>${art?.designation || 'Article'}</strong>`,
          art?.codeUnique || '-',
          s.numeroLot || '-',
          s.dateExpiration || '-',
          `<strong>${s.quantite}</strong>`,
          art?.uniteMesure || 'Sac',
          `$${pu.toFixed(2)}`,
          `$${valTot.toFixed(2)}`,
        ]
      })
    totaux = [{ label: 'Valeur Stock', valeur: `$${totalVal.toFixed(2)} USD` }]
  } else if (type === 'ventes') {
    docTitle = `JOURNAL COMMERCIAL DES VENTES COMPTOIR & FACTURES`
    colonnes = ['Réf. Facture', 'Date', 'Agence', 'Client', 'Vendeur', 'Montant Total', 'Mode', 'Statut']
    let totalV = 0
    lignes = ventes
      .filter((v) => !agenceId || v.agenceId === agenceId)
      .map((v) => {
        const ag = agences.find((a) => a.id === v.agenceId)
        const client = clients.find((c) => c.id === v.clientId)
        const vendeur = users.find((u) => u.id === v.vendeurId)
        totalV += v.montantTotal
        return [
          `<strong>${v.referenceVente}</strong>`,
          (v.dateVente || '').slice(0, 10),
          ag?.nom || String(v.agenceId),
          client?.nom || 'Client Comptoir',
          vendeur?.nom || 'Vendeur',
          `<strong>$${v.montantTotal.toFixed(2)} ${v.devise}</strong>`,
          v.estCredit ? '<span style="color: #b45309; font-weight: 700;">CRÉDIT</span>' : 'COMPTANT',
          v.statutAnnulation === 'ANNULEE' ? '<span style="color: #dc2626;">ANNULÉE</span>' : '<span style="color: #16a34a;">VALIDÉE</span>',
        ]
      })
    totaux = [{ label: 'Total Ventes', valeur: `$${totalV.toFixed(2)} USD` }]
  } else if (type === 'tresorerie') {
    docTitle = `JOURNAL DES OPÉRATIONS DE TRÉSORERIE & CAISSES`
    colonnes = ['Réf. Caisse', 'Date', 'Agence', 'Caisse', 'Sens', 'Motif / Libellé', 'Montant', 'Statut']
    lignes = transactions
      .filter((t) => !agenceId || t.agenceId === agenceId)
      .map((t) => {
        const ag = agences.find((a) => a.id === t.agenceId)
        const caisse = comptesCaisse.find((c) => c.id === t.caisseId)
        return [
          `<strong>${t.referenceInterne || t.id}</strong>`,
          (t.dateCreation || '').slice(0, 10),
          ag?.nom || String(t.agenceId),
          caisse?.nom || 'Caisse',
          `<span style="color: ${t.type === 'ENTREE' ? '#16a34a' : '#dc2626'}; font-weight: 700;">${t.type}</span>`,
          t.libelle,
          `<strong>${t.montant.toFixed(2)} ${t.devise}</strong>`,
          t.statut,
        ]
      })
  } else if (type === 'etats-besoin') {
    docTitle = `REGISTRE OFFICIEL DES ÉTATS DE BESOIN & RÉQUISITIONS`
    colonnes = ['N° Requisition', 'Date', 'Agence', 'Service', 'Demandeur', 'Motif', 'Montant', 'Statut']
    lignes = etatsBesoin
      .filter((eb) => !agenceId || eb.agenceId === agenceId)
      .map((eb) => {
        const ag = agences.find((a) => a.id === eb.agenceId)
        return [
          `<strong>${eb.numeroEB}</strong>`,
          (eb.dateDemande || '').slice(0, 10),
          ag?.nom || String(eb.agenceId),
          eb.serviceDemandeur,
          eb.demandeurNom,
          eb.motif,
          `<strong>${eb.montant.toFixed(2)} ${eb.devise}</strong>`,
          eb.statut,
        ]
      })
  } else if (type === 'maintenance') {
    docTitle = `CARNET GÉNÉRAL DE MAINTENANCE & ENTRETIENS DU PARC MATÉRIEL`
    colonnes = ['N° Intervention', 'Date', 'Agence', 'Type Matériel', 'Équipement / Immatriculation', 'Nature des Travaux', 'Prestataire', 'Coût Total USD', 'Statut']
    let totalMaint = 0
    lignes = entretiensTechniques
      .filter((m) => !agenceId || m.agenceId === agenceId)
      .map((m) => {
        const ag = agences.find((a) => a.id === m.agenceId)
        totalMaint += m.coutTotalUsd
        return [
          `<strong>${m.numeroIntervention}</strong>`,
          m.dateIntervention,
          ag?.nom || String(m.agenceId),
          m.typeEquipement,
          `<strong>${m.nomEquipement}</strong> ${m.immatriculationOuSerie ? `(${m.immatriculationOuSerie})` : ''}`,
          m.natureTravaux,
          m.technicienOuGarage,
          `<strong>$${m.coutTotalUsd.toFixed(2)}</strong>`,
          m.statut,
        ]
      })
    totaux = [{ label: 'Coût Maintenance', valeur: `$${totalMaint.toFixed(2)} USD` }]
  } else if (type === 'transactions-consolidees' || type === 'supervision-siege') {
    docTitle = `JOURNAL CONSOLIDÉ DES OPÉRATIONS MULTI-AGENCES (${mois}/${annee})`
    colonnes = ['Réf.', 'Date', 'Agence', 'Module', 'Type Flux', 'Libellé de l\'opération', 'Montant', 'Opérateur', 'Statut']
    // Ventes et caisses combinées
    const listConsolidee: any[] = []
    ventes.forEach((v) => {
      if (!agenceId || v.agenceId === agenceId) {
        const ag = agences.find((a) => a.id === v.agenceId)
        const ven = users.find((u) => u.id === v.vendeurId)
        listConsolidee.push([
          `<strong>${v.referenceVente}</strong>`,
          (v.dateVente || '').slice(0, 10),
          ag?.nom || String(v.agenceId),
          'VENTES',
          v.estCredit ? 'CRÉDIT' : 'COMPTANT',
          `Vente client`,
          `$${v.montantTotal.toFixed(2)} ${v.devise}`,
          ven?.nom || 'Vendeur',
          v.statutAnnulation === 'ANNULEE' ? 'ANNULÉE' : 'VALIDÉE',
        ])
      }
    })
    transactions.forEach((t) => {
      if (!agenceId || t.agenceId === agenceId) {
        const ag = agences.find((a) => a.id === t.agenceId)
        const cr = users.find((u) => u.id === t.createurId)
        listConsolidee.push([
          `<strong>${t.referenceInterne || t.id}</strong>`,
          (t.dateCreation || '').slice(0, 10),
          ag?.nom || String(t.agenceId),
          'TRÉSORERIE',
          t.type,
          t.libelle,
          `$${t.montant.toFixed(2)} ${t.devise}`,
          cr?.nom || 'Caissier',
          t.statut,
        ])
      }
    })
    lignes = listConsolidee
  }

  const html = renderRapportOfficielHtml({
    docTitle,
    docReference: `RPT-${String(type).toUpperCase()}-${Date.now().toString().slice(-6)}`,
    agence,
    entreprise: parametresEntreprise,
    dateLabel: `Généré le ${new Date().toLocaleDateString('fr-FR')} à ${new Date().toLocaleTimeString('fr-FR')} | Système Matabishi ERP`,
    colonnes,
    lignes,
    totaux,
  })

  res.setHeader('Content-Type', 'text/html; charset=utf-8')
  res.send(html)
})


// ----------------- DOCUMENTS & ÉDITIONS OFFICIELLES SUPPLÉMENTAIRES -----------------
router.get(['/paie/bulletins/:id/document', '/rh/bulletins/:id/document'], (req: Request, res: Response) => {
  const bId = toInt(req.params.id)
  const b = bulletinsPaie.find((item) => item.id === bId)
  if (!b) return res.status(404).send('Bulletin de paie introuvable')

  const agent = agents.find((a) => a.id === b.agentId)
  const agence = agences.find((ag) => ag.id === b.agenceId)

  const html = renderBulletinPaieHtml(b, agent, agence, parametresEntreprise)
  res.setHeader('Content-Type', 'text/html; charset=utf-8')
  res.send(html)
})

router.get(['/comptabilite/grand-livre/document', '/comptabilite/export/grand-livre'], (req: Request, res: Response) => {
  const agenceId = req.query.agenceId ? toInt(req.query.agenceId) : undefined
  const annee = req.query.annee ? Number(req.query.annee) : new Date().getFullYear()
  const agence = agenceId ? agences.find((a) => a.id === agenceId) : null
  const agenceNom = agence ? agence.nom : (parametresEntreprise.nomSociete + ' - Consolidation Siège')

  const filteredEcritures = ecrituresComptables.filter((e) => !e.annulee && (!agenceId || e.agenceId === agenceId))
  const html = renderGrandLivreHtml(filteredEcritures, planComptable, agenceNom, annee, parametresEntreprise)
  res.setHeader('Content-Type', 'text/html; charset=utf-8')
  res.send(html)
})

router.get(['/comptabilite/compte-resultat/document', '/comptabilite/export/compte-resultat'], (req: Request, res: Response) => {
  const agenceId = req.query.agenceId ? toInt(req.query.agenceId) : undefined
  const annee = req.query.annee ? Number(req.query.annee) : new Date().getFullYear()
  const agence = agenceId ? agences.find((a) => a.id === agenceId) : null
  const agenceNom = agence ? agence.nom : (parametresEntreprise.nomSociete + ' - Consolidation Siège')

  const grouped: Record<string, { numeroCompte: string; libelle: string; debitUsd: number; creditUsd: number }> = {}
  ecrituresComptables
    .filter((e) => !e.annulee && (!agenceId || e.agenceId === agenceId))
    .forEach((e) => {
      if (e.compteNumero.startsWith('6') || e.compteNumero.startsWith('7')) {
        if (!grouped[e.compteNumero]) {
          const cp = planComptable.find((p) => p.numero === e.compteNumero)
          grouped[e.compteNumero] = {
            numeroCompte: e.compteNumero,
            libelle: cp?.libelle || e.libelle || `Compte ${e.compteNumero}`,
            debitUsd: 0,
            creditUsd: 0,
          }
        }
        if (e.sens === 'DEBIT') grouped[e.compteNumero].debitUsd += e.montant
        else grouped[e.compteNumero].creditUsd += e.montant
      }
    })

  const lines = Object.values(grouped).sort((a, b) => a.numeroCompte.localeCompare(b.numeroCompte))
  const totalCharges = lines.filter((l) => l.numeroCompte.startsWith('6')).reduce((acc, l) => acc + l.debitUsd, 0)
  const totalProduits = lines.filter((l) => l.numeroCompte.startsWith('7')).reduce((acc, l) => acc + l.creditUsd, 0)
  const resultatNet = totalProduits - totalCharges

  const html = renderCompteResultatHtml(lines, agenceNom, annee, totalProduits, totalCharges, resultatNet, parametresEntreprise)
  res.setHeader('Content-Type', 'text/html; charset=utf-8')
  res.send(html)
})

router.get('/achats/commandes/:id/document', (req: Request, res: Response) => {
  const cmdId = toInt(req.params.id)
  const cmd = commandesAchat.find((c) => c.id === cmdId)
  if (!cmd) return res.status(404).send('Bon de commande introuvable')

  const fournisseur = fournisseurs.find((f) => f.id === cmd.fournisseurId)
  const html = renderBonCommandeHtml(cmd, fournisseur, parametresEntreprise)
  res.setHeader('Content-Type', 'text/html; charset=utf-8')
  res.send(html)
})

router.get(['/achats/receptions/:id/document', '/achats/pont-bascule/:id/document', '/achats/receptions/:id/ticket-pont-bascule', '/achats/receptions/:id/bon-pdf'], (req: Request, res: Response) => {
  const pbId = toInt(req.params.id)
  const rec = receptionsPontBascule.find((r) => r.id === pbId)
  if (!rec) return res.status(404).send('Réception pont-bascule introuvable')

  const cmd = rec.commandeAchatId ? commandesAchat.find((c) => c.id === rec.commandeAchatId) : undefined
  const fournisseur = rec.fournisseurId ? fournisseurs.find((f) => f.id === rec.fournisseurId) : undefined

  const html = renderTicketPontBasculeHtml(rec, cmd, fournisseur, parametresEntreprise)
  res.setHeader('Content-Type', 'text/html; charset=utf-8')
  res.send(html)
})

// ----------------- CLÔTURE ANNUELLE DE L'EXERCICE COMPTABLE OHADA -----------------
router.get('/comptabilite/exercices/statut', (_req: Request, res: Response) => {
  const annee = new Date().getFullYear()
  let chargesUsd = 0
  let produitsUsd = 0

  ecrituresComptables.forEach((e) => {
    if (!e.annulee) {
      if (e.compteNumero.startsWith('6')) {
        if (e.sens === 'DEBIT') chargesUsd += e.montant
        else chargesUsd -= e.montant
      } else if (e.compteNumero.startsWith('7')) {
        if (e.sens === 'CREDIT') produitsUsd += e.montant
        else produitsUsd -= e.montant
      }
    }
  })

  chargesUsd = Math.round(chargesUsd * 100) / 100
  produitsUsd = Math.round(produitsUsd * 100) / 100
  const resultatNetUsd = Math.round((produitsUsd - chargesUsd) * 100) / 100

  res.json({
    exercice: annee,
    statut: 'OUVERT',
    dateDebut: `${annee}-01-01`,
    dateFin: `${annee}-12-31`,
    totalChargesUsd: chargesUsd,
    totalProduitsUsd: produitsUsd,
    resultatNetUsd,
    estBeneficiaire: resultatNetUsd >= 0,
  })
})

router.post('/comptabilite/exercices/cloture', (req: Request, res: Response) => {
  const currentUser = getUserFromToken(req)
  if (!currentUser) return res.status(401).json({ message: 'Non autorisé' })
  if (currentUser.role !== 'SUPER_ADMIN' && currentUser.role !== 'COMPTABLE_SENIOR' && currentUser.role !== 'ADMIN_SIEGE') {
    return res.status(403).json({ message: 'Seul le Comptable Senior ou l Administrateur Siège peut clôturer un exercice annuel.' })
  }

  const annee = req.body.annee ? Number(req.body.annee) : new Date().getFullYear()

  // Calcul du résultat de l'exercice
  let chargesUsd = 0
  let produitsUsd = 0

  ecrituresComptables.forEach((e) => {
    if (!e.annulee) {
      if (e.compteNumero.startsWith('6')) {
        if (e.sens === 'DEBIT') chargesUsd += e.montant
        else chargesUsd -= e.montant
      } else if (e.compteNumero.startsWith('7')) {
        if (e.sens === 'CREDIT') produitsUsd += e.montant
        else produitsUsd -= e.montant
      }
    }
  })

  chargesUsd = Math.round(chargesUsd * 100) / 100
  produitsUsd = Math.round(produitsUsd * 100) / 100
  const resultatNetUsd = Math.round((produitsUsd - chargesUsd) * 100) / 100
  const estBeneficiaire = resultatNetUsd >= 0
  const refCloture = `CLOT-${annee}-${Date.now().toString().slice(-4)}`

  // Écriture de constatation du résultat net au compte 131 (Bénéfice) ou 139 (Perte)
  const compteResultat = estBeneficiaire ? '131' : '139'
  const nowIso = new Date().toISOString()
  const ecritureCloture: DbEcritureComptable = {
    id: ecrituresComptables.length + 1,
    referenceOperation: refCloture,
    agenceId: 1,
    compteNumero: compteResultat,
    sens: estBeneficiaire ? 'CREDIT' : 'DEBIT',
    montant: Math.abs(resultatNetUsd),
    devise: 'USD',
    tauxApplique: 2850,
    libelle: `Clôture annuelle exercice ${annee} - Résultat Net (${estBeneficiaire ? 'Bénéfice' : 'Perte'})`,
    sourceModule: 'COMPTABILITE',
    sourceType: 'CLOTURE_EXERCICE',
    sourceId: refCloture,
    annulee: false,
    statutValidation: 'VALIDE',
    demandeurId: currentUser.id,
    dateEcriture: nowIso,
  }
  ecrituresComptables.push(ecritureCloture)

  logAudit(
    currentUser.nom,
    'CLOTURE_EXERCICE_COMPTABLE',
    `Clôture annuelle de l'exercice ${annee} par ${currentUser.nom}. Charges: $${chargesUsd}, Produits: $${produitsUsd}, Résultat: ${resultatNetUsd >= 0 ? '+' : ''}$${resultatNetUsd} USD`,
    1
  )

  res.json({
    message: `Exercice comptable ${annee} clôturé avec succès selon les normes SYSCOHADA.`,
    exercice: annee,
    resultatNetUsd,
    statut: 'CLOTURE',
    referenceCloture: refCloture,
    ecritureCloture,
  })
})

// ----------------- IMMOBILISATIONS & AMORTISSEMENTS (SYSCOHADA) -----------------
router.get('/comptabilite/immobilisations', (req: Request, res: Response) => {
  const agenceId = req.query.agenceId ? toInt(req.query.agenceId) : undefined
  const list = immobilisations
    .filter((i) => !agenceId || i.agenceId === agenceId)
    .map((i) => ({
      ...i,
      agence: agences.find((a) => a.id === i.agenceId),
    }))
  res.json(list)
})

router.post('/comptabilite/immobilisations', (req: Request, res: Response) => {
  const currentUser = getUserFromToken(req)
  if (!currentUser) return res.status(401).json({ message: 'Non autorisé' })

  const {
    nom,
    categorie,
    compteImmo,
    valeurAcquisitionUsd,
    valeurResiduelleUsd,
    dureeAnnees,
    methode,
    dateAcquisition,
    agenceId,
    emplacement,
  } = req.body

  if (!nom || !valeurAcquisitionUsd || !dureeAnnees) {
    return res.status(400).json({ message: 'Nom, valeur d acquisition et durée requis' })
  }

  const valAcq = Number(valeurAcquisitionUsd)
  const valRes = Number(valeurResiduelleUsd) || 0
  const duree = Number(dureeAnnees)
  const baseAmort = Math.max(0, valAcq - valRes)
  const dotAnnuelle = Math.round((baseAmort / duree) * 100) / 100
  const cImmo = String(compteImmo || '241')

  const newImmo: any = {
    id: immobilisations.length + 1,
    code: `IMM-${(nom.substring(0, 3)).toUpperCase()}-${String(immobilisations.length + 1).padStart(2, '0')}`,
    nom,
    categorie: categorie || 'CORPORELLE',
    compteImmo: cImmo,
    compteAmort: '28' + cImmo.substring(1),
    valeurAcquisitionUsd: valAcq,
    valeurResiduelleUsd: valRes,
    dureeAnnees: duree,
    methode: methode || 'LINEAIRE',
    dateAcquisition: dateAcquisition || new Date().toISOString().slice(0, 10),
    amortissementCumuleUsd: 0,
    valeurNetteComptableUsd: valAcq,
    dotationAnnuelleUsd: dotAnnuelle,
    agenceId: toInt(agenceId) || currentUser.agenceId || 1,
    statut: 'ACTIF' as const,
    emplacement: emplacement || 'Usine Goma',
  }

  immobilisations.unshift(newImmo)

  // Écriture d'acquisition Débit 24x / Crédit 521
  const refImmo = `ACQ-${newImmo.code}`
  ecrituresComptables.push(
    {
      id: ecrituresComptables.length + 1,
      referenceOperation: refImmo,
      agenceId: newImmo.agenceId,
      compteNumero: newImmo.compteImmo,
      sens: 'DEBIT',
      montant: valAcq,
      devise: 'USD',
      tauxApplique: 2850,
      libelle: `Acquisition actif : ${newImmo.nom}`,
      sourceModule: 'COMPTABILITE',
      sourceType: 'OD',
      sourceId: String(newImmo.id),
      annulee: false,
      statutValidation: 'VALIDE',
      dateEcriture: newImmo.dateAcquisition,
    },
    {
      id: ecrituresComptables.length + 2,
      referenceOperation: refImmo,
      agenceId: newImmo.agenceId,
      compteNumero: '521',
      sens: 'CREDIT',
      montant: valAcq,
      devise: 'USD',
      tauxApplique: 2850,
      libelle: `Paiement acquisition ${newImmo.nom} par banque Rawbank`,
      sourceModule: 'COMPTABILITE',
      sourceType: 'OD',
      sourceId: String(newImmo.id),
      annulee: false,
      statutValidation: 'VALIDE',
      dateEcriture: newImmo.dateAcquisition,
    }
  )

  logAudit(currentUser.nom, 'CREATION_IMMOBILISATION', `Actif ${newImmo.code} enregistré ($${valAcq} USD)`, newImmo.agenceId)
  res.status(201).json(newImmo)
})

router.post('/comptabilite/immobilisations/dotation-annuelle', (req: Request, res: Response) => {
  const currentUser = getUserFromToken(req)
  if (!currentUser) return res.status(401).json({ message: 'Non autorisé' })

  const annee = toInt(req.body.annee, new Date().getFullYear())
  let totalDotation = 0

  immobilisations.forEach((immo) => {
    if (immo.statut === 'ACTIF' && immo.valeurNetteComptableUsd > 0) {
      const dot = Math.min(immo.dotationAnnuelleUsd, immo.valeurNetteComptableUsd)
      immo.amortissementCumuleUsd += dot
      immo.valeurNetteComptableUsd = Math.max(0, immo.valeurNetteComptableUsd - dot)
      totalDotation += dot

      ecrituresComptables.push(
        {
          id: ecrituresComptables.length + 1,
          referenceOperation: `DOT-${annee}-${immo.code}`,
          agenceId: immo.agenceId,
          compteNumero: '681',
          sens: 'DEBIT',
          montant: dot,
          devise: 'USD',
          tauxApplique: 2850,
          libelle: `Dotation amortissement ${annee} : ${immo.nom}`,
          sourceModule: 'COMPTABILITE',
          sourceType: 'OD',
          sourceId: String(immo.id),
          annulee: false,
          statutValidation: 'VALIDE',
          dateEcriture: `${annee}-12-31T23:59:59Z`,
        },
        {
          id: ecrituresComptables.length + 2,
          referenceOperation: `DOT-${annee}-${immo.code}`,
          agenceId: immo.agenceId,
          compteNumero: immo.compteAmort || '2841',
          sens: 'CREDIT',
          montant: dot,
          devise: 'USD',
          tauxApplique: 2850,
          libelle: `Amortissement cumulé ${annee} : ${immo.nom}`,
          sourceModule: 'COMPTABILITE',
          sourceType: 'OD',
          sourceId: String(immo.id),
          annulee: false,
          statutValidation: 'VALIDE',
          dateEcriture: `${annee}-12-31T23:59:59Z`,
        }
      )
    }
  })

  logAudit(currentUser.nom, 'CALCUL_DOTATIONS_AMORTISSEMENTS', `Dotations annuelles passées pour l exercice ${annee}. Total: $${totalDotation.toFixed(2)} USD`, 1)

  res.json({ message: `Dotations annuelles ${annee} calculées et passées en écritures avec succès`, totalDotationUsd: totalDotation })
})

router.get(['/comptabilite/immobilisations/document', '/comptabilite/export/immobilisations'], (req: Request, res: Response) => {
  const agenceId = req.query.agenceId ? toInt(req.query.agenceId) : 1
  const agence = agences.find((a) => a.id === agenceId)
  const annee = req.query.annee ? toInt(req.query.annee) : new Date().getFullYear()

  const html = renderTableauImmobilisationsHtml(
    immobilisations,
    agence?.nom || parametresEntreprise.sigle || 'Siège & Agences',
    annee,
    parametresEntreprise
  )

  res.setHeader('Content-Type', 'text/html; charset=utf-8')
  res.send(html)
})

// ----------------- FLOTTE & GESTION DE CAMIONS -----------------
router.get('/flotte/vehicules', (req: Request, res: Response) => {
  const agenceId = req.query.agenceId ? toInt(req.query.agenceId) : undefined
  const list = vehicules
    .filter((v) => !agenceId || v.agenceId === agenceId)
    .map((v) => ({
      ...v,
      agence: agences.find((a) => a.id === v.agenceId),
    }))
  res.json(list)
})

router.post('/flotte/vehicules', (req: Request, res: Response) => {
  const currentUser = getUserFromToken(req)
  if (!currentUser) return res.status(401).json({ message: 'Non autorisé' })

  const { plaqueImmatriculation, marqueModele, capaciteTonnes, capaciteSacs, chauffeurNom, chauffeurTelephone, agenceId } = req.body
  if (!plaqueImmatriculation || !marqueModele || !chauffeurNom) {
    return res.status(400).json({ message: 'Plaque, modèle et chauffeur requis' })
  }

  const nouveauVehicule = {
    id: vehicules.length + 1,
    plaqueImmatriculation: String(plaqueImmatriculation).trim().toUpperCase(),
    marqueModele: String(marqueModele).trim(),
    capaciteTonnes: Number(capaciteTonnes) || 10,
    capaciteSacs: Number(capaciteSacs) || 400,
    chauffeurNom: String(chauffeurNom).trim(),
    chauffeurTelephone: chauffeurTelephone ? String(chauffeurTelephone).trim() : undefined,
    agenceId: toInt(agenceId) || 1,
    statut: 'DISPONIBLE' as const,
  }

  vehicules.push(nouveauVehicule)
  logAudit(currentUser.nom, 'AJOUT_VEHICULE_FLOTTE', `Nouveau camion ajouté : ${nouveauVehicule.marqueModele} (${nouveauVehicule.plaqueImmatriculation})`, nouveauVehicule.agenceId)
  res.json(nouveauVehicule)
})

router.put('/flotte/vehicules/:id', (req: Request, res: Response) => {
  const currentUser = getUserFromToken(req)
  if (!currentUser) return res.status(401).json({ message: 'Non autorisé' })

  const vehicule = vehicules.find((v) => v.id === toInt(req.params.id))
  if (!vehicule) return res.status(404).json({ message: 'Véhicule introuvable' })

  const { statut, chauffeurNom, chauffeurTelephone, agenceId } = req.body
  if (statut) vehicule.statut = statut
  if (chauffeurNom) vehicule.chauffeurNom = chauffeurNom
  if (chauffeurTelephone) vehicule.chauffeurTelephone = chauffeurTelephone
  if (agenceId) vehicule.agenceId = toInt(agenceId)

  res.json({ message: 'Véhicule mis à jour', vehicule })
})

// ----------------- MODULE TECHNIQUE & ENTRETIEN (FLOTTE & MACHINES USINE) -----------------
router.get('/maintenance/equipements', (req: Request, res: Response) => {
  const agenceId = req.query.agenceId ? toInt(req.query.agenceId) : undefined
  const list = equipementsParc
    .filter((eq) => !agenceId || eq.agenceId === agenceId)
    .map((eq) => ({
      ...eq,
      agence: agences.find((a) => a.id === eq.agenceId),
    }))
  res.json(list)
})

router.post('/maintenance/equipements', (req: Request, res: Response) => {
  const currentUser = getUserFromToken(req)
  if (!currentUser) return res.status(401).json({ message: 'Non autorisé' })

  const { nom, type, immatriculationOuSerie, agenceId, marqueModele, statut, dateMiseEnService, observations } = req.body
  if (!nom) return res.status(400).json({ message: 'Nom du matériel/équipement requis' })

  const nouvelEquipement: any = {
    id: equipementsParc.length + 1,
    nom: String(nom).trim(),
    type: type || 'AUTRE',
    immatriculationOuSerie: immatriculationOuSerie ? String(immatriculationOuSerie).trim() : `EQ-${Date.now().toString().slice(-4)}`,
    agenceId: toInt(agenceId) || currentUser.agenceId || 1,
    marqueModele: marqueModele ? String(marqueModele).trim() : undefined,
    statut: statut || 'OPERATIONNEL',
    dateMiseEnService: dateMiseEnService || new Date().toISOString().slice(0, 10),
    observations: observations ? String(observations).trim() : undefined,
  }

  equipementsParc.unshift(nouvelEquipement)
  logAudit(currentUser.nom, 'CREATION_EQUIPEMENT_PARC', `Équipement ${nouvelEquipement.nom} (${nouvelEquipement.immatriculationOuSerie}) ajouté au parc`, nouvelEquipement.agenceId)
  res.json(nouvelEquipement)
})

router.put('/maintenance/equipements/:id', (req: Request, res: Response) => {
  const currentUser = getUserFromToken(req)
  if (!currentUser) return res.status(401).json({ message: 'Non autorisé' })

  const eq = equipementsParc.find((e) => e.id === toInt(req.params.id))
  if (!eq) return res.status(404).json({ message: 'Équipement introuvable' })

  const { nom, type, immatriculationOuSerie, agenceId, marqueModele, statut, observations } = req.body
  if (nom) eq.nom = String(nom).trim()
  if (type) eq.type = type
  if (immatriculationOuSerie) eq.immatriculationOuSerie = String(immatriculationOuSerie).trim()
  if (agenceId) eq.agenceId = toInt(agenceId)
  if (marqueModele !== undefined) eq.marqueModele = marqueModele ? String(marqueModele).trim() : undefined
  if (statut) eq.statut = statut
  if (observations !== undefined) eq.observations = observations ? String(observations).trim() : undefined

  res.json({ message: 'Équipement mis à jour', equipement: eq })
})

router.delete('/maintenance/equipements/:id', (req: Request, res: Response) => {
  const currentUser = getUserFromToken(req)
  if (!currentUser) return res.status(401).json({ message: 'Non autorisé' })

  const id = toInt(req.params.id)
  const idx = equipementsParc.findIndex((e) => e.id === id)
  if (idx === -1) return res.status(404).json({ message: 'Équipement introuvable' })

  const removed = equipementsParc.splice(idx, 1)[0]
  logAudit(currentUser.nom, 'SUPPRESSION_EQUIPEMENT_PARC', `Équipement ${removed.nom} retiré du parc`, removed.agenceId)
  res.json({ message: 'Équipement retiré avec succès' })
})

router.get('/maintenance/entretiens', (req: Request, res: Response) => {
  const agenceId = req.query.agenceId ? toInt(req.query.agenceId) : undefined
  const statut = req.query.statut as string | undefined
  const typeEquipement = req.query.typeEquipement as string | undefined

  let list = entretiensTechniques.filter((m) => !agenceId || m.agenceId === agenceId)
  if (statut) list = list.filter((m) => m.statut === statut)
  if (typeEquipement) list = list.filter((m) => m.typeEquipement === typeEquipement)

  res.json(list.map((m) => ({
    ...m,
    agence: agences.find((a) => a.id === m.agenceId),
    etatBesoin: etatsBesoin.find((eb) => eb.id === m.etatBesoinId),
  })))
})

router.post('/maintenance/entretiens', (req: Request, res: Response) => {
  const currentUser = getUserFromToken(req)
  if (!currentUser) return res.status(401).json({ message: 'Non autorisé' })

  const {
    agenceId,
    typeEquipement,
    nomEquipement,
    immatriculationOuSerie,
    typeMaintenance,
    natureTravaux,
    dateIntervention,
    prochaineMaintenancePrevue,
    kilometrageOuHeures,
    technicienOuGarage,
    coutPiecesUsd,
    coutMainOeuvreUsd,
    statut,
    observations,
  } = req.body

  if (!nomEquipement || !natureTravaux || !technicienOuGarage) {
    return res.status(400).json({ message: 'Nom équipement, travaux et technicien/garage obligatoires' })
  }

  const pUsd = Number(coutPiecesUsd) || 0
  const moUsd = Number(coutMainOeuvreUsd) || 0
  const totalUsd = pUsd + moUsd

  const nouvelEntretien = {
    id: entretiensTechniques.length + 1,
    numeroIntervention: `MAINT-2026-${String(entretiensTechniques.length + 1).padStart(4, '0')}`,
    agenceId: toInt(agenceId) || 1,
    typeEquipement: typeEquipement || 'VEHICULE',
    nomEquipement: String(nomEquipement).trim(),
    immatriculationOuSerie: immatriculationOuSerie ? String(immatriculationOuSerie).trim() : undefined,
    typeMaintenance: typeMaintenance || 'PREVENTIF',
    natureTravaux: String(natureTravaux).trim(),
    dateIntervention: dateIntervention || new Date().toISOString().slice(0, 10),
    prochaineMaintenancePrevue: prochaineMaintenancePrevue || undefined,
    kilometrageOuHeures: kilometrageOuHeures ? Number(kilometrageOuHeures) : undefined,
    technicienOuGarage: String(technicienOuGarage).trim(),
    coutPiecesUsd: pUsd,
    coutMainOeuvreUsd: moUsd,
    coutTotalUsd: totalUsd,
    statut: (statut || 'PLANIFIE') as 'PLANIFIE' | 'EN_COURS' | 'TERMINE',
    observations: observations ? String(observations).trim() : undefined,
  }

  entretiensTechniques.unshift(nouvelEntretien)
  logAudit(currentUser.nom, 'CREATION_MAINTENANCE', `Intervention créée: ${nouvelEntretien.numeroIntervention} pour ${nouvelEntretien.nomEquipement}`, nouvelEntretien.agenceId)
  res.json(nouvelEntretien)
})

router.put('/maintenance/entretiens/:id', (req: Request, res: Response) => {
  const currentUser = getUserFromToken(req)
  if (!currentUser) return res.status(401).json({ message: 'Non autorisé' })

  const maint = entretiensTechniques.find((m) => m.id === toInt(req.params.id))
  if (!maint) return res.status(404).json({ message: 'Intervention introuvable' })

  const { statut, coutPiecesUsd, coutMainOeuvreUsd, observations, prochaineMaintenancePrevue, kilometrageOuHeures } = req.body
  if (statut) maint.statut = statut
  if (coutPiecesUsd !== undefined) maint.coutPiecesUsd = Number(coutPiecesUsd)
  if (coutMainOeuvreUsd !== undefined) maint.coutMainOeuvreUsd = Number(coutMainOeuvreUsd)
  maint.coutTotalUsd = maint.coutPiecesUsd + maint.coutMainOeuvreUsd
  if (observations !== undefined) maint.observations = observations
  if (prochaineMaintenancePrevue !== undefined) maint.prochaineMaintenancePrevue = prochaineMaintenancePrevue
  if (kilometrageOuHeures !== undefined) maint.kilometrageOuHeures = Number(kilometrageOuHeures)

  logAudit(currentUser.nom, 'MAJ_MAINTENANCE', `Intervention ${maint.numeroIntervention} mise à jour (Statut: ${maint.statut})`, maint.agenceId)
  res.json(maint)
})

router.post('/maintenance/entretiens/:id/generer-etat-besoin', (req: Request, res: Response) => {
  const currentUser = getUserFromToken(req)
  if (!currentUser) return res.status(401).json({ message: 'Non autorisé' })

  const maint = entretiensTechniques.find((m) => m.id === toInt(req.params.id))
  if (!maint) return res.status(404).json({ message: 'Intervention introuvable' })

  if (maint.etatBesoinId) {
    const existingEb = etatsBesoin.find((eb) => eb.id === maint.etatBesoinId)
    if (existingEb) return res.json({ message: 'Un état de besoin est déjà rattaché à cette intervention', etatBesoin: existingEb })
  }

  const nouveauEB = {
    id: etatsBesoin.length + 1,
    numeroEB: `EB-2026-${String(etatsBesoin.length + 1).padStart(4, '0')}`,
    agenceId: maint.agenceId,
    serviceDemandeur: maint.typeEquipement === 'VEHICULE' ? 'Garage & Flotte Automobile' : 'Service Technique & Maintenance Usine',
    demandeurNom: `${currentUser.nom} (Responsable Technique)`,
    demandeurId: currentUser.id,
    motif: `Frais intervention ${maint.numeroIntervention} (${maint.typeMaintenance}) sur ${maint.nomEquipement} : ${maint.natureTravaux}`,
    montant: maint.coutTotalUsd > 0 ? maint.coutTotalUsd : 100,
    devise: 'USD' as const,
    compteImputation: '624',
    dateDemande: new Date().toISOString(),
    statut: 'SOUMIS' as const,
    entretienTechniqueId: maint.id,
    observations: `Généré automatiquement depuis le module technique pour ${maint.technicienOuGarage}`,
  }

  etatsBesoin.unshift(nouveauEB)
  maint.etatBesoinId = nouveauEB.id

  logAudit(currentUser.nom, 'GENERATION_ETAT_BESOIN_MAINTENANCE', `État de besoin ${nouveauEB.numeroEB} ($${nouveauEB.montant}) généré pour maintenance ${maint.numeroIntervention}`, maint.agenceId)
  res.json({ message: 'État de besoin généré avec succès pour cette intervention technique', etatBesoin: nouveauEB })
})

router.get(['/maintenance/:id/document', '/maintenance/entretiens/:id/fiche'], (req: Request, res: Response) => {
  const maint = entretiensTechniques.find((m) => m.id === toInt(req.params.id))
  if (!maint) return res.status(404).send('Intervention technique introuvable')

  const agence = agences.find((a) => a.id === maint.agenceId)
  const html = renderFicheMaintenanceTechniqueHtml(maint, agence?.nom || 'Atelier Technique', parametresEntreprise)
  res.setHeader('Content-Type', 'text/html; charset=utf-8')
  res.send(html)
})

// ----------------- BONS DE LIVRAISON CLIENTS & LOGISTIQUE -----------------
router.get('/logistique/livraisons', (req: Request, res: Response) => {
  const agenceId = req.query.agenceId ? toInt(req.query.agenceId) : undefined
  const list = bonsLivraison
    .filter((bl) => !agenceId || bl.agenceId === agenceId)
    .map((bl) => {
      const vehicule = vehicules.find((v) => v.id === bl.vehiculeId)
      const vente = ventes.find((v) => v.id === bl.venteId)
      return {
        ...bl,
        vehicule,
        vente,
      }
    })
  res.json(list)
})

router.post('/logistique/livraisons', (req: Request, res: Response) => {
  const currentUser = getUserFromToken(req)
  if (!currentUser) return res.status(401).json({ message: 'Non autorisé' })

  const {
    venteId,
    agenceId,
    clientNom,
    clientTelephone,
    adresseLivraison,
    vehiculeId,
    quantiteSacs,
    poidsTotalKg,
    observations,
    modeTransport,
    clientVehicule,
    clientChauffeur,
  } = req.body

  const numAg = toInt(agenceId) || 1
  const numVenteId = toInt(venteId)
  const mode = modeTransport || (vehiculeId ? 'FLOTTE_ENTREPRISE' : 'ENLEVEMENT_MAGASIN')
  const numVehiculeId = (mode === 'FLOTTE_ENTREPRISE' && vehiculeId) ? toInt(vehiculeId) : undefined
  const vehicule = numVehiculeId ? vehicules.find((v) => v.id === numVehiculeId) : undefined

  let chauffeurFinal: string | undefined = undefined
  if (mode === 'FLOTTE_ENTREPRISE' && vehicule) {
    chauffeurFinal = vehicule.chauffeurNom
  } else if (mode === 'VEHICULE_CLIENT') {
    chauffeurFinal = clientChauffeur ? String(clientChauffeur).trim() : 'Chauffeur Client'
  }

  const refBL = `BL-${Date.now().toString().slice(-6)}`
  const nouveauBL: any = {
    id: bonsLivraison.length + 1,
    numeroBL: refBL,
    agenceId: numAg,
    venteId: numVenteId,
    clientNom: String(clientNom || 'Client Comptoir').trim(),
    clientTelephone: clientTelephone ? String(clientTelephone).trim() : undefined,
    adresseLivraison: String(adresseLivraison || (mode === 'ENLEVEMENT_MAGASIN' ? 'Retrait sur place (Comptoir Dépôt)' : 'Adresse Client')).trim(),
    modeTransport: mode,
    clientVehicule: mode === 'VEHICULE_CLIENT' ? String(clientVehicule || 'Véhicule Client').trim() : undefined,
    clientChauffeur: mode === 'VEHICULE_CLIENT' ? chauffeurFinal : undefined,
    vehiculeId: numVehiculeId,
    chauffeurNom: chauffeurFinal,
    quantiteSacs: Number(quantiteSacs) || 1,
    poidsTotalKg: Number(poidsTotalKg) || ((Number(quantiteSacs) || 1) * 25),
    statut: mode === 'ENLEVEMENT_MAGASIN' ? 'LIVRE' : 'PREPARATION',
    dateCreation: new Date().toISOString(),
    observations: observations ? String(observations).trim() : undefined,
  }

  if (vehicule) {
    vehicule.statut = 'EN_COURSE'
  }

  bonsLivraison.unshift(nouveauBL)
  logAudit(
    currentUser.nom,
    'CREATION_BON_LIVRAISON',
    `Bordereau ${refBL} généré (${mode === 'ENLEVEMENT_MAGASIN' ? 'Retrait comptoir' : mode === 'VEHICULE_CLIENT' ? `Véhicule client ${clientVehicule || ''}` : `Camion société ${vehicule?.marqueModele || ''}`}, ${nouveauBL.quantiteSacs} sacs)`,
    numAg
  )
  res.json({ ...nouveauBL, vehicule })
})

router.put('/logistique/livraisons/:id/statut', (req: Request, res: Response) => {
  const currentUser = getUserFromToken(req)
  if (!currentUser) return res.status(401).json({ message: 'Non autorisé' })

  const bl = bonsLivraison.find((b) => b.id === toInt(req.params.id))
  if (!bl) return res.status(404).json({ message: 'Bon de livraison introuvable' })

  const { statut, recepteurNom, recepteurSignature, observations } = req.body
  if (statut) bl.statut = statut
  if (recepteurNom) bl.recepteurNom = recepteurNom
  if (recepteurSignature) bl.recepteurSignature = recepteurSignature
  if (observations) bl.observations = observations

  if (statut === 'EN_TRANSIT') {
    bl.dateDepart = new Date().toISOString()
  } else if (statut === 'LIVRE') {
    bl.dateLivraison = new Date().toISOString()
    if (bl.vehiculeId) {
      const v = vehicules.find((veh) => veh.id === bl.vehiculeId)
      if (v) v.statut = 'DISPONIBLE'
    }
  }

  logAudit(currentUser.nom, 'STATUT_LIVRAISON', `Bordereau ${bl.numeroBL} passé au statut ${statut} par ${currentUser.nom}`, bl.agenceId)
  res.json({ message: 'Statut du bon de livraison mis à jour', bonLivraison: bl })
})

router.get('/logistique/livraisons/:id/document', (req: Request, res: Response) => {
  const bl = bonsLivraison.find((b) => b.id === toInt(req.params.id))
  if (!bl) return res.status(404).send('Bon de livraison introuvable')

  const agence = agences.find((a) => a.id === bl.agenceId)
  let vente = bl.venteId ? (ventes.find((v) => v.id === bl.venteId) as any) : undefined
  if (!vente) {
    vente = {
      id: bl.id,
      referenceVente: bl.numeroBL,
      agenceId: bl.agenceId,
      clientId: 0,
      vendeurId: 1,
      dateVente: bl.dateCreation,
      montantTotal: 0,
      devise: 'USD' as const,
      modePaiement: 'CASH_USD' as const,
      statutCredit: 'AUCUN' as const,
      estCredit: false,
      details: [],
    } as any
  }

  const client = {
    id: 0,
    nom: bl.clientNom,
    telephone: bl.clientTelephone || 'Comptoir',
    adresse: bl.adresseLivraison || 'Enlèvement dépôt',
    agenceId: bl.agenceId,
    soldeDette: 0,
    plafondCredit: 0,
    estBloque: false,
  }

  const defaultArt = articles[0]
  const details = [
    {
      articleId: defaultArt?.id || 1,
      article: defaultArt || { id: 1, designation: 'Farine Extra Matabishi 25kg', uniteMesure: 'Sac 25kg' },
      quantite: bl.quantiteSacs || 1,
      prixUnitaire: 0,
      montantLigne: 0,
      numeroLot: `LOT-BL-${bl.numeroBL.slice(-4)}`,
    },
  ]

  const blAny = bl as any
  const vehicule = bl.vehiculeId ? vehicules.find((v) => v.id === bl.vehiculeId) : undefined
  const transportInfo = {
    modeTransport: blAny.modeTransport || 'ENLEVEMENT_MAGASIN',
    clientVehicule: blAny.clientVehicule,
    clientChauffeur: blAny.clientChauffeur,
    vehicule,
  }

  const html = renderBonLivraisonHtml(vente, agence, client, details, transportInfo, parametresEntreprise)
  res.setHeader('Content-Type', 'text/html; charset=utf-8')
  res.send(html)
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

router.post('/tresorerie/transfert-interne', (req: Request, res: Response) => {
  const currentUser = getUserFromToken(req)
  if (!currentUser) return res.status(401).json({ message: 'Non autorisé' })

  const { sourceCaisseId, destinationCaisseId, montant, devise, referenceBordereau, motif } = req.body
  const numSourceId = toInt(sourceCaisseId)
  const numDestId = toInt(destinationCaisseId)
  const numMontant = Number(montant)
  const dev = devise === 'CDF' ? 'CDF' : 'USD'

  if (numSourceId === numDestId) {
    return res.status(400).json({ message: 'Le compte source et le compte destination doivent être différents.' })
  }
  if (!numMontant || numMontant <= 0) {
    return res.status(400).json({ message: 'Le montant du virement doit être supérieur à zéro.' })
  }

  const source = comptesCaisse.find((c) => c.id === numSourceId)
  const dest = comptesCaisse.find((c) => c.id === numDestId)
  if (!source || !dest) {
    return res.status(404).json({ message: 'Compte de trésorerie source ou destination introuvable.' })
  }

  // Contrôle du solde disponible
  const soldeDispo = dev === 'USD' ? source.soldeUsd : source.soldeCdf
  if (soldeDispo < numMontant) {
    return res.status(400).json({
      message: `Solde insuffisant sur ${source.nom}. Disponible: ${soldeDispo.toFixed(2)} ${dev}, Demandé: ${numMontant.toFixed(2)} ${dev}.`
    })
  }

  // 1. Déduction sur le compte source
  if (dev === 'USD') source.soldeUsd -= numMontant
  else source.soldeCdf -= numMontant

  // 2. Majoration sur le compte destination
  if (dev === 'USD') dest.soldeUsd += numMontant
  else dest.soldeCdf += numMontant

  const refVir = `VIR-${Date.now().toString().slice(-6)}`
  const bordereau = referenceBordereau ? String(referenceBordereau).trim() : refVir
  const agId = source.agenceId || 1
  const activeRate = tauxChanges.find((t) => t.agenceId === agId && t.statut === 'VALIDE' && t.actif)?.taux || 2850

  // 3. Enregistrement des transactions de trésorerie
  const txSortie: any = {
    id: `TX-${Date.now().toString().slice(-8)}-OUT`,
    referenceInterne: `${refVir}-OUT`,
    agenceId: source.agenceId,
    caisseId: source.id,
    montant: numMontant,
    devise: dev,
    tauxApplique: activeRate,
    type: 'SORTIE',
    libelle: `Virement interne vers ${dest.nom} (${bordereau}) - ${motif || 'Transfert de fonds'}`,
    statut: 'VALIDE',
    createurId: currentUser.id,
    validateurId: currentUser.id,
    dateCreation: new Date().toISOString(),
    dateValidation: new Date().toISOString(),
  }
  const txEntree: any = {
    id: `TX-${Date.now().toString().slice(-8)}-IN`,
    referenceInterne: `${refVir}-IN`,
    agenceId: dest.agenceId,
    caisseId: dest.id,
    montant: numMontant,
    devise: dev,
    tauxApplique: activeRate,
    type: 'ENTREE',
    libelle: `Virement interne reçu de ${source.nom} (${bordereau}) - ${motif || 'Transfert de fonds'}`,
    statut: 'VALIDE',
    createurId: currentUser.id,
    validateurId: currentUser.id,
    dateCreation: new Date().toISOString(),
    dateValidation: new Date().toISOString(),
  }
  transactions.unshift(txEntree, txSortie)

  // 4. Écritures comptables normalisées SYSCOHADA via compte 585 (Virements internes)
  const numCompteSource = source.type === 'BANQUE' ? '521' : (dev === 'USD' ? '571' : '572')
  const numCompteDest = dest.type === 'BANQUE' ? '521' : (dev === 'USD' ? '571' : '572')

  // Phase A : Sortie du compte source vers 585
  ecrituresComptables.push(
    {
      id: ecrituresComptables.length + 1,
      referenceOperation: refVir,
      agenceId: source.agenceId,
      compteNumero: '585',
      sens: 'DEBIT',
      montant: numMontant,
      devise: dev,
      tauxApplique: activeRate,
      libelle: `Virement de fonds : Débit compte 585 par ${source.nom}`,
      sourceModule: 'TRESORERIE',
      sourceType: 'VIREMENT_INTERNE',
      sourceId: refVir,
      annulee: false,
      statutValidation: 'VALIDE',
      dateEcriture: new Date().toISOString(),
    },
    {
      id: ecrituresComptables.length + 2,
      referenceOperation: refVir,
      agenceId: source.agenceId,
      compteNumero: numCompteSource,
      sens: 'CREDIT',
      montant: numMontant,
      devise: dev,
      tauxApplique: activeRate,
      libelle: `Décaissement ${source.nom} pour virement vers ${dest.nom}`,
      sourceModule: 'TRESORERIE',
      sourceType: 'VIREMENT_INTERNE',
      sourceId: refVir,
      annulee: false,
      statutValidation: 'VALIDE',
      dateEcriture: new Date().toISOString(),
    }
  )

  // Phase B : Réception sur compte destination depuis 585
  ecrituresComptables.push(
    {
      id: ecrituresComptables.length + 3,
      referenceOperation: refVir,
      agenceId: dest.agenceId,
      compteNumero: numCompteDest,
      sens: 'DEBIT',
      montant: numMontant,
      devise: dev,
      tauxApplique: activeRate,
      libelle: `Encaissement ${dest.nom} provenant de ${source.nom}`,
      sourceModule: 'TRESORERIE',
      sourceType: 'VIREMENT_INTERNE',
      sourceId: refVir,
      annulee: false,
      statutValidation: 'VALIDE',
      dateEcriture: new Date().toISOString(),
    },
    {
      id: ecrituresComptables.length + 4,
      referenceOperation: refVir,
      agenceId: dest.agenceId,
      compteNumero: '585',
      sens: 'CREDIT',
      montant: numMontant,
      devise: dev,
      tauxApplique: activeRate,
      libelle: `Apurement compte 585 par réception sur ${dest.nom}`,
      sourceModule: 'TRESORERIE',
      sourceType: 'VIREMENT_INTERNE',
      sourceId: refVir,
      annulee: false,
      statutValidation: 'VALIDE',
      dateEcriture: new Date().toISOString(),
    }
  )

  logAudit(
    currentUser.nom,
    'VIREMENT_INTERNE_TRESORERIE',
    `Virement de ${numMontant} ${dev} depuis ${source.nom} vers ${dest.nom} (Réf: ${bordereau})`,
    source.agenceId
  )

  res.json({
    message: `Virement interne de ${numMontant} ${dev} effectué avec succès.`,
    reference: refVir,
    source,
    dest,
  })
})

// ----------------- RAPPROCHEMENT BANCAIRE -----------------
router.get('/tresorerie/rapprochements', (req: Request, res: Response) => {
  const agenceId = req.query.agenceId ? toInt(req.query.agenceId) : undefined
  const caisseId = req.query.caisseId ? toInt(req.query.caisseId) : undefined
  const list = rapprochementsBancaires
    .filter((r) => (!agenceId || r.agenceId === agenceId) && (!caisseId || r.compteCaisseId === caisseId))
    .map((r) => {
      const compte = comptesCaisse.find((c) => c.id === r.compteCaisseId)
      return {
        ...r,
        compte,
      }
    })
  res.json(list)
})

router.post('/tresorerie/rapprochements', (req: Request, res: Response) => {
  const currentUser = getUserFromToken(req)
  if (!currentUser) return res.status(401).json({ message: 'Non autorisé' })

  const { compteCaisseId, agenceId, dateDebut, dateFin, soldeDebutReleve, soldeFinReleve, devise } = req.body
  const numCaisseId = toInt(compteCaisseId)
  const numAg = toInt(agenceId) || 1
  const compte = comptesCaisse.find((c) => c.id === numCaisseId)
  if (!compte) return res.status(404).json({ message: 'Compte bancaire introuvable' })

  const dev = devise === 'CDF' ? 'CDF' : 'USD'
  const soldeComptableActuel = dev === 'USD' ? compte.soldeUsd : compte.soldeCdf
  const sFinReleve = Number(soldeFinReleve) || 0
  const ecart = Math.round((soldeComptableActuel - sFinReleve) * 100) / 100

  const nouveauRapprochement: any = {
    id: rapprochementsBancaires.length + 1,
    compteCaisseId: numCaisseId,
    agenceId: numAg,
    dateDebut: dateDebut || new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString().slice(0, 10),
    dateFin: dateFin || new Date().toISOString().slice(0, 10),
    soldeDebutReleve: Number(soldeDebutReleve) || 0,
    soldeFinReleve: sFinReleve,
    soldeComptable: soldeComptableActuel,
    ecart,
    devise: dev,
    statut: 'EN_COURS',
    auteur: currentUser.nom,
    operationsPointees: [],
  }

  rapprochementsBancaires.unshift(nouveauRapprochement)
  logAudit(currentUser.nom, 'CREATION_RAPPROCHEMENT_BANCAIRE', `État de rapprochement initié pour ${compte.nom} (Solde extrait: ${sFinReleve} ${dev}, Solde compta: ${soldeComptableActuel} ${dev})`, numAg)
  res.json({ ...nouveauRapprochement, compte })
})

router.post('/tresorerie/rapprochements/:id/pointer', (req: Request, res: Response) => {
  const currentUser = getUserFromToken(req)
  if (!currentUser) return res.status(401).json({ message: 'Non autorisé' })

  const rap = rapprochementsBancaires.find((r) => r.id === toInt(req.params.id))
  if (!rap) return res.status(404).json({ message: 'Rapprochement bancaire introuvable' })

  const { operationId } = req.body
  if (!operationId) return res.status(400).json({ message: 'ID opération requis' })

  const strOp = String(operationId)
  if (rap.operationsPointees.includes(strOp)) {
    rap.operationsPointees = rap.operationsPointees.filter((id) => id !== strOp)
  } else {
    rap.operationsPointees.push(strOp)
  }

  res.json({ message: 'Pointage mis à jour', operationsPointees: rap.operationsPointees })
})

router.post('/tresorerie/rapprochements/:id/valider', (req: Request, res: Response) => {
  const currentUser = getUserFromToken(req)
  if (!currentUser) return res.status(401).json({ message: 'Non autorisé' })

  const rap = rapprochementsBancaires.find((r) => r.id === toInt(req.params.id))
  if (!rap) return res.status(404).json({ message: 'Rapprochement bancaire introuvable' })

  rap.statut = 'VALIDE'
  rap.dateCloture = new Date().toISOString()
  logAudit(currentUser.nom, 'VALIDATION_RAPPROCHEMENT_BANCAIRE', `Rapprochement #${rap.id} validé et clôturé. Écart final: ${rap.ecart} ${rap.devise}`, rap.agenceId)

  res.json({ message: 'État de rapprochement bancaire validé avec succès', rapprochement: rap })
})

// ----------------- ÉTATS DE BESOIN & DEMANDES DE FONDS -----------------
router.get('/etats-besoin', (req: Request, res: Response) => {
  const agenceId = req.query.agenceId ? toInt(req.query.agenceId) : undefined
  const statut = req.query.statut as string | undefined

  let list = etatsBesoin.filter((eb) => !agenceId || eb.agenceId === agenceId)
  if (statut) list = list.filter((eb) => eb.statut === statut)

  res.json(list.map((eb) => ({
    ...eb,
    agence: agences.find((a) => a.id === eb.agenceId),
  })))
})

router.post('/etats-besoin', (req: Request, res: Response) => {
  const currentUser = getUserFromToken(req)
  if (!currentUser) return res.status(401).json({ message: 'Non autorisé' })

  const { agenceId, serviceDemandeur, motif, montant, devise, compteImputation, observations, entretienTechniqueId } = req.body
  const numMontant = Number(montant)
  if (!numMontant || numMontant <= 0 || !motif) {
    return res.status(400).json({ message: 'Montant supérieur à 0 et motif requis' })
  }

  const nouveauEB = {
    id: etatsBesoin.length + 1,
    numeroEB: `EB-2026-${String(etatsBesoin.length + 1).padStart(4, '0')}`,
    agenceId: toInt(agenceId) || currentUser.agenceId || 1,
    serviceDemandeur: serviceDemandeur ? String(serviceDemandeur).trim() : 'Service Général',
    demandeurNom: currentUser.nom,
    demandeurId: currentUser.id,
    motif: String(motif).trim(),
    montant: numMontant,
    devise: (devise === 'CDF' ? 'CDF' : 'USD') as 'USD' | 'CDF',
    compteImputation: compteImputation ? String(compteImputation).trim() : '605',
    dateDemande: new Date().toISOString(),
    statut: 'SOUMIS' as const,
    entretienTechniqueId: entretienTechniqueId ? toInt(entretienTechniqueId) : undefined,
    observations: observations ? String(observations).trim() : undefined,
  }

  etatsBesoin.unshift(nouveauEB)
  logAudit(currentUser.nom, 'CREATION_ETAT_BESOIN', `État de besoin initié: ${nouveauEB.numeroEB} (${nouveauEB.montant} ${nouveauEB.devise}) par ${nouveauEB.demandeurNom}`, nouveauEB.agenceId)
  res.json(nouveauEB)
})

router.post('/etats-besoin/:id/valider-chef', (req: Request, res: Response) => {
  const currentUser = getUserFromToken(req)
  if (!currentUser) return res.status(401).json({ message: 'Non autorisé' })

  const isAuthorized = currentUser.role === 'CHEF_AGENCE' || currentUser.role === 'SUPER_ADMIN' || currentUser.role === 'ADMIN_SIEGE'
  if (!isAuthorized) {
    return res.status(403).json({ message: 'Seul le Chef d Agence ou un Administrateur peut valider un état de besoin.' })
  }

  const eb = etatsBesoin.find((e) => e.id === toInt(req.params.id))
  if (!eb) return res.status(404).json({ message: 'État de besoin introuvable' })

  if (eb.statut !== 'SOUMIS' && eb.statut !== 'ATTENTE_VISA_SIEGE') {
    return res.status(400).json({ message: `Cet état de besoin ne peut plus être validé (statut actuel: ${eb.statut})` })
  }

  const plafondUsd = parametresEntreprise.plafondAutonomieEtatBesoinAgenceUsd || 200
  const montantEquivalentUsd = eb.devise === 'USD' ? eb.montant : eb.montant / 2850

  // Si c'est l'Admin Siège ou Super Admin qui valide : visa accordé directement
  if (currentUser.role === 'SUPER_ADMIN' || currentUser.role === 'ADMIN_SIEGE') {
    eb.statut = 'APPROUVE_SIEGE'
    eb.chefValidateurNom = eb.chefValidateurNom || `${currentUser.nom} (Admin Siège)`
    eb.visaSiegeNom = `${currentUser.nom} (Admin Siège)`
    eb.dateValidationChef = eb.dateValidationChef || new Date().toISOString()
    eb.dateVisaSiege = new Date().toISOString()

    logAudit(currentUser.nom, 'VISA_DIRECTION_ETAT_BESOIN', `État de besoin ${eb.numeroEB} (${eb.montant} ${eb.devise}) validé avec Visa Direction Siège. Transmis en caisse.`, eb.agenceId)
    return res.json({ message: 'État de besoin approuvé avec Visa Direction Siège. Prêt pour décaissement au guichet caisse.', etatBesoin: eb })
  }

  // Si c'est un Chef d'Agence local :
  eb.chefValidateurNom = `${currentUser.nom} (Chef Agence)`
  eb.dateValidationChef = new Date().toISOString()

  if (montantEquivalentUsd <= plafondUsd) {
    eb.statut = 'APPROUVE_CHEF'
    logAudit(currentUser.nom, 'VALIDATION_CHEF_ETAT_BESOIN', `État de besoin ${eb.numeroEB} sous le plafond d'autonomie ($${plafondUsd} USD) validé par le Chef d'Agence. Prêt pour décaissement.`, eb.agenceId)
    res.json({ message: `État de besoin validé par le Chef d'Agence (Montant conforme au plafond d'autonomie de $${plafondUsd} USD). Prêt pour caisse.`, etatBesoin: eb })
  } else {
    eb.statut = 'ATTENTE_VISA_SIEGE'
    logAudit(currentUser.nom, 'DEMANDE_VISA_SIEGE_ETAT_BESOIN', `État de besoin ${eb.numeroEB} ($${eb.montant} ${eb.devise}) excède le seuil de $${plafondUsd} USD. Transmis à l'Admin du Siège pour visa obligatoire.`, eb.agenceId)
    res.json({ message: `État de besoin visé par le Chef d'Agence, mais transmis pour Visa obligatoire à l'Admin du Siège car le montant dépasse le seuil d'autonomie fixé à $${plafondUsd} USD.`, etatBesoin: eb })
  }
})

router.post('/etats-besoin/:id/visa-siege', (req: Request, res: Response) => {
  const currentUser = getUserFromToken(req)
  if (!currentUser) return res.status(401).json({ message: 'Non autorisé' })

  if (currentUser.role !== 'SUPER_ADMIN' && currentUser.role !== 'ADMIN_SIEGE') {
    return res.status(403).json({ message: 'Seul l Admin du Siège ou le Super Admin peut accorder le visa de direction générale.' })
  }

  const eb = etatsBesoin.find((e) => e.id === toInt(req.params.id))
  if (!eb) return res.status(404).json({ message: 'État de besoin introuvable' })

  eb.statut = 'APPROUVE_SIEGE'
  eb.visaSiegeNom = `${currentUser.nom} (Admin Siège)`
  eb.dateVisaSiege = new Date().toISOString()

  logAudit(currentUser.nom, 'VISA_SIEGE_ETAT_BESOIN', `Visa Direction Siège accordé pour ${eb.numeroEB} (${eb.montant} ${eb.devise}). Autorisation de décaissement transmise à la caisse de l'agence.`, eb.agenceId)
  res.json({ message: 'Visa de Direction Générale accordé avec succès. Les fonds peuvent être décaissés au guichet caisse.', etatBesoin: eb })
})

router.post('/etats-besoin/:id/decaissement', (req: Request, res: Response) => {
  const currentUser = getUserFromToken(req)
  if (!currentUser) return res.status(401).json({ message: 'Non autorisé' })

  const eb = etatsBesoin.find((e) => e.id === toInt(req.params.id))
  if (!eb) return res.status(404).json({ message: 'État de besoin introuvable' })

  if (eb.statut !== 'APPROUVE_CHEF' && eb.statut !== 'APPROUVE_SIEGE' && currentUser.role !== 'SUPER_ADMIN') {
    if (eb.statut === 'ATTENTE_VISA_SIEGE') {
      const plafondUsd = parametresEntreprise.plafondAutonomieEtatBesoinAgenceUsd || 200
      return res.status(400).json({
        message: `Ce montant excède le seuil d'autonomie d'agence ($${plafondUsd} USD). Le visa préalable de l'Admin du Siège est obligatoire avant tout décaissement en caisse.`,
      })
    }
    return res.status(400).json({ message: 'L état de besoin doit d abord être approuvé avant libération des fonds.' })
  }

  const { caisseId } = req.body
  const numCaisseId = toInt(caisseId) || 1
  const caisse = comptesCaisse.find((c) => c.id === numCaisseId)
  if (!caisse) return res.status(404).json({ message: 'Compte de caisse sélectionné introuvable' })

  if (eb.devise === 'USD') {
    if (caisse.soldeUsd < eb.montant) {
      return res.status(400).json({ message: `Solde insuffisant en caisse USD (Disponible: $${caisse.soldeUsd.toFixed(2)}, Requis: $${eb.montant.toFixed(2)})` })
    }
    caisse.soldeUsd -= eb.montant
  } else {
    if (caisse.soldeCdf < eb.montant) {
      return res.status(400).json({ message: `Solde insuffisant en caisse CDF (Disponible: ${caisse.soldeCdf.toLocaleString('fr-FR')} CDF, Requis: ${eb.montant.toLocaleString('fr-FR')} CDF)` })
    }
    caisse.soldeCdf -= eb.montant
  }

  const refPiece = `BDEC-2026-${String(transactions.length + 1).padStart(4, '0')}`

  eb.statut = 'DECAISSE'
  eb.caisseId = caisse.id
  eb.caisseNom = caisse.nom
  eb.caissierNom = currentUser.nom
  eb.dateDecaissement = new Date().toISOString()
  eb.numeroPieceCaisse = refPiece

  const nouvelleTx = {
    id: `TX-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${String(transactions.length + 1).padStart(3, '0')}`,
    referenceInterne: refPiece,
    agenceId: eb.agenceId,
    caisseId: caisse.id,
    montant: eb.montant,
    devise: eb.devise,
    tauxApplique: 2850,
    type: 'SORTIE' as const,
    libelle: `Décaissement État de besoin ${eb.numeroEB} (${eb.serviceDemandeur}): ${eb.motif}`,
    statut: 'VALIDE' as const,
    createurId: currentUser.id,
    validateurId: currentUser.id,
    dateCreation: eb.dateDecaissement,
    dateValidation: eb.dateDecaissement,
  }
  transactions.unshift(nouvelleTx)

  const compteCharge = eb.compteImputation || '605'
  const compteCaisse = eb.devise === 'USD' ? '571' : '572'
  ecrituresComptables.push(
    {
      id: ecrituresComptables.length + 1,
      referenceOperation: refPiece,
      agenceId: eb.agenceId,
      compteNumero: compteCharge,
      sens: 'DEBIT',
      montant: eb.montant,
      devise: eb.devise,
      tauxApplique: 2850,
      libelle: `Charge - ${eb.motif}`,
      sourceModule: 'TRESORERIE',
      sourceType: 'ETAT_BESOIN',
      sourceId: String(eb.id),
      annulee: false,
      statutValidation: 'VALIDE',
      dateEcriture: eb.dateDecaissement,
    },
    {
      id: ecrituresComptables.length + 2,
      referenceOperation: refPiece,
      agenceId: eb.agenceId,
      compteNumero: compteCaisse,
      sens: 'CREDIT',
      montant: eb.montant,
      devise: eb.devise,
      tauxApplique: 2850,
      libelle: `Décaissement Caisse - ${eb.numeroEB}`,
      sourceModule: 'TRESORERIE',
      sourceType: 'ETAT_BESOIN',
      sourceId: String(eb.id),
      annulee: false,
      statutValidation: 'VALIDE',
      dateEcriture: eb.dateDecaissement,
    }
  )

  logAudit(currentUser.nom, 'DECAISSEMENT_ETAT_BESOIN', `Fonds libérés pour ${eb.numeroEB} (${eb.montant} ${eb.devise}) par le Caissier ${currentUser.nom} (Pièce: ${refPiece})`, eb.agenceId)

  res.json({
    message: 'Fonds décaissés avec succès. Bon de décaissement émis.',
    etatBesoin: eb,
    numeroPieceCaisse: refPiece,
    soldeRestantCaisse: eb.devise === 'USD' ? caisse.soldeUsd : caisse.soldeCdf,
  })
})

router.post('/etats-besoin/:id/rejeter', (req: Request, res: Response) => {
  const currentUser = getUserFromToken(req)
  if (!currentUser) return res.status(401).json({ message: 'Non autorisé' })

  const eb = etatsBesoin.find((e) => e.id === toInt(req.params.id))
  if (!eb) return res.status(404).json({ message: 'État de besoin introuvable' })

  const { motifRejet } = req.body
  eb.statut = 'REJETE'
  eb.motifRejet = motifRejet ? String(motifRejet).trim() : 'Non justifié par rapport au budget'

  logAudit(currentUser.nom, 'REJET_ETAT_BESOIN', `État de besoin ${eb.numeroEB} rejeté. Motif: ${eb.motifRejet}`, eb.agenceId)
  res.json({ message: 'État de besoin rejeté', etatBesoin: eb })
})

router.get(['/etats-besoin/:id/bon-decaissement', '/etats-besoin/:id/document'], (req: Request, res: Response) => {
  const eb = etatsBesoin.find((e) => e.id === toInt(req.params.id))
  if (!eb) return res.status(404).send('État de besoin introuvable')

  const agence = agences.find((a) => a.id === eb.agenceId)
  const html = renderEtatBesoinBonDecaissementHtml(eb, agence?.nom || 'Agence Locale', parametresEntreprise)
  res.setHeader('Content-Type', 'text/html; charset=utf-8')
  res.send(html)
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
router.get('/production/ordres', (req: Request, res: Response) => {
  const agenceId = req.query.agenceId ? toInt(req.query.agenceId) : undefined
  let list = ordresProduction
  if (agenceId) {
    list = list.filter((op) => op.agenceId === agenceId)
  }
  const enriched = list.map((op) => ({
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

router.post('/production/recettes', (req: Request, res: Response) => {
  const currentUser = getUserFromToken(req)
  if (!currentUser) return res.status(401).json({ message: 'Non autorisé' })

  const { articleFiniId, articleMatiereId, quantiteRequise } = req.body
  if (!articleFiniId || !articleMatiereId || !quantiteRequise) {
    return res.status(400).json({ message: 'Tous les paramètres de recette sont requis.' })
  }

  const nouvelleRecette = {
    id: recettes.length + 1,
    articleFiniId: Number(articleFiniId),
    articleMatiereId: Number(articleMatiereId),
    quantiteRequise: Number(quantiteRequise),
  }

  recettes.push(nouvelleRecette)
  logAudit(currentUser.nom, 'AJOUT_RECETTE_PRODUCTION', `Nouvelle formule technique enregistrée pour article #${articleFiniId}`, 1)
  res.json(nouvelleRecette)
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

router.get(['/production/ordres/:id/document', '/production/ordres/:id/fiche-a4', '/production/ordres/:id/bon-pdf', '/production/ordres/:id/bon'], async (req: Request, res: Response) => {
  const ordreId = toInt(req.params.id)
  const ordre = ordresProduction.find((o) => o.id === ordreId)
  if (!ordre) return res.status(404).send('Ordre de production non trouvé')

  const agence = agences.find((a) => a.id === ordre.agenceId)
  const articleFini = articles.find((a) => a.id === ordre.articleFiniId)
  const recetteLignes = recettes
    .filter((r) => r.articleFiniId === ordre.articleFiniId)
    .map((r) => ({
      ...r,
      articleMatiere: articles.find((a) => a.id === r.articleMatiereId),
    }))

  const qrPayload = {
    type: 'LOT',
    articleId: ordre.articleFiniId,
    codeArticle: articleFini?.codeUnique || `ART-${ordre.articleFiniId}`,
    numeroLot: ordre.lotCree || `LOT-${ordre.codeOrdre}`,
    designation: articleFini?.designation || 'Produit Fini',
    uniteMesure: articleFini?.uniteMesure || 'Unité',
    quantiteInitiale: ordre.quantiteReelle || ordre.quantitePrevue,
    dateFabrication: (ordre.dateCloture || ordre.dateCreation || new Date().toISOString()).slice(0, 10),
    dateExpiration: '2027-06-30',
    codeUnique: ordre.lotCree || `LOT-${ordre.codeOrdre}`,
  }
  const qrSvg = await generateMvgQrSvg(qrPayload)

  const html = renderBonProductionHtml(ordre, agence, articleFini, recetteLignes, parametresEntreprise, qrSvg)
  res.setHeader('Content-Type', 'text/html; charset=utf-8')
  res.send(html)
})

router.get('/production/ordres/:id/etiquettes', async (req: Request, res: Response) => {
  const ordreId = toInt(req.params.id)
  const ordre = ordresProduction.find((o) => o.id === ordreId)
  if (!ordre) return res.status(404).send('Ordre de production non trouvé')

  const agence = agences.find((a) => a.id === ordre.agenceId)
  const articleFini = articles.find((a) => a.id === ordre.articleFiniId)
  const emballageType = (req.query.emballage as string) || articleFini?.uniteMesure || 'Sac de 25 kg'
  const quantiteProduite = Number(ordre.quantiteReelle) || Number(ordre.quantitePrevue) || 50
  const count = req.query.count ? Math.max(1, toInt(req.query.count)) : quantiteProduite

  const html = await renderPlancheEtiquettesQrLotHtml(
    ordre,
    agence,
    articleFini,
    parametresEntreprise,
    emballageType,
    count
  )
  res.setHeader('Content-Type', 'text/html; charset=utf-8')
  res.send(html)
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

// ----------------- COMMANDES D'ACHAT FOURNISSEURS (BC) -----------------
router.get('/achats/commandes', (req: Request, res: Response) => {
  const agenceId = req.query.agenceId ? toInt(req.query.agenceId) : undefined
  const list = commandesAchat
    .filter((c) => !agenceId || c.agenceId === agenceId)
    .map((c) => ({
      ...c,
      fournisseur: fournisseurs.find((f) => f.id === c.fournisseurId),
      agence: agences.find((a) => a.id === c.agenceId),
    }))
  res.json(list)
})

router.post('/achats/commandes', (req: Request, res: Response) => {
  const currentUser = getUserFromToken(req)
  if (!currentUser) return res.status(401).json({ message: 'Non autorisé' })

  const { agenceId, fournisseurId, produit, quantiteKg, prixUnitaireKgUsd, observations } = req.body
  const numAg = toInt(agenceId) || 1
  const numFourn = toInt(fournisseurId)
  const four = fournisseurs.find((f) => f.id === numFourn)
  if (!four) return res.status(404).json({ message: 'Fournisseur introuvable' })

  const qte = Number(quantiteKg) || 1000
  const pu = Number(prixUnitaireKgUsd) || 0.40
  const total = Math.round(qte * pu * 100) / 100
  const refBC = `BC-${Date.now().toString().slice(-6)}`

  const nouvelleCommande: any = {
    id: commandesAchat.length + 1,
    numeroBC: refBC,
    agenceId: numAg,
    fournisseurId: numFourn,
    fournisseurNom: four.nom,
    produit: String(produit || 'Maïs en grains blanc sec').trim(),
    quantiteKg: qte,
    prixUnitaireKgUsd: pu,
    montantTotalUsd: total,
    dateCommande: new Date().toISOString(),
    statut: 'APPROUVEE',
    observations: observations ? String(observations).trim() : undefined,
  }

  commandesAchat.unshift(nouvelleCommande)
  logAudit(currentUser.nom, 'CREATION_COMMANDE_ACHAT', `Bon de commande ${refBC} créé pour ${four.nom} : ${qte} kg (${total} USD)`, numAg)
  res.json(nouvelleCommande)
})

// ----------------- RÉCEPTIONS & PESÉE PONT-BASCULE (BR) -----------------
router.get('/achats/receptions', (req: Request, res: Response) => {
  const agenceId = req.query.agenceId ? toInt(req.query.agenceId) : undefined
  const list = receptionsPontBascule
    .filter((r) => !agenceId || r.agenceId === agenceId)
    .map((r) => ({
      ...r,
      commande: commandesAchat.find((c) => c.id === r.commandeAchatId),
      agence: agences.find((a) => a.id === r.agenceId),
    }))
  res.json(list)
})

router.post('/achats/receptions', (req: Request, res: Response) => {
  const currentUser = getUserFromToken(req)
  if (!currentUser) return res.status(401).json({ message: 'Non autorisé' })

  const {
    commandeAchatId,
    agenceId,
    fournisseurId,
    produit,
    immatriculationCamion,
    chauffeur,
    peseeBruteKg,
    peseeTareKg,
    tauxHumidite,
    tauxImpuretes,
    prixUnitaireKgUsd,
    observations,
  } = req.body

  const numAg = toInt(agenceId) || 1
  const numCmdId = commandeAchatId ? toInt(commandeAchatId) : undefined
  const cmd = numCmdId ? commandesAchat.find((c) => c.id === numCmdId) : undefined
  const numFourn = fournisseurId ? toInt(fournisseurId) : (cmd ? cmd.fournisseurId : 1)
  const four = fournisseurs.find((f) => f.id === numFourn)

  const pBrut = Number(peseeBruteKg) || 0
  const pTare = Number(peseeTareKg) || 0
  if (pBrut <= pTare) {
    return res.status(400).json({ message: 'Le poids brut (camion plein) doit être supérieur au poids tare (camion vide).' })
  }

  const pNet = pBrut - pTare
  const hum = Number(tauxHumidite) || 12.5
  const imp = Number(tauxImpuretes) || 1.0

  let refactionPourcent = 0
  if (hum > 13.5) refactionPourcent += (hum - 13.5) * 1.2
  if (imp > 2.0) refactionPourcent += (imp - 2.0)
  const refactionKg = Math.round(pNet * (refactionPourcent / 100))
  const pNetAccepte = Math.max(0, pNet - refactionKg)

  const pu = Number(prixUnitaireKgUsd) || (cmd ? cmd.prixUnitaireKgUsd : 0.42)
  const montantTotalFacture = Math.round(pNetAccepte * pu * 100) / 100
  const refBR = `BR-${Date.now().toString().slice(-6)}`

  const nouvelleReception: any = {
    id: receptionsPontBascule.length + 1,
    numeroBR: refBR,
    commandeAchatId: numCmdId,
    numeroBC: cmd ? cmd.numeroBC : undefined,
    agenceId: numAg,
    fournisseurId: numFourn,
    fournisseurNom: four ? four.nom : 'Fournisseur Local',
    produit: String(produit || (cmd ? cmd.produit : 'Maïs en grains blanc sec')).trim(),
    immatriculationCamion: String(immatriculationCamion || 'CAMION-LOCAL').trim().toUpperCase(),
    chauffeur: String(chauffeur || 'Chauffeur').trim(),
    peseeBruteKg: pBrut,
    peseeTareKg: pTare,
    poidsNetKg: pNet,
    tauxHumidite: hum,
    tauxImpuretes: imp,
    refactionKg,
    poidsNetAccepteKg: pNetAccepte,
    prixUnitaireKgUsd: pu,
    montantTotalFactureUsd: montantTotalFacture,
    statut: 'VALIDE',
    datePeseeBrute: new Date().toISOString(),
    datePeseeTare: new Date().toISOString(),
    magasinierNom: currentUser.nom,
    observations: observations ? String(observations).trim() : undefined,
  }

  receptionsPontBascule.unshift(nouvelleReception)

  // 1. Entrée automatique en stock matière première
  const artGrains = articles.find((a) => a.designation.toLowerCase().includes('maïs') && a.designation.toLowerCase().includes('grain')) || articles[0]
  if (artGrains) {
    const lotId = `LOT-PONT-${Date.now().toString().slice(-4)}`
    stocksAgence.push({
      id: stocksAgence.length + 1,
      agenceId: numAg,
      articleId: artGrains.id,
      quantite: pNetAccepte,
      numeroLot: lotId,
      dateExpiration: '2027-12-31',
      seuilAlerte: 2000,
    })
  }

  // 2. Mise à jour de la dette fournisseur (Compte 401)
  if (four) {
    four.soldeDette = Math.round((four.soldeDette + montantTotalFacture) * 100) / 100
  }

  // 3. Mise à jour statut commande si applicable
  if (cmd) {
    cmd.statut = 'SOLDEE'
  }

  logAudit(
    currentUser.nom,
    'PESEE_PONT_BASCULE',
    `Pesée réception ${refBR} : Camion ${nouvelleReception.immatriculationCamion}, Net: ${pNet} kg, Accepté: ${pNetAccepte} kg (${montantTotalFacture} USD)`,
    numAg
  )

  res.json({ message: 'Pesée et réception validées. Matière première intégrée au stock.', reception: nouvelleReception })
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

  // Si un acompte ou paiement comptant a été versé à l'achat
  if (numPaye > 0) {
    const caisse = comptesCaisse.find((c) => c.agenceId === numAg) || comptesCaisse[0]
    if (caisse) {
      if (devise === 'USD') caisse.soldeUsd = Math.max(0, caisse.soldeUsd - numPaye)
      else caisse.soldeCdf = Math.max(0, caisse.soldeCdf - numPaye)
    }

    const refPaiement = `PAI-${ref}`
    ecrituresComptables.push(
      {
        id: ecrituresComptables.length + 1,
        referenceOperation: refPaiement,
        agenceId: numAg,
        compteNumero: '401',
        sens: 'DEBIT',
        montant: numPaye,
        devise: devise || 'USD',
        libelle: `Règlement comptant achat ${ref} à ${four?.nom || 'Fournisseur'}`,
        sourceModule: 'ACHATS',
        sourceType: 'PAIEMENT_FOURNISSEUR',
        sourceId: String(nouvelAchat.id),
        annulee: false,
        statutValidation: 'VALIDE',
        dateEcriture: new Date().toISOString(),
      },
      {
        id: ecrituresComptables.length + 2,
        referenceOperation: refPaiement,
        agenceId: numAg,
        compteNumero: devise === 'USD' ? '571' : '572',
        sens: 'CREDIT',
        montant: numPaye,
        devise: devise || 'USD',
        libelle: `Décaissement caisse achat ${ref}`,
        sourceModule: 'ACHATS',
        sourceType: 'PAIEMENT_FOURNISSEUR',
        sourceId: String(nouvelAchat.id),
        annulee: false,
        statutValidation: 'VALIDE',
        dateEcriture: new Date().toISOString(),
      }
    )
  }

  logAudit(currentUser?.nom || 'Chef', 'COMMANDE_ACHAT_RECUE', `Achat ${ref} : ${numTotal} ${devise} reçu en stock (Acompte payé: ${numPaye})`, numAg)
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

  const { agenceSourceId, agenceDestId, lignes, vehiculeId } = req.body
  const numSrc = toInt(agenceSourceId)
  const numDest = toInt(agenceDestId)

  if (numSrc === numDest) {
    return res.status(400).json({ message: 'L agence de destination doit être différente de l agence source.' })
  }

  const vehicule = vehiculeId ? vehicules.find((v) => v.id === Number(vehiculeId)) : undefined

  // Déterminer le statut initial selon les règles de double validation
  let statutInitial: 'EN_ATTENTE_VALIDATION_SOURCE' | 'EN_ATTENTE_VISA_SIEGE' | 'EN_TRANSIT' = 'EN_ATTENTE_VISA_SIEGE'
  let valSourceNom: string | undefined = undefined
  let dateValSource: string | undefined = undefined
  let valSiegeNom: string | undefined = undefined
  let dateValSiege: string | undefined = undefined

  if (currentUser.role === 'SUPER_ADMIN' || currentUser.role === 'ADMIN_SIEGE') {
    // Si initié directement par l'Admin Siège : visa immédiat et départ
    statutInitial = 'EN_TRANSIT'
    valSourceNom = `${currentUser.nom} (Admin Siège)`
    dateValSource = new Date().toISOString()
    valSiegeNom = `${currentUser.nom} (Admin Siège)`
    dateValSiege = new Date().toISOString()

    // Déduire directement le stock source
    for (const ligne of (lignes || [])) {
      const stock = stocksAgence.find((s) => s.agenceId === numSrc && s.articleId === Number(ligne.articleId) && s.numeroLot === ligne.numeroLot)
      if (stock) {
        stock.quantite = Math.max(0, stock.quantite - Number(ligne.quantite))
      }
    }
    if (vehicule) {
      vehicule.statut = 'EN_COURSE'
    }
  } else if (currentUser.role === 'CHEF_AGENCE') {
    // Initié par le chef de l'agence source : 1ère validation acquise, en attente du Visa Siège
    statutInitial = 'EN_ATTENTE_VISA_SIEGE'
    valSourceNom = `${currentUser.nom} (Chef Agence Source)`
    dateValSource = new Date().toISOString()
  } else {
    // Initié par un magasinier : nécessite la validation du chef d'agence source
    statutInitial = 'EN_ATTENTE_VALIDATION_SOURCE'
  }

  const nouveauTransfert = {
    id: transfertsStock.length + 1,
    referenceTransfert: `TRF-${numSrc}-${numDest}-${Date.now().toString().slice(-4)}`,
    agenceSourceId: numSrc,
    agenceDestId: numDest,
    dateCreation: new Date().toISOString(),
    dateExpedition: new Date().toISOString(),
    statut: statutInitial,
    initiateurNom: currentUser.nom,
    validationSourceNom: valSourceNom,
    dateValidationSource: dateValSource,
    visaSiegeNom: valSiegeNom,
    dateVisaSiege: dateValSiege,
    vehiculeId: vehicule?.id,
    immatriculationCamion: vehicule?.plaqueImmatriculation,
    chauffeurNom: vehicule?.chauffeurNom,
    lignes: (lignes || []).map((l: any, idx: number) => ({
      id: idx + 1,
      articleId: Number(l.articleId),
      quantite: Number(l.quantite),
      numeroLot: l.numeroLot,
    })),
  }

  transfertsStock.unshift(nouveauTransfert)
  logAudit(
    currentUser.nom,
    'INITIATION_TRANSFERT_STOCK',
    `Demande de transfert ${nouveauTransfert.referenceTransfert} (Statut: ${statutInitial}) vers agence #${numDest}`,
    numSrc
  )
  res.json(nouveauTransfert)
})

router.post('/stocks/transferts/:id/valider-source', (req: Request, res: Response) => {
  const currentUser = getUserFromToken(req)
  if (!currentUser) return res.status(401).json({ message: 'Non autorisé' })

  const transfert = transfertsStock.find((t) => t.id === toInt(req.params.id))
  if (!transfert) return res.status(404).json({ message: 'Transfert non trouvé' })

  if (transfert.statut !== 'EN_ATTENTE_VALIDATION_SOURCE') {
    return res.status(400).json({ message: `Ce transfert ne peut pas être validé au départ (statut: ${transfert.statut})` })
  }

  transfert.statut = 'EN_ATTENTE_VISA_SIEGE'
  transfert.validationSourceNom = `${currentUser.nom} (Chef Agence Source)`
  transfert.dateValidationSource = new Date().toISOString()

  logAudit(currentUser.nom, 'VALIDATION_SOURCE_TRANSFERT', `Transfert ${transfert.referenceTransfert} approuvé par l agence source. En attente du Visa de Direction Siège.`, transfert.agenceSourceId)
  res.json({ message: 'Transfert validé par l agence source. Transmis pour Visa Direction Siège.', transfert })
})

router.post('/stocks/transferts/:id/visa-siege', (req: Request, res: Response) => {
  const currentUser = getUserFromToken(req)
  if (!currentUser) return res.status(401).json({ message: 'Non autorisé' })

  if (currentUser.role !== 'SUPER_ADMIN' && currentUser.role !== 'ADMIN_SIEGE') {
    return res.status(403).json({ message: 'Seul l Admin du Siège ou le Super Admin peut accorder le visa de direction générale pour un convoi inter-agences.' })
  }

  const transfert = transfertsStock.find((t) => t.id === toInt(req.params.id))
  if (!transfert) return res.status(404).json({ message: 'Transfert non trouvé' })

  if (transfert.statut !== 'EN_ATTENTE_VISA_SIEGE' && transfert.statut !== 'EN_ATTENTE_VALIDATION_SOURCE') {
    return res.status(400).json({ message: `Ce convoi ne peut plus recevoir de visa siège (statut: ${transfert.statut})` })
  }

  // Déduire le stock de l'agence source au départ effectif validé
  for (const ligne of (transfert.lignes || [])) {
    const stock = stocksAgence.find((s) => s.agenceId === transfert.agenceSourceId && s.articleId === Number(ligne.articleId) && s.numeroLot === ligne.numeroLot)
    if (stock) {
      stock.quantite = Math.max(0, stock.quantite - Number(ligne.quantite))
    }
  }

  if (transfert.vehiculeId) {
    const vehicule = vehicules.find((v) => v.id === transfert.vehiculeId)
    if (vehicule) vehicule.statut = 'EN_COURSE'
  }

  transfert.statut = 'EN_TRANSIT'
  transfert.visaSiegeNom = `${currentUser.nom} (Admin Siège)`
  transfert.dateVisaSiege = new Date().toISOString()
  transfert.dateExpedition = new Date().toISOString()

  logAudit(currentUser.nom, 'VISA_SIEGE_TRANSFERT', `Visa Direction Siège accordé pour le convoi ${transfert.referenceTransfert}. Convoi en transit vers agence #${transfert.agenceDestId}.`, 1)
  res.json({ message: 'Visa de Direction Siège accordé. Convoi officiellement en transit avec lettre de voiture.', transfert })
})

router.post('/stocks/transferts/:id/refuser', (req: Request, res: Response) => {
  const currentUser = getUserFromToken(req)
  if (!currentUser) return res.status(401).json({ message: 'Non autorisé' })

  const transfert = transfertsStock.find((t) => t.id === toInt(req.params.id))
  if (!transfert) return res.status(404).json({ message: 'Transfert non trouvé' })

  transfert.statut = 'REFUSE'
  transfert.motifRefus = req.body.motif || 'Transfert refusé par la hiérarchie'

  if (transfert.vehiculeId) {
    const vehicule = vehicules.find((v) => v.id === transfert.vehiculeId)
    if (vehicule) vehicule.statut = 'DISPONIBLE'
  }

  logAudit(currentUser.nom, 'REFUS_TRANSFERT_STOCK', `Transfert ${transfert.referenceTransfert} refusé: ${transfert.motifRefus}`, transfert.agenceSourceId)
  res.json({ message: 'Transfert refusé.', transfert })
})

router.post('/stocks/transferts/:id/recevoir', (req: Request, res: Response) => {
  const currentUser = getUserFromToken(req)
  if (!currentUser) return res.status(401).json({ message: 'Non autorisé' })

  const transfert = transfertsStock.find((t) => t.id === toInt(req.params.id))
  if (!transfert) return res.status(404).json({ message: 'Transfert non trouvé' })

  if (transfert.statut !== 'EN_TRANSIT' && transfert.statut !== 'LITIGE' && currentUser.role !== 'SUPER_ADMIN') {
    return res.status(400).json({ message: 'Le transfert doit obligatoirement être en transit pour être réceptionné contradictoirement.' })
  }

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

  // Release vehicle back to DISPONIBLE
  if (transfert.vehiculeId) {
    const vehicule = vehicules.find((v) => v.id === transfert.vehiculeId)
    if (vehicule) {
      vehicule.statut = 'DISPONIBLE'
    }
  }

  transfert.statut = ecartConstate ? 'LITIGE' : 'RECU'
  transfert.recepteurNom = currentUser.nom
  transfert.dateReception = new Date().toISOString()
  transfert.motifEcart = motifEcart

  logAudit(currentUser.nom, 'RECEPTION_TRANSFERT_STOCK', `Réception contradictoire ${transfert.referenceTransfert} par agence #${transfert.agenceDestId} (${transfert.statut})`, transfert.agenceDestId)
  res.json(transfert)
})

router.get(['/transferts/:id/feuille-route', '/stocks/transferts/:id/feuille-route'], (req: Request, res: Response) => {
  const transfert = transfertsStock.find((t) => t.id === toInt(req.params.id))
  if (!transfert) return res.status(404).send('Transfert introuvable')

  const agenceSource = agences.find((a) => a.id === transfert.agenceSourceId)
  const agenceDest = agences.find((a) => a.id === transfert.agenceDestId)
  const vehicule = transfert.vehiculeId ? vehicules.find((v) => v.id === transfert.vehiculeId) : undefined
  const enrichedLignes = transfert.lignes.map((l) => ({
    ...l,
    article: articles.find((art) => art.id === l.articleId),
  }))

  const html = renderFeuilleRouteTransfertHtml(transfert, agenceSource, agenceDest, enrichedLignes, vehicule, parametresEntreprise)
  res.setHeader('Content-Type', 'text/html; charset=utf-8')
  res.send(html)
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

router.put('/admin/users/:id', (req: Request, res: Response) => {
  const currentUser = getUserFromToken(req)
  if (!currentUser) return res.status(401).json({ message: 'Non autorisé' })

  const userId = toInt(req.params.id)
  const targetUser = users.find((u) => u.id === userId)
  if (!targetUser) return res.status(404).json({ message: 'Utilisateur introuvable' })

  const { nom, email, role, agenceId, actif, permissions } = req.body

  // Vérification unicité de l'email si modifié
  if (email && email.toLowerCase() !== targetUser.email.toLowerCase()) {
    const existing = users.find((u) => u.id !== userId && u.email.toLowerCase() === email.toLowerCase())
    if (existing) {
      return res.status(400).json({ message: 'Un autre utilisateur utilise déjà cette adresse email' })
    }
    targetUser.email = String(email).trim().toLowerCase()
  }

  if (nom) targetUser.nom = String(nom).trim()
  if (role) targetUser.role = String(role).trim()
  if (agenceId !== undefined) targetUser.agenceId = toInt(agenceId)
  if (actif !== undefined) targetUser.actif = Boolean(actif)
  if (permissions && Array.isArray(permissions)) targetUser.permissions = permissions

  logAudit(
    currentUser.nom,
    'MODIFICATION_UTILISATEUR',
    `Mise à jour du compte #${userId} (${targetUser.nom}, Rôle: ${targetUser.role}, Agence: #${targetUser.agenceId}, Statut: ${targetUser.actif ? 'Actif' : 'Bloqué'})`,
    targetUser.agenceId
  )

  const enriched = {
    ...targetUser,
    agence: agences.find((a) => a.id === targetUser.agenceId),
  }

  res.json({ message: 'Utilisateur mis à jour avec succès', user: enriched })
})

router.post('/admin/users/:id/toggle-statut', (req: Request, res: Response) => {
  const currentUser = getUserFromToken(req)
  if (!currentUser) return res.status(401).json({ message: 'Non autorisé' })

  const userId = toInt(req.params.id)
  const targetUser = users.find((u) => u.id === userId)
  if (!targetUser) return res.status(404).json({ message: 'Utilisateur introuvable' })

  if (targetUser.id === currentUser.id) {
    return res.status(400).json({ message: 'Vous ne pouvez pas désactiver votre propre compte actif.' })
  }

  targetUser.actif = !targetUser.actif
  const actionStr = targetUser.actif ? 'ACTIVATION_COMPTE' : 'DESACTIVATION_COMPTE'
  logAudit(
    currentUser.nom,
    actionStr,
    `Compte #${userId} (${targetUser.nom}) ${targetUser.actif ? 'activé' : 'suspendu'} par ${currentUser.nom}`,
    targetUser.agenceId
  )

  const enriched = {
    ...targetUser,
    agence: agences.find((a) => a.id === targetUser.agenceId),
  }

  res.json({ message: `Compte utilisateur ${targetUser.actif ? 'activé' : 'suspendu'} avec succès`, user: enriched })
})

router.post('/admin/users/:id/deconnecter', (req: Request, res: Response) => {
  const currentUser = getUserFromToken(req)
  if (!currentUser) return res.status(401).json({ message: 'Non autorisé' })

  const userId = toInt(req.params.id)
  const targetUser = users.find((u) => u.id === userId)
  if (!targetUser) return res.status(404).json({ message: 'Utilisateur introuvable' })

  // Révocation de la session active et déliaison de l'appareil
  targetUser.sessionActiveId = undefined
  targetUser.appareilActifId = undefined
  targetUser.appareilActifNom = undefined

  logAudit(
    currentUser.nom,
    'DECONNEXION_FORCEE',
    `Déconnexion forcée du compte #${userId} (${targetUser.nom}) par l administrateur. Session et appareil déliés.`,
    targetUser.agenceId
  )

  res.json({ message: `L'utilisateur ${targetUser.nom} a été déconnecté de force avec succès. Sa session active a été révoquée.` })
})

router.post('/admin/users/:id/debloquer-reinitialiser', (req: Request, res: Response) => {
  const currentUser = getUserFromToken(req)
  if (!currentUser) return res.status(401).json({ message: 'Non autorisé' })

  const userId = toInt(req.params.id)
  const targetUser = users.find((u) => u.id === userId)
  if (!targetUser) return res.status(404).json({ message: 'Utilisateur introuvable' })

  const { motDePasseTemporaire, libererAppareil } = req.body
  const tempPass = String(motDePasseTemporaire || 'TempPass' + Math.floor(1000 + Math.random() * 9000)).trim()

  targetUser.estBloque = false
  targetUser.motifBlocage = undefined
  targetUser.tentativesEchouees = 0
  targetUser.password = tempPass
  targetUser.doitChangerMotDePasse = true
  targetUser.sessionActiveId = undefined

  if (libererAppareil !== false) {
    targetUser.appareilActifId = undefined
    targetUser.appareilActifNom = undefined
  }

  logAudit(
    currentUser.nom,
    'DEBLOCAGE_COMPTE',
    `Déblocage du compte #${userId} (${targetUser.nom}) et génération d un mot de passe temporaire à changer au 1er login.`,
    targetUser.agenceId
  )

  res.json({
    message: `Compte débloqué avec succès ! Mot de passe temporaire attribué : "${tempPass}". L'utilisateur sera contraint de le changer lors de son premier login.`,
    motDePasseTemporaire: tempPass,
    user: {
      ...targetUser,
      agence: agences.find((a) => a.id === targetUser.agenceId),
    },
  })
})

router.post('/admin/users/:id/toggle-vip', (req: Request, res: Response) => {
  const currentUser = getUserFromToken(req)
  if (!currentUser) return res.status(401).json({ message: 'Non autorisé' })

  const userId = toInt(req.params.id)
  const targetUser = users.find((u) => u.id === userId)
  if (!targetUser) return res.status(404).json({ message: 'Utilisateur introuvable' })

  targetUser.estVip = !targetUser.estVip

  logAudit(
    currentUser.nom,
    'MODIFICATION_STATUT_VIP',
    `Statut VIP (multi-appareils autorisés) ${targetUser.estVip ? 'ACTIVÉ' : 'DÉSACTIVÉ'} pour #${userId} (${targetUser.nom})`,
    targetUser.agenceId
  )

  res.json({
    message: `Statut VIP ${targetUser.estVip ? 'activé (multi-appareils autorisé)' : 'désactivé (restreint à un seul appareil)'} pour ${targetUser.nom}.`,
    estVip: targetUser.estVip,
  })
})

// ----------------- GESTION DU PARC D'APPAREILS ENREGISTRÉS -----------------
router.get('/admin/appareils', (_req: Request, res: Response) => {
  const list = appareils.map((ap) => ({
    ...ap,
    agence: agences.find((a) => a.id === ap.agenceId),
    user: ap.userId ? users.find((u) => u.id === ap.userId) : null,
  }))
  res.json(list)
})

router.post('/admin/appareils', (req: Request, res: Response) => {
  const currentUser = getUserFromToken(req)
  if (!currentUser) return res.status(401).json({ message: 'Non autorisé' })

  const { deviceId, nom, type, agenceId, userId } = req.body
  if (!deviceId || !nom) {
    return res.status(400).json({ message: 'Identifiant matériel et nom de l appareil obligatoires' })
  }

  const existing = appareils.find((a) => a.deviceId.toLowerCase() === String(deviceId).trim().toLowerCase())
  if (existing) {
    return res.status(400).json({ message: 'Un appareil avec cet identifiant est déjà enregistré' })
  }

  const assignedUser = userId ? users.find((u) => u.id === toInt(userId)) : null

  const nouvelAppareil = {
    id: appareils.length + 1,
    deviceId: String(deviceId).trim(),
    nom: String(nom).trim(),
    type: type || 'PC_BUREAU',
    agenceId: toInt(agenceId) || currentUser.agenceId || 1,
    userId: assignedUser ? assignedUser.id : undefined,
    userNom: assignedUser ? assignedUser.nom : undefined,
    statut: 'AUTORISE' as const,
    adresseIp: req.ip || '127.0.0.1',
    userAgent: (req.headers['user-agent'] as string) || 'Client Matabishi',
    derniereConnexion: new Date().toISOString(),
    dateEnregistrement: new Date().toISOString(),
  }

  appareils.push(nouvelAppareil)
  logAudit(
    currentUser.nom,
    'ENREGISTREMENT_APPAREIL',
    `Nouvel appareil enregistré: ${nouvelAppareil.nom} (${nouvelAppareil.deviceId}) pour l agence #${nouvelAppareil.agenceId}`,
    nouvelAppareil.agenceId
  )

  res.json({ message: 'Appareil enregistré avec succès', appareil: nouvelAppareil })
})

router.put('/admin/appareils/:id/statut', (req: Request, res: Response) => {
  const currentUser = getUserFromToken(req)
  if (!currentUser) return res.status(401).json({ message: 'Non autorisé' })

  const apId = toInt(req.params.id)
  const ap = appareils.find((a) => a.id === apId)
  if (!ap) return res.status(404).json({ message: 'Appareil introuvable' })

  const { statut } = req.body
  if (statut) ap.statut = statut

  logAudit(
    currentUser.nom,
    'STATUT_APPAREIL',
    `Mise à jour statut appareil ${ap.nom} (${ap.deviceId}) -> ${ap.statut}`,
    ap.agenceId
  )

  res.json({ message: 'Statut de l appareil mis à jour', appareil: ap })
})

router.delete('/admin/appareils/:id', (req: Request, res: Response) => {
  const currentUser = getUserFromToken(req)
  if (!currentUser) return res.status(401).json({ message: 'Non autorisé' })

  const apId = toInt(req.params.id)
  const index = appareils.findIndex((a) => a.id === apId)
  if (index === -1) return res.status(404).json({ message: 'Appareil introuvable' })

  const removed = appareils.splice(index, 1)[0]
  logAudit(
    currentUser.nom,
    'SUPPRESSION_APPAREIL',
    `Suppression de l appareil enregistré ${removed.nom} (${removed.deviceId})`,
    removed.agenceId
  )

  res.json({ message: 'Appareil supprimé du registre avec succès' })
})

// ----------------- ÉCRITURES COMPTABLES AUTOMATIQUES PAR SCAN QR CODE -----------------
router.post('/agences/:agenceId/articles/:articleId/prix', (req: Request, res: Response) => {
  const currentUser = getUserFromToken(req)
  if (!currentUser) return res.status(401).json({ message: 'Non autorisé' })

  const agId = toInt(req.params.agenceId)
  const artId = toInt(req.params.articleId)
  const { prix, devise } = req.body
  const numPrix = Number(prix)
  if (!numPrix || numPrix <= 0) return res.status(400).json({ message: 'Prix supérieur à 0 requis' })

  prixArticlesAgence.forEach((p) => {
    if (p.agenceId === agId && p.articleId === artId) {
      p.actif = false
    }
  })

  const nouveauPrix = {
    id: prixArticlesAgence.length + 1,
    agenceId: agId,
    articleId: artId,
    prix: numPrix,
    devise: (devise === 'CDF' ? 'CDF' : 'USD') as 'USD' | 'CDF',
    statut: 'VALIDE' as const,
    proposePar: `${currentUser.nom} (Chef Agence)`,
    validePar: `${currentUser.nom} (Chef Agence)`,
    actif: true,
  }

  prixArticlesAgence.unshift(nouveauPrix)
  logAudit(currentUser.nom, 'FIXATION_PRIX_CHEF_AGENCE', `Nouveau prix de vente fixé par Chef d'Agence: $${numPrix} ${nouveauPrix.devise} pour article #${artId}`, agId)
  res.json({ message: `Prix fixé avec succès pour l'agence: $${numPrix} ${nouveauPrix.devise}`, prix: nouveauPrix })
})

router.post('/comptabilite/passer-ecriture-qr', (req: Request, res: Response) => {
  const currentUser = getUserFromToken(req)
  if (!currentUser) return res.status(401).json({ message: 'Non autorisé' })

  const { type, reference, agenceId, articleId, codeArticle, quantite, montantTotal, montantCdf, devise } = req.body
  const numAg = Number(agenceId) || currentUser.agenceId || 1
  const ag = agences.find((a) => a.id === numAg) || agences[0]
  let numMontant = Number(montantTotal) || 0

  // Détection en temps réel du prix fixé par le Chef d'Agence pour l'agence de l'utilisateur qui scanne
  let prixUnitaireDetecte = 0
  if (numMontant <= 0) {
    const art = articles.find((a) => a.id === toInt(articleId) || (codeArticle && a.codeUnique === codeArticle) || (reference && a.codeUnique === reference))
    if (art) {
      const prixAg = prixArticlesAgence.find((p) => p.agenceId === numAg && p.articleId === art.id && p.statut === 'VALIDE' && p.actif)
      prixUnitaireDetecte = prixAg ? prixAg.prix : (art.prixVenteStandard || 25)
      const qte = Number(quantite) || 1
      numMontant = prixUnitaireDetecte * qte
    } else {
      prixUnitaireDetecte = 25
      numMontant = 25
    }
  }

  const dev = devise || 'USD'
  const numCdf = Number(montantCdf) || Math.round(numMontant * 2850)

  const pieceRef = `ECR-QR-${Date.now().toString().slice(-6)}`
  const dateIso = new Date().toISOString()

  if (type === 'VENTE') {
    // Écriture de Vente certifiée scanné par QR Code
    const compteDebit = dev === 'USD' ? parametresComptables.compteCaisseUsd : parametresComptables.compteCaisseCdf
    const compteCredit = parametresComptables.compteVenteMarchandises

    ecrituresComptables.push(
      {
        id: ecrituresComptables.length + 1,
        referenceOperation: pieceRef,
        agenceId: numAg,
        compteNumero: compteDebit,
        sens: 'DEBIT',
        montant: numMontant,
        devise: dev,
        tauxApplique: numCdf && numMontant ? Math.round(numCdf / numMontant) : 2850,
        libelle: `[SCAN QR] Encaissement Vente ${reference || ''} (${ag.nom})`,
        sourceModule: 'VENTES_QR',
        sourceType: 'SCAN_QR_VENTE',
        sourceId: pieceRef,
        annulee: false,
        statutValidation: 'VALIDE',
        dateEcriture: dateIso,
      },
      {
        id: ecrituresComptables.length + 2,
        referenceOperation: pieceRef,
        agenceId: numAg,
        compteNumero: compteCredit,
        sens: 'CREDIT',
        montant: numMontant,
        devise: dev,
        tauxApplique: numCdf && numMontant ? Math.round(numCdf / numMontant) : 2850,
        libelle: `[SCAN QR] Produits Ventes Marchandises ${reference || ''} (${ag.nom})`,
        sourceModule: 'VENTES_QR',
        sourceType: 'SCAN_QR_VENTE',
        sourceId: pieceRef,
        annulee: false,
        statutValidation: 'VALIDE',
        dateEcriture: dateIso,
      }
    )

    logAudit(
      currentUser.nom,
      'ECRITURE_AUTO_QR',
      `Passation écriture automatique via QR Code Vente ${reference || ''} pour ${ag.nom}: $${numMontant} ${dev} (${numCdf} CDF). Pièce: ${pieceRef}`,
      numAg
    )

    return res.json({
      message: `Écriture comptable passée avec succès pour l'${ag.nom} ! Pièce officielle : ${pieceRef}`,
      pieceReference: pieceRef,
      agence: ag.nom,
      debitCompte: compteDebit,
      creditCompte: compteCredit,
      montant: numMontant,
      devise: dev,
    })
  } else {
    // Type LOT ou STOCK : Valorisation et intégration stock de production pour l'agence
    const compteDebit = parametresComptables.compteStocksProduitsFinis
    const compteCredit = parametresComptables.compteVariationStocks

    ecrituresComptables.push(
      {
        id: ecrituresComptables.length + 1,
        referenceOperation: pieceRef,
        agenceId: numAg,
        compteNumero: compteDebit,
        sens: 'DEBIT',
        montant: numMontant,
        devise: dev,
        tauxApplique: 2850,
        libelle: `[SCAN QR] Entrée Stock Lot ${reference || ''} (${ag.nom}) - Tarif fixé Chef Agence`,
        sourceModule: 'STOCKS_QR',
        sourceType: 'SCAN_QR_STOCK',
        sourceId: pieceRef,
        annulee: false,
        statutValidation: 'VALIDE',
        dateEcriture: dateIso,
      },
      {
        id: ecrituresComptables.length + 2,
        referenceOperation: pieceRef,
        agenceId: numAg,
        compteNumero: compteCredit,
        sens: 'CREDIT',
        montant: numMontant,
        devise: dev,
        tauxApplique: 2850,
        libelle: `[SCAN QR] Variation Stock Production ${reference || ''} (${ag.nom})`,
        sourceModule: 'STOCKS_QR',
        sourceType: 'SCAN_QR_STOCK',
        sourceId: pieceRef,
        annulee: false,
        statutValidation: 'VALIDE',
        dateEcriture: dateIso,
      }
    )

    logAudit(
      currentUser.nom,
      'ECRITURE_AUTO_QR',
      `Passation écriture automatique via QR Code Lot/Stock ${reference || ''} pour ${ag.nom}: $${numMontant} USD (Prix Chef d'Agence: $${prixUnitaireDetecte || numMontant}). Pièce: ${pieceRef}`,
      numAg
    )

    return res.json({
      message: `Écriture de valorisation passée pour l'${ag.nom} (Tarif Chef d'Agence détecté) ! Pièce : ${pieceRef}`,
      pieceReference: pieceRef,
      agence: ag.nom,
      montant: numMontant,
      devise: dev,
    })
  }
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

const permissionsCatalog = [
  // 1. Tableau de Bord
  { id: 1, code: 'dashboard.voir', module: 'Tableau de Bord', libelle: 'Consulter les indicateurs et KPIs globaux de performance' },

  // 2. Ventes & Caisse POS
  { id: 2, code: 'ventes.voir', module: 'Ventes & Caisse POS', libelle: 'Consulter l historique des ventes et factures' },
  { id: 3, code: 'ventes.creer', module: 'Ventes & Caisse POS', libelle: 'Encaisser des ventes et imprimer les tickets/factures' },
  { id: 4, code: 'ventes.annuler', module: 'Ventes & Caisse POS', libelle: 'Demander ou autoriser l annulation d une vente' },
  { id: 5, code: 'credits.valider', module: 'Ventes & Caisse POS', libelle: 'Valider et débloquer les ventes à crédit client' },
  { id: 6, code: 'clients.gerer', module: 'Ventes & Caisse POS', libelle: 'Créer, modifier et administrer les fiches clients' },
  { id: 7, code: 'clients.credit_gerer', module: 'Ventes & Caisse POS', libelle: 'Gérer les plafonds de crédit et encaisser les dettes' },

  // 3. Stocks & Entrepôt
  { id: 8, code: 'stocks.voir', module: 'Stocks & Entrepôt', libelle: 'Consulter les stocks temps réel, lots FEFO et seuils d alerte' },
  { id: 9, code: 'stocks.corriger', module: 'Stocks & Entrepôt', libelle: 'Initier un inventaire physique ou un ajustement d écart' },
  { id: 10, code: 'stocks.valider_correction', module: 'Stocks & Entrepôt', libelle: 'Valider et entériner les régularisations d inventaire' },
  { id: 11, code: 'articles.gerer', module: 'Stocks & Entrepôt', libelle: 'Créer et modifier les articles, types et conditionnements' },

  // 4. Achats & Matières Premières
  { id: 12, code: 'achats.gerer', module: 'Achats & Matières Premières', libelle: 'Consulter et enregistrer les achats de grains maïs/blé' },
  { id: 13, code: 'achats.commandes', module: 'Achats & Matières Premières', libelle: 'Émettre et valider les bons de commande fournisseurs (BC)' },
  { id: 14, code: 'achats.pont_bascule', module: 'Achats & Matières Premières', libelle: 'Effectuer les pesées pont-bascule et contrôles agréage' },

  // 5. Logistique & Flotte
  { id: 15, code: 'transferts.gerer', module: 'Logistique & Convois', libelle: 'Gérer les transferts inter-dépôts et feuilles de route convoi' },
  { id: 16, code: 'flotte.gerer', module: 'Logistique & Convois', libelle: 'Administrer les camions, chauffeurs et disponibilités' },
  { id: 17, code: 'livraisons.gerer', module: 'Logistique & Convois', libelle: 'Générer les bordereaux de livraison (BL) et visas' },

  // 6. Production & Meunerie
  { id: 18, code: 'production.gerer', module: 'Production & Meunerie', libelle: 'Lancer, suivre et clôturer les ordres de fabrication (OF)' },
  { id: 19, code: 'production.qr_generer', module: 'Production & Meunerie', libelle: 'Générer et imprimer les étiquettes QR codes des sacs de farine' },
  { id: 20, code: 'production.recettes', module: 'Production & Meunerie', libelle: 'Paramétrer les recettes de mouture et rendements d extraction' },

  // 7. Trésorerie & Banque
  { id: 21, code: 'tresorerie.voir', module: 'Trésorerie & Banques', libelle: 'Consulter les soldes des caisses comptoir et banques' },
  { id: 22, code: 'tresorerie.demande', module: 'Trésorerie & Banques', libelle: 'Initier des demandes de décaissement pour dépenses' },
  { id: 23, code: 'tresorerie.valider', module: 'Trésorerie & Banques', libelle: 'Approuver et payer les bons de décaissement de trésorerie' },
  { id: 24, code: 'banque.rapprochement', module: 'Trésorerie & Banques', libelle: 'Effectuer le rapprochement bancaire (Rawbank / Equity BCDC)' },

  // 8. Ressources Humaines & Paie
  { id: 25, code: 'rh.gerer', module: 'Ressources Humaines & Paie', libelle: 'Administrer les fiches des agents, ouvriers et contrats' },
  { id: 26, code: 'rh.bulletins', module: 'Ressources Humaines & Paie', libelle: 'Calculer et imprimer les bulletins de paie (IPR, CNSS, INPP)' },
  { id: 27, code: 'rh.avances', module: 'Ressources Humaines & Paie', libelle: 'Accorder et comptabiliser les avances sur salaire' },

  // 9. Comptabilité SYSCOHADA
  { id: 28, code: 'comptabilite.plan_gerer', module: 'Comptabilité SYSCOHADA', libelle: 'Administrer le plan comptable général SYSCOHADA Révisé' },
  { id: 29, code: 'comptabilite.ecritures_voir', module: 'Comptabilité SYSCOHADA', libelle: 'Consulter le journal général des écritures et le Grand Livre' },
  { id: 30, code: 'comptabilite.od_creer', module: 'Comptabilité SYSCOHADA', libelle: 'Saisir des écritures manuelles d opérations diverses (OD)' },
  { id: 31, code: 'comptabilite.cloture', module: 'Comptabilité SYSCOHADA', libelle: 'Exécuter la clôture annuelle des comptes et calcul du résultat' },
  { id: 32, code: 'comptabilite.immo_gerer', module: 'Comptabilité SYSCOHADA', libelle: 'Gérer les immobilisations et passer les dotations aux amortissements' },

  // 10. Reporting & États Financiers
  { id: 33, code: 'reporting.voir', module: 'Reporting & Décisionnel', libelle: 'Consulter la balance, compte de résultat et états analytiques' },
  { id: 34, code: 'reporting.exporter', module: 'Reporting & Décisionnel', libelle: 'Télécharger les bilans officiels et exports tabulaires CSV/PDF' },

  // 11. Administration & Contrôle Siège
  { id: 35, code: 'roles.gerer', module: 'Administration & Siège', libelle: 'Attribuer les fonctionnalités, permissions et gouvernance RBAC' },
  { id: 36, code: 'utilisateurs.gerer', module: 'Administration & Siège', libelle: 'Créer, éditer, activer et bloquer les comptes utilisateurs' },
  { id: 37, code: 'agences.gerer', module: 'Administration & Siège', libelle: 'Ouvrir de nouvelles agences, dépôts et fixer les paramètres' },
  { id: 38, code: 'appareils.gerer', module: 'Administration & Siège', libelle: 'Autoriser ou révoquer les terminaux mobiles et tablettes terrain' },
  { id: 39, code: 'audit.voir', module: 'Administration & Siège', libelle: 'Auditer le journal de traçabilité immuable de sécurité' },
  { id: 40, code: 'backup.gerer', module: 'Administration & Siège', libelle: 'Sauvegarder et restaurer l intégralité de la base de données' },

  // 12. Synchronisation Terrain
  { id: 41, code: 'sync.voir', module: 'Synchronisation Terrain', libelle: 'Accéder à l outil de synchronisation des ventes hors-ligne' },
  { id: 42, code: 'documents.gerer', module: 'Gestion Documentaire', libelle: 'Imprimer les 12 documents légaux avec logo et signatures officielles' },
  { id: 43, code: 'maintenance.gerer', module: 'Logistique & Convois', libelle: 'Superviser les entretiens techniques des camions et machines usine' },
]

const rolesPermissionsMap: Record<string, string[]> = {
  SUPER_ADMIN: permissionsCatalog.map((p) => p.code),
  ADMIN_SIEGE: permissionsCatalog.filter((p) => !['sync.voir'].includes(p.code)).map((p) => p.code),
  CHEF_AGENCE: [
    'dashboard.voir', 'ventes.voir', 'ventes.creer', 'ventes.annuler', 'credits.valider', 'clients.gerer', 'clients.credit_gerer',
    'stocks.voir', 'stocks.corriger', 'stocks.valider_correction', 'articles.gerer',
    'achats.gerer', 'achats.commandes', 'achats.pont_bascule',
    'transferts.gerer', 'flotte.gerer', 'livraisons.gerer', 'production.gerer',
    'tresorerie.voir', 'tresorerie.demande', 'tresorerie.valider',
    'rh.gerer', 'rh.avances', 'reporting.voir', 'reporting.exporter', 'sync.voir', 'documents.gerer'
  ],
  COMPTABLE_SENIOR: [
    'dashboard.voir', 'ventes.voir', 'comptabilite.plan_gerer', 'comptabilite.ecritures_voir', 'comptabilite.od_creer',
    'comptabilite.cloture', 'comptabilite.immo_gerer', 'tresorerie.voir', 'tresorerie.valider', 'banque.rapprochement',
    'achats.gerer', 'achats.commandes', 'rh.gerer', 'rh.bulletins', 'reporting.voir', 'reporting.exporter',
    'audit.voir', 'documents.gerer'
  ],
  COMPTABLE: [
    'dashboard.voir', 'ventes.voir', 'comptabilite.ecritures_voir', 'comptabilite.od_creer', 'tresorerie.voir',
    'banque.rapprochement', 'reporting.voir', 'achats.gerer', 'documents.gerer'
  ],
  VENDEUR: [
    'dashboard.voir', 'ventes.voir', 'ventes.creer', 'clients.gerer', 'stocks.voir', 'sync.voir', 'livraisons.gerer'
  ],
  CAISSIER: [
    'dashboard.voir', 'ventes.voir', 'tresorerie.voir', 'tresorerie.demande', 'clients.gerer', 'sync.voir'
  ],
  MAGASINIER: [
    'dashboard.voir', 'stocks.voir', 'stocks.corriger', 'articles.gerer', 'transferts.gerer',
    'livraisons.gerer', 'achats.pont_bascule', 'production.qr_generer', 'sync.voir'
  ],
  RESPONSABLE_ACHATS: [
    'dashboard.voir', 'achats.gerer', 'achats.commandes', 'achats.pont_bascule', 'stocks.voir',
    'articles.gerer', 'tresorerie.voir', 'tresorerie.demande', 'reporting.voir', 'documents.gerer'
  ],
  RESPONSABLE_RH: [
    'dashboard.voir', 'rh.gerer', 'rh.bulletins', 'rh.avances', 'tresorerie.voir', 'tresorerie.demande',
    'reporting.voir', 'documents.gerer'
  ],
  PRODUCTION: [
    'dashboard.voir', 'production.gerer', 'production.qr_generer', 'production.recettes',
    'stocks.voir', 'transferts.gerer', 'achats.pont_bascule', 'documents.gerer'
  ],
  AUDITEUR: [
    'dashboard.voir', 'audit.voir', 'stocks.voir', 'ventes.voir', 'comptabilite.ecritures_voir',
    'tresorerie.voir', 'reporting.voir', 'reporting.exporter', 'rh.bulletins', 'documents.gerer'
  ],
}

router.get('/admin/roles/permissions', (_req: Request, res: Response) => {
  res.json(permissionsCatalog)
})

router.get('/admin/roles/:role/permissions', (req: Request, res: Response) => {
  const role = String(req.params.role)
  const perms = (rolesPermissionsMap as Record<string, string[]>)[role] || []
  res.json({ role, permissions: perms })
})

router.put('/admin/roles/:role/permissions', (req: Request, res: Response) => {
  const currentUser = getUserFromToken(req)
  if (!currentUser || (currentUser.role !== 'SUPER_ADMIN' && currentUser.role !== 'ADMIN_SIEGE')) {
    return res.status(403).json({ message: 'Seul un Administrateur peut modifier les habilitations des rôles.' })
  }

  const role = String(req.params.role)
  const { permissions: newPerms } = req.body
  if (!Array.isArray(newPerms)) {
    return res.status(400).json({ message: 'Liste de permissions invalide.' })
  }

  ;(rolesPermissionsMap as Record<string, string[]>)[role] = newPerms

  let updatedUsersCount = 0
  users.forEach((u) => {
    if (u.role === role) {
      u.permissions = [...newPerms]
      updatedUsersCount++
    }
  })

  logAudit(
    currentUser.nom,
    'MAJ_PERMISSIONS_ROLE',
    `Mise à jour des fonctionnalités pour le rôle ${role} (${newPerms.length} permissions attribuées à ${updatedUsersCount} utilisateurs)`,
    1
  )

  res.json({ message: `Habilitations du rôle ${role} mises à jour avec succès.`, role, permissions: newPerms, updatedUsersCount })
})

router.get('/admin/users/:id/permissions', (req: Request, res: Response) => {
  const userId = toInt(req.params.id)
  const targetUser = users.find((u) => u.id === userId)
  if (!targetUser) return res.status(404).json({ message: 'Utilisateur introuvable' })
  res.json({ userId, permissions: targetUser.permissions || [] })
})

router.put('/admin/users/:id/permissions', (req: Request, res: Response) => {
  const currentUser = getUserFromToken(req)
  if (!currentUser || (currentUser.role !== 'SUPER_ADMIN' && currentUser.role !== 'ADMIN_SIEGE')) {
    return res.status(403).json({ message: 'Seul un Administrateur peut modifier les fonctionnalités d un utilisateur.' })
  }

  const userId = toInt(req.params.id)
  const targetUser = users.find((u) => u.id === userId)
  if (!targetUser) return res.status(404).json({ message: 'Utilisateur introuvable' })

  const { permissions: newPerms } = req.body
  if (!Array.isArray(newPerms)) {
    return res.status(400).json({ message: 'Liste de permissions invalide.' })
  }

  targetUser.permissions = newPerms

  logAudit(
    currentUser.nom,
    'MAJ_PERMISSIONS_UTILISATEUR',
    `Attribution manuelle des fonctionnalités pour l utilisateur ${targetUser.nom} (${targetUser.email}) : ${newPerms.length} permissions accordées.`,
    targetUser.agenceId
  )

  res.json({
    message: `Fonctionnalités accordées avec succès à ${targetUser.nom}.`,
    userId,
    permissions: targetUser.permissions,
  })
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
