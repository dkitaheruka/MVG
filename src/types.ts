export type Language = 'fr' | 'sw' | 'en'
export type ThemeMode = 'light' | 'dark'

export type PermissionCode =
  | 'dashboard.voir'
  | 'agences.gerer'
  | 'utilisateurs.gerer'
  | 'roles.gerer'
  | 'appareils.gerer'
  | 'audit.voir'
  | 'articles.gerer'
  | 'stocks.voir'
  | 'stocks.corriger'
  | 'stocks.valider_correction'
  | 'ventes.creer'
  | 'ventes.voir'
  | 'ventes.annuler'
  | 'credits.valider'
  | 'clients.gerer'
  | 'clients.credit_gerer'
  | 'tresorerie.demande'
  | 'tresorerie.valider'
  | 'tresorerie.voir'
  | 'production.gerer'
  | 'production.qr_generer'
  | 'comptabilite.plan_gerer'
  | 'comptabilite.ecritures_voir'
  | 'reporting.voir'
  | 'reporting.exporter'
  | 'sync.voir'
  | 'documents.gerer'
  | 'achats.gerer'
  | 'transferts.gerer'
  | 'rh.gerer'

export type UserSession = {
  token: string
  email: string
  role: string
  agenceId?: number
  permissions: PermissionCode[]
}

export type ApiError = {
  message: string
}

export type Agence = {
  id: number
  nom: string
  ville?: string
  adresse?: string
  tauxUsdCdfLocal?: number
  estSiege: boolean
}

export type RapportPerformance = {
  totalRecettesUsd: number
  totalRecettesCdf: number
  totalConsolideUsd: number
  nombreTransactions: number
}

export type RoleUtilisateur = {
  id: number
  code: string
  nom: string
  description?: string
  systeme: boolean
  actif: boolean
  permissions: Permission[]
}

export type Permission = {
  id: number
  code: PermissionCode
  module: string
  libelle: string
  description?: string
}

export type Article = {
  id: number
  codeUnique?: string
  designation: string
  type?: 'MATIERE_PREMIERE' | 'PRODUIT_FINI'
  uniteMesure?: string
  prixVenteStandard?: number
  alerteExpiration?: boolean
}

export type PrixArticleAgence = {
  id: number
  agence?: Agence
  article?: Article
  prix: number
  devise: string
  actif: boolean
}

export type TauxChangeAgence = {
  id: number
  agence?: Agence
  taux: number
  deviseSource?: string
  deviseCible?: string
  dateDebut?: string
  actif: boolean
}

export type StockAgence = {
  id: number
  quantite?: number
  numeroLot?: string
  dateExpiration?: string
  seuilAlerte?: number
  article?: Article
  agence?: Agence
}

export type Client = {
  id?: number
  nom: string
  telephone?: string
  adresse?: string
  soldeDette?: number
}

export type VenteDetail = {
  id?: number
  article?: Article
  quantite: number
  prixUnitaireApplique: number
}

export type Vente = {
  id?: number
  referenceVente?: string
  agence?: Agence
  vendeur?: { id?: number; nom?: string; email: string }
  client?: Client
  montantTotal: number
  devise: string
  estCredit: boolean
  statutCredit?: 'AUCUN' | 'EN_ATTENTE' | 'DEPASSEMENT_PLAFOND' | 'VALIDE' | 'REJETE'
  dateVente?: string
  details?: VenteDetail[]
}

export type CartItem = {
  articleId: number
  designation: string
  codeUnique?: string
  uniteMesure?: string
  prix: number
  quantite: number
  stockDisponible: number
  numeroLot?: string
  dateExpiration?: string
}

export type SyncOperation = {
  id: number
  clientOperationId: string
  typeOperation: string
  statut: 'EN_ATTENTE' | 'ACCEPTEE' | 'ACCEPTEE_STOCK_NEGATIF' | 'REJETEE' | 'CONFLIT'
  message?: string
  stockNegatifSignale: boolean
  dateReception?: string
}

export type CompteCaisse = {
  id?: number
  nom: string
  soldeUsd: number
  soldeCdf: number
  type?: 'CAISSE' | 'BANQUE'
  numeroCompteBancaire?: string
  agence?: Agence
}

export type StatutTransaction = 'EN_ATTENTE' | 'VALIDE' | 'REJETE'
export type TypeMouvement = 'ENTREE' | 'SORTIE'

