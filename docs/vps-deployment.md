# Déploiement du pilote MVG sur un VPS

Ce guide décrit un serveur unique Docker : PostgreSQL privé, une API, Caddy pour HTTPS. Il cible une agence et environ 50 utilisateurs; il ne fournit pas de haute disponibilité.

## Capacité et coût

Prévoir **4 vCPU, 8 Go de RAM et au moins 80 Go NVMe** pour exécuter PostgreSQL et l’application sur le même VPS, puis mesurer l’usage réel. La formule plus petite 2 vCPU / 4 Go peut servir à une recette technique, mais elle laisse peu de marge au serveur de base de données et aux pointes de synchronisation.

À la vérification du 16 novembre 2026, le configurateur officiel OVHcloud Sénégal affiche un VPS-1 (2 vCPU / 4 Go) à partir de 2 955 FCFA/mois et un VPS-2 (4 vCPU / 8 Go) à partir de 5 587 FCFA/mois, taxes incluses. Ce prix n’inclut pas nécessairement le nom de domaine, le stockage de sauvegarde externe, les frais de paiement ni un éventuel changement de région. Vérifier l’emplacement physique et le prix final au moment de la commande. [Configurateur VPS OVHcloud Sénégal](https://www.ovhcloud.com/fr-sn/vps/configurator/).

## Préparer le serveur

1. Créer un VPS Ubuntu LTS, un nom DNS pointant vers son IPv4 et un compte SSH nominatif avec clé publique.
2. Dans le pare-feu du fournisseur, autoriser uniquement SSH depuis les adresses d’administration et TCP 80/443 depuis Internet. Ne jamais publier le port PostgreSQL 5432 ni le port API 3000.
3. Installer Docker Engine et le plugin Compose depuis le dépôt officiel Docker; maintenir le système et les images à jour.
4. Récupérer la branche revue du dépôt sur le serveur. Les fichiers `.env.production`, `config/production.json`, les clés de sauvegarde et les sauvegardes ne vont jamais dans Git.

## Configurer l’application

```sh
cp .env.production.example .env.production
chmod 600 .env.production
```

Renseigner `DOMAIN`, `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD`, `JWT_SECRET` et `CORS_ORIGINS`. Générer les mots de passe avec des caractères URL sûrs (par exemple hexadécimaux) car le secret PostgreSQL est inclus dans `DATABASE_URL` par Compose. Utiliser un `JWT_SECRET` aléatoire d’au moins 32 caractères. Garder la CORS limitée au domaine HTTPS de l’application.

Copier `config/production.example.json` vers un fichier local `config/production.json` non suivi par Git. Remplacer tous les marqueurs par les données légales de la société, les règles sociales/fiscales relues par le comptable, les seuils déjà approuvés et le taux USD/CDF approuvé. Deux personnes distinctes doivent proposer et approuver le taux initial.

Construire l’image puis démarrer PostgreSQL :

```sh
docker compose --env-file .env.production build app
docker compose --env-file .env.production up -d db
docker compose --env-file .env.production ps
```

Créer un fichier protégé hors du dépôt pour les deux comptes de bootstrap, avec les variables `MVG_BOOTSTRAP_SUPER_ADMIN_EMAIL`, `MVG_BOOTSTRAP_SUPER_ADMIN_NAME`, `MVG_BOOTSTRAP_SUPER_ADMIN_PASSWORD`, `MVG_BOOTSTRAP_ADMIN_SIEGE_EMAIL`, `MVG_BOOTSTRAP_ADMIN_SIEGE_NAME` et `MVG_BOOTSTRAP_ADMIN_SIEGE_PASSWORD`. Les mots de passe doivent différer et contenir au moins 12 caractères. Charger ces variables dans le shell courant sans les inscrire à l’historique, puis amorcer la base vide :

```sh
docker compose --env-file .env.production run --rm \
  -v "$PWD/config/production.json:/app/config/production.json:ro" \
  -e MVG_BOOTSTRAP_SUPER_ADMIN_EMAIL -e MVG_BOOTSTRAP_SUPER_ADMIN_NAME -e MVG_BOOTSTRAP_SUPER_ADMIN_PASSWORD \
  -e MVG_BOOTSTRAP_ADMIN_SIEGE_EMAIL -e MVG_BOOTSTRAP_ADMIN_SIEGE_NAME -e MVG_BOOTSTRAP_ADMIN_SIEGE_PASSWORD \
  app npm run provision:production -- /app/config/production.json
```

Après amorçage, effacer le fichier secret de bootstrap et retirer ces variables du shell. Démarrer la pile :

```sh
docker compose --env-file .env.production up -d --build
docker compose --env-file .env.production ps
curl --fail https://$DOMAIN/healthz
curl --fail https://$DOMAIN/readyz
```

Caddy obtient et renouvelle le certificat HTTPS si le DNS et les ports 80/443 sont accessibles. L’API est servie sur la même origine que l’interface; les API ne sont pas exposées séparément.

## Sauvegarder et restaurer

Installer `age` sur le VPS et conserver sa clé privée hors du VPS, idéalement dans un gestionnaire de secrets. Créer une clé age de sauvegarde dédiée, puis configurer `MVG_AGE_RECIPIENT` dans l’environnement d’exécution du script. Pour une copie hors VPS, installer `rclone`, configurer un stockage chiffré/privé et définir `MVG_BACKUP_REMOTE` (par exemple une destination S3/B2 privée).

Lancer quotidiennement :

```sh
bash scripts/backup-postgres.sh
```

Le script produit une archive PostgreSQL chiffrée, vérifie sa structure avant chiffrement, applique une rétention locale et copie éventuellement l’archive vers `MVG_BACKUP_REMOTE`. Ajouter la commande à un cron système root. Vérifier chaque jour le code de sortie et l’arrivée de la copie distante; le script seul ne garantit pas qu’un service distant fonctionne.

Tester la restauration dans une nouvelle base isolée, jamais par-dessus la base de production :

```sh
MVG_RESTORE_DATABASE=mvg_restore_20261116 \
MVG_AGE_IDENTITY_FILE=/root/backup-key.txt \
bash scripts/restore-postgres-to-new-db.sh /var/backups/mvg/mvg-YYYYMMDDTHHMMSSZ.dump.age
```

Après restauration, démarrer temporairement une instance de recette pointant vers cette base (un seul processus API par base), vérifier les ventes, les stocks, les comptes et les écritures, puis supprimer la base de recette selon la procédure validée. Le script ne remplace jamais `DATABASE_URL` et refuse les noms qui ne commencent pas par `mvg_restore_`.

## Mise en service et exploitation

- Effectuer les essais de réception avec données fictives : connexion et changement du mot de passe provisoire, droits de chaque rôle, vente USD/CDF, annulation, retour de connexion, synchronisation répétée, stock négatif signalé, sauvegarde/restauration et redémarrage.
- Charger les articles, prix, lots, stocks physiques, caisses, utilisateurs et règles de validation vérifiés avant l’ouverture. Le provisionnement ne crée volontairement aucun stock, article, client ou solde bancaire réel.
- Les rapports Bilan, TFT et CAGE non rapprochés sont refusés en production avec `RAPPORT_NON_CERTIFIE`; il faut les recetter et les recalculer avant que la Direction s’en serve.
- Le verrou PostgreSQL autorise une seule instance API par base. Ne pas lancer de réplicas applicatifs.
- Conserver le dépôt privé, protéger la branche de production et renouveler tout secret qui aurait été commis dans l’historique Git.
- Mesurer CPU, mémoire, espace disque, connexions PostgreSQL, durée des sauvegardes et taux d’échec de synchronisation pendant un pilote fermé. Augmenter le VPS si la marge devient faible.
