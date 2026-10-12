# Sécurité de la première bêta — 12 octobre 2026

Périmètre : configuration de production, authentification et inscriptions, accès Payload/REST, isolation des compositions et documents, imports, secrets Git, dépendances de production, Docker, migrations et workflows de release. Cette revue couvre le code et les tests locaux ; Vercel, Neon, DNS, WAF et leurs permissions n’ont pas encore été configurés ni audités en ligne.

## Problèmes identifiés et traitement

| Priorité       | Constat                                                                                       | Traitement                                                                                                                                             |
| -------------- | --------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Critique       | Les versions installées comprenaient une alerte critique Next.js et plusieurs alertes élevées | Next.js/eslint-config-next 16.3.8, Sharp 0.35.5, corrections transitives DOMPurify/Undici/source-map-js/esbuild ; audit bloquant dans la CI            |
| Haute          | Le premier inscrit devenait admin                                                             | Attribution automatique supprimée ; administrateur créé explicitement depuis une machine de confiance                                                  |
| Haute          | Inscription publique illimitée pour une bêta privée                                           | Liens individuels expirables et consommables côté serveur, appliqués au formulaire et à l’accès collection REST ; sans invitation = inscription fermée |
| Haute          | Stockage local de médias et lecture publique                                                  | Accès médias réservé aux admins ; création/modification fermées en production ; MusicXML indépendant de cette collection                               |
| Haute          | Secrets/configuration silencieusement absents                                                 | Validation de la configuration et longueur minimale du secret en production ; aucune valeur secrète de production nécessaire au build Docker           |
| Haute          | Migrations incapables d’initialiser une base vide                                             | Bootstrap historique suivi des deux migrations existantes, testé sur une base jetable ; schema push désactivé en production                            |
| Moyenne        | Reset password sans fournisseur e-mail : messages/token écrits dans les logs                  | Opération fermée en production jusqu’à configuration d’une vraie livraison e-mail ; récupération manuelle documentée                                   |
| Moyenne        | Défense navigateur limitée                                                                    | CSP à nonce de script par requête, cookies HttpOnly/Secure/SameSite Lax, headers nosniff/frame/referrer/permissions                                    |
| Moyenne        | Surface GraphQL inutilisée                                                                    | GraphQL désactivé ; API REST reste soumise aux accès Payload et à la protection CSRF                                                                   |
| Opérationnelle | Déploiement direct de chaque push et absence de sauvegarde préalable                          | Tags contrôlés depuis main, CI sans secrets de production, candidate avant promotion, sauvegarde chiffrée et migrations séquentielles                  |

Les opérations applicatives vérifiées utilisent `overrideAccess: false` avec une session reconnue. Les bypass restants servent aux hooks internes, migrations, scripts privés ou à la readiness sans données personnelles. Les UUID ne sont pas considérés comme une protection d’accès.

## Dépendance sans correctif

`GHSA-vfj7-8cjw-p6xm` concerne `braces <=3.0.3`, dépendance du watcher Sass via Next.js. Au moment de l’audit, aucun correctif n’est publié. L’application n’expose pas de motifs glob fournis par les utilisateurs ; le watcher sert au build et au développement, pas aux requêtes de production.

Cette alerte est exclue **par identifiant exact** dans `pnpm-workspace.yaml`, avec son motif. Elle doit être réévaluée à chaque mise à jour Sass/Next ou changement d’usage. L’audit n’est donc pas annoncé comme sans aucune alerte : toutes les autres alertes corrigeables ont été traitées et les nouvelles alertes élevées/critiques bloquent la CI.

## Scan de secrets

Gitleaks a examiné les 54 commits disponibles. Les cinq correspondances sont des entrées du fichier public de mots de passe interdits et un mot de passe de fixture de test. `.gitleaksignore` ne contient que leurs fingerprints historiques exacts : aucune exclusion globale des fichiers d’authentification ou des secrets nouveaux. Les rapports ont été produits avec masquage des valeurs.

Les fichiers `.env*`, clés et credentials Vercel sont exclus du contexte Docker. Les secrets GitHub ne sont accessibles qu’au job de production après validation d’un tag appartenant à main. Les Actions sont fixées à des SHAs ; Node est fixé à une version LTS corrigée et l’image à son digest. pnpm et le lockfile sont fixés.

## Vérifications

