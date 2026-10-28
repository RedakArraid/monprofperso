# Page vitrine + espace utilisateur, Mon Prof Perso (web)

Site statique (HTML/CSS/JS, **sans build ni dépendance**) pour la vitrine, plus
espace utilisateur **React** (`webapp/`, Vite + Tailwind/shadcn) buildé dans
`web/espace/`.

```
web/
├── index.html           # vitrine (bouton « Se connecter » / « Mon espace »)
├── connexion.html       # redirect → /espace/#/login
├── espace/              # build React (généré par `cd webapp && npm run build`)
├── js/                  # main.js, api-client.js, besoin.js
├── admin/               # console admin
└── css/styles.css

webapp/                  # source Vite + React + composants style shadcn
```

## Espace utilisateur (`/espace/`)

- Source : `webapp/` (React 19, Tailwind 4, charte MP²)
- Build : `cd webapp && npm run build` → `web/espace/`
- Login : `/espace/#/login` ou `/connexion.html`
- JWT `mpp_user_jwt` ; admin → `/admin/`
- Chargement API, états vides et message d’indisponibilité avec réessai ; aucune donnée fictive en cas d’erreur réseau.

## Rendu et accessibilité

- La navigation publique passe en menu compact jusqu’à 1100 px. Le menu est
  utilisable au clavier, ferme avec Échap et restitue le focus au bouton.
- Les formulaires gardent des champs de 16 px sur téléphone et des cibles
  tactiles d’au moins 44 px pour les actions principales. Les erreurs sont
  annoncées et le premier champ concerné reçoit le focus.
- L’administration utilise des dialogues natifs pour conserver le focus dans
  la fenêtre ouverte. Les tableaux larges défilent dans leur propre région,
  accessible au clavier, sans élargir toute la page.
- Les polices Hanken Grotesk et Schibsted Grotesk sont servies depuis
  `assets/fonts/` via `css/fonts.css`, avec `font-display: swap`. Les licences
  SIL Open Font License sont conservées à côté des fichiers WOFF2.
- L’illustration d’accueil est une création éditoriale ; elle ne représente
  pas un professeur du catalogue. Les variantes WebP de 600 et 1200 px sont
  sélectionnées avec `srcset` et leurs dimensions réservent la place au
  chargement.

Les captures de recette utilisent une API locale de test, jamais des données
de familles réelles. La vérification automatisée de l’accessibilité complète
la recette au clavier et l’inspection des captures ; elle ne constitue pas
une certification ni une validation sur tous les appareils.

## Lancer en local

**Via docker compose** (recommandé, service `web`, nginx) :
```bash
cd webapp && npm run build
cd backend && docker compose up -d web   # → http://localhost:8095
```

**Dev hot-reload** :
```bash
cd webapp && npm run dev   # → http://localhost:5173/espace/
```

**Sans Docker** (n'importe quel serveur statique) :
```bash
cd web && python3 -m http.server 5050    # → http://localhost:5050
```

## Déployer
Hébergeable tel quel sur tout hébergement statique (Netlify, Vercel, GitHub Pages,
Nginx, un bucket…). Pointer la racine du site sur `web/`. Le script
`deploy-staging.sh` rebuild `webapp` si `npm` est disponible sur le VPS.

## À compléter avant publication
- **Liens des stores** : la vitrine propose actuellement l’espace web. Ajouter
  les liens Google Play / App Store seulement après publication effective des
  applications, avec leurs URL définitives.
- **Réseaux sociaux** : gérés via l'admin (`/api/settings`).
- **Liens légaux** : PDF gérés par l'admin (`/api/legal`).
