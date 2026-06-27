-- Up Migration
-- Socle de conformité (Loi CI N°2013-450, cf. docs/COMPLIANCE.md) : trace le
-- consentement de l'utilisateur à l'inscription — acceptation des CGU + politique
-- de confidentialité, avec la version acceptée et l'horodatage. Le consentement
-- parental est requis quand le compte concerne un élève (souvent mineur).

ALTER TABLE users ADD COLUMN consent_version    TEXT;          -- version des CGU acceptée (ex. "2026-06")
ALTER TABLE users ADD COLUMN consent_at         TIMESTAMPTZ;   -- horodatage de l'acceptation
ALTER TABLE users ADD COLUMN parental_consent   BOOLEAN NOT NULL DEFAULT FALSE; -- consentement parental (élève mineur)

-- Comptes de démo seedés : réputés avoir consenti (évite de bloquer la démo).
UPDATE users SET consent_version = 'seed', consent_at = now(), parental_consent = TRUE;

-- Down Migration
ALTER TABLE users DROP COLUMN IF EXISTS parental_consent;
ALTER TABLE users DROP COLUMN IF EXISTS consent_at;
ALTER TABLE users DROP COLUMN IF EXISTS consent_version;
