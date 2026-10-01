import type {
  DbUser,
  DbAgence,
  DbArticle,
  DbPrixArticleAgence,
  DbTauxChange,
  DbStockAgence,
  DbClient,
  DbVente,
  DbCompteCaisse,
  DbTransaction,
  DbCorrectionStock,
  DbPlanComptable,
  DbEcritureComptable,
  DbOrdreProduction,
  DbRecette,
  DbAuditLog,
  DbFournisseur,
  DbAchat,
  DbTransfertStock,
  DbAgent,
  DbAvanceSalaire,
  DbBulletinPaie,
  DbSyncOperation,
  DbCategorie,
} from './db'

export const agences: DbAgence[] = [
  { id: 1, nom: 'Siège Social Goma', ville: 'Goma', adresse: 'Avenue du 20 Mai, Quartier Les Volcans', estSiege: true },
  { id: 2, nom: 'Agence Kinshasa', ville: 'Kinshasa', adresse: 'Boulevard du 30 Juin, Gombe', estSiege: false },
  { id: 3, nom: 'Agence Bukavu', ville: 'Bukavu', adresse: 'Avenue Patrice Lumumba', estSiege: false },
]

export const users: DbUser[] = [
  {
    id: 1,
    email: 'dkitaheruka@gmail.com',
    nom: 'David Kitaheruka (Super Admin)',
    role: 'SUPER_ADMIN',
    agenceId: 1,
    permissions: [
      'dashboard.voir', 'agences.gerer', 'utilisateurs.gerer', 'roles.gerer', 'appareils.gerer',
      'audit.voir', 'articles.gerer', 'stocks.voir', 'stocks.corriger', 'stocks.valider_correction',
      'ventes.creer', 'ventes.voir', 'ventes.annuler', 'credits.valider', 'clients.gerer',
      'clients.credit_gerer', 'tresorerie.demande', 'tresorerie.valider', 'tresorerie.voir',
      'production.gerer', 'production.qr_generer', 'comptabilite.plan_gerer', 'comptabilite.ecritures_voir',
      'reporting.voir', 'reporting.exporter', 'sync.voir', 'documents.gerer',
      'achats.gerer', 'transferts.gerer', 'rh.gerer',
    ],
    actif: true,
  },
  {
    id: 2,
    email: 'admin.siege@mvg.cd',
    nom: 'Direction Générale (Admin Siège)',
    role: 'ADMIN_SIEGE',
    agenceId: 1,
    permissions: [
      'dashboard.voir', 'agences.gerer', 'utilisateurs.gerer', 'audit.voir', 'articles.gerer',
      'stocks.voir', 'ventes.voir', 'credits.valider', 'clients.gerer', 'tresorerie.valider',
      'tresorerie.voir', 'reporting.voir', 'reporting.exporter', 'comptabilite.ecritures_voir',
      'achats.gerer', 'transferts.gerer', 'rh.gerer',
    ],
    actif: true,
  },
  {
    id: 3,
    email: 'chef.goma@mvg.cd',
    nom: 'Kasereka Jean (Chef Agence Goma)',
    role: 'CHEF_AGENCE',
    agenceId: 1,
    permissions: [
      'dashboard.voir', 'articles.gerer', 'stocks.voir', 'stocks.valider_correction',
      'ventes.creer', 'ventes.voir', 'ventes.annuler', 'credits.valider', 'clients.gerer',
      'tresorerie.demande', 'tresorerie.valider', 'tresorerie.voir', 'reporting.voir',
      'achats.gerer', 'transferts.gerer', 'rh.gerer',
    ],
    actif: true,
  },
  {
    id: 4,
    email: 'vendeur.goma@mvg.cd',
    nom: 'Mwamba Eric (Vendeur)',
    role: 'VENDEUR',
    agenceId: 1,
    permissions: ['dashboard.voir', 'ventes.creer', 'ventes.voir', 'clients.gerer', 'stocks.voir'],
    actif: true,
  },
  {
    id: 5,
    email: 'caissier.goma@mvg.cd',
    nom: 'Amina Sophie (Caissière)',
    role: 'CAISSIER',
    agenceId: 1,
    permissions: ['dashboard.voir', 'tresorerie.demande', 'tresorerie.voir', 'ventes.voir'],
    actif: true,
  },
  {
    id: 6,
    email: 'magasinier.goma@mvg.cd',
    nom: 'Baraka Joseph (Magasinier)',
    role: 'MAGASINIER',
    agenceId: 1,
    permissions: ['dashboard.voir', 'stocks.voir', 'stocks.corriger', 'articles.gerer', 'transferts.gerer'],
    actif: true,
  },
  {
    id: 7,
    email: 'comptable.senior@mvg.cd',
    nom: 'Kambale Michel (Comptable Senior)',
    role: 'COMPTABLE_SENIOR',
    agenceId: 1,
    permissions: ['dashboard.voir', 'comptabilite.plan_gerer', 'comptabilite.ecritures_voir', 'reporting.voir', 'reporting.exporter', 'tresorerie.voir', 'achats.gerer', 'rh.gerer'],
    actif: true,
  },
  {
    id: 8,
    email: 'comptable@mvg.cd',
    nom: 'Bahati Claire (Comptable)',
    role: 'COMPTABLE',
    agenceId: 1,
    permissions: ['dashboard.voir', 'comptabilite.ecritures_voir', 'reporting.voir'],
    actif: true,
  },
]

