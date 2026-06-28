# Hébergement, Mon Prof Perso — recommandations

Guide technique pour héberger la plateforme complète (API, base, fichiers, vitrine,
admin) en **Côte d'Ivoire**, conforme à la Loi N°2013-450 et aux mentions légales
du projet (`docs/COMPLIANCE.md`, `docs/legal/`).

> **État actuel (2026-06)** : prod/staging tournent sur un **VPS Contabo (Europe)**
> avec Docker + Traefik. C’est adapté au **prototype et aux tests**, mais **pas**
> à une mise en production légale revendiquant un hébergement en CI. La cible
> décrite ci-dessous est un **VPS ou cloud en Côte d'Ivoire (CEDEAO)**.

---

## 1. Ce qu’il faut héberger

| Composant | Rôle | Déjà dans le repo |
|-----------|------|-------------------|
| **API Node/Express** | Auth JWT, profs, cours, ressources, candidatures… | `backend/api/` |
| **PostgreSQL 16** | Données métier (23+ tables) | `docker-compose.prod.yml` |
| **Stockage fichiers** | PDF ressources, pièces candidatures prof | MinIO/S3 (`storage.ts`) |
| **Vitrine + admin web** | HTML statique + nginx | `web/` |
| **Reverse proxy + TLS** | HTTPS, routage domaines | Traefik (VPS actuel) |
| **Apps mobile** | Android / iOS | **Stores** (pas sur le VPS) |

Les apps mobiles ne s’hébergent pas sur le serveur : seules l’**API** et la **vitrine**
le sont. Les binaires vont sur Play Store / App Store.

---

## 2. Stack recommandée — **garder Docker Compose**

**Recommandation : oui à Docker**, pas besoin de Kubernetes pour cette phase.

Pourquoi Docker Compose convient :
- Déjà en place (`backend/docker-compose.yml`, `docker-compose.prod.yml`)
- Déploiement en une commande (`docker compose up -d --build`)
- Reproductible local → staging → prod
- Équipe réduite, coût maîtrisé

Architecture cible (identique à aujourd’hui, changement de **lieu** uniquement) :

```
Internet (HTTPS)
    ↓
Traefik ou Caddy (TLS Let's Encrypt)
    ↓
┌─────────────────────────────────────────┐
│  monprofperso-web (nginx)  → vitrine    │
│  monprofperso-api  (Node)  → /api       │
│  monprofperso-db   (Postgres 16)        │
│  minio (optionnel même VPS ou service)  │
└─────────────────────────────────────────┘
    réseau Docker interne (DB non exposée)
```

**À éviter pour l’instant** : Kubernetes, PaaS propriétaire sans Docker, hébergement
mutualisé PHP (pas adapté à Node + Postgres).

**Évolution plus tard** (Phase 4 ROADMAP, >10k utilisateurs actifs) :
- Postgres managé (backup automatique)
- Object storage managé (S3-compatible local)
- 2ᵉ instance API derrière le proxy (horizontal scaling)

---

## 3. Caractéristiques serveur conseillées

### Production (lancement → ~5 000 utilisateurs actifs)

| Ressource | Minimum | Confortable |
|-----------|---------|-------------|
| **vCPU** | 2 | **4** |
| **RAM** | 4 Go | **8 Go** |
| **Disque** | 40 Go SSD | **80–160 Go NVMe** |
| **Bande passante** | 100 Mbit/s | 1 Gbit/s |
| **OS** | Ubuntu 22.04/24.04 LTS | idem |
| **Sauvegardes** | quotidiennes, rétention 7–30 j | + copie hors site (2ᵉ DC) |

Répartition RAM indicative (8 Go) :
- PostgreSQL : ~2 Go
- API Node : ~512 Mo–1 Go
- MinIO + nginx : ~512 Mo
- Traefik + OS : ~1 Go
- marge pics / migrations : ~3 Go

### Staging (pré-prod)

| Ressource | Suffisant |
|-----------|-----------|
| vCPU | 2 |
| RAM | 4 Go |
| Disque | 40 Go SSD |

Peut être un **2ᵉ VPS** ou un **2ᵉ stack Docker** sur le même serveur prod
(comme aujourd’hui avec `monprofperso-staging`), avec **base séparée**.

### Développement local

Machine dev + `docker compose up` (déjà documenté dans `docs/WORKFLOW.md`).

---

## 4. Hébergeurs en Côte d'Ivoire — recommandations

