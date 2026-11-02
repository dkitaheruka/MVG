export interface DbUser {
  id: number
  email: string
  nom: string
  role: string
  agenceId?: number
  permissions: string[]
  actif: boolean
  password?: string
  tentativesEchouees?: number
  estBloque?: boolean
  motifBlocage?: 'TENTATIVES_EXCESSIVES' | 'CONNEXION_MULTI_APPAREILS' | 'SUSPENDU_ADMIN' | string
  doitChangerMotDePasse?: boolean
  estVip?: boolean
  appareilActifId?: string
  appareilActifNom?: string
  sessionActiveId?: string
  derniereConnexion?: string
}

export interface DbAppareil {
  id: number
  deviceId: string
  nom: string
  type: 'POS_TERMINAL' | 'PC_BUREAU' | 'TABLETTE' | 'MOBILE'
  agenceId: number
  userId?: number
  userNom?: string
  statut: 'AUTORISE' | 'BLOQUE' | 'EN_ATTENTE'
  adresseIp?: string
  userAgent?: string
  derniereConnexion?: string
  dateEnregistrement: string
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
  compteComptable?: string
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
  statutCredit: 'AUCUN' | 'EN_ATTENTE' | 'DEPASSEMENT_PLAFOND' | 'VALIDE' | 'REJETE' | 'PARTIEL' | 'REGLE' | 'SOLDE'
  demandeurAnnulation?: string
  statutAnnulation?: 'AUCUNE' | 'EN_ATTENTE' | 'ANNULEE'
  dateVente: string
  details: DbVenteDetail[]
  fraisTransport?: number
  comptabilisee?: boolean
  modeTransport?: string
  vehiculeId?: number
  clientVehicule?: string
  clientChauffeur?: string
  caisseId?: number
  montantPaye?: number
  montantRestant?: number
  referencePaiement?: string
  dateDernierPaiement?: string
}

export interface DbCompteCaisse {
  id: number
  nom: string
  agenceId: number
  soldeUsd: number
  soldeCdf: number
  type?: 'CAISSE' | 'BANQUE'
  numeroCompteBancaire?: string
  numeroCompteComptable?: string
  deviseDefaut?: 'USD' | 'CDF' | 'MULTI'
  responsableNom?: string
  actif?: boolean
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
  classe?: number
  nature?: 'ACTIF' | 'PASSIF' | 'CHARGE' | 'PRODUIT' | 'SPECIAL'
  actif?: boolean
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
  dateCreation?: string
  dateExpedition: string
  dateReception?: string
  statut: 'EN_ATTENTE_VALIDATION_SOURCE' | 'EN_ATTENTE_VISA_SIEGE' | 'APPROUVE_SIEGE' | 'EN_TRANSIT' | 'RECU' | 'LITIGE' | 'REFUSE'
  initiateurNom: string
  validationSourceNom?: string
  dateValidationSource?: string
  visaSiegeNom?: string
  dateVisaSiege?: string
  recepteurNom?: string
  motifEcart?: string
  motifRefus?: string
  vehiculeId?: number
  immatriculationCamion?: string
  chauffeurNom?: string
  lignes: DbTransfertStockLigne[]
}

