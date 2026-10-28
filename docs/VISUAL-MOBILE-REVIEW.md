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
en environ 31 secondes sur l’environnement local. Elle contrôle les parcours parent
et professeur, les formulaires, les dialogues et leur focus, une réservation
à 320 px avec le texte calculé à 200 %, les états vides et les erreurs réseau.
Le [dossier de preuves de l’espace connecté](visual-evidence/webapp/README.md)
identifie les sources et les captures sélectionnées. Les 26 tests web existants,
le contrôle des types, le lint et le build passent également ; le lint conserve
les trois avertissements Fast Refresh préexistants.

Le [build Android local](visual-evidence/android/README.md) réussit en Debug,
compile le Kotlin Release et les tests instrumentés, et exécute **15 tests JVM
sans échec** sur les sources finales du premier commit natif.

Les applications natives disposent maintenant de parcours instrumentés et de
captures produites sur émulateur ou simulateur. Leur résultat dépend de la CI
**du commit concerné** : consulter les jobs Android/iOS et leurs artefacts dans
la PR. Une capture de navigateur n’est pas une capture d’application native.
La première compilation et recette native de cette série est suivie dans le
[run40745829826](https://github.com/RedakArraid/monprofperso/actions/runs/40745829826)
du commit `3539dc3c74d9db160d52854bdf2e6723670c7828`.

Ce premier passage n’a pas validé les parcours natifs : Android a révélé une
mutation de navigation hors du thread principal après l’OTP ; iOS a compilé et
passé ses 11 tests unitaires, puis ses quatre parcours d’interface ont échoué
lors de l’enregistrement de la session dans le trousseau. Les captures iOS
confirment cette erreur ; l’application du simulateur était construite sans
signature. La navigation Android est corrigée et recompilée ; la recette iOS
utilise désormais une signature locale du simulateur (`CODE_SIGN_IDENTITY=-`).
Le vrai stockage Keychain est conservé. Un nouveau passage complet est requis
pour qualifier ces correctifs et inspecter les écrans après connexion.

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
- Texte sombre sur les actions orange, textes secondaires plus contrastés et
  états sélectionnés annoncés dans la navigation.
- Zones de sécurité et barre système prises en compte sur Android ; destination
  conservée lors d’une rotation ou d’un changement de taille de police.
- Mutation de la navigation Android remise sur le thread principal après
  l’OTP et les retours réseau, à la suite d’un échec réellement observé
  dans le premier parcours instrumenté.
- Navigation iOS réalisée avec des boutons accessibles ; flux parent/professeur,
  compte et finances harmonisés. Le collage du préfixe ivoirien conserve les
  dix chiffres nationaux.
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
npx playwright install --with-deps chromium
npm run test:visual
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