Critères pour Mon Prof Perso :
1. **Datacenter en CI** (CEDEAO) — obligation projet / ARTCI
2. **VPS ou cloud avec accès root** (pour Docker)
3. **Support réactif** (Français)
4. **Sauvegardes** et disponibilité Tier III de préférence

### Recommandé en priorité

| Fournisseur | Offre | Intérêt |
|-------------|-------|---------|
| **[Hodi Côte d'Ivoire](https://hodi.host/ci/)** | VPS managé ou non, colocation VITIB Grand-Bassam (Tier III) | Datacenter **local**, prix en FCFA, support FR, sauvegarde 2ᵉ site — **meilleur rapport simplicité / conformité CI** pour une PME |
| **[ST Digital / CloudStore](https://stdigital.net/)** | IaaS cloud, DC Grand-Bassam (Tier III, 2025–2026) | Cloud **100 % africain**, montée en charge, contrat entreprise |

### Alternatives (colocation / plus gros volumes)

| Fournisseur | Usage |
|-------------|--------|
| **Equinix AB1** (ex-MainOne, Abidjan) | Colocation baie / serveur dédié — plutôt quand trafic très élevé |
| **Raxio CIV1** (Abidjan) | Idem colocation |
| **Orange Business / Cloud CI** | Grands comptes, cycle commercial long |

### Acceptable en **staging / dev uniquement**

| Fournisseur | Usage |
|-------------|--------|
| **Contabo, Hetzner, OVH** (Europe) | Staging, tests, démo — **ne pas** pour prod légale « données en CI » |
| **Cloudflare** | DNS + CDN **fichiers statiques** uniquement (vitrine) — l’API et Postgres restent en CI |

---

## 5. Plan de migration recommandé

### Phase A — Maintenant (prototype)
- Garder **Contabo** pour staging + prod technique
- Continuer le flux `dev` → `staging` → `prod` (`docs/WORKFLOW.md`)

### Phase B — Avant lancement public en CI
1. Louer un **VPS 4 vCPU / 8 Go** chez **Hodi** (ou ST Digital)
2. Installer Docker + Traefik (ou réutiliser le playbook du VPS actuel)
3. Copier `docker-compose.prod.yml`, `.env.production`, volumes Postgres
4. Pointer DNS `monprofperso.com` / `api.monprofperso.com` vers la **nouvelle IP CI**
5. Mettre à jour les **mentions légales** (`docs/legal/MENTIONS-LEGALES.md`) :
   nom hébergeur, adresse Abidjan/Grand-Bassam, contact
6. Déclaration / autorisation de traitement **ARTCI** (`docs/COMPLIANCE.md`)

### Phase C — Exploitation
- Sauvegardes : `pg_dump` quotidien + snapshot volume MinIO
- Monitoring : Uptime Kuma + alertes SMS/e-mail
- Secrets : `.env.production` hors Git, mots de passe forts, JWT rotatif

---

## 6. Coûts indicatifs (ordre de grandeur, 2026)

| Poste | Fourchette mensuelle |
|-------|----------------------|
| VPS prod CI (4 vCPU, 8 Go) | ~30 000 – 80 000 FCFA |
| VPS staging CI (2 vCPU, 4 Go) | ~15 000 – 40 000 FCFA |
| Nom de domaine `.com` | ~10 000 – 20 000 FCFA/an |
| Contabo staging (optionnel) | ~5–8 € |
| **Total démarrage** | **~50 000 – 120 000 FCFA/mois** |

Les apps stores (Google 25 $ une fois, Apple 99 $/an) sont en plus.

---

## 7. Checklist avant prod légale CI

- [ ] Serveur en **Côte d'Ivoire** (facture + adresse datacenter pour mentions légales)
- [ ] HTTPS partout (Traefik + Let's Encrypt)
- [ ] Postgres + MinIO **non exposés** sur Internet (réseau Docker interne)
- [ ] Sauvegardes testées (restauration au moins 1 fois)
- [ ] `.env.production` : `JWT_SECRET`, mots de passe DB, clés MinIO uniques
- [ ] OTP SMS + paiement Mobile Money réels (Phase 1 ROADMAP)
- [ ] Déclaration ARTCI + CGU/confidentialité à jour
- [ ] `./scripts/smoke.sh https://monprofperso.com` OK après bascule DNS

---

## 8. Résumé en une phrase

**Gardez Docker Compose**, visez un **VPS 4 vCPU / 8 Go / 80 Go SSD en datacenter
ivoirien (Hodi ou ST Digital)** pour la prod légale, laissez **Contabo** pour le
staging de développement, et migrez le DNS quand la conformité ARTCI est prête.
