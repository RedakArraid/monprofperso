# Budget de lancement — Mon Prof Perso (MP²)

Estimation **2026**, en **FCFA** (taux indicatif : 1 € ≈ 655 FCFA, 1 $ ≈ 600 FCFA).

Ce document couvre **tout ce qu’il faut pour passer du prototype actuel à un lancement
public légal en Côte d'Ivoire** : juridique, technique, conformité, stores, intégrations
et marketing de démarrage.

> **Hypothèse** : le produit logiciel (apps + API + admin) est déjà largement construit.
> Le budget distingue donc les **coûts restants avant ouverture** et les **coûts
> récurrents** (exploitation + acquisition).

---

## Vue d’ensemble — 3 scénarios

| | **Minimal** (bootstrap) | **Recommandé** | **Confortable** |
|---|--:|--:|--:|
| **One-shot (avant J0)** | ~1,0 M | ~2,5 M | ~5,5 M |
| **Récurrent / mois (M1–M6)** | ~200 k | ~550 k | ~1,3 M |
| **Total 6 premiers mois** | ~2,2 M | ~5,8 M | ~13,3 M |
| **Total 12 premiers mois** | ~3,4 M | ~9,1 M | ~21,3 M |

*Le minimal suppose beaucoup de travail en interne (pas de cabinet, pas de pub payante
massive). Le confortable inclut accompagnement pro et marketing actif.*

---

## 1. Création de la société (one-shot)

Obligatoire pour être **responsable de traitement** identifié (ARTCI, contrats, stores).

| Poste | Minimal | Recommandé | Confortable | Notes |
|-------|--------:|-----------:|------------:|-------|
| Frais CEPICI (SAS capital < 10 M) | 50 000 | 80 000 | 120 000 | Statuts notariés obligatoires pour SAS |
| Notaire / rédaction statuts | 150 000 | 300 000 | 500 000 | SAS = actes notariés |
| Domiciliation (12 mois) | 0* | 80 000 | 150 000 | *Si siège réel (bureau / domicile déclaré) |
| Capital social bloqué | 100 000 | 500 000 | 1 000 000 | Minimum légal faible ; crédibilité bancaire |
| Ouverture compte pro + frais bancaires | 25 000 | 75 000 | 150 000 | |
| Tampons, impressions, divers admin | 30 000 | 50 000 | 100 000 | |
| **Sous-total société** | **355 000** | **1 085 000** | **2 020 000** | Délai typique : 4–8 semaines |

**Forme conseillée** : **SAS** (flexible pour associés / investisseurs) ou **SARLU**
(moins cher en notaire si un seul associé). Voir `docs/COMPLIANCE.md` et
`docs/legal/CEPICI-creation-entreprise-SAS.pdf`.

---

## 2. Conformité & juridique (one-shot + récurrent)

| Poste | Minimal | Recommandé | Confortable | Notes |
|-------|--------:|-----------:|------------:|-------|
| Validation juridique CGU + confidentialité + mentions | 150 000 | 400 000 | 1 000 000 | Brouillons déjà dans `docs/legal/` |
| Déclaration / dossier ARTCI (traitement des données) | 0** | 150 000 | 350 000 | **Possible sans honoraires si dossier DIY |
| Registre des traitements (rédaction) | 0 | 100 000 | 200 000 | Peut rester interne |
| DPO externalisé (optionnel) | — | — | 150 000/mois | Utile si volume de données élevé |
| Assurance RC pro / cyber (optionnel) | — | 200 000/an | 500 000/an | Souvent exigée par partenaires B2B |
| **Sous-total conformité (one-shot)** | **150 000** | **650 000** | **1 550 000** | |

**Point ARTCI** : hébergement **en CI** (Hodi, ST Digital) → pas de formulaire de
transfert hors CEDEAO pour l’hébergement. En revanche, **FCM (Google)** et **APNs
(Apple)** pour le push = sous-traitants hors CEDEAO → dossier ARTCI spécifique si push
activé (`docs/COMPLIANCE.md`).

---

## 3. Infrastructure & hébergement

Référence détaillée : `docs/HOSTING.md`.

### One-shot

| Poste | Minimal | Recommandé | Confortable |
|-------|--------:|-----------:|------------:|
| Migration VPS Contabo → CI (temps / prestataire) | 0 (DIY) | 150 000 | 400 000 |
| Configuration sauvegardes + test restauration | 0 | 50 000 | 150 000 |
| Nom de domaine `.com` (1 an) | 12 000 | 15 000 | 20 000 |
| Certificats SSL | 0 | 0 | 0 | Let's Encrypt via Traefik |
| **Sous-total infra (one-shot)** | **12 000** | **215 000** | **570 000** |

### Récurrent / mois

