# Page vitrine — Mon Prof Perso (web)

Site statique (HTML/CSS/JS, **sans build ni dépendance**) présentant le projet,
permettant de télécharger les applications et renvoyant vers les réseaux sociaux.

```
web/
├── index.html        # la page (sections : hero, fonctionnalités, étapes, pour qui, aperçu, téléchargement, footer)
├── css/styles.css    # design (charte MP² : vert #0E5A43, orange #E8722A, crème)
├── js/main.js        # menu mobile, apparition au défilement, mise en avant du store selon l'OS
└── assets/
    ├── mp2-logo.png
    └── screens/      # captures de l'app
```

## Lancer en local
Aucun build. Servez le dossier avec n'importe quel serveur statique :

```bash
cd web && python3 -m http.server 5050
# puis ouvrir http://localhost:5050
```

## Déployer
Hébergeable tel quel sur tout hébergement statique (Netlify, Vercel, GitHub Pages,
Nginx, un bucket…). Pointer la racine du site sur `web/`.

## À compléter avant publication
- **Liens des stores** : dans `index.html`, remplacer les `href="#"` (ou `#download`)
  des `.store-badge` par les URL Google Play / App Store réelles.
- **Réseaux sociaux** : dans le `<footer>`, remplacer les `href="#"` des `.social`
  (Facebook, Instagram, TikTok, WhatsApp, LinkedIn, X) par les vraies URL.
- **Liens légaux** : footer « Légal » — pointer vers les pages CGU / confidentialité /
  mentions publiées (textes sources dans `docs/legal/`).
