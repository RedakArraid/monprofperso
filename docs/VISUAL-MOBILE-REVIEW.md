# Mon Prof Perso — revue visuelle et mobile

Mise à jour : **28 octobre 2026**. Périmètre : vitrine, administration, espace
React, Android et iOS, pour les parcours de cours individuels réellement activés.
Les corrections sont regroupées dans la [PR nº5](https://github.com/RedakArraid/monprofperso/pull/5).

## Résultat et limites de la validation

La revue a trouvé des défauts concrets et les a corrigés : contraste insuffisant,
contenu coupé avec de grandes polices, navigation trop large sur tablette,
formulaires peu accessibles au clavier, mauvaise distinction entre chargement,
liste vide et erreur, et retour Android intempestif à l’accueil après rotation.

La recette locale de la vitrine et de l’administration couvre **70 états et
21 contrôles d’interaction**, aux largeurs **320, 390, 768, 1024 et 1440 px**.
Elle ne détecte ni exception JavaScript, ni débordement horizontal de page,
ni violation parmi les règles axe exécutées. Neuf captures ont été inspectées.
Le [dossier de preuves public/admin](visual-evidence/public/README.md) conserve
les résultats, les captures et les empreintes des sources réellement contrôlées.

La recette de l’espace React passe **12 scénarios sur 12, sans nouvelle tentative**,
en environ 37 secondes sur l’environnement local. Elle contrôle les parcours parent
et professeur, les formulaires, les dialogues et leur focus, une réservation
à 320 px avec le texte calculé à 200 %, les états vides et les erreurs réseau.
Ses 51 contrôles axe ne détectent aucune violation.
Le [dossier de preuves de l’espace connecté](visual-evidence/webapp/README.md)
identifie les sources et les captures sélectionnées. Les 26 tests web existants,
le contrôle des types, le lint et le build passent également ; le lint conserve
les trois avertissements Fast Refresh préexistants.

Une [recette complémentaire WebKit](visual-evidence/webkit/README.md) passe
**six parcours mobiles sur six** en environ 22 secondes, à 320/390 px et avec
texte agrandi. Elle ne détecte aucune violation sur ses 26 contrôles axe.
L’inspection manuelle a aussi permis de corriger le texte trop pâle des champs
natifs date/heure. Ce contrôle du moteur WebKit sous Linux est ajouté à la CI ;
il ne représente pas un test Safari sur appareil physique.

Le [build Android local](visual-evidence/android/README.md) réussit en Debug,
compile le Kotlin Release et les tests instrumentés, et exécute **15 tests JVM
sans échec** sur les sources finales du premier commit natif.

Les jobs API et web du [run 40759860433 du commit `4601340`](https://github.com/RedakArraid/monprofperso/actions/runs/40759860433)
sont réussis. Le commit temporaire de fusion de la PR,
`b588991063075c916598bfa4572d896c27ea0505`, possède exactement le même arbre que
cette tête : `33c91b9b4300245381762bf040fba824c045964d`. La CI confirme
les **165 tests API**, **11 tests d’exploitation**, l’isolation Docker, les
**26 tests web existants**, les **12 parcours Chromium** et les **six parcours
WebKit**, avec zéro violation sur leurs **77 contrôles axe**.

Sur le **simulateur iPhone SE de troisième génération, iOS 26.4.1**, les
**11 tests unitaires et quatre parcours d’interface passent**, ces derniers en
252,423 secondes pour cette même révision. Les **28 captures produites** ont été
inspectées et représentent **27 images distinctes** : l’erreur Ressources et son
réessai donnent légitimement le même état visuel. Le parcours de
grande taille de texte AX XXXL vérifie le champ OTP entièrement au-dessus du
clavier avant de le toucher, puis utilise de vrais gestes horizontaux pour
atteindre le dernier onglet et revenir à l’accueil. Le stockage de session
utilise le vrai Keychain de l’application signée localement pour le simulateur.
Neuf originaux, dont les trois états Ressources, et le manifeste de toutes les
captures sont conservés dans le [dossier de preuves iOS](visual-evidence/ios/README.md).

Sur **Android 36, téléphone de 360 dp**, le [passage `6bd10c1`](https://github.com/RedakArraid/monprofperso/actions/runs/40756599455/job/123057065911)
réussit le parcours instrumenté en **78,572 secondes**. Les **23 captures sont
distinctes**, avec 23 métadonnées : la comparaison stricte de la fenêtre rendue
avec l’écran présenté a éliminé les anciennes frames du passage précédent.
Les rendus à 100 % et 200 % sont différents, le clavier reste visible sur les
captures prévues et le paysage n’a plus de bande noire. L’inspection de ces
images révèle encore trois détails : le contraste des icônes système sur
l’inscription, les mots coupés des onglets à 200 % et les dates des cours en attente.
Leur correction sera
vérifiée sur la révision suivante avant de conserver les preuves définitives.
Le [rapport Android par révision](../android/VISUAL-VALIDATION.md) détaille
les captures rejetées, la synchronisation et les résultats de chaque passage.

Le passage Android `4601340` compile et produit neuf images partielles. Le rail
agrandi affiche désormais les libellés entiers, mais le parcours s’arrête sur
une mesure sémantique inadaptée à la largeur non bornée du défilement dans
Compose 1.7.2. Le contrôle est corrigé avec les dimensions intrinsèques réelles,
la ligne complète et l’inclusion dans le viewport ; les gestes seront de nouveau
exécutés. La capture de l’inscription vérifie aussi les pixels réellement rendus
par SystemUI, car les flags de style pouvaient précéder leur présentation.

La revue des écrans accessibles depuis le compte a aussi trouvé, sur les deux
applications, trois ressources pédagogiques de démonstration utilisées à la
place d’une réponse vide ou d’une erreur. Ce repli est supprimé ; les nouveaux
parcours distinguent le vide, l’erreur et son réessai. Le contrat de fixture a
été vérifié localement : liste vide pour le compte 0198, HTTP 503 pour le compte
0199, après challenge et OTP. Le nouveau parcours iOS valide le filtre sélectionné,
l’absence des exemples, l’erreur et le réessai. Le parcours Android doit encore
être exécuté jusqu’à ces étapes après correction de son contrôle de navigation ;
le succès des captures antérieures ne lui est pas attribué.

Les premiers passages et leurs corrections restent traçables :

| Révision | Résultat utile et correction |
| --- | --- |
| [`3539dc3`](https://github.com/RedakArraid/monprofperso/actions/runs/40745829826) | Android : navigation après OTP hors du thread principal, corrigée dans `NavActions`. iOS : vrai Keychain indisponible dans l’application non signée ; signature locale du simulateur ajoutée. |
| [`7d926c0`](https://github.com/RedakArraid/monprofperso/actions/runs/40749309467) | Parcours Android et iOS réussis. Collecte Android après désinstallation en échec : remplacée par la collecte UTP avant désinstallation. Les captures iOS ont conduit aux derniers correctifs de contraste et de grandes polices. |
| [`2c1b4c0`](https://github.com/RedakArraid/monprofperso/actions/runs/40752999558) | Quatre jobs réussis ; derniers parcours iOS et WebKit validés. Captures Android récupérées mais décalées : synchronisation de l’écran à vérifier. |
| [`6bd10c1`](https://github.com/RedakArraid/monprofperso/actions/runs/40756599455) | Parcours Android et collecte réussis, 23 PNG distincts avec correspondance exacte à la fenêtre. L’inspection permet d’identifier les derniers détails de barre système et de navigation agrandie. |
| [`4601340`](https://github.com/RedakArraid/monprofperso/actions/runs/40759860433) | iOS : 11 unitaires et quatre parcours UI réussis, dont les nouveaux états Ressources ; 28 captures inspectées. Android compile, mais s’arrête sur un faux positif de mesure du rail dans Compose 1.7.2 ; contrôle et synchronisation SystemUI corrigés, à revalider. |

Ces résultats ne sont pas une certification d’accessibilité ni une validation
sur tous les appareils. L’installation signée, VoiceOver/TalkBack, les claviers
constructeurs, Safari sur appareil physique, les liens de paiement externes,
les prestataires réels et la publication sur les boutiques demandent encore
leur recette dans l’environnement de livraison. Le déploiement effectif reste
suivi séparément dans [PRODUCTION-OPERATIONS.md](PRODUCTION-OPERATIONS.md).

## Corrections apportées

### Vitrine et administration

- Navigation compacte dès la largeur où les liens ne tiennent plus ; menus
  utilisables au clavier, fermeture avec Échap et retour du focus.
- Titre et actions principales présentés avant l’illustration sur téléphone.
- Contrastes renforcés, champs de 16 px sur mobile et boutons suffisamment grands.
- Erreurs de formulaires reliées aux champs, étapes et confirmations annoncées
  avec déplacement du focus au bon endroit.
- Dialogues admin natifs, contenu défilable, sélection et tableaux lisibles sur
  petit écran ; régions de tableaux accessibles au clavier.
- Polices Hanken Grotesk et Schibsted Grotesk servies depuis le projet, avec leurs
  licences OFL. Le chargement typographique ne dépend plus de Google Fonts.

### Espace connecté

- Connexion avec une vraie hiérarchie de titres, formulaire compact sur mobile,
  illustration sur ordinateur, état de chargement et réessai des canaux OTP.
- Accueils parent et professeur centrés sur les cours et les actions utiles,
  sans cartes de hauteur fixe qui coupent le contenu agrandi.
- Menu mobile dans un dialogue natif, navigation active annoncée, lien d’accès
  direct au contenu, retour visible sur les sous-pages, zones sûres et espace
  réservé selon la hauteur réelle des actions fixées en bas de page.
- Champs associés à leurs libellés, contraste des textes secondaires renforcé,
  boutons d’au moins 44 px et champs de 16 px sur téléphone.
- Texte natif date/heure lisible dans WebKit, avec les sélecteurs du navigateur
  et la saisie conservés.
- Version technique des documents conservée dans un détail dépliable ; sa valeur
  exacte continue d’être transmise au serveur pour le consentement.
- États chargement/vide/indisponible distincts ; aucune personne, cours, note ou
  transaction de secours n’est créé en cas d’échec réseau.
- Tableau des reversements accessible au clavier et indice de défilement mobile.
- Filtres, tri et détail des offres dans des dialogues nommés avec Échap et
  restitution du focus. Repères d’offres sur la carte nommés et activables au
  clavier ; cible 44 px. Le repère de départ ne masque plus une offre située dans
  la même commune. La carte respecte la hauteur de son panneau et sa légende.

### Android et iOS

- Accueils illustrés défilables, champs et actions accessibles quand le clavier
  est ouvert ; corrections pour grandes polices et petits écrans.
- Actions orange contrastées, textes secondaires plus contrastés et
  états sélectionnés annoncés dans la navigation.
- Zones de sécurité et barre système prises en compte sur Android ; destination
  conservée lors d’une rotation ou d’un changement de taille de police.
- Mutation de la navigation Android remise sur le thread principal après
  l’OTP et les retours réseau, à la suite d’un échec réellement observé
  dans le premier parcours instrumenté.
- Navigation iOS réalisée avec des boutons accessibles ; flux parent/professeur,
  compte et finances harmonisés. Le collage du préfixe ivoirien conserve les
  dix chiffres nationaux.
- Textes indicatifs, erreurs et sous-titres natifs plus contrastés ; libellés
  français des formats de cours. Les initiales décoratives et les pastilles
  de notification restent lisibles avec de grandes polices. Le nom complet
  conserve son agrandissement et le bouton annonce le nombre de notifications.
- Navigations agrandies défilables avec des libellés entiers et une vérification
  par gestes jusqu’au dernier onglet, puis retour à l’accueil ; taille de texte
  non plafonnée. Le contenu de connexion iOS reste dans sa zone défilable.
- Style des icônes système Android appliqué par la destination effectivement
  active après transition ; dates des cours en attente avec un orange plus
  contrasté sur leur fond clair.
- Ressources pédagogiques issues uniquement de l’API, sans exemples ajoutés en
  cas de vide ou de panne ; états explicites, réessai et filtres accessibles
  annonçant leur sélection.
- Apparence claire cohérente sur les écrans conçus avec la palette claire ; il
  n’est pas annoncé de thème sombre complet non implémenté.

Les versions restent **1.1.0 / build 3** sur les deux plateformes. Android cible
API 36, minimum API 24 ; iOS conserve le minimum 16. Les scripts et instructions de
signature sont dans les README natifs. Un nouveau dépôt sur les boutiques doit
respecter leur numérotation et les comptes de publication du propriétaire.

## Illustration intégrée

L’illustration a été produite avec **ImageGen**, à la demande de l’utilisateur,
puis optimisée pour chaque support. Elle représente une scène éditoriale
fictive d’accompagnement scolaire en Côte d’Ivoire. Elle ne remplace ni une
photographie de professeur, ni un avis ou une preuve de résultat scolaire.
Les textes et les boutons restent de vrais éléments d’interface.

| Support | Fichier | Dimensions | Taille |
| --- | --- | --- | --- |
| Web ordinateur/tablette | `web/assets/illustrations/learning-together.webp` | 1 200 × 900 | 68 014 octets |
| Web téléphone | `web/assets/illustrations/learning-together-small.webp` | 600 × 450 | 25 660 octets |
| Android | `android/app/src/main/res/drawable-nodpi/tutoring_hero.webp` | 960 × 720 | 49 380 octets |
| iOS | `LearningIllustration.imageset/LearningIllustration.jpg` | 960 × 720 | 60 966 octets |

L’image iOS remplace un PNG de 1 071 759 octets par un JPEG dont le rendu a été
inspecté, afin de limiter le poids de l’application et des transferts du dépôt.
La source générée mesurait 1448 × 1086. Aucun texte n’est inclus dans l’image :
les mêmes ressources servent aux formats mobiles et ordinateur.

### Prompt de génération

```text
Use case: illustration-story. Asset type: production website and native mobile onboarding illustration for Mon Prof Perso, a tutoring service in Côte d'Ivoire. Create one polished, original editorial illustration in a horizontal 4:3 composition. A warm, competent Black Ivorian female tutor with neat natural braids, in a forest green blouse, sits beside a Black Ivorian schoolgirl aged about 12 in a warm orange top. They work together at a simple light wood desk with an open notebook and a few books; the tutor gently points to the notebook while the student confidently writes with a pencil. The characters should be expressive, dignified, contemporary and anatomically natural. Calm friendly study room, very subtle plant and light geometric window shapes; avoid cultural stereotypes. Style: sophisticated flat editorial illustration with soft paper texture, clear silhouettes, restrained hand-drawn detail, elegant rounded forms, beautiful balanced negative space. Color palette: deep forest green #0E5A43, warm orange #E8722A, warm ivory #F5F2EB, muted sage and natural warm brown skin tones. The canvas background must be a consistent warm ivory #F5F2EB around all outer edges, so it blends into a UI card. Main scene centered and fully contained with generous margins, usable at small mobile size; nothing important near the crop edges. No text, no letters or numbers, no typography, no logos, no watermarks, no badges, no stars, no fake testimonial or score, no UI screenshot. This should feel trustworthy, welcoming and premium without looking corporate or childish. Final image intended as a reusable 4:3 raster asset.
```

## Reproduire les vérifications

### Espace React et tests existants

```sh
cd webapp
npm ci
npm run lint
npm test
npm run build
npx playwright install --with-deps chromium webkit
npm run test:visual
PLAYWRIGHT_JSON_OUTPUT_FILE=test-results/webkit-summary.json \
PLAYWRIGHT_HTML_OUTPUT_DIR=playwright-report-webkit \
npm run test:visual:webkit -- --output=test-results/webkit --reporter=list,json,html
```

Playwright démarre automatiquement le serveur local de fixtures et le site sur
les ports 8099 et 8095. Un marqueur explicite est exigé sur `/health`, et les appels
API distants sont refusés par la recette. Les données de recette ne font pas
partie de l’API déployée. Les 12 scénarios utilisent une connexion HTTP 202 puis la
saisie d’un code ; ils ne mettent pas directement un JWT dans le navigateur.

Le cas de détail d’offre fournit une opportunité synthétique uniquement au test
concerné, car la fixture commune fournit d’abord une réservation directe. Cette
substitution locale est documentée dans les tests. Elle ne crée pas un chemin
de secours dans le code de production.

Pour la vitrine et l’admin, démarrer séparément le serveur de fixtures et le site,
puis `npm run test:visual:public` dans `webapp/`. Les détails sont dans le dossier
de preuves public/admin. Les résultats complets sont générés dans
`webapp/test-results/`; le rapport Playwright va dans `webapp/playwright-report/`.
`MPP_CHROME_EXECUTABLE` permet de choisir un navigateur déjà installé.

### Applications natives

Consulter [Android](../android/README.md) et [iOS](../ios/README.md).
La CI conserve les captures, rapports instrumentés et résultats Xcode pendant
14 jours. La fixture est réservée au développement local, refuse
`NODE_ENV=production`, écoute sur 127.0.0.1 et répond toujours 503 à `/ready`.
Elle ne constitue donc jamais une preuve de préparation de la production.

Inspecter les captures en plus des assertions : compilation, tests automatiques,
qualité visuelle sur les configurations testées et diffusion sur les boutiques
sont quatre validations distinctes.
