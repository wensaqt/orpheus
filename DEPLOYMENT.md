# Première bêta d’Orpheus

La préparation vit sur `chore/beta-deployment`. L’application se déploie nativement sur Vercel ; Docker sert à vérifier le comportement de production et conserve une option d’hébergement alternative. Les fichiers MusicXML sont stockés en PostgreSQL. Les uploads de médias sont fermés en production tant qu’un stockage persistant n’est pas configuré.

## Services à créer

1. Créer un compte Vercel et un projet Orpheus lié au repository GitHub. Vérifier l’éligibilité de l’usage à Hobby ; un service gratuit peut avoir une finalité commerciale.
2. Créer un projet PostgreSQL Neon, idéalement dans la même région que l’application. Choisir PostgreSQL 17 pour correspondre aux tests et aux sauvegardes.
3. Copier les deux URL de connexion dans les paramètres privés : URL avec pooling pour Vercel, URL directe pour les migrations et sauvegardes. Ne jamais les mettre dans Git ou dans une conversation.
4. Désactiver les déploiements Git automatiques. `vercel.json` le prévoit : seule une release validée doit déplacer le domaine de production.
5. Garder la base de production séparée du développement et des tests. La CI fournit sa propre base temporaire.

## Configuration Vercel

Node.js : branche LTS 24. Commandes : `pnpm install --frozen-lockfile`, puis `pnpm build`. Le lockfile et pnpm 11.24.0 sont fixés.

Configurer ces variables dans l’environnement **Production** du projet :

| Variable         | Valeur                                                          |
| ---------------- | --------------------------------------------------------------- |
| `DATABASE_URL`   | Connexion Neon avec pooling et SSL                              |
| `PAYLOAD_SECRET` | Secret aléatoire d’au moins 32 caractères, conservé durablement |
| `APP_URL`        | URL HTTPS publique de la bêta, sans chemin                      |

Les inscriptions de production nécessitent un lien d’invitation individuel, lié à une adresse e-mail, valable 7 jours et utilisable une seule fois. La whitelist et le code partagé ne sont plus utilisés. L’API REST applique les mêmes règles que le formulaire.

Générer chaque secret séparément :

```sh
openssl rand -hex 32
```

Ne pas réutiliser le secret de développement. Ne pas préfixer ces variables par `NEXT_PUBLIC_`.

## Configuration GitHub

Dans Settings → Environments, créer **production**. Dans cet environnement, ajouter :

| Type                  | Nom                        | Contenu                                                                |
| --------------------- | -------------------------- | ---------------------------------------------------------------------- |
| Variable              | `VERCEL_ORG_ID`            | Team ID Vercel                                                         |
| Variable              | `VERCEL_PROJECT_ID`        | Project ID Vercel                                                      |
| Variable              | `APP_URL`                  | Même URL HTTPS que dans Vercel                                         |
| Secret                | `VERCEL_TOKEN`             | Jeton Vercel limité à l’équipe/projet nécessaire                       |
| Secret                | `PRODUCTION_DATABASE_URL`  | URL directe de la même base Neon                                       |
| Secret                | `PAYLOAD_SECRET`           | Même secret que dans Vercel                                            |
| Secret                | `BACKUP_PASSPHRASE`        | Secret distinct d’au moins 32 caractères pour chiffrer les sauvegardes |
| Secret, si nécessaire | `VERCEL_PROTECTION_BYPASS` | Jeton de bypass pour vérifier une URL candidate protégée               |

Conserver `BACKUP_PASSPHRASE` dans un gestionnaire de mots de passe : sans lui, les archives sont inutilisables. Les archives chiffrées restent 14 jours dans les artifacts GitHub ; ce n’est pas un archivage durable. Prévoir un export hors GitHub et tester une restauration avant d’accueillir les testeurs.

Protéger `main` : PR et job **CI / verify** requis, pas de force-push. Restreindre aussi la création/modification des tags `v*`. Activer les alertes Dependabot et le secret scanning lorsque disponibles. Le fichier Dependabot suit également les Actions.

## Première initialisation

Ne jamais appliquer les migrations sur la base locale habituelle. La migration initiale est prévue pour une base **vide** ; elle ne devine pas comment reprendre une base créée par schema push.

Pour la première initialisation, utiliser GitHub Actions : aucune connexion de production n’est nécessaire dans l’environnement de développement local.

Dans l’environnement GitHub `production`, ajouter les secrets `PRODUCTION_DATABASE_URL` (valeur de `DATABASE_URL_UNPOOLED` dans Vercel) et `PAYLOAD_SECRET` (même secret que Vercel), ainsi que la variable `APP_URL` (URL HTTPS du projet). Une fois la PR de déploiement intégrée à `main`, ouvrir Actions → Initialize beta database → Run workflow, en sélectionnant `main`.

Cette action vérifie d’abord que le schéma applicatif `public` ne contient ni tables ni enums, puis applique les migrations et affiche leur statut. Elle ne supprime rien et refuse une base déjà initialisée. Les changements ultérieurs sont migrés par la release avec sauvegarde préalable.

