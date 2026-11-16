# Guide détaillé de déploiement de Matabishi ERP sur un VPS

**Public visé :** personne qui administre le VPS et responsable métier chargé de la recette.

**Architecture :** un VPS Ubuntu LTS, Docker Compose, PostgreSQL privé, une instance de l’application, Caddy pour HTTPS.

**But :** créer d’abord un environnement de recette sans données réelles, puis ouvrir le pilote uniquement après validation technique et métier.

> Ce guide ne signifie pas que le système est déjà prêt à recevoir des données réelles. Le premier déploiement doit être un **staging** isolé. Les taux, taxes, paie, identité légale et taux USD/CDF doivent provenir des responsables et du comptable. Ne remplacez jamais les marqueurs par des valeurs inventées.

## 1. Vue d’ensemble

```text
Utilisateurs (navigateur / poste POS)
                  │ HTTPS 443 (HTTP 80 pour redirection et certificat)
                  ▼
              Caddy ─────────────── Certificats TLS automatiques
                  │ réseau Docker privé
                  ▼
          Application Matabishi (API + interface)
                  │ réseau Docker privé
                  ▼
               PostgreSQL

Sauvegardes chiffrées age ───────► stockage distinct du VPS (rclone)
```

Le pilote fonctionne avec **une seule instance API par base**. Ne publiez pas les ports 3000 et 5432 sur Internet. Le VPS unique reste un point de panne unique; la sauvegarde externalisée et les tests de restauration sont obligatoires.

## 2. Préparer les éléments nécessaires

Avant d’ouvrir un compte VPS, réunir :

- un VPS Ubuntu LTS maintenu, avec au minimum 2 vCPU / 4 Go pour une recette; prévoir plutôt 4 vCPU / 8 Go pour le premier pilote et mesurer la charge;
- un domaine ou sous-domaine réservé à l’application, par exemple `erp.exemple.cd`;
- l’adresse IP publique du VPS et l’accès au DNS;
- une clé SSH personnelle par administrateur;
- l’accès GitHub permettant de récupérer le dépôt et la branche revue;
- deux personnes nommées pour les rôles Super Admin et Admin Siège;
- après la recette technique seulement : identité légale, taux de change, taxes, barèmes sociaux/paie, seuils approuvés et données initiales vérifiées;
- une destination de sauvegarde privée hors du VPS et une clé `age` dont la clé privée ne sera **pas** stockée sur le VPS.

Conserver les secrets dans un gestionnaire de secrets ou dans des fichiers avec permissions `600`, jamais dans Git, un ticket public, une capture d’écran ou une commande enregistrée dans l’historique du shell.

## 3. Créer et sécuriser le serveur

### 3.1 Fournisseur et réseau

Choisir une région répondant aux besoins de disponibilité et de confidentialité de l’entreprise. Vérifier le prix récurrent, la politique de sauvegarde du fournisseur, les frais de trafic et la localisation réelle avant commande. Une sauvegarde du fournisseur ne remplace pas l’archive applicative chiffrée.

Créer une VM Ubuntu LTS avec IPv4 publique. Dans le pare-feu du fournisseur, n’autoriser que :

| Port | Source | Usage |
| --- | --- | --- |
| TCP 22 | IP d’administration uniquement | SSH |
| TCP 80 | Internet | redirection HTTPS et validation ACME |
| TCP 443 | Internet | application HTTPS |
| UDP 443 | Internet | HTTP/3 si disponible; facultatif |

Ne pas ouvrir 3000, 5432, ni les ports Docker. Les ports publiés par Docker peuvent contourner certaines règles UFW; limiter aussi le pare-feu réseau du fournisseur.

### 3.2 DNS

Créer un enregistrement `A` pour `erp.exemple.cd` vers l’IPv4 du VPS. Si vous n’avez pas configuré IPv6 sur le serveur, ne créez pas d’enregistrement `AAAA`. Vérifier la résolution depuis votre poste avant de démarrer Caddy :

