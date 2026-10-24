# Mon Prof Perso, iOS (Swift + SwiftUI)

Application native iOS reproduisant fidèlement la maquette « Akwaba, Cours
particuliers » (soutien scolaire à domicile / en ligne en Côte d'Ivoire).

## Stack
- **Swift 5.9** · **SwiftUI** · `NavigationStack` (iOS 16+)
- Polices **Schibsted Grotesk** + **Hanken Grotesk** (bundlées, `UIAppFonts`)
- Icônes **SF Symbols** (équivalents des Phosphor de la maquette)

## Générer le projet Xcode
Le dépôt ne versionne pas le `.xcodeproj` (binaire). Deux options :

**A. XcodeGen (recommandé)**
```bash
brew install xcodegen      # si nécessaire
cd ios
xcodegen generate          # crée MonProfPerso.xcodeproj depuis project.yml
open MonProfPerso.xcodeproj
```

**B. Projet Xcode manuel**
1. Xcode → New Project → App (SwiftUI), nom « MonProfPerso ».
2. Glisser le dossier `MonProfPerso/` (App, Theme, Components, Screens, Resources)
   dans le projet (« Create groups »).
3. Vérifier que les `.ttf` de `Resources/Fonts` sont dans *Build Phases →
   Copy Bundle Resources* et listés dans `Info.plist` (clé `UIAppFonts`).
4. Ajouter le build setting `API_BASE_URL` (voir ci-dessous), utilisé par la clé
   `APIBaseURL` du plist.

## Environnements et session

`project.yml` définit trois configurations :

| Configuration | URL de base | Identifiant de l'app |
| --- | --- | --- |
| Debug | `http://localhost:8099` | `ci.monprofperso.app.dev` |
| Staging | `https://staging-api.monprofperso.com` | `ci.monprofperso.app.staging` |
| Release | `https://api.monprofperso.com` | `ci.monprofperso.app` |

Les appels ajoutent `/api` à cette base. Le scheme `MonProfPerso` utilise Debug
pour le simulateur et Release pour l'archive. `MonProfPerso-Staging` utilise la
préproduction. L'URL se surcharge avec le build setting `API_BASE_URL` ; HTTPS
est obligatoire en dehors de `localhost` et `127.0.0.1`.

Le JWT et l'identité associée sont conservés dans le Keychain, disponibles sur
l'appareil déverrouillé, sans synchronisation iCloud. Les environnements sont
isolés par leur identifiant. Les anciennes sessions du prototype stockées dans
UserDefaults sont supprimées ; une nouvelle connexion est nécessaire.

L'inscription et la connexion reçoivent un challenge serveur. L'écran OTP vérifie
`challengeId` + `code` et conserve le nouvel identifiant après un renvoi. Il ne
renvoie pas de code automatiquement à son ouverture. Une panne réseau ou des
canaux OTP indisponibles affichent une erreur. Seule une session vérifiée ouvre
l'espace utilisateur. Le raccourci administrateur de démonstration est réservé
aux builds Debug et à un serveur ayant explicitement activé la démo locale.

## Réserver et payer

La fiche conserve l'identifiant du professeur sélectionné. La réservation envoie
un créneau futur ISO 8601, choisi en heure de Côte d'Ivoire, et une durée. Le
serveur fixe le montant de la séance. Après l'envoi, le parent retrouve la demande
dans **Mes cours**. Le bouton **Payer ce cours** apparaît après acceptation du
professeur ; il réutilise le cours existant et son prix confirmé. La confirmation
de paiement dépend du statut serveur. Les besoins tarifés et les réservations
directes utilisent deux routes d'acceptation distinctes.

## Vérification sur macOS

Les tests `ApiClientTests` couvrent l'encodage des filtres et des numéros `+225`,
la conservation du zéro ivoirien et l'éligibilité d'un cours au paiement.

```bash
cd ios
xcodegen generate
xcodebuild -list -project MonProfPerso.xcodeproj
xcodebuild test -project MonProfPerso.xcodeproj -scheme MonProfPerso \
  -destination 'platform=iOS Simulator,name=iPhone 16' CODE_SIGNING_ALLOWED=NO
```

Adapter le nom du simulateur à ceux installés dans Xcode. Un environnement Linux
ne permet pas de compiler SwiftUI ni d'exécuter ces tests iOS.

## Architecture
```
MonProfPerso/
├── App/
│   ├── MonProfPersoApp.swift     # @main + NavigationStack + table de routage
│   ├── Router.swift        # Route (37 cas) + Router (pile) + onglets
│   └── Info.plist          # UIAppFonts, orientation
├── Theme/                  # Ak (couleurs), AkFont (typographie)
├── Components/             # AkScreen, boutons, chips, avatars, BottomNav, FlowLayout…
└── Screens/                # les 37 écrans, regroupés par étape (A→K)
    ├── AuthScreens.swift          # 1-4
    ├── FindScreens.swift          # 5-8
    ├── BookingScreens.swift       # 9-11
    ├── LearnScreens.swift         # 12-15
    ├── AccountScreens.swift       # 16-19
    ├── TeacherScreens.swift       # 20-22
    ├── SubscriptionScreens.swift  # 23-25
    ├── GroupScreens.swift         # 26-28
    ├── TeacherMgmtScreens.swift   # 29-30
    ├── ManageScreens.swift        # 31-33
    └── MiscScreens.swift          # 34-37
```

## Navigation
- Racine : **Bienvenue** → Inscription/Connexion → Accueil.
- Barres inférieures parent & professeur, écrans secondaires poussés sur la pile.
- L'« Espace professeur → » au bas de l'écran Compte ouvre le tableau de bord prof.
