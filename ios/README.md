# Mon Prof Perso — iOS (Swift + SwiftUI)

Application native iOS reproduisant fidèlement la maquette « Akwaba — Cours
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
