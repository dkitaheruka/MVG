# Préparation production — Matabishi ERP

État au 16 novembre 2026. Cette note reflète l’architecture du dépôt et les changements de préparation en cours. Aucun serveur de production ni aucune base contenant des données réelles n’a été créé.

## Décisions métier retenues

- Une agence pilote au démarrage; les autres agences seront ajoutées plus tard.
- Les rôles de gouvernance retenus sont `SUPER_ADMIN` (système) et `ADMIN_SIEGE` (siège).
- Les règles et parcours de validation déjà présents dans l’application sont conservés. Les montants et seuils existants restent à confirmer par le métier avant toute utilisation réelle.
- Environ 50 utilisateurs ou plus sont attendus. Les ventes doivent pouvoir être saisies pendant une coupure et synchronisées ensuite.
- Le dépôt reste privé.

## Changements de cette phase

- Les écritures métier peuvent être persistées dans PostgreSQL, collection par collection en lignes JSONB, sans réécrire les routes existantes.
- Les modifications d’une requête sont écrites dans une transaction PostgreSQL avant que la réponse soit envoyée. Les mutations sont sérialisées dans le processus API pour empêcher des sauvegardes concurrentes de s’écraser.
- Un verrou consultatif PostgreSQL empêche deux instances API de partager cette base. Le déploiement courant doit donc rester sur une seule instance applicative.
- L’amorçage conserve les 175 comptes du plan de référence présents dans le dépôt. Les ventes, écritures, soldes, journaux de trésorerie et mouvements stock de démonstration sont supprimés.
- Les sous-comptes clients et banques qui portaient des noms d’exemples sont renommés génériquement sans toucher à leurs codes. L’agence pilote reçoit aussi une caisse principale à soldes nuls (compte 571) et le taux USD/CDF initial doit être fourni avec une proposition et une approbation par deux personnes distinctes.
- Deux caisses principales à solde nul sont créées pour les devises de règlement (USD/571 et CDF/572); une vente API exige une session, la permission `ventes.creer`, l’agence autorisée et une caisse de la devise correspondante. La synchronisation hors ligne refuse les articles ou clients inconnus et choisit la caisse de la devise vendue.
- Une base vierge en développement peut recevoir les données fictives. La base est marquée `development-seed`; le mode production refuse ce marqueur, une base non initialisée, et les comptes actifs qui n’ont pas d’empreinte de mot de passe `scrypt`.
- Les nouveaux mots de passe sont hachés avec `scrypt`. Les raccourcis `admin123` et `demo` ne fonctionnent qu’en dehors de la production. En production, les changements de mot de passe imposent au moins 12 caractères.
- Les secrets requis sont documentés dans `.env.example`; `.env` est ignoré par Git.
- La file hors ligne récupère les opérations restées en état `SYNCING` après cinq minutes et relance la synchronisation au retour du réseau.

## Architecture de départ recommandée

Pour limiter les coûts du pilote, commencer par un VPS Linux unique avec 2 à 4 vCPU et 4 à 8 Go de RAM, PostgreSQL sur le même serveur, l’API et le frontend servis par le même processus, puis Caddy ou Nginx devant l’application pour HTTPS. Utiliser un nom de domaine et ne publier que les ports 80/443; limiter SSH aux adresses d’administration. Ce dimensionnement est un point de départ à mesurer, pas une garantie de capacité.

Cette configuration a un seul point de panne. Mettre les sauvegardes chiffrées hors du VPS, conserver plusieurs jours de rétention, et tester réellement une restauration avant d’ouvrir le pilote. Pour une meilleure continuité, déplacer PostgreSQL vers un service séparé ou un second serveur après le pilote. Ne pas ajouter plusieurs instances API tant que la persistance et les verrous restent en mémoire du processus.

## Points bloquants avant données réelles

