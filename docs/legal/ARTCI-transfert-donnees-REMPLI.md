# Formulaire ARTCI, transfert de données hors CEDEAO (pré-rempli)

Transcription pré-remplie du formulaire officiel
`ARTCI-transfert-donnees-hors-CEDEAO.pdf` (Loi N°2013-450 du 19 juin 2013).
À reporter sur le PDF officiel, signer et tamponner. Les champs `⟨…⟩` sont à
compléter par l'exploitant (identité société/représentant).

> **Important, hébergement en Côte d'Ivoire.** L'API, la base PostgreSQL **et**
> le stockage objet (MinIO/S3) sont hébergés **en Côte d'Ivoire**, donc **dans
> l'espace CEDEAO**. L'hébergement lui-même **ne constitue donc pas un transfert
> hors CEDEAO** et ne requiert pas ce formulaire. Ce document n'est à déposer que
> si un **sous-traitant hors CEDEAO** est introduit (ex. notifications push
> Google FCM / Apple APNs, passerelle de paiement étrangère, e-mailing). Tant que
> tout reste hébergé en CI, c'est une **déclaration/autorisation de traitement**
> ordinaire auprès de l'ARTCI qui s'applique, pas un transfert.

---

## I, Identification du responsable de traitement
- Type : ☑ Personne Morale
- Nom / Raison sociale : ⟨raison sociale de la SAS, cf. immatriculation CEPICI⟩
- Sigle : MP² (Mon Prof Perso)
- Activité : Plateforme de mise en relation pour le soutien scolaire à domicile
  et en ligne (cours particuliers)
- Code activité : ⟨code APE/activité CEPICI⟩
- Adresse / Commune / Ville / Pays : ⟨siège social⟩, Abidjan, Côte d'Ivoire
- N° RC / Juridiction : ⟨N° RCCM⟩ / ⟨tribunal⟩
- Email / Tél : ⟨contact société⟩
- **Représentant légal** : ⟨nom, prénom, qualité, pièce d'identité, nationalité, contact⟩
- **Personne communiquant les données** : ⟨responsable technique / DPO⟩
- **Contact principal** : ⟨idem ou support⟩

## II, Identification du destinataire des données
*(à remplir uniquement en cas de transfert hors CEDEAO, un formulaire par destinataire)*
- Exemple si push notifications : Google LLC (FCM) / Apple Inc. (APNs), États-Unis.
- Type de destinataire : ☑ Sous-traitant
- Le pays destinataire dispose-t-il d'une autorité de contrôle : ⟨selon le pays⟩

## III, Description du fichier transféré
1. Nom du fichier : Base utilisateurs & activité « Mon Prof Perso »
2. Descriptif : comptes (parents, élèves, professeurs), réservations de cours,
   suivi pédagogique, notifications, transactions Mobile Money.
3. Nombre approximatif de personnes concernées : ⟨à estimer au lancement⟩
4. Mode de transfert : API HTTPS (TLS), au cas par cas selon le sous-traitant.
5. Finalité du transfert : ⟨ex. acheminement des notifications push⟩
6. Fréquence : ⟨ex. à l'événement (temps réel)⟩
7. Date du premier transfert : ⟨date de mise en service du sous-traitant⟩
8. Traitements effectués en Côte d'Ivoire : Authentification, réservation,
   suivi pédagogique, paiement, support pédagogique (N° récépissé/autorisation
   ARTCI : ⟨à obtenir⟩).

## IV, Consentement des personnes concernées
- Consentement recueilli : ☑ Oui
- Modalités : ☑ Formulaire de recueil du consentement ☑ Conditions générales
  d'utilisation
- **Mise en œuvre technique** : à l'inscription, l'utilisateur accepte les CGU +
  politique de confidentialité ; un **consentement parental** est requis pour les
  comptes élèves (mineurs). Tracé en base : `users.consent_version`,
  `users.consent_at`, `users.parental_consent` (migration `1700000008000`).

## V, Caractéristiques du traitement effectué par le destinataire
⟨selon le sous-traitant, ex. délivrance de notifications, sans réutilisation⟩

## VI, Catégories de données concernées
| Catégorie | Données | Personnes concernées | Finalité | Conservation |
|---|---|---|---|---|
| Identification | Nom & prénom, n° de téléphone | Parents, élèves, professeurs | Compte & contact | Durée du compte + délai légal |
| Identification | Email (optionnel) | idem | Contact | idem |
| Données professionnelles | Matières, expérience, niveaux | Professeurs | Profil prof | Durée du compte |
| Comportement / scolarité | Résultats, progrès (`progress_subjects`) | Élèves (mineurs) | Suivi pédagogique | Durée du suivi |
| Situation financière | Comptes Mobile Money, transactions | Parents/payeurs | Paiement des cours | Durée légale comptable |
| Localisation | Lieu du cours à domicile | Parents/élèves | Organisation du cours | Durée de la réservation |

> **Données sensibles** : aucune donnée sensible au sens de la loi (origine, santé,
> opinions, biométrie…) n'est collectée. Les résultats scolaires de mineurs sont
> traités avec consentement parental.

## VII, Sécurité des transferts (mesures en place / prévues)
| Mesure | État | Comment |
|---|---|---|
| Authentification des accès | ✅ | JWT signé HS256 (`api/src/auth.ts`), scoping par utilisateur |
| Chiffrement de la communication | ⏳ prod | HTTPS/TLS (Phase 4) |
| Confidentialité (login/mot de passe) | ✅/⏳ | comptes scopés ; auth forte à compléter |
| Cryptage / stockage | ⏳ prod | chiffrement au repos DB + bucket (Phase 4) |
| Destruction des données non utilisées | ⏳ | politique de conservation à définir |
| Contrôle d'accès physique | ⏳ prod | hébergeur CI (datacenter) |

## VIII, Signature du représentant légal
- Je soussigné(e) ⟨nom⟩, en ma qualité de ⟨qualité⟩, atteste l'exactitude des
  informations et la conformité à la Loi N°2013-450.
- Fait à ⟨ville⟩, le ⟨date⟩. Signature et cachet.

---
*Voir `docs/COMPLIANCE.md` pour le contexte et la checklist de mise en conformité.*
