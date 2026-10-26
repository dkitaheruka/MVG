# DOSSIER DE GESTION & MANUEL D'EXPLOITATION OFFICIEL
## SYSTÈME INTÉGRÉ D'ENTREPRISE (ERP MULTI-AGENCES)
**Pilotage Opérationnel, Ventes & POS, Transformation Industrielle, Trésorerie Multi-Devises, Paie RDC & Comptabilité SYSCOHADA**

---

> **Note de Confidentialité & Direction Générale :**  
> Ce document constitue le dossier de présentation et le manuel technique d'exploitation destiné à la Direction Générale. Il détaille l'intégralité des flux financiers, logistiques, industriels et comptables du système, sans aucune dépendance à un produit particulier. Les flux sont organisés autour des catégories normalisées : **Matières Premières**, **Produits Finis**, **Sous-Produits** et **Équipements de Production**.

---

## SOMMAIRE EXÉCUTIF

1. [Vision Globale & Architecture d'Entreprise](#1-vision-globale--architecture-dentreprise)
2. [Gouvernance, Droits d'Accès & Sécurité (Règle des Deux Personnes)](#2-gouvernance-droits-daccès--sécurité-règle-des-deux-personnes)
3. [Module 1 : Tableau de Bord & Pilotage Stratégique Direction](#3-module-1--tableau-de-bord--pilotage-stratégique-direction)
4. [Module 2 : Point de Vente (POS), Ventes Comptoir & Gestion des Créances](#4-module-2--point-de-vente-pos-ventes-comptoir--gestion-des-créances)
   - 4.1 Encaissement Comptant Multi-Devises (USD / CDF)
   - 4.2 Ventes à Crédit & Écritures Comptables Immédiates
   - 4.3 Règlement des Créances avec Référence Certifiée de Vente
   - 4.4 Émission des Reçus Thermiques 80 mm ESC/POS & Factures Normalisées A4
   - 4.5 Mode Résilient Hors-Ligne (PWA & IndexedDB)
5. [Module 3 : Réception Industrielle, Pont-Bascule & Matières Premières](#5-module-3--réception-industrielle-pont-bascule--matières-premières)
6. [Module 4 : Transformation Industrielle, Ordres de Production & Lots](#6-module-4--transformation-industrielle-ordres-de-production--lots)
7. [Module 5 : Gestion des Stocks, Traçabilité & Règle FEFO](#7-module-5--gestion-des-stocks-traçabilité--règle-fefo)
8. [Module 6 : Trésorerie, Caisses & Circuit des États de Besoin](#8-module-6--trésorerie-caisses--circuit-des-états-de-besoin)
9. [Module 7 : Comptabilité Générale SYSCOHADA Révisé](#9-module-7--comptabilité-générale-syscohada-révisé)
   - 9.1 Organisation des Classes 1 à 8
   - 9.2 Balance Générale & Grand Livre
   - 9.3 Grand Livre Auxiliaire Tiers (Comptes 411)
   - 9.4 Saisie d'Écritures Manuelles Équilibrées
10. [Module 8 : Ressources Humaines & Feuille de Paie Collective RDC](#10-module-8--ressources-humaines--feuille-de-paie-collective-rdc)
    - 10.1 Barème Progressif Officiel IPR (DGI 3% à 40%)
    - 10.2 Charges Sociales & Patronales (CNSS, INPP, ONEM)
    - 10.3 Feuille de Paie Collective 14 Colonnes & Bulletins Individuels
    - 10.4 Moteur Paramétrique & Barèmes Dynamiques (Zero-Code)
11. [Module 9 : Flotte, Logistique & Bons de Livraison](#11-module-9--flotte-logistique--bons-de-livraison)
12. [Module 10 : Maintenance des Équipements de Production](#12-module-10--maintenance-des-équipements-de-production)
13. [Module 11 : Procédures de Contrôle Interne, Clôtures & Sauvegardes](#13-module-11--procédures-de-contrôle-interne-clôtures--sauvegardes)

---

## 1. VISION GLOBALE & ARCHITECTURE D'ENTREPRISE

L'ERP a été conçu comme une plateforme unifiée capable d'opérer dans un environnement multi-agences et multi-sites :

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│                             DIRECTION GÉNÉRALE / SIÈGE                           │
│     Vue Consolidée Multi-Agences • Trésorerie Globale • Audits • Gouvernance     │
└────────────────────────────────────────┬─────────────────────────────────────────┘
                                         │
                 ┌───────────────────────┴───────────────────────┐
                 ▼                                               ▼
┌─────────────────────────────────┐             ┌─────────────────────────────────┐
│        AGENCE PRINCIPALE        │             │         DÉPÔT RÉGIONAL          │
│ • Réception Matières Premières  │             │ • Réception Produits Finis      │
│ • Pont-Bascule & Pesée Entrée   │             │ • Ventes Comptoir & Gros        │
│ • Lignes de Production (OP)     │             │ • Caisse POS (USD/CDF)          │
│ • Stock Produits Finis & Sous-P.│             │ • Gestion des Crédits Clients   │
│ • Trésorerie & Banque Locale    │             │ • Livraisons & Flotte           │
└─────────────────────────────────┘             └─────────────────────────────────┘
```

### Piliers Techniques :
1. **Intégration native des devises :** Gestion en double devise (Dollar américain USD et Franc congolais CDF) avec application stricte du taux de change certifié de l'agence.
2. **Automatisation comptable SYSCOHADA :** Aucune ressaisie. Chaque opération physique ou monétaire (vente, réception, production, paie, dépense) génère son écriture en temps réel.
3. **Continuité d'activité en cas de coupure (Offline-First) :** Fonctionnement autonome sur le terrain grâce au cache PWA et à la base locale IndexedDB.

---

## 2. GOUVERNANCE, DROITS D'ACCÈS & SÉCURITÉ (RÈGLE DES DEUX PERSONNES)

Le système implémente une matrice rigoureuse de séparation des tâches :

| Profil Utilisateur | Droits et Responsabilités | Verrous de Sécurité & Contrôles |
| :--- | :--- | :--- |
| **Vendeur / Caissier POS** | Encaissement des ventes, saisie des commandes, émission des tickets thermiques 80 mm et reçus. | Ne peut pas valider sa propre vente à crédit. Ne peut pas annuler une vente validée sans accord hiérarchique. |
| **Caissier Trésorerie** | Paiement des dépenses approuvées, gestion des coffres et comptes bancaires, livre de caisse. | Blocage informatique automatique en cas de solde négatif (anti-découvert strict). |
| **Chef d'Agence** | Arbitrage des prix de vente locaux, approbation des crédits clients, validation des dépenses locales. | Règle des deux personnes : l'initiateur d'une demande ne peut pas en être le validateur. |
| **Responsable Pont-Bascule** | Enregistrement de la pesée brute et de la tare des véhicules transportant les Matières Premières. | Double émargement obligatoire sur le bordereau de pesée officiel (Chauffeur et Opérateur). |
| **Chef de Production** | Lancement des Ordres de Production (OP), déclaration des rendements, attribution des numéros de lot. | Déduction automatique des Matières Premières selon la formule standard homologuée. |
| **Comptable** | Clôtures périodiques, vérification de la Balance, Grand Livre général, Grand Livre auxiliaire 411. | Contrôle d'équilibre arithmétique rigoureux (Débit = Crédit) pour toute écriture manuelle. |
| **Direction des Ressources Humaines** | Gestion des dossiers agents, calcul des cotisations sociales et de l'IPR selon barème DGI. | Visa préalable de la Direction Générale avant tout ordre de décaissement salarial. |
| **Direction Générale / Siège** | Paramétrage des plafonds d'autonomie financière, validation des transferts inter-agences, audits inaltérables. | Journal d'audit traçant horodatage, auteur, agence et nature de chaque opération sensible. |

---

## 3. MODULE 1 : TABLEAU DE BORD & PILOTAGE STRATÉGIQUE DIRECTION

Le tableau de bord central fournit une visibilité exécutive en temps réel sur l'ensemble de l'entreprise :

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ [LOGO SOCIÉTÉ]  SUPERVISION EXÉCUTIVE - TOUTES AGENCES       USD/CDF : 2 850 FC        │
├────────────────────┬────────────────────┬────────────────────┬─────────────────────────┤
│ CHIFFRE D'AFFAIRES │ TRÉSORERIE DISPO.  │ TRÉSORERIE DISPO.  │ VALEUR STOCK DISPONIBLE │
│ $ 145,280.00 USD   │ $ 38,450.00 USD    │ 84,250,000 CDF     │ $ 92,100.00 USD         │
│ (+14.2% ce mois)   │ (Caisses + Banques)│ (Caisses agences)  │ (Produits Finis + M.P.) │
├────────────────────┴────────────────────┴────────────────────┴─────────────────────────┤
│ • Production du Mois : 8,420 Unités de Produits Finis transformées                    │
│ • Réceptions Matières Premières : 248.50 Tonnes enregistrées au Pont-Bascule           │
│ • Encours Crédits Clients : $ 12,450.00 USD sous surveillance (92% dans les limites)   │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

### Indicateurs de Performance (KPIs) :
* **Trésorerie nette consolidée :** Découpage instantané entre avoirs en devises étrangères (USD) et en monnaie nationale (CDF).
* **Rotation des stocks :** Suivi comparé entre entrées de Matières Premières et sorties de Produits Finis.
* **Taux de recouvrement des créances :** Pourcentage des ventes à crédit honorées dans les délais contractuels.

---

## 4. MODULE 2 : POINT DE VENTE (POS), VENTES COMPTOIR & GESTION DES CRÉANCES

### 4.1 Encaissement Comptant Multi-Devises (USD / CDF)
1. Le vendeur sélectionne les **Produits Finis** commandés par le client.
2. Le système calcule immédiatement le montant hors taxe, les frais de transport éventuels et le total net à payer.
3. Le montant total est affiché simultanément en **USD** et en **CDF** selon le cours officiel validé de la journée.
4. L'opérateur sélectionne le mode : **Cash USD** ou **Cash CDF**.
5. Dès validation :
   - Le stock physique des Produits Finis est décrémenté selon la règle **FEFO** (lots les plus anciens déstockés prioritairement).
   - Le solde de la caisse concernée augmente immédiatement.
   - Une écriture comptable est automatiquement inscrite au journal :
     - **Débit :** Compte `571` (*Caisse USD*) ou `572` (*Caisse CDF*).
     - **Crédit :** Compte `701` (*Vente de Produits Finis*).
     - **Crédit :** Compte `706` (*Prestations de transport facturées*, si applicable).

### 4.2 Ventes à Crédit & Écritures Comptables Immédiates
Conformément aux normes SYSCOHADA :
1. L'opérateur sélectionne obligatoirement un **Client titulaire d'un compte auxiliaire**.
2. L'encours actuel et la limite de crédit accordée s'affichent automatiquement. Si la limite est dépassée, une alerte est transmise au Chef d'Agence pour dérogation.
3. Dès validation de la vente à crédit :
   - **Écritures comptables passées immédiatement au journal :**
     - **Débit :** Compte `411xxx` (*Créance Client - Compte Auxiliaire dédié*).
     - **Crédit :** Compte `701` (*Vente de Produits Finis*).
     - **Crédit :** Compte `706` (*Prestations de transport facturées*).
   - **Trésorerie :** La caisse **n'est pas touchée** (aucun mouvement d'espèces).
   - **Dette Client :** La dette du client augmente immédiatement de la valeur de la facture.

### 4.3 Règlement des Créances avec Référence Certifiée de Vente
Lorsqu'un client vient honorer sa créance (par tranche ou en totalité) :
1. L'opérateur ouvre l'Historique des Ventes ou le Relevé du Client et clique sur **« Régler »**.
2. La fenêtre présente :
   - La référence de la vente originale (ex. `VNT-1-008420`).
   - Le montant facturé, le montant déjà payé, et le solde restant dû.
3. L'opérateur saisit le montant du versement, la devise, la caisse/banque réceptrice, le mode de paiement (*Espèces, Virement Bancaire, Chèque, Mobile Money*) et le numéro de pièce justificative.
4. Dès validation :
   - Le système passe l'écriture de règlement liée avec la référence certifiée `REG-${referenceVente}` :
     - **Débit :** Compte de Trésorerie `571`, `572` ou `521`.
     - **Crédit :** Compte Client `411xxx` (*Apurement créance client*).
   - Le solde de caisse augmente du montant payé.
   - La dette du client diminue d'autant.
   - La vente bascule automatiquement en statut **« Soldé »** ou **« Acompte Partiel »**.

### 4.4 Émission des Reçus Thermiques 80 mm ESC/POS & Factures Normalisées A4
* **Ticket de Caisse 80 mm :** Impression thermique directe avec en-tête d'entreprise, coordonnées de l'agence, détail des Produits Finis, mention de la devise et **QR Code de certification fiscale** contrôlable par douchette ou smartphone.
* **Facture A4 :** Document commercial complet pour grossistes et institutions, intégrant les mentions légales (RCCM, IdNat, NIF), les modalités de décharge et les signatures autorisées.

### 4.5 Mode Résilient Hors-Ligne (PWA & IndexedDB)
En cas d'interruption du réseau Internet ou d'alimentation électrique :
* Le système bascule automatiquement en mode autonome local.
* Les ventes continuent d'être saisies et validées.
* Les transactions sont cryptées et stockées dans la base de données locale du navigateur (**IndexedDB**).
* Dès rétablissement de la connectivité, les transactions sont synchronisées automatiquement vers le serveur central sans risque de doublon.

---

## 5. MODULE 3 : RÉCEPTION INDUSTRIELLE, PONT-BASCULE & MATIÈRES PREMIÈRES

Ce module contrôle l'entrée des camions d'approvisionnement en **Matières Premières** :

```
1. ENTRÉE CAMION PLEIN   ──►  Pesée Brute (P1)  ──►  Ex: 38 400 kg (Véhicule + Matière Première)
2. DÉCHARGEMENT          ──►  Contrôle Qualité  ──►  Vérification humidité & conformité au silo
3. SORTIE CAMION VIDE    ──►  Pesée Tare (P2)   ──►  Ex: 14 200 kg (Véhicule vide)
4. CALCUL DU POIDS NET   ──►  NET = P1 - P2     ──►  Ex: 24 200 kg nets de Matière Première
5. BORDEREAU DE RÉCEPTION (BR) avec QR Code & Double Visa (Chauffeur / Réceptionnaire)
```

* **Mise à jour automatique des stocks :** Le tonnage net est immédiatement crédité dans l'inventaire des **Matières Premières** (Compte SYSCOHADA `311`).
* **Contrôle anti-fraude :** Verrouillage de la pesée nette pour empêcher toute manipulation manuelle des poids enregistrés.

---

## 6. MODULE 4 : TRANSFORMATION INDUSTRIELLE, ORDRES DE PRODUCTION & LOTS

Ce module orchestre la transformation des **Matières Premières** en **Produits Finis** et **Sous-Produits** :

### Workflow de Production :
1. **Émission de l'Ordre de Production (OP) :**  
   Définition de la quantité cible de **Produits Finis** à fabriquer. Le système calcule automatiquement la quantité de **Matières Premières** à consommer selon le ratio technique homologué.
2. **Exécution & Suivi des Lignes de Transformation :**  
   Sortie d'inventaire des Matières Premières avec passage de l'OP au statut *« EN COURS »*.
3. **Clôture de la Production & Déclaration des Rendements :**  
   Enregistrement de la production réelle obtenue :
   - Volume de **Produits Finis** conditionnés.
   - Volume de **Sous-Produits** récupérés.
   - Écart éventuel de rendement analysé par la direction technique.
4. **Attribution Automatique du Numéro de Lot & DLUO :**  
   Chaque lot de fabrication reçoit un identifiant unique (ex. `LOT-2026-PF-0084`) avec calcul automatique de la date de péremption. Les articles entrent immédiatement en stock disponible pour la vente.

---

## 7. MODULE 5 : GESTION DES STOCKS, TRAÇABILITÉ & RÈGLE FEFO

* **Règle FEFO (First Expiring, First Out) :**  
  Le système oriente automatiquement le déstockage vers les lots dont la date limite d'utilisation optimale est la plus proche, éliminant ainsi les pertes par péremption en magasin.
* **Inventaire Permanent Multi-Emplacements :**  
  Suivi en temps réel des stocks par agence, dépôt et magasin physique.
* **Régularisations & Avaries :**  
  Toute correction physique d'inventaire (perte, dégradation d'emballage) exige la soumission d'une demande motivée par le magasinier et l'approbation formelle du Chef d'Agence avant ajustement de la valeur d'inventaire.

---

## 8. MODULE 6 : TRÉSORERIE, CAISSES & CIRCUIT DES ÉTATS DE BESOIN

### 8.1 Cloisonnement Financier Multi-Caisses
Chaque agence opère avec des comptes financiers distincts :
* **Caisse Principale USD (Compte SYSCOHADA 571)**
* **Caisse Principale CDF (Compte SYSCOHADA 572)**
* **Comptes Bancaires d'Agence ou Siège (Compte SYSCOHADA 521)**

### 8.2 Contrôle Strict Anti-Solde Négatif
Le système intègre un garde-fou inviolable : **aucune opération de dépense ou de décaissement ne peut être validée si les disponibilités réelles de la caisse sont inférieures au montant demandé.**

### 8.3 Circuit d'Approbation des États de Besoin (EB)
```
[Agent Émetteur]   ──► Saisie de l'État de Besoin (Service, Motif détaillé, Montant)
                           │
[Chef d'Agence]    ──► Contrôle budgétaire & Visa d'Approbation Hiérarchique
                           │
[Caissier]         ──► Paiement physique & Émargement du Bon de Décaissement
                           │
[Comptabilité]     ──► Imputation automatique au compte de charge (Classe 6)
```

---

## 9. MODULE 7 : COMPTABILITÉ GÉNÉRALE SYSCOHADA RÉVISÉ

Le système repose sur la codification officielle du **Système Comptable Ouest et Centre Africain (SYSCOHADA Révisé)** :

### 9.1 Organisation des Classes 1 à 8
* **Classe 1 — Ressources Durables :** Capital social (`101`), réserves (`11`), emprunts et dettes financières (`16`).
* **Classe 2 — Actif Immobilisé :** Bâtiments industriels (`22`), équipements et lignes de transformation (`241`), matériel de transport (`245`), amortissements cumulés (`28`).
* **Classe 3 — Stocks & En-cours :** Stocks de **Matières Premières** (`311`), emballages (`33`), **Produits Finis** (`361`), sous-produits (`35`).
* **Classe 4 — Comptes de Tiers :** Fournisseurs de matières (`401`), clients collectifs (`411`), sous-comptes auxiliaires clients (`411xxx`), personnel rémunérations dues (`422`), organismes sociaux CNSS/INPP/ONEM (`43`), État impôts et IPR (`44`).
* **Classe 5 — Trésorerie :** Banques (`521`), caisses USD (`571`), caisses CDF (`572`), virements internes (`585`).
* **Classe 6 — Charges d'Exploitation :** Achats de matières premières (`601`), transports (`61`), services extérieurs (`62/63`), charges de personnel (`66`), dotations aux amortissements (`68`).
* **Classe 7 — Produits d'Exploitation :** Ventes de **Produits Finis** (`701`), prestations de transport facturées (`706`), valorisation des sous-produits (`70`).
* **Classe 8 — Hors Activités Ordinaires (HAOP) :** Charges et produits exceptionnels.

### 9.2 Balance Générale & Grand Livre
* **Balance Générale :** Édition en 6 colonnes (Mouvements Débit/Crédit, Soldes Débiteurs/Créditeurs) avec conversion multi-devises et contrôle permanent de l'écart d'équilibre.
* **Grand Livre Général :** Relevé exhaustif et inaltérable de tous les mouvements comptables.

### 9.3 Grand Livre Auxiliaire Tiers (Comptes 411)
Chaque client dispose de son compte auxiliaire dédié. Le système édite en un clic le **Relevé de Compte Client Officiel (PDF)** récapitulant les factures émises, les paiements reçus avec référence certifiée (`REG-VNT-xxx`), le solde progressif et le plafond de crédit restant.

### 9.4 Saisie d'Écritures Manuelles Équilibrées
Réservée aux comptables habilités pour les opérations de clôture, d'inventaire ou de régularisation. Le système interdit formellement l'enregistrement si la somme des débits ne correspond pas exactement à la somme des crédits.

---

## 10. MODULE 8 : RESSOURCES HUMAINES & FEUILLE DE PAIE COLLECTIVE RDC

Le moteur de paie applique rigoureusement les dispositions du Code du Travail de la République Démocratique du Congo, du Code Général des Impôts (DGI) et de la Loi sur la Sécurité Sociale :

### 10.1 Barème Progressif Officiel IPR (DGI)
L'Impôt Professionnel sur les Rémunérations est calculé par tranches progressives selon le barème annuel légal converti mensuellement :
* **Tranche 1 (0 à 1 944 000 CDF) :** 3%
* **Tranche 2 (1 944 001 à 21 600 000 CDF) :** 15%
* **Tranche 3 (21 600 001 à 43 200 000 CDF) :** 30%
* **Tranche 4 (Au-delà de 43 200 000 CDF) :** 40%
*(Application des déductions légales pour charges de famille à hauteur de 2% par personne à charge, dans la limite de 9 personnes).*

### 10.2 Charges Sociales & Patronales Obligatoires
* **CNSS QPO (Quote-part ouvrière à charge de l'employé) :** 5% du salaire brut.
* **CNSS QPP (Quote-part patronale à charge de l'employeur) :** 13% du salaire brut.
* **INPP (Institut National de Préparation Professionnelle) :** 3,5% à charge de l'employeur.
* **ONEM (Office National de l'Emploi) :** 0,5% à charge de l'employeur.

### 10.3 Feuille de Paie Collective 14 Colonnes & Bulletins Individuels
* **Feuille de Paie Collective Mensuelle :** Document paysage officiel A4 regroupant l'ensemble du personnel avec les 14 colonnes certifiées :
  `N° | Matricule | Noms & Post-noms | Fonction | Salaire Base | Transport | Logement | Salaire Brut | CNSS 5% | Base Imposable | IPR DGI | Total Retenues | Net à Payer | Emargement`
* **Blocs de validation officiels :** Espaces réservés aux signatures de la Direction des Ressources Humaines, de la Direction Administrative et Financière, et de la Direction Générale.
* **Bulletins de Paie Individuels :** Fiches individuelles détachables imprimables pour chaque employé.

### 10.4 Moteur Paramétrique & Barèmes Dynamiques (Sans Modification de Code)
Pour anticiper toute évolution législative ou fiscale en République Démocratique du Congo ou à l'international, l'application intègre un **module de paramétrage dynamique des barèmes** accessible depuis l'interface :
* **Cotisations sociales et patronales configurables :** Les pourcentages CNSS Salarié (QPO), CNSS Patronale (QPP), INPP et ONEM sont éditables à tout moment.
* **Barème progressif IPR par tranches marginales :** Possibilité d'ajuster les bornes inférieures et supérieures de chaque tranche en CDF, de modifier les taux (3%, 15%, 30%, 40%) et d'ajouter ou supprimer des tranches fiscales.
* **Charges de famille & Plafond légal :** Déduction par enfant à charge (2% par défaut) et plafond légal de retenue IPR (30% du salaire imposable) entièrement paramétrables.
* **Simulateur en direct & Recalcul en un clic :** Un banc d'essai interactif permet de simuler instantanément l'impact financier de nouveaux barèmes sur un salaire test, et de recalculer automatiquement l'ensemble des bulletins en brouillon du mois sans redémarrage serveur ni intervention dans le code source.

---

## 11. MODULE 9 : FLOTTE, LOGISTIQUE & BONS DE LIVRAISON

Assure la traçabilité complète de l'acheminement des **Produits Finis** :
1. **Émission Automatique du Bon de Livraison (BL) :**  
   Généré instantanément lors de chaque vente au comptoir avec numéro de série chronologique.
2. **Choix du Mode de Transport :**  
   - *Enlèvement Comptoir :* Retrait immédiat par le client.
   - *Véhicule Client :* Enregistrement de la plaque et de l'identité du chauffeur mandaté.
   - *Flotte Interne de l'Entreprise :* Affectation d'un camion et d'un chauffeur salarié.
3. **Traçabilité en Trois Étapes :**  
   *En préparation au dépôt* ➔ *En transit routier* ➔ *Livré (avec décharge signée par le réceptionnaire)*.

---

## 12. MODULE 10 : MAINTENANCE DES ÉQUIPEMENTS DE PRODUCTION

Garantit la pérennité et la productivité des lignes de transformation et des véhicules :
* **Fiche d'Équipement :** Répertoire des machines, générateurs, pont-bascule et camions.
* **Interventions Préventives & Curatives :** Planification des révisions périodiques, suivi des pièces d'usure remplacées, coût de la main d'œuvre technique.
* **Intégration Comptable Immédiate :** Les dépenses de maintenance sont directement répercutées dans les comptes de charges d'entretien (SYSCOHADA `624`).

---

## 13. MODULE 11 : PROCÉDURES DE CONTRÔLE INTERNE, CLÔTURES & SAUVEGARDES

### 13.1 Procédure de Clôture Journalière de Caisse
À la fermeture quotidienne de chaque agence :
1. Édition du journal des mouvements de caisse de la journée.
2. Rapprochement contradictoire entre le solde théorique système et le décompte physique des billets (USD et CDF).
3. Visa conjoint du Caissier et du Chef d'Agence.
4. Transfert éventuel des fonds excédentaires vers le compte bancaire de la société.

### 13.2 Sauvegardes de Sécurité Inviolables
* Téléchargement de la sauvegarde intégrale de la base de données en un clic (Format structuré JSON / SQL).
* Possibilité d'archivage sur disque dur externe chiffré ou stockage cloud sécurisé.

---

**Ce système garantit à la Direction Générale une maîtrise totale, transparente et auditable de l'ensemble des flux opérationnels et financiers de l'entreprise.**
