# Roadmap — Mon Prof Perso

Feuille de route depuis le **prototype démo** vers une **mise en production**.
État au 2026-06-24 : 3 cibles synchronisées (Android, iOS, backend) sur une API
commune ; auth et paiement simulés ; repo en cours de premier versionnage.

## Phase 0 — Hygiène repo ✅ (en cours)
- [x] Premier commit + versionnage de l'existant.
- [x] `.gitignore` : ignorer `.kotlin/`, captures de dev racine `android/`,
      projet Xcode généré (`MonProfPerso.xcodeproj`), `_maquette/`, `*.zip`.
- [ ] Créer un remote (GitHub) et push.

## Phase 1 — Durcir le backend (priorité haute)
Maillon faible : auth/paiement simulés. À traiter avant toute nouvelle feature.
- [x] JWT signé (HS256, `auth.ts`) émis à la connexion + middleware `optionalAuth`
      rétrocompatible (repli `DEMO_USER` si pas de token). Scoping par `currentUserId`.
- [ ] OTP SMS réel (Orange/MTN CI) pour `verify-otp` (actuellement simulé).
- [ ] Apps : envoyer l'en-tête `Authorization: Bearer` + stocker le token (Android/iOS).
- [x] Secrets en variables d'environnement (`.env`), retirés du `docker-compose.yml`.
- [x] Validation des entrées (helper maison sans dépendance) sur les POST.
- [x] Migrations versionnées (node-pg-migrate, `api/migrations/*.sql`) appliquées
      automatiquement au démarrage, idempotentes. `init.sql` supprimé.
- [x] Tests d'intégration (runner natif Node, `api/test/*.test.mjs`, 17 tests).
- [ ] Codes HTTP et logs standardisés.

## Phase 2 — Fonctionnel produit
- [ ] Paiement Mobile Money réel (Orange Money / MTN MoMo / Wave) + portefeuille.
- [ ] Multi-utilisateur réel (parents / élèves / profs ; rôles déjà dans `users`).
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