export const articles: DbArticle[] = [
  { id: 1, codeUnique: 'FAR-001', designation: 'Farine de Froment MVG Extra 25kg', type: 'PRODUIT_FINI', uniteMesure: 'Sac', prixVenteStandard: 24.5, alerteExpiration: true },
  { id: 2, codeUnique: 'HUI-002', designation: 'Huile de Palme Raffinée 20L', type: 'PRODUIT_FINI', uniteMesure: 'Bidon', prixVenteStandard: 28.0, alerteExpiration: false },
  { id: 3, codeUnique: 'PAI-003', designation: 'Pain Toast Familial 500g', type: 'PRODUIT_FINI', uniteMesure: 'Pièce', prixVenteStandard: 1.2, alerteExpiration: true },
  { id: 4, codeUnique: 'BIS-004', designation: 'Biscuits Croquants MVG 100g', type: 'PRODUIT_FINI', uniteMesure: 'Carton', prixVenteStandard: 14.0, alerteExpiration: true },
  { id: 5, codeUnique: 'BLE-RAW', designation: 'Blé Grain Brut d Importation', type: 'MATIERE_PREMIERE', uniteMesure: 'Tonne', prixVenteStandard: 450.0, alerteExpiration: false },
  { id: 6, codeUnique: 'SUC-RAW', designation: 'Sucre de Canne Pur', type: 'MATIERE_PREMIERE', uniteMesure: 'Sac 50kg', prixVenteStandard: 42.0, alerteExpiration: false },
]

export const prixArticlesAgence: DbPrixArticleAgence[] = [
  { id: 1, agenceId: 1, articleId: 1, prix: 24.0, devise: 'USD', statut: 'VALIDE', actif: true },
  { id: 2, agenceId: 1, articleId: 2, prix: 27.5, devise: 'USD', statut: 'VALIDE', actif: true },
  { id: 3, agenceId: 1, articleId: 3, prix: 1.2, devise: 'USD', statut: 'VALIDE', actif: true },
  { id: 4, agenceId: 1, articleId: 4, prix: 13.5, devise: 'USD', statut: 'VALIDE', actif: true },
  { id: 5, agenceId: 2, articleId: 1, prix: 26.5, devise: 'USD', statut: 'VALIDE', actif: true },
]

export const tauxChanges: DbTauxChange[] = [
  { id: 1, agenceId: 1, taux: 2850, statut: 'VALIDE', dateDebut: '2026-09-01T08:00:00Z', actif: true },
  { id: 2, agenceId: 2, taux: 2880, statut: 'VALIDE', dateDebut: '2026-09-01T08:00:00Z', actif: true },
  { id: 3, agenceId: 3, taux: 2860, statut: 'VALIDE', dateDebut: '2026-09-01T08:00:00Z', actif: true },
]