| Poste | Minimal | Recommandé | Confortable |
|-------|--------:|-----------:|------------:|
| VPS **production CI** (4 vCPU, 8 Go, 80 Go SSD) | 35 000 | 55 000 | 80 000 | Hodi / ST Digital |
| **Staging** (Contabo EU ou petit VPS CI) | 4 000 | 25 000 | 40 000 | Contabo ~6 € suffit pour tests |
| Sauvegardes managées (option) | 0 | 15 000 | 30 000 | |
| DNS Cloudflare (gratuit) + e-mail pro (option) | 0 | 5 000 | 15 000 | Google Workspace / Zoho |
| Monitoring (Uptime Kuma self-hosted = 0) | 0 | 0 | 20 000 | Datadog / Better Stack si SaaS |
| **Sous-total infra / mois** | **39 000** | **100 000** | **185 000** |

**État actuel** : prod/staging sur Contabo (Europe) — **~4 000 FCFA/mois** déjà payé
via VPS partagé ; à **remplacer par prod CI** avant lancement légal.

---

## 4. Stores mobile (one-shot + récurrent)

| Poste | Minimal | Recommandé | Confortable | Notes |
|-------|--------:|-----------:|------------:|-------|
| Google Play Console | 15 000 | 15 000 | 15 000 | 25 $ **unique** |
| Apple Developer Program | 59 000 | 59 000 | 59 000 | 99 $ / **an** |
| Captures d’écran, fiches store, ASO | 0 | 150 000 | 400 000 | Logo MP² déjà dans `docs/logo/` |
| Compte développeur + soumission (prestation) | 0 | 300 000 | 600 000 | Si externalisation |
| **Sous-total stores (année 1)** | **74 000** | **524 000** | **1 074 000** | |

Les binaires Android/iOS ne génèrent **pas** de coût d’hébergement serveur.

---

## 5. Intégrations métier restantes (one-shot dev)

Items encore ouverts dans `docs/ROADMAP.md` (Phase 1–2).

| Poste | Minimal | Recommandé | Confortable | Notes |
|-------|--------:|-----------:|------------:|-------|
| OTP SMS réel (Orange / MTN / agrégateur) | 0* | 400 000 | 900 000 | *Si dev interne |
| Passerelle Mobile Money (CinetPay, Paystack CI, etc.) | 0* | 800 000 | 1 800 000 | Orange Money, MTN MoMo, Wave |
| Notifications push FCM + APNs | 0* | 350 000 | 700 000 | + dossier ARTCI transfert |
| Droits RGPD-like (export / suppression compte) | 0* | 250 000 | 500 000 | Obligation conformité |
| Durcissement prod (chiffrement repos, conservation) | 0* | 200 000 | 500 000 | |
| **Sous-total intégrations (one-shot)** | **0** | **2 000 000** | **4 400 000** | 0 = équipe interne |

### Coûts variables (après lancement)

| Poste | Ordre de grandeur |
|-------|-------------------|
| **SMS OTP** | ~20–35 FCFA / SMS → 500 inscriptions/mois ≈ **10–18 k FCFA/mois** |
| **Commission Mobile Money** | ~1,5–3 % du montant encaissé (+ frais fixe éventuel) |
| Exemple : 5 M FCFA GMV/mois | **75 000 – 150 000 FCFA/mois** de frais paiement |

---

## 6. Marketing & lancement (récurrent)

| Poste | Minimal | Recommandé | Confortable | Période |
|-------|--------:|-----------:|------------:|---------|
| Identité / supports print (flyers, affiches) | 50 000 | 200 000 | 500 000 | One-shot |
| Réseaux sociaux (Meta / TikTok ads) | 50 000/mois | 200 000/mois | 600 000/mois | M1–M3 puis ajuster |
| Influenceurs / édu-blogueurs CI | 0 | 300 000 | 1 000 000 | One-shot campagne |
| Google Ads (search local) | 0 | 100 000/mois | 300 000/mois | |
| Événement lancement (école, salon) | 0 | 500 000 | 2 000 000 | One-shot |
| Parrainage / crédits parrainage (produit) | 100 000 | 300 000 | 800 000 | Budget promo in-app |
| **Sous-total marketing M1–M3** | **250 000** | **1 500 000** | **5 100 000** | |

Le site vitrine et le formulaire « Devenir professeur » existent déjà — pas de refonte
à prévoir pour le lancement.

---

## 7. Exploitation & équipe (récurrent / mois)

| Poste | Minimal | Recommandé | Confortable |
|-------|--------:|-----------:|------------:|
| Expert-comptable | 50 000 | 100 000 | 200 000 |
| Support client (1 personne mi-temps) | 0 | 150 000 | 300 000 |
| Modération / validation candidatures prof | 0 | 75 000 | 150 000 | Peut être fondateur au début |
| CNPS + charges (si salarié) | — | ~80 000 | ~160 000 | ~21 % patronale indicative |
| Outils (Notion, Slack, etc.) | 0 | 15 000 | 40 000 |
| **Sous-total ops / mois** | **50 000** | **340 000** | **850 000** |

