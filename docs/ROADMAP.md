# Roadmap, Mon Prof Perso

Feuille de route depuis le **prototype démo** vers une **mise en production**.
État au 2026-06-24 : 3 cibles synchronisées (Android, iOS, backend) sur une API
commune ; auth et paiement simulés ; repo en cours de premier versionnage.

## Phase 0, Hygiène repo ✅ (en cours)
- [x] Premier commit + versionnage de l'existant.
- [x] `.gitignore` : ignorer `.kotlin/`, captures de dev racine `android/`,
      projet Xcode généré (`MonProfPerso.xcodeproj`), `_maquette/`, `*.zip`.
- [x] Créer un remote (GitHub) et push (`origin`, branche `feat/admin-space-apps`).

## Phase 1, Durcir le backend (priorité haute)
Maillon faible : auth/paiement simulés. À traiter avant toute nouvelle feature.
- [x] JWT signé (HS256, `auth.ts`) émis à la connexion + middleware `optionalAuth`
      rétrocompatible (repli `DEMO_USER` si pas de token). Scoping par `currentUserId`.
- [ ] OTP SMS réel (Orange/MTN CI) pour `verify-otp` (actuellement simulé).
- [x] Apps : envoyer l'en-tête `Authorization: Bearer` + stocker le token (Android/iOS).
      login/signup/verify-otp appellent réellement l'API, persistent le JWT
      (SharedPreferences / UserDefaults) et l'injectent sur tous les appels.
- [x] Secrets en variables d'environnement (`.env`), retirés du `docker-compose.yml`.
- [x] Validation des entrées (helper maison sans dépendance) sur les POST.
- [x] Migrations versionnées (node-pg-migrate, `api/migrations/*.sql`) appliquées
      automatiquement au démarrage, idempotentes. `init.sql` supprimé.
- [x] Tests d'intégration + e2e (runner natif Node, `api/test/*.test.mjs`, 40 tests ;
      e2e = parcours complets + isolation JWT ; admin = garde + CRUD + ressources).
- [x] Codes HTTP et logs standardisés (`api/src/http.ts`) : journalisation de chaque
      requête (`MÉTHODE chemin -> code durée`), 404 JSON cohérent pour les routes
      inconnues, filet d'erreurs (corps JSON illisible -> 400 `bad_json`, payload trop
      gros -> 413), et 500 sans fuite de détail interne (consigné côté serveur).

## Phase 2, Fonctionnel produit
- [~] Back-office d'administration. Fait côté **API** : rôle `admin` + garde
      `requireAdmin`, CRUD matières & niveaux (→ musique, langues hors FR/EN, niveaux
      supérieur/universitaire), ressources pédagogiques (cours/devoirs/exercices) avec
      upload de fichier. Fait côté **apps** : UI admin native Android + iOS (catalogue,
      ressources avec sélecteur de fichier natif, vue utilisateur lecture seule),
      rôle admin porté par le JWT et reflété dans « Mon compte ». Fait côté **infra** :
      stockage fichiers durable sur **MinIO** (S3-compatible, `api/src/storage.ts`,
      colonne `resources.storage_key`) avec repli `BYTEA`. Reste : auth admin dédiée,
      rôles d'auteur (prof crée ses ressources), bucket/credentials managés en prod.
- [x] Sortir les endpoints codés en dur vers la DB. `/subscription/mine`, `/referral`
      (user-scoped), puis espace prof (`/teacher/{dashboard,requests,earnings}` →
      `teacher_profiles`/`teacher_requests`/`teacher_earning_weeks`/`teacher_payouts`),
      comptes Mobile Money de `/wallet` (`payment_accounts`, user-scoped) et `program`
      des groupes (`group_programs`, par groupe). Migration `1700000004000`.
      Reste pour plus tard : scoper l'espace prof par compte (cf. multi-utilisateur).
- [ ] Paiement Mobile Money réel (Orange Money / MTN MoMo / Wave) + portefeuille.
- [~] Multi-utilisateur réel (parents / élèves / profs ; rôles déjà dans `users`).
      Entamé : `users.teacher_id` relie un compte prof à sa fiche `teachers`, l'espace
      prof (`/teacher/*`) est scopé sur le professeur connecté (migration `1700000005000`,
      isolation testée en e2e). Reste : scoper de même `/wallet`, demandes/cours liés
      au compte, et le parcours élève/parent multi-comptes.