export const stocksAgence: DbStockAgence[] = [
  { id: 1, agenceId: 1, articleId: 1, quantite: 320, numeroLot: 'LOT-2609-01', dateExpiration: '2027-03-31', seuilAlerte: 50 },
  { id: 2, agenceId: 1, articleId: 2, quantite: 180, numeroLot: 'LOT-2609-02', dateExpiration: '2027-06-30', seuilAlerte: 25 },
  { id: 3, agenceId: 1, articleId: 3, quantite: 95, numeroLot: 'LOT-2609-03', dateExpiration: '2026-10-08', seuilAlerte: 40 },
  { id: 4, agenceId: 1, articleId: 4, quantite: 210, numeroLot: 'LOT-2609-04', dateExpiration: '2027-02-15', seuilAlerte: 30 },
  { id: 5, agenceId: 2, articleId: 1, quantite: 140, numeroLot: 'LOT-2609-05', dateExpiration: '2027-03-31', seuilAlerte: 30 },
]

export const clients: DbClient[] = [
  { id: 1, nom: 'Supermarché Ihusi Goma', telephone: '+243997123456', adresse: 'Avenue du Rond Point Rutshuru', soldeDette: 450.0, limiteCredit: 2000.0, bloque: false },
  { id: 2, nom: 'Boulangerie Moderne Bukavu', telephone: '+243818654321', adresse: 'Boulevard Industriel', soldeDette: 120.0, limiteCredit: 1500.0, bloque: false },
  { id: 3, nom: 'Alimentation Centrale Kinshasa', telephone: '+243851239874', adresse: 'Marché Central Gombe', soldeDette: 0.0, limiteCredit: 3000.0, bloque: false },
]

export const comptesCaisse: DbCompteCaisse[] = [
  { id: 1, nom: 'Caisse Principale USD/CDF - Goma', agenceId: 1, soldeUsd: 4850.0, soldeCdf: 2450000.0 },
  { id: 2, nom: 'Caisse Ventes Comptoir - Goma', agenceId: 1, soldeUsd: 1250.0, soldeCdf: 980000.0 },
  { id: 3, nom: 'Caisse Principale - Kinshasa', agenceId: 2, soldeUsd: 7200.0, soldeCdf: 5600000.0 },
]

export const transactions: DbTransaction[] = [
  {
    id: 'TX-20260930-001',
    referenceInterne: 'ENC-20260930-01',
    agenceId: 1,
    caisseId: 1,
    montant: 350.0,
    devise: 'USD',
    tauxApplique: 2850,
    type: 'ENTREE',
    libelle: 'Versement vente comptoir matinale',
    statut: 'VALIDE',
    createurId: 4,
    validateurId: 3,
    dateCreation: '2026-09-30T07:30:00Z',
    dateValidation: '2026-09-30T08:00:00Z',
  },
]

export const ventes: DbVente[] = [
  {
    id: 1,
    referenceVente: 'VNT-GOM-202609-001',
    agenceId: 1,
    vendeurId: 4,
    clientId: 1,
    montantTotal: 120.0,
    devise: 'USD',
    estCredit: false,
    statutCredit: 'AUCUN',
    dateVente: '2026-09-30T07:45:00Z',
    details: [
      { id: 1, articleId: 1, quantite: 5, prixUnitaireApplique: 24.0 },
    ],
  },
]

export const planComptable: DbPlanComptable[] = [
  { numero: '101', libelle: 'Capital social', estModifiable: false },
  { numero: '401', libelle: 'Fournisseurs et comptes rattachés', estModifiable: false },
  { numero: '411', libelle: 'Clients et comptes rattachés', estModifiable: false },
  { numero: '521', libelle: 'Banques locales', estModifiable: false },
  { numero: '571', libelle: 'Caisse principale USD', estModifiable: false },
  { numero: '572', libelle: 'Caisse principale CDF', estModifiable: false },
  { numero: '601', libelle: 'Achats de matières premières', estModifiable: false },
  { numero: '605', libelle: 'Autres achats et fournitures', estModifiable: false },
  { numero: '661', libelle: 'Rémunérations du personnel', estModifiable: false },
  { numero: '701', libelle: 'Ventes de produits finis', estModifiable: false },
  { numero: '706', libelle: 'Services vendus', estModifiable: false },
  { numero: '707', libelle: 'Ventes de marchandises', estModifiable: false },
]

