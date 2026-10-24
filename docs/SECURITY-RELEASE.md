# Sécurité et mise en service

État du lot préparé le 24 octobre 2026. Le workflow reste **dev → staging → main**.
L’API, le web, Android et iOS doivent être livrés avec le même contrat. Le guide
[PRODUCTION-OPERATIONS.md](PRODUCTION-OPERATIONS.md) décrit la préparation fermée,
l’ouverture explicite, la sauvegarde, la restauration et la supervision.

Les tests du dépôt constituent des preuves techniques. Ils ne remplacent pas
la recette des prestataires, l’examen des données existantes et la validation
des règles commerciales par l’exploitant. Aucun déploiement sur le VPS ni
transfert financier réel n’est revendiqué par ce document.

## Périmètre livré

| Domaine | Comportement |
| --- | --- |
| Identité | Challenge OTP lié au compte avant JWT ; inscription différée ; téléphone prouvé ; email de connexion déjà vérifié ; quotas persistants ; rôle relu en base |
| Autorisations | Aucun compte anonyme de démonstration ; dossiers candidats privés ; contrôles parent/professeur/admin ; participation au cours distincte du rôle global du compte |
| Administration | Remplacement explicite du numéro administrateur seed avant démarrage exposé ; réauthentification récente pour les décisions sensibles |
| Réservation | Professeur actif réellement sélectionné ; dates et durée contrôlées ; tarif et commission figés côté serveur ; conflits de créneau refusés |
| Réalisation | Détail privé du rendez-vous, lien HTTPS de visio externe, report accepté par l’autre partie, annulation, comptes rendus, litiges, bilan pédagogique et avis liés au cours |
| Paiement | Accord du professeur et créneau futur requis ; aucun succès par absence de clé ; séparation test/live ; signature webhook et contrôle référence/montant/devise/domaine |
| Rapprochement | Reprise des réponses perdues ; intentions et verrous persistants ; écritures idempotentes ; preuve fournisseur indispensable aux fonds disponibles |
| Remboursement et reversement | Décision administrative tracée ; demande du professeur sur téléphone prouvé ; exécution dans la console prestataire puis confirmation par lecture de sa preuve ; montants réservés, versés et inversés distincts |
| Pertes et anomalies | Exception financière documentée et explicitement approuvée ; plafond lié aux fonds encaissés ; aucune transformation d’une simulation en recette disponible |
| Compte | Préférences transactionnelles, export personnel et documents, fermeture immédiate ou différée selon les obligations, retrait des données personnelles et reprise durable du nettoyage S3 |
| Consentement | Version affichée transmise par le client ; réacceptation explicite après changement ; archive des PDF et reçus successifs ; version du demandeur figée sur chaque nouveau cours |
| Notifications | Destinations vérifiées, préférences relues à l’envoi, contenu générique, reprises bornées ; rappels sans doublon, renouvelés après changement effectif du créneau |
| Livraison | Images API/web par SHA, environnement sans fixtures, contrôle des quatre jobs CI, sauvegarde avant migration, ouverture fermée par défaut, santé et préparation vérifiées séparément |

Les groupes, abonnements, parrainages et la messagerie ne sont pas ouverts
commercialement. Les capacités publiées les désactivent dans les clients.
Les lectures historiques conservées dans l’API ne constituent pas un mécanisme
d’achat. La visioconférence intégrée n’est pas fournie ; un lien de réunion
HTTPS peut être partagé aux participants autorisés.

## Configuration réelle requise

Les fichiers `backend/.env.production.example`, `.env.staging.example`,
`.env.backup.example` et `.env.monitor.example` donnent les clés attendues.
Les valeurs réelles restent hors Git.