export interface DbAgent {
  id: number
  matricule: string
  nom: string
  telephone: string
  poste: string
  agenceId: number
  categorie?: string
  salaireBase: number
  indemniteTransport?: number
  indemniteLogement?: number
  tauxCommission: number
  devise?: 'USD' | 'CDF'
  nombreEnfantsACharge?: number
  actif: boolean
  biometrieEnregistree?: boolean
  empreinteHash?: string
  dateEnrolementBiometrique?: string
  doigtEnrole?: string
  qualiteEmpreinte?: number
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
  categorie?: string
  nombreEnfantsACharge?: number
  salaireBase: number
  indemniteTransport?: number
  indemniteLogement?: number
  commissionsVentes: number
  salaireBrut: number
  cnssQpo: number
  cnssQpp: number
  remunerationImposable: number
  ipr: number
  inpp: number
  onem: number
  avancesDeduites: number
  nombreRetardsDuMois?: number
  retardsPenalises?: number
  retenueRetards?: number
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

export interface DbParametresEntreprise {
  nomSociete: string
  sigle?: string
  slogan: string
  rccm: string
  idNat: string
  nif: string
  siegeAdresse: string
  telephone: string
  emailContact: string
  siteWeb?: string
  tauxTvaPourcent: number
  mentionsPiedFacture: string
  mentionsPiedLivraison: string
  logoUrl?: string
  logoDroiteUrl?: string
  logoFiligraneUrl?: string
  filigraneOpacite?: number
  filigraneTexte?: string
  plafondAutonomieEtatBesoinAgenceUsd?: number
  plafondDepenseDirecteAgenceUsd?: number
  doubleValidationTransfertObligatoire?: boolean
}

export interface DbVehicule {
  id: number
  plaqueImmatriculation: string
  marqueModele: string
  capaciteTonnes: number
  capaciteSacs: number
  chauffeurNom: string
  chauffeurTelephone?: string
  agenceId: number
  statut: 'DISPONIBLE' | 'EN_COURSE' | 'EN_MAINTENANCE'
}

// 1. Rapprochement Bancaire
export interface DbRapprochementBancaire {
  id: number
  compteCaisseId: number
  agenceId: number
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
  operationsPointees: string[] // IDs des transactions ou écritures pointées
}

// 2. Bons de Livraison Clients
export interface DbBonLivraison {
  id: number
  numeroBL: string
  agenceId: number
  venteId: number
  clientNom: string
  clientTelephone?: string
  adresseLivraison: string
  vehiculeId?: number
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

// 3. Commandes d'Achat Fournisseurs & Pesée Pont-Bascule
export interface DbCommandeAchat {
  id: number
  numeroBC: string
  agenceId: number
  fournisseurId: number
  fournisseurNom: string
  produit: string
  quantiteKg: number
  prixUnitaireKgUsd: number
  montantTotalUsd: number
  dateCommande: string
  statut: 'APPROUVEE' | 'EN_RECEPTION' | 'SOLDEE' | 'ANNULEE'
  observations?: string
}

export interface DbReceptionPontBascule {
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

// 4. Immobilisations & Dotations aux Amortissements (SYSCOHADA)
export interface DbImmobilisation {
  id: number
  code: string
  nom: string
  categorie: 'CORPORELLE' | 'INCORPORELLE' | 'FINANCIERE'
  compteImmo: string
  compteAmort: string
  valeurAcquisitionUsd: number
  valeurResiduelleUsd: number
  dureeAnnees: number
  methode: 'LINEAIRE' | 'DEGRESSIF'
  dateAcquisition: string
  amortissementCumuleUsd: number
  valeurNetteComptableUsd: number
  dotationAnnuelleUsd: number
  agenceId: number
  statut: 'ACTIF' | 'REBUTE' | 'CEDE'
  emplacement: string
}

// 5. Paramétrage Dynamique Fiscal & Social de la Paie (CNSS, IPR, INPP, ONEM, Tranches)
export interface DbTrancheIpr {
  id: string
  ordre: number
  limiteInferieureCdf: number
  limiteSuperieureCdf: number | null // null = illimité (au-delà)
  tauxPourcent: number
  description?: string
}

export interface DbParametresFiscauxSociaux {
  cnssQpoPourcent: number // Taux salarié (QPO, ex: 5%)
  cnssQppPourcent: number // Taux patronal (QPP, ex: 13%)
  inppPourcent: number // Taux INPP employeur (ex: 3.5%)
  onemPourcent: number // Taux ONEM employeur (ex: 0.5%)
  deductionEnfantPourcent: number // Réduction IPR par enfant à charge (ex: 2%)
  maxEnfantsDeductibles: number // Plafond d'enfants pour déduction (ex: 9)
  appliquerPlafondIpr: boolean // Activer ou non le plafond légal de l'IPR
  plafondIprPourcent: number // Plafond légal de retenue IPR sur le brut imposable (ex: 30%)
  smigJournalierCdf?: number // SMIG journalier de référence (optionnel)
  deviseReferenceBareme: 'CDF' | 'USD'
  tranchesIpr: DbTrancheIpr[]
  // Politique de ponctualité, heure de retard et retenues disciplinaires
  heureDebutTravail?: string // Heure normale d'embauche (ex: "08:00")
  toleranceRetardMinutes?: number // Période de grâce / tolérance en minutes (ex: 10)
  activerRetenueRetard?: boolean // Activer ou non la retenue automatique sur salaire
  seuilRetardsAvantRetenue?: number // Nombre de retards mensuels tolérés avant retenue (ex: 2)
  typeCalculRetenue?: 'FORFAIT_FIXE' | 'POURCENTAGE_SALAIRE_JOURNALIER' // Méthode de calcul
  valeurRetenueParRetard?: number // Montant ou % par retard excédentaire (ex: 5$ ou 25%)
  deviseRetenue?: 'USD' | 'CDF'
  derniereModification?: string
  modifiePar?: string
}

// 6. Pointage Biométrique & Présence des Agents
export interface DbPointageAgent {
  id: number
  agentId: number
  matricule: string
  agentNom: string
  poste: string
  agenceId: number
  agenceNom: string
  date: string // YYYY-MM-DD
  heureArrivee: string // HH:mm:ss
  heureDepart?: string
  statut: 'PRESENT' | 'RETARD' | 'ABSENT' | 'MISSION'
  modePointage: 'EMPREINTE_DIGITALE' | 'BADGE_RFID' | 'RECONNAISSANCE_FACIALE' | 'MANUEL'
  empreinteMatchScore?: number // Pourcentage de correspondance biométrique (ex: 98.7%)
  terminalId?: string // Identifiant du lecteur biométrique (ex: 'BIO-SCAN-GOMA-01')
  temperature?: number // Température corporelle (ex: 36.6)
  observations?: string
}