export const ecrituresComptables: DbEcritureComptable[] = [
  {
    id: 1,
    referenceOperation: 'ECR-INIT-01',
    agenceId: 1,
    compteNumero: '571',
    sens: 'DEBIT',
    montant: 4850.0,
    devise: 'USD',
    tauxApplique: 2850,
    libelle: 'Solde d ouverture caisse USD',
    sourceModule: 'TRESORERIE',
    sourceType: 'SOLDE_INITIAL',
    sourceId: '1',
    annulee: false,
    statutValidation: 'VALIDE',
    dateEcriture: '2026-09-01T00:00:00Z',
  },
  {
    id: 2,
    referenceOperation: 'ECR-INIT-01',
    agenceId: 1,
    compteNumero: '101',
    sens: 'CREDIT',
    montant: 4850.0,
    devise: 'USD',
    tauxApplique: 2850,
    libelle: 'Capital social affectation initiale',
    sourceModule: 'TRESORERIE',
    sourceType: 'SOLDE_INITIAL',
    sourceId: '1',
    annulee: false,
    statutValidation: 'VALIDE',
    dateEcriture: '2026-09-01T00:00:00Z',
  },
]

export const correctionsStock: DbCorrectionStock[] = []

export const ordresProduction: DbOrdreProduction[] = [
  {
    id: 1,
    codeOrdre: 'OP-202609-001',
    agenceId: 1,
    articleFiniId: 1,
    quantitePrevue: 50,
    quantiteReelle: 50,
    statut: 'TERMINE',
    dateCreation: '2026-09-28T08:00:00Z',
    dateCloture: '2026-09-28T16:00:00Z',
    lotCree: 'LOT-2609-01',
  },
]

export const recettes: DbRecette[] = [
  { id: 1, articleFiniId: 1, articleMatiereId: 5, quantiteRequise: 0.025 },
  { id: 2, articleFiniId: 3, articleMatiereId: 5, quantiteRequise: 0.0004 },
  { id: 3, articleFiniId: 4, articleMatiereId: 6, quantiteRequise: 0.05 },
]

export const auditLogs: DbAuditLog[] = [
  {
    id: 1,
    dateHeure: '2026-09-30T06:00:00Z',
    utilisateur: 'Système',
    action: 'INITIALISATION',
    details: 'Initialisation du registre Matabishi ERP MVG SARL',
    agenceId: 1,
  },
]

export const fournisseurs: DbFournisseur[] = [
  {
    id: 1,
    nom: 'Grands Moulins du Kivu SARL',
    contact: 'M. Paluku Sylvain',
    telephone: '+243998812345',
    adresse: 'Zone Industrielle Kituku, Goma',
    soldeDette: 2400.0,
  },
  {
    id: 2,
    nom: 'Agro-Business Tanganyika',
    contact: 'Mme Jeanne Masika',
    telephone: '+243812309876',
    adresse: 'Port Public de Bukavu',
    soldeDette: 0.0,
  },
  {
    id: 3,
    nom: 'Emballages & Plastiques du Congo',
    contact: 'Direction Commerciale',
    telephone: '+243850011223',
    adresse: 'Boulevard Lumumba, Limete, Kinshasa',
    soldeDette: 650.0,
  },
]

export const achats: DbAchat[] = [
  {
    id: 1,
    referenceAchat: 'ACH-202609-001',
    agenceId: 1,
    fournisseurId: 1,
    montantTotal: 4500.0,
    montantPaye: 2100.0,
    devise: 'USD',
    statut: 'RECU',
    dateAchat: '2026-09-25T09:00:00Z',
    lignes: [
      {
        id: 1,
        articleId: 5, // Blé Grain Brut
        quantite: 10,
        prixUnitaire: 450.0,
        numeroLot: 'LOT-RAW-2609-01',
        dateExpiration: '2027-09-30',
      },
    ],
  },
]