- [~] Réservation transactionnelle : conflits de créneaux, statuts, notifications.
      Fait : statut d'acceptation (`courses.accepted`), une réservation naît en
      attente et remonte chez le prof concerné. Reste : conflits de créneaux,
      transaction de paiement, notifications.
- [~] Espace prof complet : validation des demandes, calendrier, revenus réels.
      Fait côté API : `/teacher/requests` reflète les vraies réservations + demandes
      de démo, `POST /teacher/requests/:id/accept` valide (isolé au prof concerné).
      Fait côté apps : espace prof (dashboard, demandes, revenus) **branché en live**
      sur Android + iOS, avec boutons « Accepter » / « Refuser » câblés
      (`/teacher/requests/:id/{accept,refuse}`) et repli mock. Reste : calendrier.
- [x] **Candidatures professeur** : table `teacher_applications`, soumission publique
      (`POST /api/teacher-applications` + statut par téléphone), validation admin
      (approve → crée `teachers` + compte `teacher`), console `/admin/` (liste/détail/
      fichiers), vitrine `web/devenir-prof.html`, écran app « Devenir professeur »
      (Android + iOS, 3 étapes + upload). Migration `1700000012000`, tests dédiés.
- [~] Notifications push (FCM Android / APNs iOS).
      Fait : notifications **in-app** persistées en base, le parent est notifié quand
      sa réservation est acceptée/refusée ; l'écran Notifications est branché en live
      (Android + iOS). Reste : le push réel (FCM/APNs).

## Phase 3, Qualité apps natives
- [~] Brancher en live les écrans encore en repli local (Android + iOS).
      Fait : espace prof (tableau de bord, demandes + validation, revenus), candidature
      prof (écran 29 « Devenir professeur »). Reste les écrans encore mockés (agenda,
      gestion de cours, réglages, etc.).
- [~] États réseau uniformes (loading / erreur / offline) des deux côtés.
      Fait : composants réutilisables `OfflineBanner` (bandeau « hors-ligne » +
      Réessayer, respectant le repli mock) et `LoadingRow`, appliqués aux écrans
      Notifications et Demandes prof (Android + iOS). Reste : généraliser aux autres
      écrans live.
- [ ] Tests UI de base + tests ViewModels (Android) / Stores (iOS).
- [ ] CI : lint + build des 3 cibles à chaque PR.

## Phase 4, Mise en production
- [~] Héberger l'API + Postgres + MinIO **en Côte d'Ivoire (CEDEAO)**, HTTPS.
      Prototype actuel sur VPS Contabo (Europe) ; cible et plan de migration :
      `docs/HOSTING.md`. Stack : **Docker Compose** (déjà en prod technique).
      Budget indicatif : `docs/BUDGET-LANCEMENT.md`.
- [ ] `ApiConfig` par environnement (dev / staging / prod) côté Android et iOS.
- [ ] Préparer les stores : icônes (logo MP², `docs/logo/`), signatures, fiches
      Play Store / App Store.
- [~] **Conformité données personnelles (Loi CI N°2013-450, ARTCI)**, voir
      `docs/COMPLIANCE.md` (analyse des pièces `docs/legal/`) :
      - [x] Hébergement Postgres **et** stockage objet (MinIO/S3) **en Côte d'Ivoire
            (CEDEAO)** → pas de transfert hors CEDEAO (décision projet).
      - [x] Socle de consentement (CGU + confidentialité) + **consentement parental**
            pour les élèves mineurs, tracé en base (migration `1700000008000`, apps).
      - [~] Rédiger les CGU + politique de confidentialité réelles : **brouillons**
            dans `docs/legal/` (CGU.md, POLITIQUE-CONFIDENTIALITE.md,
            MENTIONS-LEGALES.md), à faire valider par un juriste. Gérables en PDF
            via l'**espace admin** (table `legal_documents`, écran « Documents légaux »
            Android + iOS ; consultation utilisateur depuis « Mon compte »).
      - [ ] Faire valider les textes par un conseil juridique, puis publier les PDF.
      - [ ] Déclaration/autorisation de traitement auprès de l'ARTCI (registre).
      - [ ] Droits des personnes : accès / rectification / suppression du compte.
      - [ ] Chiffrement au repos (DB + bucket) et en transit, politique de conservation.
- [ ] Constitution de la société (CEPICI, cf. `docs/legal/`) → exploitant =
      responsable de traitement identifié.

## Séquencement conseillé
Phase 0 → Phase 1 **avant** d'ajouter des fonctionnalités (ne pas bâtir la Phase 2
sur une auth mockée), puis Phase 2/3 en parallèle, Phase 4 en dernier.