- Tests unitaires : configuration, fermeture des inscriptions et nonce CSP, plus suite existante.
- Tests d’intégration : permissions utilisateurs, rôles, isolation des compositions/documents, écritures et transactions, sur la base temporaire migrée.
- Build Docker : sans connexion à PostgreSQL pendant la compilation ; exécution non root et endpoint de readiness.
- `scripts/smoke-production.mjs` : vérifications REST directes des invitations, rôle du premier inscrit, escalade de privilèges, cookies, isolation propriétaire, médias, GraphQL et headers. Le script est limité aux hôtes locaux et crée des fixtures jetables.
- Workflows : validation Actionlint ; le déploiement Vercel lui-même sera testé après création des services.

## Conditions avant ouverture

1. Créer l’administrateur avant d’inviter les testeurs. Ne pas réutiliser les credentials de développement.
2. Configurer les vrais secrets, la liste d’invités et l’URL HTTPS ; vérifier les cookies sur cette URL.
3. Protéger main et les tags, limiter le jeton Vercel, activer les alertes et les règles WAF contre les abus des endpoints d’authentification. Le lockout Payload protège les comptes ; il ne remplace pas une limitation distribuée des requêtes.
4. Vérifier que les URLs candidates/previews ne partagent pas accidentellement la base de développement et ne sont pas rendues publiques avant validation.
5. Tester sauvegarde/restauration, conserver la clé de chiffrement hors GitHub et prévoir une rétention durable. Les artifacts temporaires ne suffisent pas pour des sauvegardes quotidiennes.
6. La vérification e-mail et le reset automatique attendent un fournisseur e-mail. Le code et la liste constituent une invitation privée, pas une preuve de possession de la boîte e-mail : transmettre le code aux personnes prévues et contrôler les premiers comptes.
7. Fixer les quotas de compositions/documents selon les usages observés. Dix invités ne bornent pas automatiquement le volume créé par un compte ou le coût de ses requêtes.

Sources : [advisories Next.js](https://github.com/vercel/next.js/security/advisories), [advisory braces](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm), [authentification Payload](https://payloadcms.com/docs/authentication/overview), [CSP Next.js](https://nextjs.org/docs/app/guides/content-security-policy).

## Résultats locaux

- 350 tests unitaires et 59 tests d’intégration passent.
- Les 16 scénarios Chromium ciblés d’authentification/admin/partitions sont validés ; un timeout initial de signup pendant la compilation concurrente a été rejoué seul (trois scénarios signup passent).
- L’image de production compile sans base accessible, démarre en utilisateur `orpheus`, répond à la readiness et pèse environ 106 Mo.
- Le smoke REST de production passe, y compris le refus d’une inscription sans invitation valide et le rôle régulier du premier inscrit.
- Un navigateur Chromium a vérifié login, création de composition et rendu d’une partition sur le conteneur de production, sans erreur navigateur ni violation CSP.
- Une sauvegarde PostgreSQL custom a été restaurée dans une seconde base temporaire : deux comptes et la composition attendue sont présents. Le chiffrement GPG du workflow sera vérifié lors de sa première exécution GitHub.
- TypeScript, ESLint, Actionlint et le scan Git Gitleaks passent. L’audit pnpm reste vert avec la seule exception braces documentée.
- Bootstrap administrateur testé sur la base temporaire. Aucun compte Vercel/Neon ni déploiement public n’a été créé.

## Paquets système de l’image

Le scan Trivy a également identifié des alertes corrigeables de `perl-base` dans Debian et de dépendances du npm fourni par l’image Node. Le runtime applique `perl-base 5.36.0-7+deb12u4` et supprime npm/yarn, inutiles pour exécuter le serveur standalone. Le build conserve les outils nécessaires dans ses stages séparés.

La CI scanne les paquets de l’image finale avec Trivy 0.75.0 et bloque les alertes HIGH/CRITICAL pour lesquelles un correctif existe. `--ignore-unfixed` ne signifie pas qu’une image est sans aucune vulnérabilité : les alertes sans correctif restent à réévaluer. Dependabot suit aussi le Dockerfile.

Le scan final de l’image ne trouve aucune alerte HIGH/CRITICAL avec correctif disponible. La readiness de cette image corrigée passe.

Les invitations de bêta utilisent désormais des tokens aléatoires de 256 bits, stockés uniquement sous forme de hash SHA-256. Chaque lien est lié à une adresse, expire après 7 jours, et est consommé avec la création du compte dans la même transaction. L’unicité de l’adresse du compte empêche les doubles créations concurrentes. Les invitations consommées restent enregistrées après suppression du compte. Les liens sont générés localement et envoyés manuellement ; aucun e-mail n’est envoyé par l’application. La page d’inscription demande une politique de referrer `no-referrer`.