---

## 8. Synthèse par phase

### A. Avant le jour J (one-shot)

| Bloc | Minimal | Recommandé | Confortable |
|------|--------:|-----------:|------------:|
| Société (CEPICI) | 355 000 | 1 085 000 | 2 020 000 |
| Conformité & juridique | 150 000 | 650 000 | 1 550 000 |
| Infra (setup + domaine) | 12 000 | 215 000 | 570 000 |
| Stores (année 1) | 74 000 | 524 000 | 1 074 000 |
| Intégrations dev (SMS, paiement, push…) | 0 | 2 000 000 | 4 400 000 |
| Marketing one-shot | 50 000 | 1 000 000 | 3 300 000 |
| **TOTAL ONE-SHOT** | **641 000** | **5 474 000** | **12 914 000** |

*Arrondi « Recommandé » ≈ **5,5 M FCFA** (~8 400 €) avant le premier utilisateur payant.*

### B. Mois type après lancement (M1+)

| Bloc | Minimal | Recommandé | Confortable |
|------|--------:|-----------:|------------:|
| Hébergement | 39 000 | 100 000 | 185 000 |
| SMS + paiement (variable, faible volume) | 15 000 | 50 000 | 120 000 |
| Marketing récurrent | 50 000 | 200 000 | 600 000 |
| Ops & compta | 50 000 | 340 000 | 850 000 |
| **TOTAL / MOIS** | **154 000** | **690 000** | **1 755 000** |

---

## 9. Budget recommandé — détail des 6 premiers mois

Scénario **Recommandé** (lancement sérieux, conforme CI, intégrations externalisées
partiellement) :

| Mois | One-shot amorti | Récurrent | Cumul |
|------|----------------:|----------:|------:|
| Préparation (M-2 → M0) | 5 474 000 | 200 000 × 2 | 5 874 000 |
| M1 (lancement) | — | 690 000 | 6 564 000 |
| M2 | — | 690 000 | 7 254 000 |
| M3 | — | 690 000 | 7 944 000 |
| M4 | — | 550 000 | 8 494 000 |
| M5 | — | 550 000 | 9 044 000 |
| M6 | — | 550 000 | 9 594 000 |

**≈ 9,6 M FCFA sur 6 mois** (~14 600 €), hors capital social et hors salaire fondateur.

---

## 10. Ce qui est déjà « payé » (actifs existants)

À ne **pas** re-budgétiser :

| Actif | Valeur estimée évitée |
|-------|----------------------:|
| Apps Android + iOS (37 écrans, API live) | 8–15 M FCFA |
| Backend + admin web + vitrine | 3–6 M FCFA |
| VPS Contabo + domaine + déploiement CI/CD | ~50 k FCFA/mois déjà absorbé |
| Docs légales brouillons + socle consentement | ~500 k FCFA |
| Tests API (57 tests) | ~300 k FCFA |

Le **coût de reproduction** du prototype dépasse largement le **coût de lancement**
reste à financer.

---

## 11. Priorisation si budget serré (< 2 M FCFA)

Ordre strict :

1. **SAS/SARLU** + mentions légales validées (~500 k)
2. **VPS prod CI** + migration (~50 k/mois + 150 k setup)
3. **Validation juridique** CGU/confidentialité (~400 k)
4. **OTP SMS** + **Mobile Money** (indispensables au modèle économique)
5. **Google Play** (15 k) — iOS peut attendre si budget limité
6. **ARTCI** (dossier traitement)
7. Marketing (organic d’abord, pub payante ensuite)

Reporter : push notifications (rester in-app), assurance cyber, DPO, campagne influenceurs.

---

## 12. Hypothèses & réserves

- Montants **indicatifs** ; demander devis fermes à Hodi, CEPICI, notaire, agrégateur
  SMS et passerelle paiement.
- **TVA / taxes** : à clarifier avec expert-comptable (prestations numériques en CI).
- **Salaire fondateur** non inclus.
- **Commission profs** (modèle marketplace) : poste financier, pas coût de lancement.
- Prévoir **+15 %** de marge imprévus sur le scénario Recommandé → **~6,3 M one-shot**.

---

## Résumé en une phrase

Pour un lancement **légal et crédible en Côte d'Ivoire**, prévoyez **~5,5 M FCFA
one-shot** + **~550–700 k FCFA/mois** les 6 premiers mois (**~9,6 M FCFA au total**),
en capitalisant sur le prototype déjà construit ; le plan minimal tient autour de
**~2 M FCFA sur 6 mois** si tout est fait en interne et sans marketing payant.
