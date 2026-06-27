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

### 1. Localisation des données / transfert hors CEDEAO  ⚠️ priorité
La loi encadre le **transfert de données hors de l'espace CEDEAO**. Or
l'hébergement managé (API, Postgres, **bucket S3/MinIO**) est souvent hors
CEDEAO par défaut (UE/US).
- **Technique** : héberger Postgres **et** le stockage objet dans une région
  CEDEAO, ou chez un fournisseur présent dans la zone ; sinon déposer une
  **demande d'autorisation de transfert** à l'ARTCI (le formulaire `docs/legal/`)
  et documenter les garanties (chiffrement en transit/au repos, clauses
  contractuelles, durée de conservation).
- **Impact direct** : le service `minio` (cf. `CLAUDE.md` § Stockage fichiers) et
  le Postgres managé de la **Phase 4** doivent choisir leur région en conséquence.

### 2. Consentement (dont parental pour les mineurs)
- **Technique** : écran de **consentement** à l'inscription (CGU + politique de
  confidentialité), avec **consentement parental** quand le compte concerne un
  élève mineur. Tracer le consentement (date, version des CGU) côté `users`.
- Le formulaire ARTCI référence explicitement « Formulaire de recueil du
  consentement » / « Conditions générales d'utilisation » comme bases possibles.

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
- [ ] Hébergement Postgres + stockage objet **en zone CEDEAO**, sinon
      autorisation de transfert ARTCI obtenue.
- [ ] Écran de consentement (CGU + confidentialité) + **consentement parental**
      pour les mineurs, traçé en base.
- [ ] Registre des traitements (finalités, durées, destinataires).
- [ ] Process droits des personnes (accès / rectification / suppression).
- [ ] Politique de conservation + chiffrement au repos et en transit.

## Marque
Le logo officiel (`docs/logo/mp2-logo.png`) — **« MP² » / « Un succès inévitable »**
— utilise le vert `#0E5A43` du design system (cohérent avec `CLAUDE.md`). À
décliner en icônes d'app (Play Store / App Store) lors de la Phase 4.
