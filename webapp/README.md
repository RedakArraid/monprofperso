# Espace web React (Vite + shadcn-style)

Application utilisateur Mon Prof Perso : React 19, Vite, Tailwind 4, composants
style shadcn, charte MP² (vert `#0E5A43`, orange `#E8722A`).

## Dev local

```bash
# API
cd backend && docker compose up -d

# App
cd webapp && npm ci && npm run dev
# → http://localhost:5173/espace/
```

Le proxy Vite renvoie `/api` vers `http://localhost:8099`.

## Build (servi par nginx sous `/espace/`)

```bash
cd webapp && npm run build
# → sortie dans web/espace/
```

Puis `http://localhost:8095/espace/` (service docker `web`).

## Auth

- Login : `/espace/#/login` (ou `/connexion.html` qui redirige)
- JWT `mpp_user_jwt` (identique à l’ancienne SPA vanilla)
- Admin → redirect `/admin/`


## Contrats et validation

Node.js 24 est requis. `npm test` exécute les tests des transitions OTP/paiement,
de l’isolation de la reprise de paiement, des champs du formulaire et des textes
DOM de la carte. `npm run lint` et `npm run build` complètent ces contrôles.

Une réponse d’authentification HTTP 202 ouvre la vérification du challenge.
Une réservation attend l’accord du professeur avant de proposer le paiement.
La confirmation exige simultanément `status: success` et `paid: true` de l’API.
Les états de chargement, panne et absence de données sont explicites.