```sh
dig +short erp.exemple.cd A
dig +short erp.exemple.cd AAAA
```

Le DNS doit pointer sur ce VPS et les ports 80/443 doivent être joignables pour que Caddy obtienne et renouvelle les certificats. Caddy automatise la gestion HTTPS quand son hôte est un nom de domaine valide. [Documentation Caddy HTTPS](https://caddyserver.com/docs/automatic-https)

### 3.3 Connexion SSH et système

Depuis votre poste, tester l’accès SSH avec la clé fournie par le prestataire :

```sh
ssh -i ~/.ssh/mvg_vps_ed25519 ubuntu@IP_DU_VPS
```

Sur le serveur, mettre le système à jour et créer un compte d’administration nominatif si le fournisseur utilise un compte générique. Vérifier l’accès par clé avec une **deuxième session** avant de désactiver la connexion SSH par mot de passe. Ne fermez pas votre session fonctionnelle avant d’avoir confirmé le nouvel accès.

```sh
sudo apt update
sudo apt full-upgrade -y
sudo apt install -y ca-certificates curl git ufw unattended-upgrades
sudo systemctl enable --now unattended-upgrades
```

Configurer UFW après avoir autorisé SSH pour éviter de se verrouiller hors du serveur :

```sh
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow from VOTRE_IP_ADMIN to any port 22 proto tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 443/udp
sudo ufw enable
sudo ufw status verbose
```

Remplacer `VOTRE_IP_ADMIN` par une adresse fixe fiable. Si l’adresse change souvent, conserver une procédure de récupération via la console du fournisseur et limiter SSH par clé, plutôt que d’ouvrir SSH largement sans contrôle.

### 3.4 Installer Docker Engine et Compose

Installer Docker depuis le dépôt APT officiel, pas avec le script de commodité sur un serveur de production. Les commandes ci-dessous sont celles de la documentation officielle Ubuntu de Docker; vérifier les instructions si la version/région Ubuntu du VPS change. [Installer Docker Engine sur Ubuntu](https://docs.docker.com/engine/install/ubuntu/)

```sh
sudo install -m 0755 -d /etc/apt/keyrings
sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
sudo chmod a+r /etc/apt/keyrings/docker.asc

sudo tee /etc/apt/sources.list.d/docker.sources >/dev/null <<EOF
Types: deb
URIs: https://download.docker.com/linux/ubuntu
Suites: $(. /etc/os-release && echo "${UBUNTU_CODENAME:-$VERSION_CODENAME}")
Components: stable
Architectures: $(dpkg --print-architecture)
Signed-By: /etc/apt/keyrings/docker.asc
EOF

sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
sudo systemctl enable --now docker
sudo docker version
sudo docker compose version
```

Docker Compose est fourni ici par le plugin `docker-compose-plugin`. [Documentation Docker Compose Linux](https://docs.docker.com/compose/install/linux/). Éviter d’ajouter des comptes humains au groupe `docker` : ce groupe confère des privilèges proches de root. Utiliser `sudo docker ...` ou une politique d’administration contrôlée.

## 4. Récupérer le code sans exposer de secrets

Créer un répertoire appartenant à l’utilisateur d’exploitation :

```sh
sudo install -d -o "$USER" -g "$USER" /opt/mvg
cd /opt/mvg
```

Récupérer le code par HTTPS si le dépôt est accessible, ou configurer une **deploy key en lecture seule** si le dépôt est privé. Ne collez pas de jeton GitHub dans l’URL ou dans l’historique de commandes.

Pour la recette de la pull request :

```sh
git clone --branch codex/production-readiness-phase-1 --single-branch \
  git@github.com:dkitaheruka/MVG.git app
cd /opt/mvg/app
git rev-parse --short HEAD
```

Ce nom de branche est celui de la branche revue au moment de la rédaction. Pour la production finale, déployer le commit approuvé/mergé que l’entreprise a choisi, puis noter son hash. Ne pas suivre automatiquement une branche mutable sans revue.

## 5. Préparer les fichiers locaux de configuration

### 5.1 Variables Compose

Le dépôt fournit `.env.production.example`. Copier ce modèle; ne pas committer le vrai fichier :

```sh
cd /opt/mvg/app
cp .env.production.example .env.production
chmod 600 .env.production
```

Éditer `.env.production` et renseigner :

```dotenv
DOMAIN=erp.exemple.cd
POSTGRES_DB=mvg
POSTGRES_USER=mvg_app
POSTGRES_PASSWORD=UN_SECRET_ALEATOIRE_LONG_EN_HEXADECIMAL
JWT_SECRET=UN_SECRET_ALEATOIRE_D_AU_MOINS_32_CARACTERES
CORS_ORIGINS=https://erp.exemple.cd
TRUST_PROXY=1
REQUEST_BODY_LIMIT=10mb
```

Générer des secrets, puis les coller dans l’éditeur sûr sans les laisser dans l’historique :

```sh
openssl rand -hex 32
openssl rand -hex 48
```

Utiliser un mot de passe PostgreSQL composé de caractères URL sûrs (hexadécimal recommandé), car Compose l’insère dans `DATABASE_URL`. Garder `CORS_ORIGINS` limité à l’origine HTTPS exacte. Ne jamais mettre plusieurs noms arbitraires ou `*` en production.

### 5.2 Configuration métier

Copier le modèle et le protéger :

```sh
cp config/production.example.json config/production.json
chmod 600 config/production.json
```

**En staging**, utiliser seulement les valeurs fictives explicitement marquées comme telles. **En production**, compléter après validation écrite :

- nom légal de l’entreprise, identifiants fiscaux et coordonnées;
- nom/adresse de l’agence pilote;
- taux USD/CDF proposé et approuvé par deux personnes différentes;
- TVA, IPR, CNSS, INPP, ONEM et paramètres de paie selon les règles applicables;
- seuil de visa siège (200 USD provisoire) et seuil de dépense directe (100 USD provisoire), à confirmer;
- double validation des transferts et textes à imprimer sur les documents.

Ne pas positionner `legalAndPayrollRatesReviewed` à `true` avant la revue par le comptable/responsable compétent. Le provisionneur doit rejeter les marqueurs du modèle. Il initialise une base vide seulement et ne crée pas les stocks initiaux, articles, utilisateurs opérationnels ou soldes de caisse. Ces éléments devront être chargés et comptés séparément avant l’ouverture.

## 6. Construire et amorcer une base de staging

Vérifier les fichiers présents, puis construire l’image :

```sh
docker compose --env-file .env.production config --quiet
docker compose --env-file .env.production build app
docker compose --env-file .env.production up -d db
docker compose --env-file .env.production ps
```

Créer deux comptes d’amorçage distincts. Ne pas réutiliser ces secrets comme mots de passe quotidiens. Saisir les mots de passe sans écho dans le shell :

```sh
read -r -p 'Courriel Super Admin: ' MVG_BOOTSTRAP_SUPER_ADMIN_EMAIL
read -r -p 'Nom Super Admin: ' MVG_BOOTSTRAP_SUPER_ADMIN_NAME
read -r -s -p 'Mot de passe initial Super Admin: ' MVG_BOOTSTRAP_SUPER_ADMIN_PASSWORD; echo
read -r -p 'Courriel Admin Siège: ' MVG_BOOTSTRAP_ADMIN_SIEGE_EMAIL
read -r -p 'Nom Admin Siège: ' MVG_BOOTSTRAP_ADMIN_SIEGE_NAME
read -r -s -p 'Mot de passe initial Admin Siège: ' MVG_BOOTSTRAP_ADMIN_SIEGE_PASSWORD; echo
export MVG_BOOTSTRAP_SUPER_ADMIN_EMAIL MVG_BOOTSTRAP_SUPER_ADMIN_NAME MVG_BOOTSTRAP_SUPER_ADMIN_PASSWORD
export MVG_BOOTSTRAP_ADMIN_SIEGE_EMAIL MVG_BOOTSTRAP_ADMIN_SIEGE_NAME MVG_BOOTSTRAP_ADMIN_SIEGE_PASSWORD
```

Lancer le provisionnement avec le même environnement Compose :

```sh
docker compose --env-file .env.production run --rm \
  -v "$PWD/config/production.json:/app/config/production.json:ro" \
  -e MVG_BOOTSTRAP_SUPER_ADMIN_EMAIL -e MVG_BOOTSTRAP_SUPER_ADMIN_NAME -e MVG_BOOTSTRAP_SUPER_ADMIN_PASSWORD \
  -e MVG_BOOTSTRAP_ADMIN_SIEGE_EMAIL -e MVG_BOOTSTRAP_ADMIN_SIEGE_NAME -e MVG_BOOTSTRAP_ADMIN_SIEGE_PASSWORD \
  app npm run provision:production -- /app/config/production.json
unset MVG_BOOTSTRAP_SUPER_ADMIN_EMAIL MVG_BOOTSTRAP_SUPER_ADMIN_NAME MVG_BOOTSTRAP_SUPER_ADMIN_PASSWORD
unset MVG_BOOTSTRAP_ADMIN_SIEGE_EMAIL MVG_BOOTSTRAP_ADMIN_SIEGE_NAME MVG_BOOTSTRAP_ADMIN_SIEGE_PASSWORD
```

Le provisionnement refuse une base déjà initialisée/non vide et le modèle incomplet. En cas d’erreur, arrêter et comprendre la cause; ne pas vider ou réutiliser une base sans procédure formelle. Le premier login force le changement de mot de passe.

## 7. Démarrer l’application et vérifier HTTPS

Confirmer que le DNS pointe sur le VPS, puis lancer les services :

```sh
docker compose --env-file .env.production up -d --build
docker compose --env-file .env.production ps
docker compose --env-file .env.production logs --tail=100 db app caddy
```

Attendre que Caddy obtienne un certificat. Vérifier les sondes et la page :

```sh
curl --fail --show-error https://erp.exemple.cd/healthz
curl --fail --show-error https://erp.exemple.cd/readyz
```

`healthz` indique que le processus HTTP répond; `readyz` vérifie aussi la persistance PostgreSQL. Ouvrir le domaine dans un navigateur et vérifier le certificat, l’absence d’avertissement, la connexion et le changement du mot de passe initial.

Si TLS échoue : vérifier le DNS (A/AAAA), les règles du fournisseur et UFW, les logs Caddy, l’horloge du serveur et l’absence d’un autre service qui occupe 80/443. Ne pas contourner HTTPS pour les utilisateurs.

## 8. Recette technique et métier avant l’ouverture

Utiliser des comptes, ventes, prix et stocks **fictifs** dans le staging. Cocher chaque point et conserver les résultats datés :

### Accès et sécurité

- [ ] Les deux comptes d’administration sont différents, sécurisés et le mot de passe initial a été changé.
- [ ] Créer des comptes pour chaque rôle opérationnel; vérifier les droits autorisés et refusés.
- [ ] Un utilisateur d’agence ne lit ni ne modifie les objets d’une autre agence.
- [ ] Les exports comptables et rapports sensibles sont réservés aux permissions attendues.
- [ ] Les tentatives excessives de connexion sont limitées; aucun secret n’apparaît dans les logs.
- [ ] La base PostgreSQL et l’API ne sont pas accessibles depuis Internet.

### Activités

- [ ] Vente USD et CDF, caisse correspondante, ticket et écriture comptable.
- [ ] Ventes hors ligne sur au moins deux appareils, coupure/reconnexion, répétition de synchronisation et absence de doublon.
- [ ] Vente simultanée du même lot pendant la coupure : vérifier l’acceptation convenue, l’alerte de conflit et la procédure de correction.
- [ ] Vérifier FEFO, lot, quantité, prix, remise, TVA, client, limite de crédit, remboursement et annulation selon les parcours autorisés.
- [ ] Clôture caisse, dépenses, approbations et séparation demandeur/approbateur.
- [ ] Paie, taxes, taux et documents confirmés par le responsable compétent.
- [ ] Tester au moins 50 comptes avec un scénario d’usage représentatif; surveiller CPU, mémoire, disque, connexions et latence.

### Redémarrage et restauration

- [ ] Redémarrer les services et vérifier que les données persistent.
- [ ] Réaliser une sauvegarde chiffrée vers une destination hors VPS.
- [ ] Restaurer cette sauvegarde dans une **nouvelle base isolée**, démarrer une instance de recette séparée et comparer ventes, stocks, comptes, écritures et paramètres.
- [ ] Démontrer le temps réel de restauration (RTO) et la perte maximale de données acceptable (RPO), puis faire approuver ces objectifs.

Ne pas ouvrir aux opérations réelles tant que les cases de sécurité, backup/restore, synchronisation et validation métier ne sont pas signées.

## 9. Sauvegardes chiffrées hors du VPS

Installer `age` et `rclone` depuis leurs sources officielles, puis générer une identité de sauvegarde. Garder la clé privée hors du VPS (gestionnaire de secrets ou support contrôlé avec copie de secours) et configurer le destinataire public `MVG_AGE_RECIPIENT`.

Configurer une destination `rclone` privée, idéalement avec chiffrement côté client, dans `/root/.config/rclone/rclone.conf`; limiter les permissions :

```sh
sudo chmod 700 /root/.config/rclone
sudo chmod 600 /root/.config/rclone/rclone.conf
```

Créer `/etc/mvg-backup.env` avec le destinataire public et le remote rclone, puis `chmod 600`. Exemple :

```dotenv
MVG_AGE_RECIPIENT=age1DESTINATAIRE_PUBLIC
MVG_BACKUP_REMOTE=mvg-remote:matabishi-prod
MVG_BACKUP_DIR=/var/backups/mvg
MVG_BACKUP_RETENTION_DAYS=14
```

Ne jamais mettre l’identité privée age dans ce fichier. Le script attend que `.env.production` et le fichier du projet soient accessibles depuis `/opt/mvg/app`. Tester une sauvegarde manuelle :

```sh
cd /opt/mvg/app
sudo bash -c 'set -a; . /etc/mvg-backup.env; set +a; ./scripts/backup-postgres.sh'
```

Vérifier que le fichier `.dump.age` existe localement et dans le stockage distant, puis faire immédiatement un essai de restauration isolée avec la clé privée conservée hors serveur. Le script refuse de restaurer par-dessus la base active.

Pour planifier la sauvegarde quotidienne, créer un service systemd qui charge l’environnement :

`/etc/systemd/system/mvg-backup.service` :

```ini
[Unit]
Description=Sauvegarde PostgreSQL chiffrée de Matabishi
After=docker.service
Requires=docker.service

[Service]
Type=oneshot
WorkingDirectory=/opt/mvg/app
EnvironmentFile=/etc/mvg-backup.env
ExecStart=/opt/mvg/app/scripts/backup-postgres.sh
```

`/etc/systemd/system/mvg-backup.timer` :

```ini
[Unit]
Description=Sauvegarde quotidienne Matabishi

[Timer]
OnCalendar=*-*-* 02:15:00
Persistent=true
RandomizedDelaySec=10m

[Install]
WantedBy=timers.target
```

Activer et contrôler :

```sh
sudo systemctl daemon-reload
sudo systemctl enable --now mvg-backup.timer
sudo systemctl list-timers mvg-backup.timer
sudo systemctl start mvg-backup.service
sudo journalctl -u mvg-backup.service --since today
```

Une alerte externe doit prévenir l’équipe si le timer échoue ou si aucune archive distante n’arrive. Une sauvegarde jamais restaurée n’est pas une preuve de reprise.

## 10. Mise à jour contrôlée

Faire les mises à jour d’abord sur staging. Planifier une fenêtre, avertir les utilisateurs, lancer une sauvegarde et enregistrer le hash actuellement installé :

```sh
cd /opt/mvg/app
git rev-parse HEAD
sudo systemctl start mvg-backup.service
git fetch origin
```

Récupérer explicitement le commit approuvé; examiner les changements, puis construire/redémarrer :

```sh
git checkout HASH_APPROUVE
docker compose --env-file .env.production build app
docker compose --env-file .env.production up -d app
docker compose --env-file .env.production ps
curl --fail --show-error https://erp.exemple.cd/readyz
```

Contrôler les journaux, se connecter, faire une vente de contrôle selon la procédure de recette et observer les erreurs de synchronisation. Ne pas lancer plusieurs API contre une même base. Les migrations de schéma sont automatiques au démarrage; une incompatibilité doit être détectée en staging avant production.

## 11. Retour arrière et incidents

### Incident applicatif sans changement de schéma

Revenir au précédent hash examiné, reconstruire l’image puis vérifier `readyz`. Ne jamais utiliser `latest` comme référence de retour arrière.

### Données altérées ou migration incompatible

1. Mettre l’application en maintenance et empêcher de nouvelles écritures.
2. Noter l’heure, le hash applicatif, l’archive choisie et les actions réalisées.
3. Restaurer l’archive dans une nouvelle base `mvg_restore_*` avec `scripts/restore-postgres-to-new-db.sh`.
4. Vérifier cette base hors ligne avec les responsables métier/comptables.
5. Basculer vers la base restaurée uniquement après autorisation formelle et plan de retour arrière.
6. Garder l’ancienne base intacte jusqu’à validation. Ne jamais supprimer ou écraser la base source pendant le diagnostic.

La synchronisation hors ligne peut transmettre des ventes après une coupure; le responsable doit rapprocher la file locale et les conflits signalés avant toute restauration qui pourrait retirer des opérations déjà acceptées.

## 12. Exploitation courante

Contrôles réguliers :

```sh
cd /opt/mvg/app
docker compose --env-file .env.production ps
docker compose --env-file .env.production logs --since=1h app caddy db
df -h
free -h
sudo systemctl status mvg-backup.timer
```

Surveiller les mises à jour de sécurité Ubuntu et Docker, l’espace disque PostgreSQL, l’âge de la dernière sauvegarde distante, l’état des certificats, les erreurs de synchronisation et le temps de réponse. Définir qui reçoit et traite les alertes en dehors des heures d’ouverture. Tester périodiquement la restauration et réviser les comptes d’accès.

## 13. Procédure d’ouverture pilote

1. Obtenir l’approbation de recette technique, dont restauration et essai de charge.
2. Obtenir l’approbation métier/comptable des paramètres et états utilisés.
3. Confirmer par écrit les seuils de 100/200 USD et leurs règles d’exception.
4. Recréer une base de production **neuve**, avec les paramètres réels et deux administrateurs nommés.
5. Charger le plan comptable de référence fourni; vérifier ses comptes avec le comptable.
6. Compter et saisir les stocks initiaux, lots, prix, caisses et utilisateurs opérationnels avec pièces justificatives et double contrôle.
7. Vérifier une dernière fois le HTTPS, le pare-feu, la sauvegarde distante, les accès et les exports.
8. Ouvrir d’abord à l’agence pilote; suivre quotidiennement les conflits hors ligne et rapprocher ventes, stocks et caisses.
9. N’ajouter d’autres agences qu’après une période pilote validée et une revue des droits/périmètres.

## Liens utiles

- [Déploiement VPS résumé du dépôt](vps-deployment.md)
- [État de préparation production](production-readiness.md)
- [Docker Engine sur Ubuntu](https://docs.docker.com/engine/install/ubuntu/)
- [Docker Compose sur Linux](https://docs.docker.com/compose/install/linux/)
- [Pare-feu Ubuntu](https://ubuntu.com/server/docs/firewalls/)
- [HTTPS automatique Caddy](https://caddyserver.com/docs/automatic-https)
- [Documentation age](https://age-encryption.org/)
- [Documentation rclone](https://rclone.org/docs/)