export const transfertsStock: DbTransfertStock[] = [
  {
    id: 1,
    referenceTransfert: 'TRF-GOM-KIN-001',
    agenceSourceId: 1, // Goma (Siège)
    agenceDestId: 2,   // Kinshasa
    dateExpedition: '2026-09-29T10:00:00Z',
    statut: 'EN_TRANSIT',
    initiateurNom: 'Kasereka Jean (Chef Goma)',
    lignes: [
      {
        id: 1,
        articleId: 1, // Farine Extra 25kg
        quantite: 100,
        numeroLot: 'LOT-2609-01',
      },
      {
        id: 2,
        articleId: 2, // Huile de Palme 20L
        quantite: 40,
        numeroLot: 'LOT-2609-02',
      },
    ],
  },
]

export const agents: DbAgent[] = [
  {
    id: 1,
    matricule: 'AGT-GOM-001',
    nom: 'Mwamba Eric',
    telephone: '+243997001122',
    poste: 'Vendeur / Commercial',
    agenceId: 1,
    salaireBase: 350.0,
    tauxCommission: 2.5, // 2.5% sur ventes
    actif: true,
  },
  {
    id: 2,
    matricule: 'AGT-GOM-002',
    nom: 'Amina Sophie',
    telephone: '+243997001133',
    poste: 'Caissière Principale',
    agenceId: 1,
    salaireBase: 380.0,
    tauxCommission: 0.0,
    actif: true,
  },
  {
    id: 3,
    matricule: 'AGT-GOM-003',
    nom: 'Baraka Joseph',
    telephone: '+243997001144',
    poste: 'Magasinier / Gestionnaire Stock',
    agenceId: 1,
    salaireBase: 320.0,
    tauxCommission: 0.0,
    actif: true,
  },
  {
    id: 4,
    matricule: 'AGT-KIN-001',
    nom: 'Kabasele André',
    telephone: '+243818002233',
    poste: 'Commercial Kinshasa',
    agenceId: 2,
    salaireBase: 400.0,
    tauxCommission: 3.0,
    actif: true,
  },
]

export const avancesSalaire: DbAvanceSalaire[] = [
  {
    id: 1,
    agentId: 1,
    agenceId: 1,
    montant: 50.0,
    devise: 'USD',
    motif: 'Frais médicaux urgents',
    statut: 'DECAISSE',
    demandeurNom: 'Mwamba Eric',
    validateurNom: 'Kasereka Jean (Chef Agence)',
    dateDemande: '2026-09-15T09:00:00Z',
    dateDecaissement: '2026-09-15T10:30:00Z',
  },
]

export const bulletinsPaie: DbBulletinPaie[] = [
  {
    id: 1,
    referenceBulletin: 'PAY-202609-001',
    agentId: 1,
    agenceId: 1,
    mois: 9,
    annee: 2026,
    salaireBase: 350.0,
    commissionsVentes: 45.0, // calculé sur ses ventes
    avancesDeduites: 50.0,
    netAPayer: 345.0,
    devise: 'USD',
    statut: 'VALIDE',
    preparateurNom: 'Direction RH',
    comptableSeniorNom: 'Kambale Michel (Comptable Senior)',
    dateGeneration: '2026-09-29T16:00:00Z',
  },
]

export const operationsSync: DbSyncOperation[] = [
  {
    id: 1,
    clientOperationId: 'SYNC-INIT-001',
    typeOperation: 'VENTE',
    statut: 'ACCEPTEE',
    message: 'Synchronisation initiale conforme',
    stockNegatifSignale: false,
    dateReception: '2026-09-30T07:00:00Z',
  },
]

export const categories: DbCategorie[] = [
  { id: 1, nom: 'Farines & Dérivés Céréaliers', description: 'Farines de froment, maïs et semoules de qualité supérieure' },
  { id: 2, nom: 'Huiles & Matières Grasses', description: 'Huiles végétales raffinées et conditionnées' },
  { id: 3, nom: 'Matières Premières Minoterie', description: 'Grains bruts de blé, maïs et intrants de transformation' },
  { id: 4, nom: 'Boulangerie & Pâtisserie', description: 'Pains toast et produits finis de panification' },
  { id: 5, nom: 'Biscuiterie & Snacks', description: 'Biscuits secs et confiseries' },
]



