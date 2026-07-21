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
- Pattern live API + fallback hors-ligne

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
- **Liens des stores** : dans `index.html`, remplacer les `href="#"` (ou `#download`)
  des `.store-badge` par les URL Google Play / App Store réelles.
- **Réseaux sociaux** : gérés via l'admin (`/api/settings`).
- **Liens légaux** : PDF gérés par l'admin (`/api/legal`).
