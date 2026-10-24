# Sécurisation et préparation de la mise en service

Cette correction est préparée depuis `dev`, révision
`9f118d1c2246b830142545f5ee8cfff8abf6dacb`. Le parcours de livraison reste
**dev → staging → main**. Les changements de contrat concernent simultanément
l’API, le web, Android et iOS.

## Changements livrés

| Domaine | Correction et comportement |
| --- | --- |
| Identité | Challenge OTP lié au compte avant JWT ; inscription différée ; email de connexion déjà vérifié ; ancien JWT invalidé ; destination masquée |
| Autorisations | Aucune identité anonyme de démonstration ; rôle relu en base ; fiche professeur liée obligatoire ; suivi candidat privé |
| Administrateur | Remplacement explicite du compte seed avant tout démarrage exposé |
| Réservation | Professeur sélectionné réellement utilisé ; date future ; tarif et durée calculés côté serveur ; conflit de créneau accepté refusé |
| Paiement | Acceptation préalable ; aucun succès simulé par absence de clé ; clés test/live séparées ; contrôle signature, référence, montant, devise et domaine |
| Concurrence | Une initiation en attente par cours ; réutilisation après réponse perdue ; une écriture comptable par nouveau paiement ; contrôle prestataire limité à une fois par dix secondes |
| Historique | Un webhook rejoué sur un ancien paiement finalisé ne recrée pas de dépense |
| Candidatures | Unicité du pipeline actif ; approbation transactionnelle ; notes internes exclues du suivi candidat |
| Documents | Correction du premier upload professeur ; repli BYTEA pour les besoins ; téléchargements privés ; contenu actif servi en pièce jointe avec nosniff et CSP sandbox |
| Web | Textes de carte construits par textContent ; états OTP/paiement distincts ; description conservée ; erreurs et états vides explicites |
| Mobile | Android Keystore/iOS Keychain ; URLs par environnement ; encodage des requêtes ; fin des connexions fictives après erreur ; réservation et paiement distincts |
| Livraison | Lockfile backend ; Node.js 24 ; npm ci ; conteneur API sans root ; CI API/web/Android/iOS ; health et smoke bloquants |

## Variables à préparer avant staging

Ne pas placer les secrets dans Git. Les fichiers d’exemple contiennent
uniquement les noms et des valeurs de remplacement.

| Variable | Règle |
| --- | --- |
| `JWT_SECRET` | Secret aléatoire d’au moins 32 caractères ; les valeurs locales connues sont refusées |
| `ADMIN_BOOTSTRAP_PHONE` | Numéro réellement contrôlé, différent du seed et libre ; nécessaire seulement si le compte seed est encore administrateur |
| `OTP_ENABLED` | `true` pour l’authentification réelle |
| `OTP_WHATSAPP_ENABLED` | `true` pour prouver le téléphone, notamment à l’inscription |
| `OTP_WHATSAPP_BASE_URL`, `OTP_WHATSAPP_SESSION_ID`, `OTP_WHATSAPP_API_KEY` | Fournisseur/session opérationnels avant la première connexion admin |
| `TRUST_PROXY` | Adresses ou CIDR exacts des reverse proxies fiables, séparés par des virgules |
| `PAYSTACK_SECRET_KEY` | Clé `sk_test_…` en staging ; `sk_live_…` en production |
| `S3_*` | Stockage objet, si utilisé ; sinon les nouveaux fichiers sont conservés en base |

Les Compose de staging et production forcent `NODE_ENV=production`,
`DEMO_MODE=false`, `PAYSTACK_MOCK=false` et leur propre `APP_ENV`.
Le backend refuse une clé de test sur l’environnement de production, et une
clé live sur le staging. Une clé manquante laisse le paiement indisponible (503).

Les variables `OTP_*` surchargent les réglages enregistrés dans l’administration.
Ce mécanisme permet de configurer l’OTP avant la première connexion. Retirer
une surcharge après le bootstrap si la configuration doit ensuite être gérée
depuis la console. L’authentification par email exige une adresse déjà vérifiée
pour le compte ; elle ne sert pas à prouver arbitrairement un autre téléphone.

Ne pas définir `TRUST_PROXY=true` ni une confiance inconditionnelle dans les
en-têtes entrants. Vérifier les réseaux Nginx/Traefik réels. Sans une valeur
adaptée, les quotas OTP risquent de regrouper tous les utilisateurs derrière
le proxy ; les Compose exposés refusent donc une valeur vide.

## Préparer les données et les migrations

Sauvegarder la base et les objets avant mise à niveau, puis répéter la migration
sur une copie de staging. Les migrations ajoutées sont :

- **28 — secure-auth** : challenges hachés, état de vérification email et invalidation des anciens codes.
- **29 — business-integrity** : unicité des candidatures actives, documents de besoins en BYTEA, durée numérique et net horaire corrigé.
- **31 — payment-integrity** : date réelle et durée des cours, lien comptable unique, version de l’historique et horodatage des vérifications prestataire.

