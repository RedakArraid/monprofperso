# Page vitrine + espace utilisateur, Mon Prof Perso (web)

Site statique (HTML/CSS/JS, **sans build ni dépendance**) présentant le projet,
permettant de télécharger les applications, de se connecter et d'accéder à l'espace
utilisateur (parité avec les apps natives).

```
web/
├── index.html           # vitrine (bouton « Se connecter » / « Mon espace »)
├── connexion.html       # login, inscription, OTP → JWT `mpp_user_jwt`
├── js/
│   ├── main.js          # menu mobile, liens légaux, session utilisateur
│   └── api-client.js    # fetch + JWT partagé (vitrine, connexion, espace)
├── espace/              # SPA hash (`#/accueil`, `#/prof-espace`, …)
│   ├── index.html
│   ├── css/espace.css
│   └── js/              # router, auth, views (parent, prof, besoins…)
├── admin/               # console admin (`mpp_admin_jwt`)
├── css/styles.css
└── assets/
```

## Espace utilisateur (`/espace/`)

- **Connexion** : `/connexion.html` (POST `/api/auth/login` ou signup/OTP)
- **Parent** : bottom nav Accueil · Recherche · Cours · Progrès · Compte
- **Prof** : Tableau de bord · Demandes · Agenda · Revenus · Compte
- **Admin** : redirect `/admin/` après login (comme les apps)
- Pattern **live API + fallback** (`espace/js/fallback.js`) si l'API est injoignable

## Lancer en local
Aucun build. Deux options :

**Via docker compose** (recommandé, service `web`, nginx) :
```bash
cd backend && docker compose up -d web   # → http://localhost:8095
```
Le port est configurable via `WEB_PORT` dans `backend/.env`.

**Sans Docker** (n'importe quel serveur statique) :
```bash
cd web && python3 -m http.server 5050    # → http://localhost:5050
```

## Déployer
Hébergeable tel quel sur tout hébergement statique (Netlify, Vercel, GitHub Pages,
Nginx, un bucket…). Pointer la racine du site sur `web/`.

## À compléter avant publication
- **Liens des stores** : dans `index.html`, remplacer les `href="#"` (ou `#download`)
  des `.store-badge` par les URL Google Play / App Store réelles.
- **Réseaux sociaux** : dans le `<footer>`, remplacer les `href="#"` des `.social`
  (Facebook, Instagram, TikTok, WhatsApp, LinkedIn, X) par les vraies URL.
- **Liens légaux** : footer « Légal », pointer vers les pages CGU / confidentialité /
  mentions publiées (textes sources dans `docs/legal/`).