Les commandes CLI ci-dessous sont réservées aux opérations depuis une machine de confiance explicitement configurée pour la production ; elles ne sont pas à lancer avec le `.env` de développement.

Avant d’exposer la bêta, créer l’administrateur depuis une machine de confiance. Configurer temporairement `ADMIN_EMAIL` et `ADMIN_PASSWORD` dans cet environnement privé puis exécuter :

```sh
NODE_ENV=production pnpm users:create-admin
```

Le mot de passe doit respecter les règles de l’application. Retirer ensuite ces deux variables de cet environnement et conserver le mot de passe dans un gestionnaire dédié. Le premier inscrit ne reçoit jamais le rôle admin. Le reset par e-mail est fermé pendant cette bêta : un administrateur connecté peut modifier le mot de passe d’un compte depuis l’admin. En cas de perte du seul compte administrateur, utiliser le script privé pour créer un nouvel administrateur sous une autre adresse, puis rétablir l’accès.

Pour inviter un testeur, configurer son adresse comme `BETA_INVITE_EMAIL` dans l’environnement privé puis exécuter :

```sh
pnpm users:invite
```

Le script affiche une URL `/signup?invite=…` à copier dans un e-mail envoyé depuis votre boîte habituelle. Le destinataire arrive sur un formulaire avec son adresse préremplie et choisit son mot de passe. La base conserve seulement le hash du token. L’ouverture du lien ne le consomme pas : la création réussie du compte le fait, dans la même transaction. Un lien expiré ou consommé ne fonctionne plus. Pour révoquer un lien avant utilisation, supprimer son entrée dans `beta-invitations` depuis l’admin. Une nouvelle invitation peut être générée si nécessaire.

Les anciennes variables `BETA_ALLOWED_EMAILS` et `BETA_INVITE_CODE` peuvent être retirées de Vercel. Aucun fournisseur d’e-mail n’est requis pour cet envoi manuel.

Le dictionnaire de synonymes n’est pas inclus dans les migrations. Pour commencer, importer seulement la source Dicollecte depuis une machine de confiance :

```sh
NODE_ENV=production pnpm thesaurus:import dicollecte
```

Contrôler la taille de la base avant d’importer Wiktionary, qui est une opération plus lourde. Ces imports ne s’exécutent pas pendant les requêtes ni pendant chaque déploiement.

## Release

Mettre à jour `package.json`, faire valider et merger la PR sur `main`. Le tag doit pointer vers un commit de `main` et correspondre exactement à la version du package. Première version préparée : `0.1.0-beta.1`.

```sh
git switch main
git pull --ff-only
git tag -a v0.1.0-beta.1 -m 'Première bêta Orpheus'
git push origin v0.1.0-beta.1
```

Le workflow vérifie le tag, rejoue la CI, construit avec la configuration Production, déploie une candidate sans déplacer le domaine, sauvegarde et chiffre la base, applique les migrations, vérifie `/api/health`, puis promeut cette même candidate et publie une GitHub prerelease.

Une migration échouée ou une candidate indisponible bloque la promotion. Ne pas supprimer/recréer un tag : publier une nouvelle version. Les workflows n’ont pas encore été exécutés sur GitHub tant que les services et secrets ne sont pas configurés.

## Retour arrière

Revenir à un déploiement précédent depuis Vercel ne restaure pas la base. Les futures migrations doivent rester compatibles avec l’ancienne version pendant la transition. Ne jamais lancer `migrate:down`, `migrate:reset` ou `migrate:fresh` automatiquement en production.

Avant une restauration : arrêter les écritures, télécharger une archive chiffrée, la déchiffrer dans un environnement privé, restaurer vers une **nouvelle base** puis vérifier son contenu. Changer ensuite la connexion de l’application. Cela préserve la base d’origine pour investigation.

```sh
gpg --output restored.dump --decrypt pre-release.dump.gpg
pg_restore --dbname="$RESTORE_DATABASE_URL" --no-owner --no-acl restored.dump
```

## Docker local

Le build utilise des placeholders et ne doit pas contacter une base réelle. `.dockerignore` exclut les fichiers privés.

```sh
docker build -t orpheus:beta .
docker compose -f compose.production.yml up -d
```

La base doit être accessible depuis le conteneur : sur Docker Desktop, `host.docker.internal` remplace généralement `127.0.0.1`. La connexion de production n’est jamais intégrée à l’image. L’utilisateur d’exécution n’est pas root.

`/api/health` vérifie l’application et la base sans renvoyer de données personnelles. `scripts/smoke-production.mjs` crée des fixtures : il est volontairement limité à localhost et ne doit être utilisé qu’avec une base temporaire.

Références : [Payload en production](https://payloadcms.com/docs/production/deployment), [Vercel avec GitHub Actions](https://vercel.com/kb/guide/how-can-i-use-github-actions-with-vercel), [Vercel Hobby](https://vercel.com/docs/plans/hobby), [Neon pour Vercel](https://vercel.com/marketplace/neon).