| Configuration | Condition de mise en service |
| --- | --- |
| `POSTGRES_PASSWORD`, `JWT_SECRET` | Secrets propres à l’environnement ; secret JWT aléatoire d’au moins 32 caractères |
| `ADMIN_BOOTSTRAP_PHONE` | Numéro effectivement contrôlé et différent du seed ; utilisé si le seed est encore administrateur |
| `OTP_*` | Fournisseur WhatsApp et session opérationnels avant la première connexion administrateur ; les variables surchargent les réglages de la console |
| `PAYSTACK_SECRET_KEY` | `sk_test_…` en staging, `sk_live_…` en production ; l’absence de clé laisse le paiement indisponible |
| `TRUST_PROXY` | Adresses ou CIDR des proxies réellement utilisés ; aucune confiance globale dans les en-têtes entrants |
| `S3_*` | Bucket et accès propres à l’environnement si le stockage objet est utilisé ; sinon les fichiers sont conservés en BYTEA |
| `PUBLIC_WEB_URL`, `CORS_ALLOWED_ORIGINS` | URL HTTPS et origines réellement servies |
| `RELEASE_SHA` | SHA Git complet livré et contrôlé par la CI |
| `SERVICE_OPEN` | `false` pendant préparation et recette ; ouverture explicite seulement après validation |
| `LAUNCH_TEST_PHONES` | Liste limitée des comptes de recette avant ouverture ; aucun contournement de l’OTP ni simulation de paiement implicite |
| `NOTIFICATIONS_ENABLED`, `WORKER_ENABLED` | Envois transactionnels et worker activés après configuration et vérification ; suivi de son dernier cycle réussi |
| Exploitant et politiques | Identité, contact, hébergement, conservation, annulation, remboursement et reversement renseignés par l’exploitant |
| Documents | PDF effectifs et versions de CGU, confidentialité et mentions légales |
| Sauvegarde et alertes | Dépôt chiffré externe, secret de récupération conservé séparément, restauration répétée, destinataire et procédure d’alerte opérationnels |

`GET /health` vérifie l’accès à PostgreSQL. `GET /ready` exige les contrôles
de configuration, les tâches périodiques et l’ouverture du service. Dans
l’administration, les cinq validations `data_review`, `provider_e2e`,
`backup_restore`, `monitoring` et `legal_review` sont des déclarations documentées
de l’exploitant. Elles sont liées au SHA et à une empreinte de la configuration
effective ; changer un prestataire, le stockage ou une politique rend les
preuves précédentes caduques. L’empreinte ne révèle aucun secret.

Le blocage des nouvelles opérations laisse accessibles la connexion,
l’administration, l’export, les demandes de fermeture et la résolution des
obligations existantes. Les nouvelles inscriptions, réservations, demandes et
charges restent fermées tant que les conditions ne sont pas réunies.

## Migrations et historique existant

Chaque migration SQL est transactionnelle séparément. Une relance applique
uniquement les migrations restantes. Le numéro 30 est volontairement absent.

| Migration | Effet principal |
| --- | --- |
| 28 | Challenges OTP hachés, état de vérification et invalidation des anciens codes |
| 29 | Unicité des candidatures actives, documents BYTEA, durée et net horaire |
| 31 | Dates réelles, intégrité des paiements et lien comptable unique |
| 32 | Cycle du cours, reports, comptes rendus, avis, règlements et opérations financières |
| 33 | Fermeture et anonymisation des comptes, nettoyage durable et contrôles d’ouverture |
| 34 | Destinations vérifiées, préférences, file de notifications et rappels |
| 35 | Anomalies financières, inversion des reversements et exception de perte explicitement approuvée |
| 36 | Révision contractuelle et quotas persistants des formulaires publics |
| 37 | Historique des documents légaux |
| 38 | Empreinte de configuration associée aux validations d’exploitation |
| 39 | Registre des révisions acceptées, reçus de consentement et snapshot sur les nouveaux cours |

Une installation sans `DEMO_MODE=true` ne crée plus de professeurs, comptes
clients, cours, avis ni revenus de démonstration. Les catalogues de matières,
niveaux et programmes demeurent disponibles. Le seul compte initial est
l’administrateur technique dont le téléphone doit être remplacé au bootstrap.
Ce changement des scripts seed ne réexécute pas les anciennes migrations
d’une base existante.

