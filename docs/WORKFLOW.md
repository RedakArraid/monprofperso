# Workflow de développement et de livraison — Mon Prof Perso

Le chemin de promotion est **`dev` → `staging` → `main`**. Une promotion Git,
une préparation de version sur le serveur et l’ouverture du service sont trois
opérations distinctes.

Les commandes sont implémentées dans [`scripts/operations.mjs`](../scripts/operations.mjs).
Le [guide d’exploitation et de mise en service](PRODUCTION-OPERATIONS.md) décrit
les commandes complètes, leurs fichiers de configuration, les prérequis serveur,
les sauvegardes et la restauration. Ce document décrit l’ordre de travail ; il
ne constitue pas une preuve de déploiement ou d’ouverture d’un environnement.

## 1. Développer et intégrer dans `dev`

Travailler sur une branche dédiée, vérifier les changements localement et les
faire relire dans une pull request vers `dev`. Les commandes de développement
et de test sont documentées dans [le README](../README.md) et
[le README backend](../backend/README.md).

Les tests d’intégration utilisent une base locale jetable et les modes de test
explicitement configurés. Les données, secrets et comptes de production ne
servent pas de fixtures. Les fichiers d’environnement réels restent hors du dépôt.

## 2. Promouvoir vers `staging` par pull request

Ouvrir et faire relire la pull request `dev` → `staging`. La fusion et le push
sont effectués dans le workflow Git autorisé ; **aucun script de release ou de
déploiement ne fusionne des branches et aucun ne pousse du code**.

Choisir le **SHA Git complet de 40 caractères** à livrer. La révision doit
appartenir à `origin/staging`. Attendre la CI de ce SHA exact : le contrôle
`ci-check` exige le workflow attendu et le succès des jobs API, web, Android et
iOS. Un résultat d’une autre révision, une exécution en cours ou un job ignoré
ne valide pas la livraison. Si la fusion crée un nouveau commit, attendre la CI
de ce nouveau commit avant de le préparer.

La CI technique ne remplace pas la recette du parcours avec les prestataires
de staging, les contrôles de données et les validations de l’exploitant.

## 3. Préparer la version avec les nouvelles opérations fermées

`release` est un raccourci qui vérifie la CI puis appelle `deploy` sur le serveur
par SSH. `deploy` vérifie de nouveau la branche et la CI du SHA demandé, crée un
worktree détaché et construit les images API et web identifiées par cette révision.
Il ne remplace pas les fichiers d’une ancienne livraison en place.

Avant les migrations, la préparation exige une **sauvegarde externe complète**
de la base et des fichiers référencés. Si cette sauvegarde ne peut pas être
établie, la livraison s’arrête. Elle applique ensuite la version avec
`SERVICE_OPEN=false`, vérifie la révision effectivement servie et exécute le
smoke test de préparation. L’état attendu est `prepared_closed`.

À ce stade, les nouvelles inscriptions, demandes, réservations et charges
soumises au contrôle d’ouverture restent fermées. Les comptes de recette
explicitement autorisés conservent leurs contrôles OTP et prestataire. Staging
emploie sa propre base, ses propres secrets et des clés Paystack test ; il
n’utilise pas le mode de simulation locale.

Réaliser la recette de la révision préparée et consigner les preuves dans la vue
administrateur « Mise en service ». Les déclarations portent sur cette révision
et sa configuration ; elles ne sont ni déduites de la CI ni présentées comme
un audit externe. Les documents et informations légales sont ceux fournis par
l’exploitant, sans identité ou politique de remplacement.

## 4. Activer explicitement, puis promouvoir vers `main`

L’activation est une commande distincte, avec l’environnement, le même SHA et
une confirmation explicite. Elle vérifie que cette version est bien celle
préparée, que le contenu des images n’a pas changé, que sa CI est toujours
valide et que les contrôles de préparation sont satisfaits.

Elle ouvre alors le service et exécute le smoke test d’ouverture. Un échec de
cette vérification referme les nouvelles opérations ; une simple préparation
ne provoque jamais une activation automatique.

Après validation du staging, promouvoir les changements par une pull request
`staging` → `main`. Choisir le SHA de production appartenant à `origin/main`,
attendre **sa propre CI**, puis répéter la préparation fermée, la sauvegarde,
la recette et l’activation dans l’environnement de production. Une CI verte
sur `staging` ne valide pas automatiquement un nouveau SHA créé sur `main`.

Les configurations de production exigent les prestataires réels et les clés
appropriées. Une recette locale simulée ne justifie pas leur activation.

## 5. Contrôles après livraison et retour à une version précédente

Le smoke test reçoit toujours le SHA attendu afin de contrôler la révision
servie. Le mode `--prepared` vérifie une version préparée avec le service fermé ;
le mode normal vérifie une version ouverte. Ces deux états ne sont pas
interchangeables et le smoke test ne se connecte pas avec un compte administrateur
de démonstration.

Un rollback cible une version antérieure déjà préparée et dont les images
enregistrées sont toujours disponibles. Il exige un motif, une confirmation
explicite de compatibilité et une nouvelle sauvegarde de sécurité. Le script
contrôle également que la liste des migrations appliquées correspond exactement
à celle du code cible. **L’option de confirmation ne contourne pas ce contrôle.**

Le rollback ne lance aucune migration descendante et ne restaure pas
automatiquement une ancienne base. Si le schéma diffère, il refuse le retour
automatique : une procédure spécifique doit être revue avec ses conséquences
sur les données et les opérations financières. La restauration se prépare dans
une nouvelle destination selon le guide d’exploitation.

Une version remise en place par rollback revient à l’état `prepared_closed`.
Sa réouverture exige les contrôles et l’activation explicite de cette révision.

## Repères de commande

Les syntaxes ci-dessous sont des repères. Remplacer `SHA40`, `URL` et `MOTIF`
par les valeurs vérifiées et utiliser la configuration de l’environnement
décrite dans [PRODUCTION-OPERATIONS.md](PRODUCTION-OPERATIONS.md).

| Commande | Rôle |
| --- | --- |
| `node scripts/operations.mjs ci-check --sha SHA40` | Contrôler la CI de la révision exacte |
| `scripts/release-staging.sh --sha SHA40 --confirm` | Préparer à distance la révision de staging, sans merge, push ni activation |
| `scripts/release-prod.sh --sha SHA40 --confirm` | Préparer à distance la révision de production, sans merge, push ni activation |
| `scripts/deploy-staging.sh --sha SHA40 --confirm` | Préparer directement sur le serveur staging avec sa configuration |
| `scripts/deploy-prod.sh --sha SHA40 --confirm` | Préparer directement sur le serveur de production avec sa configuration |
| `scripts/activate-release.sh --environment prod --sha SHA40 --confirm` | Activer explicitement la version préparée de production |
| `scripts/smoke.sh URL --sha SHA40 --prepared` | Contrôler une préparation fermée |
| `scripts/smoke.sh URL --sha SHA40` | Contrôler la version ouverte |
| `scripts/rollback-release.sh --environment prod --sha SHA40 --confirm --confirm-schema-compatible --reason MOTIF` | Revenir à une version antérieure compatible, en conservant les nouvelles opérations fermées |

L’activation et le rollback acceptent aussi `--environment staging`. Les options
communes et la configuration requise sont détaillées par
`node scripts/operations.mjs --help` et le guide d’exploitation. Le protocole de
livraison n’utilise plus les anciennes invocations sans SHA ;
`release-prod.sh --yes` a été remplacé par la préparation explicite avec
`--sha` et `--confirm`, suivie d’une activation séparée.
