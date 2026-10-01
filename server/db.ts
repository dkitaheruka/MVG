// Database and business state for Matabishi ERP
export interface DbUser {
  id: number
  email: string
  nom: string
  role: string
  agenceId?: number
  permissions: string[]
  actif: boolean
}

export interface DbAgence {
  id: number
  nom: string
  ville: string
  adresse: string
  estSiege: boolean
}

export interface DbArticle {
  id: number
  codeUnique: string
  designation: string
  type: 'MATIERE_PREMIERE' | 'PRODUIT_FINI'
  uniteMesure: string
  prixVenteStandard: number
  alerteExpiration: boolean
  categorieId?: number
}

export interface DbCategorie {
  id: number
  nom: string
  description: string
}

export interface DbPrixArticleAgence {
  id: number
  agenceId: number
  articleId: number
  prix: number
  devise: 'USD' | 'CDF'
  statut: 'PROPOSE' | 'VALIDE' | 'REFUSE'
  proposePar?: string
  validePar?: string
  actif: boolean
}

export interface DbTauxChange {
  id: number
  agenceId: number
  taux: number
  statut: 'PROPOSE' | 'VALIDE' | 'REFUSE'
  proposePar?: string
  validePar?: string
  dateDebut: string
  actif: boolean
}

export interface DbStockAgence {
  id: number
  agenceId: number
  articleId: number
  quantite: number
  numeroLot: string
  dateExpiration: string
  seuilAlerte: number
}

export interface DbClient {
  id: number
  nom: string
  telephone: string
  adresse: string
  soldeDette: number
  limiteCredit: number
  bloque: boolean
}

export interface DbVenteDetail {
  id: number
  articleId: number
  quantite: number
  prixUnitaireApplique: number
  numeroLot?: string
}

export interface DbVente {
  id: number
  referenceVente: string
  agenceId: number
  vendeurId: number
  clientId?: number
  montantTotal: number
  montantCdf?: number
  devise: 'USD' | 'CDF'
  estCredit: boolean
  statutCredit: 'AUCUN' | 'EN_ATTENTE' | 'DEPASSEMENT_PLAFOND' | 'VALIDE' | 'REJETE'
  demandeurAnnulation?: string
  statutAnnulation?: 'AUCUNE' | 'EN_ATTENTE' | 'ANNULEE'
  dateVente: string
  details: DbVenteDetail[]
}

export interface DbCompteCaisse {
  id: number
  nom: string
  agenceId: number
  soldeUsd: number
  soldeCdf: number
}

export interface DbTransaction {
  id: string
  referenceInterne: string
  agenceId: number
  caisseId?: number
  montant: number
  devise: 'USD' | 'CDF'
  tauxApplique?: number
  type: 'ENTREE' | 'SORTIE'
  libelle: string
  statut: 'EN_ATTENTE' | 'VALIDE' | 'REJETE'
  createurId: number
  validateurId?: number
  dateCreation: string
  dateValidation?: string
}

export interface DbCorrectionStock {
  id: number
  agenceId: number
  articleId: number
  numeroLot: string
  quantiteActuelle: number
  quantiteNouvelle: number
  motif: string
  demandeurId: number
  validateurId?: number
  statut: 'EN_ATTENTE' | 'VALIDE' | 'REJETE'
  dateDemande: string
}

export interface DbPlanComptable {
  numero: string
  libelle: string
  estModifiable: boolean
  parentNumero?: string
}

export interface DbEcritureComptable {
  id: number
  referenceOperation: string
  agenceId: number
  compteNumero: string
  sens: 'DEBIT' | 'CREDIT'
  montant: number
  devise: 'USD' | 'CDF'
  tauxApplique?: number
  libelle: string
  sourceModule: string
  sourceType: string
  sourceId: string
  annulee: boolean
  statutValidation: 'VALIDE' | 'EN_ATTENTE'
  demandeurId?: number
  validateurId?: number
  dateEcriture: string
}

export interface DbOrdreProduction {
  id: number
  codeOrdre: string
  agenceId: number
  articleFiniId: number
  quantitePrevue: number
  quantiteReelle?: number
  statut: 'PLANIFIE' | 'EN_COURS' | 'TERMINE' | 'ANNULE'
  dateCreation: string
  dateCloture?: string
  lotCree?: string
}

export interface DbRecette {
  id: number
  articleFiniId: number
  articleMatiereId: number
  quantiteRequise: number
}

export interface DbAuditLog {
  id: number
  dateHeure: string
  utilisateur: string
  action: string
  details: string
  agenceId?: number
}

export interface DbFournisseur {
  id: number
  nom: string
  contact: string
  telephone: string
  adresse: string
  soldeDette: number
}

export interface DbAchatLigne {
  id: number
  articleId: number
  quantite: number
  prixUnitaire: number
  numeroLot: string
  dateExpiration: string
}

export interface DbAchat {
  id: number
  referenceAchat: string
  agenceId: number
  fournisseurId: number
  montantTotal: number
  montantPaye: number
  devise: 'USD' | 'CDF'
  statut: 'COMMANDE' | 'RECU' | 'CLOTURE'
  dateAchat: string
  lignes: DbAchatLigne[]
}

export interface DbTransfertStockLigne {
  id: number
  articleId: number
  quantite: number
  numeroLot: string
}

export interface DbTransfertStock {
  id: number
  referenceTransfert: string
  agenceSourceId: number
  agenceDestId: number
  dateExpedition: string
  dateReception?: string
  statut: 'EN_TRANSIT' | 'RECU' | 'LITIGE'
  initiateurNom: string
  recepteurNom?: string
  motifEcart?: string
  lignes: DbTransfertStockLigne[]
}

export interface DbAgent {
  id: number
  matricule: string
  nom: string
  telephone: string
  poste: string
  agenceId: number
  salaireBase: number
  tauxCommission: number
  actif: boolean
}

export interface DbAvanceSalaire {
  id: number
  agentId: number
  agenceId: number
  montant: number
  devise: 'USD' | 'CDF'
  motif: string
  statut: 'EN_ATTENTE' | 'VALIDE' | 'DECAISSE' | 'REJETE'
  demandeurNom: string
  validateurNom?: string
  dateDemande: string
  dateDecaissement?: string
}

export interface DbBulletinPaie {
  id: number
  referenceBulletin: string
  agentId: number
  agenceId: number
  mois: number
  annee: number
  salaireBase: number
  commissionsVentes: number
  avancesDeduites: number
  netAPayer: number
  devise: 'USD' | 'CDF'
  statut: 'BROUILLON' | 'VALIDE' | 'PAYE'
  preparateurNom: string
  comptableSeniorNom?: string
  dateGeneration: string
  datePaiement?: string
}

export interface DbSyncOperation {
  id: number
  clientOperationId: string
  typeOperation: string
  statut: 'EN_ATTENTE' | 'ACCEPTEE' | 'ACCEPTEE_STOCK_NEGATIF' | 'REJETEE' | 'CONFLIT'
  message?: string
  stockNegatifSignale: boolean
  dateReception: string
}