export type PlanComptable = {
  numero: string
  libelle: string
  estModifiable: boolean
  parent?: PlanComptable
}

export type ServiceEntreprise = {
  id?: number
  nom: string
}

export type Transaction = {
  id?: string
  referenceInterne?: string
  agence?: Agence
  service?: ServiceEntreprise
  compteComptable?: PlanComptable
  caisseId?: number
  caisse?: CompteCaisse
  montant: number
  devise: 'USD' | 'CDF'
  tauxApplique?: number
  type: TypeMouvement
  libelle: string
  statut: StatutTransaction
  dateCreation?: string
  dateValidation?: string
  createur?: { id?: number; nom?: string; email: string }
  validateur?: { id?: number; nom?: string; email: string }
}

export type SensEcriture = 'DEBIT' | 'CREDIT'

export type EcritureComptable = {
  id?: number
  referenceOperation?: string
  agence?: Agence
  compte?: PlanComptable
  sens: SensEcriture
  montant: number
  devise: string
  tauxApplique?: number
  libelle?: string
  sourceModule?: string
  sourceType?: string
  sourceId?: string
  annulee?: boolean
  dateEcriture?: string
  utilisateur?: { id?: number; nom?: string; email: string }
}

export type LigneFinanciere = {
  numeroCompte: string
  libelle: string
  debitUsd: number
  creditUsd: number
  debitCdf: number
  creditCdf: number
  totalConsolideUsd: number
}

export type ServicePerformance = {
  nomService: string
  charges: number
  produits: number
  resultatNet: number
}

export type RapprochementBancaire = {
  id: number
  compteCaisseId: number
  agenceId: number
  compte?: CompteCaisse
  dateDebut: string
  dateFin: string
  soldeDebutReleve: number
  soldeFinReleve: number
  soldeComptable: number
  ecart: number
  devise: 'USD' | 'CDF'
  statut: 'EN_COURS' | 'VALIDE'
  dateCloture?: string
  auteur: string
  operationsPointees: string[]
}

export type BonLivraison = {
  id: number
  numeroBL: string
  agenceId: number
  venteId: number
  vente?: any
  clientNom: string
  clientTelephone?: string
  adresseLivraison: string
  vehiculeId?: number
  vehicule?: any
  chauffeurNom?: string
  quantiteSacs: number
  poidsTotalKg: number
  statut: 'PREPARATION' | 'EN_TRANSIT' | 'LIVRE' | 'ANNULE'
  dateCreation: string
  dateDepart?: string
  dateLivraison?: string
  recepteurNom?: string
  recepteurSignature?: string
  observations?: string
}

export type CommandeAchat = {
  id: number
  numeroBC: string
  agenceId: number
  fournisseurId: number
  fournisseur?: any
  fournisseurNom: string
  produit: string
  quantiteKg: number
  prixUnitaireKgUsd: number
  montantTotalUsd: number
  dateCommande: string
  statut: 'APPROUVEE' | 'EN_RECEPTION' | 'SOLDEE' | 'ANNULEE'
  observations?: string
}

export type ReceptionPontBascule = {
  id: number
  numeroBR: string
  commandeAchatId?: number
  numeroBC?: string
  agenceId: number
  fournisseurId: number
  fournisseurNom: string
  produit: string
  immatriculationCamion: string
  chauffeur: string
  peseeBruteKg: number
  peseeTareKg: number
  poidsNetKg: number
  tauxHumidite: number
  tauxImpuretes: number
  refactionKg: number
  poidsNetAccepteKg: number
  prixUnitaireKgUsd: number
  montantTotalFactureUsd: number
  statut: 'VALIDE' | 'EN_ATTENTE_TARE'
  datePeseeBrute: string
  datePeseeTare?: string
  magasinierNom: string
  observations?: string
}

export type DirectionKpis = {
  caMoisUsd: number
  caMoisCdf: number
  sacsVendus: number
  margeBruteParSacUsd: number
  tauxMargeMoyen: number
  farineExtraiteKg: number
  maisConsommeKg: number
  rendementMeunerie: number
  totalCaisseUsd: number
  totalBanqueUsd: number
  totalTresorerieCdf: number
  tresorerieNetteConsolideeUsd: number
  creancesTotalUsd: number
  creancesEchuesUsd: number
  evolutionVentes6Mois: Array<{
    mois: string
    caUsd: number
    margeUsd: number
    tonnageT: number
  }>
}


