# Exploiter Mon Prof Perso

Les commandes de ce document préparent et vérifient une livraison. Elles ne
créent pas de validation commerciale ou juridique, ne font pas de paiement de
recette et ne remplacent pas les preuves de fonctionnement des prestataires.
Une livraison reste fermée aux nouvelles inscriptions, réservations et charges
jusqu’à son activation explicite. Les comptes existants, la clôture des cours et
le support restent accessibles selon leurs autorisations.

## 1. Organisation et prérequis du serveur

Utiliser Node.js 24, Git, la CLI GitHub `gh` authentifiée en lecture sur le dépôt,
Docker avec Compose v2, GNU tar et restic. PostgreSQL 16 et les outils
`pg_dump`/`pg_restore` sont fournis par le conteneur `db` pour l’exploitation
standard. Les clients PostgreSQL sur l’hôte servent seulement au mode de
répétition locale.

Disposition proposée :

| Emplacement | Contenu |
| --- | --- |
| `/srv/monprofperso/control` | Checkout de contrôle contenant les scripts relus |
| `/srv/monprofperso/releases/prod` | Worktrees détachés des versions de production |
| `/srv/monprofperso/releases/staging` | Worktrees distincts de préproduction |
| `/srv/monprofperso/state/prod` | Journaux des livraisons, preuves de sauvegarde, verrous |
| `/etc/monprofperso/production.env` | Configuration réelle de l’API et de Compose |
| `/etc/monprofperso/backup-prod.env` | Configuration d’exploitation et dépôt restic |
| `/etc/monprofperso/monitor-prod.env` | Sondes, accès au dépôt et destination d’alerte |
| `/var/lib/monprofperso/backup-tmp` | Répertoire privé partagé avec les conteneurs de sauvegarde |

Créer ces répertoires avec les droits de l’opérateur `mpp-ops`. Cet opérateur doit
pouvoir utiliser Docker et lire les secrets nécessaires. Les fichiers de secrets
et les mots de passe restic doivent appartenir à cet opérateur et être en mode
`0600`. Adapter le chemin `/usr/bin/node` des unités systemd si Node.js est
installé ailleurs. Aucun script n’installe ni n’active les unités automatiquement.

Copier `backend/.env.production.example`, `backend/.env.backup.example` et
`backend/.env.monitor.example` vers les emplacements choisis, puis renseigner les
vraies valeurs. Les exemples sont volontairement inutilisables tels quels.
Staging utilise ses propres base, bucket, dépôt, mot de passe et configuration.

### Lire les configurations sans les exécuter

`--config` et `scripts/run-env.mjs` lisent le fichier comme du texte dotenv puis
lancent les programmes sans shell. Ils n’exécutent pas `$()`, les backticks ou
d’autres substitutions. Les options d’exécution telles que `NODE_OPTIONS` et
`RESTIC_PASSWORD_COMMAND` sont refusées dans ces fichiers.

Pour la configuration destinée à Compose, mettre entre **guillemets simples**
les valeurs contenant un dollar ou des échappements :

```dotenv
OTP_WHATSAPP_API_KEY='une-valeur-avec-$-littéral'
OTP_SMTP_PASS='une-valeur-avec-\n-littéral'
```

