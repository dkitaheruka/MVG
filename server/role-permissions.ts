export const permissionsCatalog = [
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
  { id: 12, code: 'achats.gerer', module: 'Achats & Matières Premières', libelle: 'Consulter et enregistrer les achats de matières premières et intrants' },
  { id: 13, code: 'achats.commandes', module: 'Achats & Matières Premières', libelle: 'Émettre et valider les bons de commande fournisseurs (BC)' },
  { id: 14, code: 'achats.pont_bascule', module: 'Achats & Matières Premières', libelle: 'Effectuer les pesées pont-bascule et contrôles agréage' },

  // 5. Logistique & Convois
  { id: 15, code: 'transferts.gerer', module: 'Logistique & Convois', libelle: 'Gérer les transferts inter-dépôts et feuilles de route convoi' },
  { id: 17, code: 'livraisons.gerer', module: 'Logistique & Convois', libelle: 'Générer les bordereaux de livraison (BL) et visas' },

  // 6. Maintenance & Gestion du Parc Matériel
  { id: 16, code: 'flotte.gerer', module: 'Maintenance & Parc Matériel', libelle: 'Accéder et administrer le parc matériel, camions, véhicules et machines usine' },
  { id: 43, code: 'maintenance.gerer', module: 'Maintenance & Parc Matériel', libelle: 'Superviser les ordres de réparation et entretiens techniques des équipements' },

  // 7. Production & Transformation
  { id: 18, code: 'production.gerer', module: 'Production & Transformation', libelle: 'Lancer, suivre et clôturer les ordres de fabrication (OF)' },
  { id: 19, code: 'production.qr_generer', module: 'Production & Transformation', libelle: 'Générer et imprimer les étiquettes QR codes de traçabilité des articles' },
  { id: 20, code: 'production.recettes', module: 'Production & Transformation', libelle: 'Paramétrer les recettes de fabrication et rendements de production' },

  // 8. Trésorerie & Banque
  { id: 21, code: 'tresorerie.voir', module: 'Trésorerie & Banques', libelle: 'Consulter les soldes des caisses comptoir et banques' },
  { id: 22, code: 'tresorerie.demande', module: 'Trésorerie & Banques', libelle: 'Initier des demandes de décaissement pour dépenses' },
  { id: 23, code: 'tresorerie.valider', module: 'Trésorerie & Banques', libelle: 'Approuver et payer les bons de décaissement de trésorerie' },
  { id: 24, code: 'banque.rapprochement', module: 'Trésorerie & Banques', libelle: 'Effectuer le rapprochement bancaire (Rawbank / Equity BCDC)' },

  // 9. Ressources Humaines & Paie
  { id: 25, code: 'rh.gerer', module: 'Ressources Humaines & Paie', libelle: 'Administrer les fiches des agents, ouvriers et contrats' },
  { id: 26, code: 'rh.bulletins', module: 'Ressources Humaines & Paie', libelle: 'Calculer et imprimer les bulletins de paie (IPR, CNSS, INPP)' },
  { id: 27, code: 'rh.avances', module: 'Ressources Humaines & Paie', libelle: 'Accorder et comptabiliser les avances sur salaire' },

  // 10. Comptabilité SYSCOHADA
  { id: 28, code: 'comptabilite.plan_gerer', module: 'Comptabilité SYSCOHADA', libelle: 'Administrer le plan comptable général SYSCOHADA Révisé' },
  { id: 29, code: 'comptabilite.ecritures_voir', module: 'Comptabilité SYSCOHADA', libelle: 'Consulter le journal général des écritures et le Grand Livre' },
  { id: 30, code: 'comptabilite.od_creer', module: 'Comptabilité SYSCOHADA', libelle: 'Saisir des écritures manuelles d opérations diverses (OD)' },
  { id: 31, code: 'comptabilite.cloture', module: 'Comptabilité SYSCOHADA', libelle: 'Exécuter la clôture annuelle des comptes et calcul du résultat' },
  { id: 32, code: 'comptabilite.immo_gerer', module: 'Comptabilité SYSCOHADA', libelle: 'Gérer les immobilisations et passer les dotations aux amortissements' },
  { id: 44, code: 'comptabilite.voir', module: 'Comptabilité SYSCOHADA', libelle: 'Consulter et accéder aux modules comptables d agence' },

  // 11. Reporting & Décisionnel
  { id: 33, code: 'reporting.voir', module: 'Reporting & Décisionnel', libelle: 'Consulter la balance, compte de résultat et états analytiques' },
  { id: 34, code: 'reporting.exporter', module: 'Reporting & Décisionnel', libelle: 'Télécharger les bilans officiels et exports tabulaires CSV/PDF' },
  { id: 45, code: 'analytics.voir', module: 'Reporting & Décisionnel', libelle: 'Consulter les diagrammes et analyses graphiques (Consolidé pour le siège, agence locale pour le chef)' },
  { id: 46, code: 'cage.voir', module: 'Reporting & Décisionnel', libelle: 'Consulter le Contrôle de Gestion (CAGE & TFT) et flux financiers' },

  // 12. Administration & Contrôle Siège
  { id: 35, code: 'roles.gerer', module: 'Administration & Siège', libelle: 'Attribuer les fonctionnalités, permissions et gouvernance RBAC' },
  { id: 36, code: 'utilisateurs.gerer', module: 'Administration & Siège', libelle: 'Créer, éditer, activer et bloquer les comptes utilisateurs' },
  { id: 37, code: 'agences.gerer', module: 'Administration & Siège', libelle: 'Ouvrir de nouvelles agences, dépôts et fixer les paramètres' },
  { id: 38, code: 'appareils.gerer', module: 'Administration & Siège', libelle: 'Autoriser ou révoquer les terminaux mobiles et tablettes terrain' },
  { id: 39, code: 'audit.voir', module: 'Administration & Siège', libelle: 'Auditer le journal de traçabilité immuable de sécurité' },
  { id: 40, code: 'backup.gerer', module: 'Administration & Siège', libelle: 'Sauvegarder et restaurer l intégralité de la base de données' },

  // 13. Synchronisation & Documents
  { id: 41, code: 'sync.voir', module: 'Synchronisation Terrain', libelle: 'Accéder à l outil de synchronisation des ventes hors-ligne' },
  { id: 42, code: 'documents.gerer', module: 'Gestion Documentaire', libelle: 'Imprimer les documents officiels et badges avec logo et QR codes' },
]

