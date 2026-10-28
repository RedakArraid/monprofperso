# Mon Prof Perso — iOS

Application Swift et SwiftUI pour iPhone (iOS 16+), reliée à l’API commune Android/web. Les services visibles correspondent aux capacités exposées par le serveur. Les prototypes de groupes, abonnements, chat et parrainage ne sont pas présentés comme des fonctions disponibles.

## Génération du projet

Le fichier `project.yml` est la source XcodeGen ; le projet Xcode généré n’est pas versionné.

```sh
brew install xcodegen
cd ios
xcodegen generate
open MonProfPerso.xcodeproj
```

Un Xcode actuellement accepté pour la soumission App Store est nécessaire pour une livraison. Les polices, l’icône AppIcon 1024 × 1024 opaque et le manifeste de confidentialité sont inclus dans les ressources du projet.

| Configuration | API par défaut | Identifiant |
| --- | --- | --- |
| Debug | `http://localhost:8099` | `ci.monprofperso.app.dev` |
| Staging | `https://staging-api.monprofperso.com` | `ci.monprofperso.app.staging` |
| Release | `https://api.monprofperso.com` | `ci.monprofperso.app` |

Les appels ajoutent `/api`. Le build setting `API_BASE_URL` remplace l’URL. HTTPS est exigé hors hôtes locaux, sans identifiants, requête ni fragment. Le scheme `MonProfPerso` exécute Debug et archive Release ; `MonProfPerso-Staging` utilise Staging. Une URL configurée ne confirme pas que le serveur a été déployé.

## Parcours opérationnels

`GET /api/capabilities` contrôle les options. En l’absence de réponse, les options non attestées restent désactivées. Le cours en ligne ouvre uniquement un lien HTTPS autorisé et enregistré dans le détail d’un vrai cours, si le service est activé côté serveur.

Le catalogue, la recherche et les avis utilisent les données de l’API. Les besoins permettent de choisir un enfant ou d’en créer un, d’accepter le tarif, d’annuler la recherche ou d’ouvrir le cours attribué. Le détail du cours propose les coordonnées privées autorisées, la planification et le report acceptés par l’autre partie, l’annulation motivée, puis la déclaration de réalisation, absence ou litige. Les bilans pédagogiques sont ceux saisis par le professeur.

Le paiement réutilise un cours accepté, planifié dans le futur et impayé. La confirmation attend la relecture du statut serveur. Les revenus du professeur séparent le prévisionnel, le dû, le disponible, les sommes réservées et celles effectivement versées. Les demandes de versement et remboursement utilisent une clé d’idempotence ; l’approbation d’une demande n’est pas présentée comme un mouvement d’argent réalisé. Un versement exige le numéro vérifié du compte et une session OTP de moins de 15 minutes.

L’écran **Mes données et mon compte** exporte les données JSON avec le sélecteur natif, règle les alertes transactionnelles WhatsApp/email et propose la suppression confirmée par `SUPPRIMER`. L’export et la suppression exigent une connexion récente. Une demande bloquée par des cours ou finances ouverts reste en attente et peut être retirée. La suppression clôt le compte, avec conservation des justificatifs requis selon la politique de confidentialité et nettoyage des fichiers qui peut être différé.

Les nouvelles vues sont regroupées dans `Screens/ProductionScreens.swift`. `Networking/ApiClient.swift` porte les contrats et `App/Router.swift` l’état et la navigation.

## Session et confidentialité

Login/signup reçoit un challenge serveur ; la vérification utilise `challengeId` + `code`. Une panne ne crée aucune session de démonstration. Le JWT et l’identité sont conservés dans Keychain, accessibles sur appareil déverrouillé et sans synchronisation iCloud. Les anciennes sessions UserDefaults sont supprimées, et `/api/me` valide la session restaurée. La déconnexion efface l’identité et la pile de navigation.