Le trou de numérotation 30 est volontaire ; `node-pg-migrate` applique les
migrations présentes dans l’ordre.

Avant migration 29, identifier les doublons sans afficher les notes privées :

```sql
SELECT phone, array_agg(id ORDER BY id) AS application_ids, count(*)
FROM teacher_applications
WHERE status IN ('pending','interview','test','training')
GROUP BY phone HAVING count(*) > 1;
```

Choisir le dossier actif avec l’administration. La migration s’arrête sur
ces doublons plutôt que de rejeter automatiquement un dossier.
Chaque migration possède sa propre transaction : si 29 échoue, 28 reste
appliquée. Après résolution du doublon, une relance reprend 29 puis 31.
Les durées historiques invalides restent à corriger explicitement ; le code
ne les transforme plus silencieusement en une heure.
Les anciens cours gardent leurs dates numériques à NULL, faute de conversion
fiable depuis les libellés. Le contrôle de chevauchement couvre les créneaux
réellement datés ; compléter les anciens agendas avant d’y compter dessus.
Une pièce perdue avant cette correction ne peut pas être reconstruite.

Les paiements existants reçoivent `integrity_version=1`, les nouveaux `2`.
L’ancien registre ne contient pas de clé permettant de relier toutes les
transactions à un paiement avec certitude. Les succès historiques déjà
comptabilisés restent donc stables lors d’un rejeu de webhook. Réconcilier
séparément les paiements historiques, en particulier ceux qui auraient été
marqués payés par l’ancien mode simulé. Cette correction ne prétend pas
reconstituer de véritables encaissements à partir de données de démonstration.

## Vérification de staging et livraison

1. Construire et tester la branche avec les quatre jobs CI. Le build Android
   exige le SDK Android et les tests iOS exigent Xcode/macOS.
2. Préparer les secrets, le numéro administrateur et les proxies fiables.
3. Déployer sur staging avec sa base et son stockage distincts, puis exécuter
   `scripts/smoke.sh https://staging.monprofperso.com`.
4. Vérifier avec les configurations de test autorisées : réception OTP,
   création de compte, candidature, réservation datée, accord du professeur,
   paiement demandé/attendu/confirmé et réception d’un webhook.
5. Livrer les applications clientes compatibles avant d’exposer le nouveau
   contrat aux utilisateurs ; les anciennes sessions sont invalidées.
6. Après validation de staging, suivre le workflow de promotion vers `main`.

Le smoke ne se connecte pas comme administrateur et n’envoie pas d’OTP. Il
contrôle la santé, les pages, le catalogue, les refus anonymes et l’absence de
démo sur les URLs HTTPS. Les scripts de déploiement échouent si le build,
la santé de l’API ou le smoke échoue.

## Portée de la validation

La validation locale couvre compilation TypeScript, PostgreSQL réel temporaire,
scénarios auth avec fournisseur local simulé, concurrence, isolation des comptes,
documents, paiements et webhooks simulés, tests web, lint et build web.
Android a également des tests JVM sur les vrais modèles et aides de contrat.
Les fichiers Swift/Kotlin ont été analysés syntaxiquement.

Résultats locaux : 130 scénarios backend validés (suite complète de 129 puis
les 11 régressions de paiement incluant le dernier scénario ajouté), 9 tests
web et 6 tests JVM Android réussis. Compilation TypeScript et build Vite
réussis ; lint sans erreur, avec sept avertissements Fast Refresh. La montée
depuis les 28 migrations historiques jusqu’aux 31 présentes a été répétée,
ainsi que l’échec et la reprise sur doublons de candidatures. Aucun accès à une
base de production ni appel à un véritable prestataire n’a été effectué.

La validation locale ne prouve pas un encaissement bancaire, une livraison OTP
par le fournisseur configuré sur le VPS, ni l’exécution sur des téléphones
physiques. Ces essais doivent utiliser les accès et environnements prévus à cet effet.

Après mise à jour, `npm audit` web ne signale aucune vulnérabilité. Le backend
ne signale aucune vulnérabilité haute ou critique ; quatre alertes modérées
restent dans la chaîne MinIO 8.0.7 (`decode-uri-component`, `query-string`,
`stream-json`, et MinIO par propagation). Ne pas forcer le retour vers une
version ancienne proposé par audit ni remplacer un majeur transitif sans
vérifier son API. Le stockage courant utilise des objets binaires et les
opérations bucket/put/get/delete, pas le parseur de notifications JSON concerné.
Suivre les corrections amont et refaire l’audit lors de la livraison.

Références du protocole de paiement :
[modes test/live](https://paystack.com/docs/api/authentication/),
[vérification d’une transaction](https://paystack.com/docs/api/transaction/),
[contrôle d’une charge en attente](https://paystack.com/docs/api/charge/#check-pending-charge).