1. **Initialisation des paramètres.** `npm run provision:production -- <config.json>` peut maintenant initialiser une base totalement vide avec une agence, les deux rôles de gouvernance, le plan comptable de référence complet, une caisse principale à zéro et un taux de change USD/CDF saisi avec deux approbateurs distincts. Le taux doit être vérifié le jour de l’ouverture par les responsables financiers. Il faut définir `DATABASE_URL`, `MVG_BOOTSTRAP_SUPER_ADMIN_EMAIL`, `MVG_BOOTSTRAP_SUPER_ADMIN_NAME`, `MVG_BOOTSTRAP_SUPER_ADMIN_PASSWORD`, `MVG_BOOTSTRAP_ADMIN_SIEGE_EMAIL`, `MVG_BOOTSTRAP_ADMIN_SIEGE_NAME` et `MVG_BOOTSTRAP_ADMIN_SIEGE_PASSWORD` dans l’environnement opérateur au moment de l’amorçage seulement. Les mots de passe ne sont jamais inclus dans le fichier de configuration ni affichés. La commande refuse une base non vide ou déjà initialisée. Le fichier [`config/production.example.json`](../config/production.example.json) est un modèle incomplet et sera rejeté tant que ses marqueurs n’auront pas été remplacés et que les valeurs légales/fiscales ne seront pas confirmées par le comptable. Tester d’abord cette commande sur une base jetable.
2. **Données de démonstration.** Les exports de développement conservent les exemples, mais l’amorçage exclut les ventes, écritures, soldes, mouvements de caisse, clients, articles, stocks et comptes utilisateurs fictifs. Il conserve le plan comptable de référence (175 codes uniques, parents résolus) et remplace les sept libellés auxiliaires contenant des noms d’exemples. Les soldes initiaux restent à zéro.
3. **Validation des règles financières.** Les seuils d’approbation existants doivent être revus par les responsables, y compris devises, montants, séparation demandeur/approbateur, pièces justificatives, exceptions et journal d’audit. Les valeurs configurées pour la production ne sont pas certifiées ici. Les taux fiscaux et sociaux doivent être confirmés par le comptable avant de positionner `legalAndPayrollRatesReviewed` à `true`.
4. **Ventes hors ligne.** La file locale persiste les ventes, lie les opérations à l’utilisateur, les synchronise de façon idempotente et recharge le catalogue de référence. Si des postes vendent le même stock pendant une coupure, la synchronisation accepte l’opération puis signale l’écart avec une alerte/audit; le responsable doit traiter les conflits. Faire une recette sur plusieurs appareils, y compris les changements de prix, limites de crédit, sessions expirées, lots et doublons, avant le pilote.
5. **Sauvegarde et restauration.** Des scripts PostgreSQL chiffrés `age`, de vérification et de restauration isolée sont fournis sous `scripts/` et la procédure VPS est documentée. Les archives doivent être copiées hors du VPS avec un remote rclone configuré. Les scripts ne sont pas encore exercés sur cette machine, car Docker/PostgreSQL ne sont pas disponibles ici; la restauration doit être démontrée sur le VPS de recette avant ouverture. Les archives JSON de l’interface sont réservées au développement et désactivées en production.
6. **Exposition web et exploitation.** Docker Compose, Caddy HTTPS, configuration d’exemple et contrôles de santé sont fournis. Avant Internet public, renseigner le domaine, restreindre CORS, confirmer les limites de requête/téléversement, ajouter une limite de débit d’authentification et superviser les journaux/alertes. N’exposer que HTTPS et SSH filtré.
7. **Stockage et capacité.** Le modèle JSONB garde la logique actuelle et impose une seule instance API par base. Il reste des garanties relationnelles à formaliser. Mesurer latence, verrous, consommation mémoire et volume avec le vrai catalogue et au moins 50 comptes; dimensionner le VPS après ce test.
8. **Accès dépôt.** Le dépôt distant n’a pas été modifié par cette recette. Vérifier son statut privé/public et renouveler les secrets qui auraient été commis dans l’historique avant toute ouverture à des données réelles.
9. **États financiers.** La balance, le bilan, le TFT/CAGE et les coûts ne sont pas tous certifiés. Les rapports identifiés comme non fiables sont bloqués en production; les autres doivent être rapprochés des écritures validées et vérifiés par le comptable. Aucun taux de change, taxe ou barème social ne doit être pris comme réel avant validation.
10. **Recette métier finale.** Tester les ventes et écritures associées, calcul des remises/taxes, remboursements, clôture de caisse, approbations à 100 USD/200 USD (seuils provisoires), paie, droits par rôle, isolation d’agence et scénarios de reprise. Les seuils et les valeurs légales seront confirmés après la recette technique selon votre décision.

## Vérifications effectuées

- `npm run build` réussit; Vite signale un bundle JavaScript principal d’environ 1,995 kB avant gzip (494 kB gzip), à découper pour améliorer le chargement sur réseau mobile.
- Oxlint ciblé passe sur le serveur, l’authentification et la file hors ligne.
- Après le contrôle des quantités par lot, `git diff --check` et Oxlint ciblé passent; le build TypeScript/Vite passe aussi. Vite émet toujours un avertissement de bundle principal volumineux (~1,995 kB, 494 kB gzip).
- Vérification manuelle sur une base PostgreSQL de test dédiée : connexion, écriture concurrente, redémarrage et relecture des ventes et opérations de synchronisation, rejet d’une seconde instance, et refus en production d’une base marquée comme données de développement.
- Amorçage exercé sur une autre base jetable en mode production : le modèle avec marqueurs est rejeté; avec des paramètres de test complétés, l’amorçage crée deux administrateurs, les 175 comptes, les libellés génériques, deux caisses à zéro et un taux avec deux approbateurs, sans vente de démonstration. Le premier login exige un changement de mot de passe. Cette recette confirme le mécanisme, pas les taux légaux/fiscaux ou le taux de change utilisés pour l’essai.
- Contrôle du plan de comptes existant : 175 codes uniques, tous les libellés renseignés et toutes les références parent présentes.
- Vérification manuelle de hachage : le bon mot de passe est accepté et un mot de passe incorrect est rejeté; le changement de mot de passe permet ensuite une nouvelle connexion.
- La compilation la plus récente doit être relancée après les derniers ajustements de sécurité de cette phase. Docker/PostgreSQL ne sont pas disponibles dans l’environnement de travail courant; aucun déploiement ni test de restauration VPS n’a été exécuté ici.
- Ces contrôles n’équivalent pas à un audit de sécurité, un test de charge représentatif ou une recette comptable.

## Prochaine étape technique

Exécuter une recette technique sur VPS de staging : provisionnement d’une base vide, tests d’acceptation multi-postes et de permissions, sauvegarde chiffrée vers un stockage hors VPS, puis restauration isolée. Ensuite seulement, fournir l’identité légale, domaine, taux USD/CDF, règles fiscales/paie et confirmer les seuils; répéter l’amorçage sur une base de production neuve après validation métier.