Pour une base existante, effectuer la sauvegarde puis la migration sur une
copie isolée avant promotion. L’audit administrateur signale les signatures
connues de fixtures et les cours payés sans preuve d’encaissement. Il ne supprime
aucune donnée automatiquement et ne peut détecter toute donnée de test créée
manuellement.

La migration 29 refuse les candidatures actives en doublon. Les identifier
sans exposer leurs pièces ou notes :

```sql
SELECT phone, array_agg(id ORDER BY id) AS application_ids, count(*)
FROM teacher_applications
WHERE status IN ('pending','interview','test','training')
GROUP BY phone HAVING count(*) > 1;
```

Un responsable choisit le dossier actif avant relance. Les anciennes dates,
durées ou commissions ambiguës ne sont pas inventées. Les termes historiques
et paiements inconnus disposent d’actions administratives documentées. Un
ancien paiement marqué réussi ne devient disponible au professeur qu’après
confirmation de fonds par le prestataire. Une simulation peut être classée
comme non encaissée ; elle ne constitue jamais un revenu réel.

La fermeture retire les profils, données d’enfants et pièces personnelles.
Les références, montants, preuves financières et reçus nécessaires à la
traçabilité sont conservés suivant la politique que l’exploitant doit publier.
Les anciennes acceptations dont les PDF ne peuvent être identifiés gardent
`legal_revisions=NULL` : aucun historique juridique n’est reconstitué au hasard.

## Validation technique et limites

Avant publication du lot : **164 tests API**, **26 tests web** et **15 tests JVM
Android** ont passé localement. La compilation TypeScript, le build Vite,
la compilation Android Debug et le code Release sont vérifiés. Le lint web
ne produit aucune erreur, avec trois avertissements Fast Refresh. Les tests
du dernier commit publiés dans GitHub Actions sont la référence pour les
quatre plateformes, notamment la compilation SwiftUI et les XCTest sur macOS.

La recette Chromium locale a couvert les trois rôles, réservation, paiement
simulé avec écran OTP, report bilatéral, comptes rendus, bilan, avis, opérations
financières de fixture, consentement, export et fermeture. Elle a aussi vérifié
l’affichage mobile et le cas d’un payeur devenu professeur. Les simulations
restent explicitement exclues du calcul des fonds réels.

Les tests des scripts couvrent notamment le SHA CI exact, les jobs manquants
ou ignorés, l’interdiction de retour sur schéma incompatible, les archives
incomplètes et altérées, les verrous d’exploitation et la distinction entre
sauvegarde locale de test et copie externe. Le résultat de la répétition de
restauration est décrit dans le guide d’exploitation.

La validation locale ne prouve pas la livraison d’un OTP sur le VPS,
l’encaissement bancaire, l’exécution d’un remboursement ou d’un reversement,
la réception d’une alerte ni le fonctionnement sur des téléphones physiques.
Les signatures Android/iOS, les déclarations stores et la recette sur appareils
restent associées aux comptes et configurations réels de l’exploitant.

Audit npm effectué le 24 octobre 2026 : web **0 alerte** ; backend **0 haute ou
critique, 4 modérées transitives** dans MinIO (`decode-uri-component`,
`query-string`, `stream-json` et MinIO par propagation). Les chemins de parsing
JSON de notifications MinIO concernés ne sont pas utilisés par les opérations
de stockage de cette application. Ces alertes restent à suivre ; elles ne sont
pas présentées comme corrigées. Aucun downgrade ou remplacement majeur forcé
n’a été appliqué pour faire disparaître artificiellement l’audit.

Références du protocole financier :
[modes test/live](https://paystack.com/docs/api/authentication/),
[vérification de transaction](https://paystack.com/docs/api/transaction/),
[charge en attente](https://paystack.com/docs/api/charge/#check-pending-charge),
[remboursements](https://paystack.com/docs/api/refund/),
[reversements](https://paystack.com/docs/api/transfer/).
