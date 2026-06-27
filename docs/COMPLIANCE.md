# Conformité & cadre légal — Mon Prof Perso (Côte d'Ivoire)

Notes d'ingénierie tirées des documents officiels rangés dans `docs/legal/`.
**Ce n'est pas un avis juridique** : à valider avec un conseil/notaire et l'ARTCI
avant mise en production. Objectif : que l'architecture technique anticipe les
obligations légales ivoiriennes plutôt que de les découvrir en prod.

## Documents de référence (`docs/legal/`)
- **CEPICI — `CEPICI-creation-entreprise-SAS.pdf`** : liste des pièces et frais
  pour créer la société (personne morale, SAS au capital < 10 000 000 FCFA). Volet
  **constitution d'entreprise** (RCCM, statuts notariés, siège, CNPS, Identifiant
  Unique). Sans impact technique direct, mais conditionne l'existence légale de
  l'exploitant (responsable de traitement).
- **ARTCI — `ARTCI-transfert-donnees-hors-CEDEAO.pdf`** : formulaire de
  **demande de transfert de données hors espace CEDEAO**, au titre de la
  **Loi N°2013-450 du 19 juin 2013** relative à la protection des données à
  caractère personnel. Volet **protection des données** — directement lié à
  l'architecture (hébergement, stockage fichiers, paiement).

## Pourquoi ça concerne ce dépôt
L'application traite des **données à caractère personnel**, dont certaines de
**mineurs** (les élèves) et des données financières :
- `users` (nom, téléphone, rôle), `courses`/`bookings` (élève, créneau, lieu),
- `progress_subjects` (résultats scolaires → données sur des mineurs),
- `transactions`, `payment_accounts` (Mobile Money → données financières),
- `resources` + fichiers (stockés sur **MinIO/S3**, cf. `api/src/storage.ts`).

L'exploitant est **responsable de traitement** au sens de la loi 2013-450 ;
l'ARTCI est l'autorité de contrôle.

## Obligations à anticiper (et leur traduction technique)

### 1. Localisation des données / transfert hors CEDEAO  ✅ décidé
La loi encadre le **transfert de données hors de l'espace CEDEAO**.
- **Décision projet** : l'API, Postgres **et** le stockage objet (MinIO/S3) sont
  hébergés **en Côte d'Ivoire** → **dans l'espace CEDEAO**. L'hébergement ne
  constitue donc **pas** un transfert hors CEDEAO ; aucune autorisation de
  transfert n'est requise pour l'hébergement lui-même.
- **Reste à surveiller** : tout **sous-traitant hors CEDEAO** introduit plus tard
  (notifications push Google FCM / Apple APNs, passerelle de paiement étrangère,
  e-mailing) **déclencherait** le formulaire ARTCI. Voir le formulaire pré-rempli
  `docs/legal/ARTCI-transfert-donnees-REMPLI.md`.
- **À la place** : prévoir une **déclaration/autorisation de traitement** ordinaire
  auprès de l'ARTCI (registre des traitements, section 3 ci-dessous).

### 2. Consentement (dont parental pour les mineurs)  ✅ socle en place
- **Implémenté** : à l'inscription, l'utilisateur accepte les CGU + politique de
  confidentialité (case obligatoire) ; un **consentement parental** est requis
  pour les comptes élèves. Tracé en base : `users.consent_version`,
  `users.consent_at`, `users.parental_consent` (migration `1700000008000`).
  Côté apps, l'écran d'inscription bloque la création tant que le consentement
  requis n'est pas donné (Android + iOS).
- **Textes** : brouillons rédigés dans `docs/legal/` — `CGU.md`,
  `POLITIQUE-CONFIDENTIALITE.md`, `MENTIONS-LEGALES.md` (à faire valider par un
  juriste). Gérables en **PDF via l'espace admin** : table `legal_documents`,
  endpoint `PUT /api/admin/legal/:slug`, écrans « Documents légaux » (Android + iOS),
  consultation utilisateur publique (`GET /api/legal`, `/api/legal/:slug/file`).
- **Lien depuis l'inscription** : sur l'écran d'inscription (Android + iOS), les
  mentions « Conditions d'utilisation » et « politique de confidentialité » sont
  **cliquables** et ouvrent le PDF publié (`/api/legal/{cgu,confidentialite}/file`).
  *(Tant qu'aucun PDF n'est téléversé via l'espace admin, le lien renvoie un 404.)*
- **Reste** : versionner via `CONSENT_VERSION` (`api/src/routes.ts`) pour
  re-solliciter à chaque révision.

### 3. Déclaration / autorisation des traitements auprès de l'ARTCI
- Recenser les **traitements** (authentification, réservation, paiement, suivi
  scolaire, support pédagogique) et leur **finalité**, **durée de conservation**,
  **destinataires** — exactement les rubriques du formulaire ARTCI.
- À tenir à jour dans un **registre des traitements** (peut vivre ici, en `docs/`).

### 4. Droits des personnes & sécurité
- **Droits** : accès, rectification, suppression → prévoir des endpoints/process
  (p. ex. export et suppression du compte et des données liées).
- **Sécurité** (déjà partiellement en place) : JWT signé, secrets en `.env`,
  scoping par utilisateur. À renforcer en prod : HTTPS, chiffrement au repos
  (Postgres + bucket), durées de conservation, journalisation des accès.

## Checklist prod (résumé)
- [ ] Société immatriculée (CEPICI) → responsable de traitement identifié.
- [x] Hébergement Postgres + stockage objet **en Côte d'Ivoire (CEDEAO)** →
      pas de transfert hors CEDEAO (décision projet).
- [x] Socle de consentement (CGU + confidentialité) + **consentement parental**
      pour les mineurs, tracé en base (migration `1700000008000`, apps câblées).
- [ ] Rédiger les CGU + politique de confidentialité réelles (texte juridique).
- [ ] Déclaration/autorisation de traitement auprès de l'ARTCI (registre).
- [ ] Process droits des personnes (accès / rectification / suppression).
- [ ] Politique de conservation + chiffrement au repos et en transit (prod).
- [ ] Si sous-traitant hors CEDEAO un jour : formulaire ARTCI
      (`ARTCI-transfert-donnees-REMPLI.md`).

## Marque
Le logo officiel (`docs/logo/mp2-logo.png`) — **« MP² » / « Un succès inévitable »**
— utilise le vert `#0E5A43` du design system (cohérent avec `CLAUDE.md`). À
décliner en icônes d'app (Play Store / App Store) lors de la Phase 4.