Les formes ambiguës sont rejetées avant livraison : Compose interprète les
valeurs non protégées ou entre guillemets doubles. Voir la
[syntaxe officielle des fichiers d’environnement Docker](https://docs.docker.com/compose/how-tos/environment-variables/variable-interpolation/#env-file-syntax).
Ne pas afficher `docker compose config` ou `config --environment` dans les logs :
ces commandes développent les secrets. L’option applicative est `--app-env`,
distincte de l’option native `node --env-file`.

## 2. Préparer une version exacte

Faire relire et intégrer le commit dans `staging`, puis dans `main` selon le
processus de revue. Les scripts ne font aucun merge, push ni changement du
checkout de contrôle. Indiquer le **SHA Git complet de 40 caractères** : une
branche, un SHA abrégé ou `latest` est refusé.

```bash
node -- scripts/operations.mjs ci-check --sha SHA40

node -- scripts/operations.mjs deploy \
  --config /etc/monprofperso/backup-staging.env \
  --environment staging --sha SHA40 --confirm
```

La préparation exige que le SHA appartienne à `origin/staging` pour staging,
ou à `origin/main` pour la production. La dernière exécution de
`.github/workflows/ci.yml` portant sur **ce même SHA** doit être terminée avec
succès, et chacun des quatre jobs doit être présent une seule fois et avoir
réussi : API/PostgreSQL, web, Android et iOS. Un job ignoré ou une relance en
cours fait échouer le contrôle.

Le script crée un worktree détaché, construit les ressources web avec le lockfile
et construit les images `monprofperso-api:SHA40` et
`monprofperso-web:SHA40`. Il enregistre leurs identifiants. Le fichier
d’environnement reste externe, référencé par un lien dans le worktree. La base
est démarrée, puis une sauvegarde externe complète est exigée **avant** que la
nouvelle API ne démarre et applique les migrations.

Ensuite la nouvelle version démarre avec `SERVICE_OPEN=false`. C’est une phase
de maintenance pour les nouvelles opérations, y compris lors d’une mise à jour
d’un service déjà ouvert. Prévenir les utilisateurs et planifier cette phase.
Les sondes vérifient `/health`, le bon SHA, les lectures publiques, le refus des
accès privés anonymes et l’absence de mode démo. `/ready` doit alors répondre
`503/not_ready`, et les capacités doivent déclarer le service fermé. Ce résultat
est un succès de **préparation**, pas une disponibilité de production.

Le résultat est enregistré dans `state/.../current.json` et
`state/.../releases/SHA40.json`. Les worktrees et les images précédentes restent
disponibles. Une erreur de construction, de CI, de sauvegarde, de migration ou
de smoke arrête la commande avec un code non nul. Une erreur après la bascule
est enregistrée comme une livraison fermée en échec ; elle n’est pas annoncée
comme une mise en service réussie.

Depuis un poste opérateur, les wrappers `release-staging.sh` et `release-prod.sh`
effectuent d’abord le contrôle CI puis lancent la préparation par SSH. Configurer
`MP2_SSH`, `MPP_REMOTE_CONTROL_DIR` et `MPP_REMOTE_CONFIG` si les valeurs par
défaut ne conviennent pas. Ils n’exécutent pas l’activation.

## 3. Recette et activation

Effectuer la recette contrôlée pendant la préparation. Les numéros autorisés
dans `LAUNCH_TEST_PHONES` doivent toujours fournir leur preuve OTP. Aucun
paiement de recette ne doit être déclenché à l’insu de son titulaire.

Dans la console d’administration, compléter les informations d’exploitation et
consigner les preuves de revue des données, des prestataires, de restauration,
de monitoring et des documents/règles. Ces validations sont liées au SHA et à
la configuration effective. Le moteur de readiness contrôle aussi les fonds
attestés, le catalogue, les notifications et l’état du worker.

```bash
node -- scripts/operations.mjs activate \
  --config /etc/monprofperso/backup-prod.env \
  --environment prod --sha SHA40 --confirm
```

L’activation relit la CI, vérifie que les images n’ont pas changé et demande un
preflight métier complet. Elle ouvre ensuite le service et exige un smoke avec
`/ready=200/ready`, le SHA attendu et `serviceOpen=true`. Si ce contrôle échoue,
elle relance l’API fermée et renvoie un échec. La dernière preuve de smoke est
conservée dans le journal de livraison.

La preuve de restauration locale produite pendant le développement **ne vaut
pas** validation d’une copie externe de production. La réception des messages,
les opérations des prestataires et la restauration R2 restent à prouver dans
les environnements concernés.

## 4. Sauvegarde chiffrée et cohérente

Créer explicitement un dépôt restic sur un stockage externe au disque/VPS
primaire. Conserver son mot de passe dans le fichier privé configuré et en
prévoir une récupération indépendante du serveur. Le script n’initialise pas
silencieusement un nouveau dépôt en cas de mauvaise configuration.

```bash
node -- scripts/run-env.mjs /etc/monprofperso/backup-prod.env -- restic init
node -- scripts/operations.mjs backup \
  --config /etc/monprofperso/backup-prod.env --environment prod
```

Une sauvegarde de production refuse un chemin local, une boucle locale ou une
URL d’exemple. L’opérateur doit encore vérifier que la destination appartient
effectivement à une infrastructure indépendante et que ses accès sont limités.
Les sauvegardes restic sont chiffrées ; TLS n’est jamais désactivé par ces outils.

Le déroulement est le suivant :

1. Le conteneur exporteur ouvre une transaction PostgreSQL en lecture seule avec
   snapshot stable et produit l’identifiant de `pg_export_snapshot()`.
2. `pg_dump -Fc --snapshot=...` lit exactement cet état, puis signale sa fin.
3. L’exporteur lit, dans le même snapshot, les clés des ressources, documents
   légaux actuels et historiques, besoins et pièces de candidature. Il copie
   tous les objets référencés ; les contenus BYTEA sont déjà dans le dump.
4. Le manifeste contient SHA256 et taille de chaque objet. `release.json`
   contient le SHA256 du dump, l’inventaire des migrations, les comptes de lignes
   et les révisions connues. Un objet absent ou un checksum incorrect bloque.
5. Une archive tar contrôlée est transmise à restic. Le marqueur de dernière
   sauvegarde n’est écrit qu’après une confirmation complète de restic.

Les répertoires temporaires sont en mode privé. Pour Docker/systemd, ils doivent
se trouver hors `/tmp` et `/var/tmp` afin d’être visibles du daemon malgré
`PrivateTmp`. Le défaut est `/var/lib/monprofperso/backup-tmp`. Un export incomplet
est nettoyé et ne met pas à jour le marqueur de réussite.

Une suppression ou un remplacement d’objet pendant l’export peut faire échouer
celui-ci : corriger la cause puis recommencer. Ne pas valider une sauvegarde
partielle. Choisir des objectifs de fréquence, de conservation et de reprise
adaptés au service ; l’exemple quotidien et le seuil de 26 heures sont des
paramètres à examiner, pas une garantie de perte maximale. Aucun `forget` ou
`prune` destructif n’est programmé par défaut.

## 5. Répéter une restauration sans écraser le service

Choisir explicitement un identifiant de snapshot restic. `latest` est refusé
pour éviter de restaurer une mauvaise génération par inadvertance.

```bash
node -- scripts/run-env.mjs /etc/monprofperso/backup-prod.env -- \
  restic snapshots --tag monprofperso,env:prod

node -- scripts/operations.mjs restore \
  --config /etc/monprofperso/backup-prod.env --environment prod \
  --snapshot IDENTIFIANT_RESTIC --target /var/lib/monprofperso/restore-2026-10-24

node -- scripts/operations.mjs restore-database \
  --config /etc/monprofperso/backup-prod.env --environment prod \
  --backup-dir /var/lib/monprofperso/restore-2026-10-24 \
  --target-database mpp_restore_exercice_20261024 --confirm-new-database
```

La cible fichier doit être neuve. L’archive est inspectée avant extraction :
seuls les fichiers attendus et le répertoire d’objets sont admis ; liens, chemins
arbitraires et doublons sont refusés. Les checksums sont vérifiés ensuite.

La cible PostgreSQL doit être une nouvelle base nommée `mpp_restore_...`, distincte
de toute base active. Le chemin standard utilise `compose exec db` et n’exige
aucun port PostgreSQL exposé. La restauration se fait en une transaction avec
arrêt sur erreur, puis contrôle l’historique des migrations et les nombres de
lignes du snapshot. Une base existante n’est jamais écrasée. Les fichiers
`archive-proof.json` et `database-proof.json` consignent les résultats.

Pour les objets S3/R2, utiliser une **configuration distincte visant un bucket
vide de restauration** et l’image de l’exporteur :

```bash
docker run --rm --env-file /etc/monprofperso/restore-objects.env \
  -v /var/lib/monprofperso/restore-2026-10-24:/backup:ro \
  monprofperso-api:SHA40 node dist/backupFiles.js restore-objects /backup \
  --confirm-empty-target
```

Ce programme vérifie le manifeste avant écriture, refuse un bucket non vide et
conserve les clés originales. Ce fichier utilise la syntaxe de `docker run
--env-file` (valeurs brutes sans enveloppe de guillemets), distincte du fichier
Compose. Ne pas démarrer l’API restaurée avec des workers, notifications ou
clés de paiement réels ; vérifier les documents et les parcours en isolation.
Après la recette, supprimer manuellement les ressources temporaires identifiées
et traiter la conservation des preuves selon la politique de l’exploitant.

## 6. Retour à une version précédente

```bash
node -- scripts/operations.mjs rollback \
  --config /etc/monprofperso/backup-prod.env --environment prod \
  --sha SHA40_PRECEDENT --confirm --confirm-schema-compatible \
  --reason 'Incident identifié et retour de code examiné'
```

Le retour vérifie les images enregistrées et exige une correspondance **exacte**
des migrations appliquées avec la version cible. Il sauvegarde l’état courant,
relance l’ancien code fermé et effectue un smoke de préparation. Il faut ensuite
réexaminer les validations et activer. Si le schéma diffère, il s’arrête avec le
code `78` ; un opérateur doit préparer et tester une procédure spécifique.

Il n’y a aucune migration descendante ni restauration automatique de la base
active. Une restauration peut supprimer des transactions intervenues après la
sauvegarde ; elle exige donc une décision séparée, un rapprochement des
prestataires et une procédure d’incident explicite. Les sauvegardes, journaux et
versions précédentes ne sont pas supprimés par les scripts de livraison.

## 7. Planifier et surveiller

Les modèles `scripts/systemd/monprofperso-backup@.*` et
`monprofperso-monitor@.*` sont fournis sans installation. Adapter les droits et
chemins, les faire relire, puis les installer et activer les instances choisies
(`prod`, `staging`). Le backup est proposé chaque jour ; le monitor vérifie
environ chaque minute.

Le monitor vérifie le web, `/health`, `/ready` et l’âge de la dernière sauvegarde
confirmée. Il contrôle que l’identifiant enregistré existe encore dans restic.
Une sauvegarde locale de répétition ne satisfait pas la sonde de production.
Un code non nul doit être pris en charge par le responsable d’exploitation.

Les alertes n’envoient un message que si `MONITOR_ALERTS_ENABLED=true` **et**
`ALERT_WEBHOOK_URL` est renseigné. Le message contient l’environnement et les
sondes en défaut, sans données d’élèves ni secrets. Les alertes identiques sont
espacées ; le rétablissement est signalé après une alerte. L’absence de
destination configurée produit des logs et un état d’échec, sans inventer une
notification envoyée. Une préparation fermée déclenche normalement la sonde
readiness : coordonner la fenêtre de maintenance avec l’astreinte.

Installer aussi une sonde depuis une infrastructure indépendante : un timer
sur le VPS ne peut pas alerter si tout ce VPS est arrêté. Tester la réception et
la prise en charge d’une alerte avant de valider le contrôle `monitoring`.

## 8. Vérifications réalisées et limites

Les tests `node --test scripts/test/operations.test.mjs` couvrent la configuration
littérale, les formes Compose ambiguës, le SHA/CI exact, les verrous concurrents,
le refus de retour sur schéma différent, les archives incomplètes ou avec liens,
les checksums, le smoke fermé/ouvert et l’absence de fausse alerte envoyée.

Le 24 octobre 2026, `scripts/test/backup-rehearsal.mjs` a créé deux bases locales
isolées, appliqué 39 migrations, chiffré une sauvegarde avec restic, exécuté
`restic check --read-data`, extrait puis restauré le dump. Une modification BYTEA
et une insertion utilisateur ont été réalisées après ouverture du snapshot et
avant `pg_dump` : la base restaurée contient les octets et le nombre de lignes
antérieurs. Deux versions PDF légales ont aussi été conservées. Les deux bases
temporaires ont été nettoyées après vérification.

Cette répétition utilisait un dépôt restic local et aucun objet S3 (`external=false`,
`objectCount=0`). Elle ne prouve ni l’accès au stockage externe final, ni une
restauration R2, ni la disponibilité du VPS. Aucun déploiement distant, paiement,
remboursement, versement ou message réel n’a été effectué pendant ces tests.
