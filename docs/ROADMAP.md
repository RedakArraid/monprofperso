# Roadmap — Mon Prof Perso

Feuille de route depuis le **prototype démo** vers une **mise en production**.
État au 2026-06-24 : 3 cibles synchronisées (Android, iOS, backend) sur une API
commune ; auth et paiement simulés ; repo en cours de premier versionnage.

## Phase 0 — Hygiène repo ✅ (en cours)
- [x] Premier commit + versionnage de l'existant.
- [x] `.gitignore` : ignorer `.kotlin/`, captures de dev racine `android/`,
      projet Xcode généré (`MonProfPerso.xcodeproj`), `_maquette/`, `*.zip`.
- [x] Créer un remote (GitHub) et push (`origin`, branche `feat/admin-space-apps`).

## Phase 1 — Durcir le backend (priorité haute)
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

## Phase 2 — Fonctionnel produit
- [~] Back-office d'administration. Fait côté **API** : rôle `admin` + garde
      `requireAdmin`, CRUD matières & niveaux (→ musique, langues hors FR/EN, niveaux
      supérieur/universitaire), ressources pédagogiques (cours/devoirs/exercices) avec
      upload de fichier. Fait côté **apps** : UI admin native Android + iOS (catalogue,
      ressources avec sélecteur de fichier natif, vue utilisateur lecture seule),
      rôle admin porté par le JWT et reflété dans « Mon compte ». Reste : auth admin
      dédiée, stockage fichiers durable (volume/S3 au lieu de BYTEA), rôles d'auteur
      (prof crée ses ressources).
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
- [ ] Réservation transactionnelle : conflits de créneaux, statuts, notifications.
- [ ] Espace prof complet : validation des demandes, calendrier, revenus réels.
- [ ] Notifications push (FCM Android / APNs iOS).

## Phase 3 — Qualité apps natives
- [ ] Brancher en live les écrans encore en repli local (Android + iOS).
- [ ] États réseau uniformes (loading / erreur / offline) des deux côtés.
- [ ] Tests UI de base + tests ViewModels (Android) / Stores (iOS).
- [ ] CI : lint + build des 3 cibles à chaque PR.

## Phase 4 — Mise en production
- [ ] Héberger l'API (conteneur managé) + Postgres managé, HTTPS.
- [ ] `ApiConfig` par environnement (dev / staging / prod) côté Android et iOS.
- [ ] Préparer les stores : icônes, signatures, fiches Play Store / App Store.
- [ ] Conformité données personnelles (mineurs → consentement parental).

## Séquencement conseillé
Phase 0 → Phase 1 **avant** d'ajouter des fonctionnalités (ne pas bâtir la Phase 2
sur une auth mockée), puis Phase 2/3 en parallèle, Phase 4 en dernier.
