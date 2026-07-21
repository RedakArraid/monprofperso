# Espace web React (Vite + shadcn-style)

Application utilisateur Mon Prof Perso : React 19, Vite, Tailwind 4, composants
style shadcn, charte MP² (vert `#0E5A43`, orange `#E8722A`).

## Dev local

```bash
# API
cd backend && docker compose up -d

# App
cd webapp && npm install && npm run dev
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