L’inscription et la candidature utilisent la version fournie par `/api/auth/otp-channels`, gardée dans l’écran lors de l’accord explicite. En cas de publication concurrente, les cases sont décochées et les conditions rechargées. Les paramètres proposent la réacceptation via `/api/account/consent`, avec un accès depuis les erreurs de réservation et paiement qui l’exigent. Le rôle de participation à chaque cours prime sur celui du compte, pour conserver le suivi des cours achetés avant ou après le passage au rôle professeur.

`Resources/PrivacyInfo.xcprivacy` déclare les données nécessaires aux comptes, cours, candidatures, paiements et demandes de support. L’accès à UserDefaults utilise le motif `CA92.1` pour les données propres à l’app. Il ne déclare pas de suivi publicitaire. Références Apple : [manifeste de confidentialité](https://developer.apple.com/documentation/bundleresources/adding-a-privacy-manifest-to-your-app-or-third-party-sdk) et [déclarations App Store](https://developer.apple.com/app-store/app-privacy-details/).

Le responsable de la publication doit vérifier ces déclarations avec les prestataires réellement configurés et renseigner App Store Connect. Le manifeste ne remplace pas les réponses de confidentialité de la fiche ni la politique applicable aux données des enfants.

## Tests sur macOS

```sh
cd ios
xcodegen generate
xcodebuild -list -project MonProfPerso.xcodeproj
xcodebuild test -project MonProfPerso.xcodeproj -scheme MonProfPerso \
  -destination 'platform=iOS Simulator,name=iPhone 16' \
  CODE_SIGNING_ALLOWED=YES CODE_SIGN_IDENTITY=-
```

Adapter le simulateur à ceux installés. `ApiClientTests` contrôle l’encodage des filtres et du préfixe ivoirien, l’éligibilité au paiement, les liens HTTPS, les demandes de suppression en attente, les montants de versement et les conditions financières manquantes d’un cours historique. Linux permet seulement une vérification des sources ; il ne compile pas SwiftUI et n’exécute pas ces tests.

## Archive et export de livraison

Configurer le compte Apple Developer et les certificats/profils de signature sur le Mac de publication. Fournir l’identifiant d’équipe dans `MPP_IOS_TEAM_ID`, puis lancer depuis `ios/` :

```sh
./scripts/archive-release.sh
```

Variables optionnelles : `MPP_IOS_API_URL` (HTTPS), `MPP_IOS_VERSION_NAME` (par défaut `1.1.0`) et `MPP_IOS_BUILD_NUMBER` (par défaut `3`). Le numéro de build doit augmenter à chaque envoi. Le script exige une équipe valide, génère le projet, archive Release et exporte localement vers `ios/build/`. Il ne téléverse rien vers App Store Connect.

La mise en diffusion nécessite encore les certificats et profils du propriétaire, les métadonnées et documents de confidentialité, les captures adaptées, les accès de revue et une validation des parcours sur appareils et préproduction. Une archive réussie ne prouve ni une validation App Review ni un paiement réel.


## Recette visuelle instrumentée

Le schéma Xcode `MonProfPerso-Visual` ajoute quatre parcours XCUITest aux tests
unitaires. Il capture les vraies vues du simulateur : accueil illustré,
connexion et OTP, parent, recherche, fiche, réservation, cours, compte,
confidentialité, professeur, revenus, grandes polices, état vide et erreur réseau.

Démarrer le serveur local depuis la racine dans un autre terminal :

```sh
MPP_VISUAL_FIXTURES=1 node scripts/visual/fixture-server.mjs
```

Puis, sur macOS, après avoir choisi un iPhone disponible avec
`xcrun simctl list devices available` :

```sh
cd ios
xcodegen generate
xcodebuild test -project MonProfPerso.xcodeproj -scheme MonProfPerso-Visual \
  -destination 'platform=iOS Simulator,name=iPhone 16' \
  -resultBundlePath build/visual.xcresult -parallel-testing-enabled NO \
  -test-timeouts-enabled YES -default-test-execution-time-allowance 300 \
  -maximum-test-execution-time-allowance 300 \
  CODE_SIGNING_ALLOWED=YES CODE_SIGN_IDENTITY=-
bash scripts/export-visual-captures.sh build/visual.xcresult build/visual-captures
```

La signature locale ad hoc du simulateur (`CODE_SIGN_IDENTITY=-`) préserve
l’exécution réelle du Keychain ; elle n’exige pas de certificat de publication.
La [première CI visuelle du candidat `3539dc3`](https://github.com/RedakArraid/monprofperso/actions/runs/40745829826)
a compilé l’application et réussi les 11 tests unitaires sur iPhone 17 Pro / iOS
26.4.1. Ses quatre parcours UI se sont arrêtés après l’OTP : les captures montrent
« La session n’a pas pu être enregistrée dans le trousseau » avec la signature
désactivée. Ces captures attestent seulement les écrans atteints, pas les parcours
connectés.

La [CI du candidat `7d926c0`](https://github.com/RedakArraid/monprofperso/actions/runs/40749309467)
a ensuite réussi les **11 tests unitaires et les quatre parcours XCUITest** sur
**iPhone SE de troisième génération / iOS 26.4.1**, avec le vrai Keychain et une
signature locale ad hoc. Les parcours UI ont duré 162,428 secondes. L’assertion
de visibilité du champ OTP a réussi avec le clavier logiciel ouvert et la taille
Dynamic Type `Accessibility XXXL`, avant tout tap ou défilement du test sur le
champ. Les 27 PNG exportés ont été inspectés : ils correspondent à 22 images
distinctes. Quatre pièces jointes portent à tort un nom `failure` car
`hasSucceeded` était lu avant la clôture du test ; leurs pixels sont identiques
aux captures de fin réussies. Le compteur d’échecs et d’exceptions
`totalFailureCount` remplace maintenant cette condition. Les deux captures de
détail de cours étaient aussi identiques ; la recette défile désormais jusqu’au
bouton du formulaire pour montrer les consignes et la planification, sans
modifier les données.

Cette inspection confirme le défilement de l’accueil hors de la barre système,
les écrans connectés et la distinction entre vide et indisponibilité. Elle a
également révélé des initiales tronquées dans l’avatar et une pastille de
notification trop agrandie, un texte indicatif OTP tronqué, des textes indicatifs
trop pâles, et le code `home` présenté dans une demande professeur. Le delta
suivant corrige ces points, limite le dessin de la connexion à sa zone défilable
et ajoute des gestes explicites dans le test de navigation agrandie jusqu’à
Compte puis Accueil. Les noms et textes de contenu conservent Dynamic Type ;
seuls les repères graphiques de l’avatar et de la pastille ont une taille fixe.

La [CI du candidat `2c1b4c0`](https://github.com/RedakArraid/monprofperso/actions/runs/40752999558)
a validé ces modifications : **11 tests unitaires et quatre parcours UI réussis**
sur iPhone SE de troisième génération / iOS 26.4.1, en 179,686 secondes pour les
parcours UI. Les **25 PNG distincts** ont été inspectés, y compris le clavier OTP
et le défilement de la navigation en Accessibility XXXL. Aucun nouveau défaut
de mise en page bloquant n’a été identifié sur ces captures. Les
[six PNG originaux et leur manifeste](../docs/visual-evidence/ios/README.md)
conservent la provenance exacte, les empreintes et la portée de cette validation.

Choisir un dossier `.xcresult` neuf à chaque exécution. La CI privilégie un
iPhone SE installé ou tente d’en créer un si ce type est disponible. Sinon,
elle utilise un iPhone installé et indique le modèle effectivement testé dans
le journal. Elle conserve les pièces jointes et exporte des PNG nommés.
La remise à zéro du trousseau pour ce parcours exige un build Debug, l’argument
explicite de test et une API locale ; aucune session n’est injectée et aucun
prestataire externe n’est contacté. Lire les captures produites avant validation.
Cette recette ne remplace pas les essais VoiceOver, clavier, installation signée
et retour des applications de paiement sur appareil physique.

### Ressources : états réels

L’écran accessible depuis **Compte → Ressources pédagogiques** remplaçait une
liste API vide ou une erreur par des exemples locaux. Ce repli est supprimé en
Debug comme en Release : chargement, résultat vide et erreur avec **Réessayer**
sont distincts, et seules les ressources reçues de l’API sont affichées. Les
filtres sont des boutons accessibles de 44 points minimum, avec sélection annoncée.
Le badge Devoir utilise `#A94713` sur `#FBE9DA` : contraste sRGB de **4,939:1**,
contre 2,586:1 avec l’orange décoratif précédent, pour son texte de 10,5 points.

Le parcours des comptes de recette `0700000198` et `0700000199` ajoute trois
captures prévues, sans création de ressource :

- `21-empty-resources` : réponse `200 []`, filtre Cours sélectionné et absence des anciens exemples.
- `22-unavailable-resources` : réponse `503`, message d’erreur et réessai accessible.
- `23-retry-resources` : après Réessayer, l’indisponibilité reste explicite et aucun exemple n’apparaît.

**Cette nouvelle révision doit réussir sa propre CI iOS et ses trois nouvelles
captures doivent être inspectées.** Les six preuves conservées du candidat
`2c1b4c0` restent attribuées à leur révision d’origine ; elles ne valident pas ce
correctif ultérieur.

### Contrastes mesurés

La revue du 28 octobre 2026 a renforcé les couleurs de petit texte. Le vert
`#0E5A43` et l’orange `#E8722A` de marque sont conservés. Les ratios ci-dessous
utilisent la luminance relative sRGB et la formule `(Lclair + 0,05) / (Lsombre + 0,05)`
du [critère WCAG 2.2 1.4.3](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html),
avec un objectif de **4,5:1** pour ces textes. Les valeurs affichées sont arrondies
à trois décimales ; la comparaison au seuil porte sur les valeurs non arrondies.

| Texte | Fond | Avant | Après | Ratio avant → après |
| --- | --- | --- | --- | --- |
| Sous-titre d’un rôle non sélectionné | Blanc à 10 % sur `#0E5A43` | `#C6DCD2` | `#E2EFE9` | 4,416 → **5,383** |
| Texte secondaire (`Ak.muted`) | Canvas `#F7F4EE` | `#67756D` | `#5B685F` | 4,406 → **5,328** |
| Texte secondaire | Champ `#F2EFE8` | `#67756D` | `#5B685F` | 4,212 → **5,094** |
| Texte secondaire | Blanc `#FFFFFF` | `#67756D` | `#5B685F` | 4,836 → **5,849** |
| Texte secondaire | Crème `#ECE7DE` | `#67756D` | `#5B685F` | 3,927 → **4,750** |
| Erreur (`Ak.danger`) | Canvas `#F7F4EE` | `#E0392B` | `#BF3326` | 3,994 → **5,147** |
| Erreur | Blanc `#FFFFFF` | `#E0392B` | `#BF3326` | 4,385 → **5,650** |
| Erreur | Crème `#ECE7DE` | `#E0392B` | `#BF3326` | 3,560 → **4,588** |
| Nombre de notifications | Orange `#E8722A` | `#FFFFFF` | `#18241E` | 3,056 → **5,246** |

La composition de la carte de rôle est calculée avant la luminance, sans arrondir
ses canaux (R 38,1 ; V 106,5 ; B 85,8 sur 255). `Ak.onGreenSoft` reste utilisé
directement sur le vert, où son ratio est de 5,686:1. Ces mesures portent sur les
couples de couleurs du code ; elles ne constituent pas un audit d’accessibilité
complet. Les textes indicatifs des champs communs utilisent désormais `Ak.muted`,
soit 5,849:1 sur blanc et 5,094:1 sur le fond de champ. La pastille est masquée
aux lecteurs d’écran, car le libellé du bouton annonce déjà le nombre réel de
notifications non lues. Le candidat `7d926c0` précède ces ajustements : ses captures
ne permettent pas de valider leur rendu après correction.