export const rolesPermissionsMap: Record<string, string[]> = {
  SUPER_ADMIN: permissionsCatalog.map((p) => p.code),
  ADMIN_SIEGE: permissionsCatalog.filter((p) => !['sync.voir'].includes(p.code)).map((p) => p.code),
  CHEF_AGENCE: [
    'dashboard.voir', 'analytics.voir', 'ventes.voir', 'ventes.creer', 'ventes.annuler', 'credits.valider', 'clients.gerer', 'clients.credit_gerer',
    'stocks.voir', 'stocks.corriger', 'stocks.valider_correction', 'articles.gerer',
    'achats.gerer', 'achats.commandes', 'achats.pont_bascule',
    'transferts.gerer', 'flotte.gerer', 'livraisons.gerer', 'production.gerer',
    'tresorerie.voir', 'tresorerie.demande', 'tresorerie.valider',
    'comptabilite.voir', 'comptabilite.plan_gerer', 'comptabilite.ecritures_voir', 'comptabilite.od_creer',
    'maintenance.gerer', 'roles.gerer', 'utilisateurs.gerer', 'appareils.gerer',
    'rh.gerer', 'rh.avances', 'reporting.voir', 'reporting.exporter', 'sync.voir', 'documents.gerer'
  ],
  COMPTABLE_SENIOR: [
    'dashboard.voir', 'ventes.voir', 'comptabilite.voir', 'comptabilite.plan_gerer', 'comptabilite.ecritures_voir', 'comptabilite.od_creer',
    'comptabilite.cloture', 'comptabilite.immo_gerer', 'tresorerie.voir', 'tresorerie.valider', 'banque.rapprochement',
    'achats.gerer', 'achats.commandes', 'rh.gerer', 'rh.bulletins', 'reporting.voir', 'reporting.exporter',
    'audit.voir', 'documents.gerer'
  ],
  COMPTABLE: [
    'dashboard.voir', 'ventes.voir', 'comptabilite.voir', 'comptabilite.plan_gerer', 'comptabilite.ecritures_voir', 'comptabilite.od_creer',
    'comptabilite.cloture', 'comptabilite.immo_gerer', 'tresorerie.voir',
    'banque.rapprochement', 'reporting.voir', 'reporting.exporter', 'achats.gerer', 'documents.gerer'
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
  TECHNICIEN_MAINTENANCE: [
    'dashboard.voir', 'flotte.gerer', 'maintenance.gerer', 'stocks.voir', 'documents.gerer'
  ],
  AUDITEUR: [
    'dashboard.voir', 'audit.voir', 'stocks.voir', 'ventes.voir', 'comptabilite.ecritures_voir',
    'tresorerie.voir', 'reporting.voir', 'reporting.exporter', 'rh.bulletins', 'documents.gerer'
  ],
}