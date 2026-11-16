# Matabishi ERP

Application de gestion pour Matabishi : ventes POS, stocks, trésorerie, achats, production, ressources humaines et comptabilité.

## Développement local

Prérequis : Node.js 22+ et PostgreSQL 16+ (facultatif en mode mémoire local).

```powershell
npm install
Copy-Item .env.example .env
npm run dev
```

Les profils de démonstration et leurs mots de passe simplifiés sont réservés au mode développement (`npm run dev`) et ne sont pas créés par le provisionnement de production. N’utilisez jamais ces profils pour des données réelles. En développement, `DATABASE_URL` est facultatif. Avec PostgreSQL, une base vide reçoit les données de démonstration et reste marquée comme telle.

## Vérifier le build

```powershell
npm run build
npx oxlint
```

## État de préparation à la production

Le projet est encore en préparation et n’est pas prêt à accueillir des données réelles. Le serveur peut maintenant persister les collections métier dans PostgreSQL et reprendre les données après redémarrage. Cette couche conserve les routes et règles métier en place, fonctionne avec une seule instance API et refuse d’utiliser les données de démonstration en production.

La commande d’initialisation et le modèle de configuration sont disponibles (`npm run provision:production -- <config.json>`). Les opérations hors ligne sont mises en file par utilisateur puis synchronisées; les conflits de stock sont signalés pour traitement. Les scripts de sauvegarde PostgreSQL chiffrée et la procédure VPS sont présents, mais doivent être exercés sur un VPS de recette. Les paramètres officiels et seuils restent à fournir après cette recette. Le lancement réel nécessite encore une recette multi-postes, la vérification de restauration, les paramètres légaux/fiscaux et HTTPS.

Voir [`docs/production-readiness.md`](docs/production-readiness.md) pour le plan, les exigences du VPS et les contrôles restants.
