# Rituel de développement, Mon Prof Perso

Trois branches longues sur GitHub : **`dev`** → **`staging`** → **`prod`**.

| Environnement | Branche | Où | URL |
|---------------|---------|-----|-----|
| **Local** | `dev` | Machine dev + `docker compose up` | `http://localhost:8095` (web), `http://localhost:8099` (API) |
| **Staging** | `staging` | VPS `/root/monprofperso-staging` | https://staging.monprofperso.com |
| **Production** | `prod` | VPS `/root/monprofperso` | https://monprofperso.com |

Ne jamais pousser directement sur `prod` sans passer par `staging`.

---

## 1. Développer en local (branche `dev`)

```bash
git checkout dev
git pull origin dev

# Backend + DB + vitrine
cd backend && docker compose up -d --build
# API  → http://localhost:8099
# Web  → http://localhost:8095
# Admin → http://localhost:8095/admin/

# Tests API (stack locale requise)
cd backend/api && npm test
```

Travailler, commiter, pousser sur **`dev`** :

```bash
git add …
git commit -m "feat: …"
git push origin dev
```

---

## 2. Tester en staging

Quand une itération est prête :

```bash
./scripts/release-staging.sh
```

Ce script :
1. Met à jour `dev`
2. Merge **`dev` → `staging`**
3. Push `staging` sur GitHub
4. SSH sur le VPS → pull `staging` → `docker compose` staging

**Vérifier manuellement :**
- https://staging.monprofperso.com/admin/ (login `+2250700000001`)
- Apps mobile pointant vers staging (si besoin, URL API staging)

**Smoke automatique :**

```bash
./scripts/smoke.sh https://staging.monprofperso.com
```

---

## 3. Mettre en production

Uniquement si staging est validé :

```bash
./scripts/release-prod.sh --yes
```

Ce script :
1. Met à jour `staging`
2. Merge **`staging` → `prod`**
3. Push `prod` sur GitHub
4. SSH sur le VPS → pull `prod` → `docker compose` prod

**Vérifier :**

```bash
./scripts/smoke.sh https://monprofperso.com
```

---

## Premier déploiement staging (une fois)

### DNS (A → IP VPS `178.238.229.159`)

- `staging.monprofperso.com`
- `staging-api.monprofperso.com`

Avec Cloudflare :

```bash
cd backend/scripts
CLOUDFLARE_API_TOKEN=… ./setup-cloudflare-dns.sh   # inclut staging
```

### Secrets sur le VPS

```bash
ssh vps-contabo
git clone git@github.com:RedakArraid/monprofperso.git /root/monprofperso-staging
cd /root/monprofperso-staging
git checkout staging
cp backend/.env.staging.example backend/.env.staging
# Éditer .env.staging (mots de passe, JWT, R2…)
```

Puis depuis la machine dev :

```bash
./scripts/release-staging.sh
```

---

## Récap des scripts

| Script | Où | Rôle |
|--------|-----|------|
| `scripts/release-staging.sh` | Local | dev → staging + deploy VPS |
| `scripts/release-prod.sh --yes` | Local | staging → prod + deploy VPS |
| `scripts/deploy-staging.sh` | VPS (ou via SSH) | Pull staging + compose up |
| `scripts/deploy-prod.sh` | VPS (ou via SSH) | Pull prod + compose up |
| `scripts/smoke.sh <url>` | Local ou VPS | Health + login admin |
| `deploy-monprofperso.sh` | VPS | Alias → `deploy-prod.sh` |

---

## Règles

- **`dev`** : intégration quotidienne, peut être instable.
- **`staging`** : pré-prod, base de données **séparée** (`monprofperso_staging`).
- **`prod`** : stable, déployée uniquement depuis `staging`.
- **`main`** : historique de référence, pas utilisée pour le déploiement.
