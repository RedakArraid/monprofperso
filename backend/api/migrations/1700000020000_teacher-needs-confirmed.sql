-- Accès aux offres « besoins parents » : réservé aux profs confirmés (tests / validation).
ALTER TABLE teachers ADD COLUMN IF NOT EXISTS needs_confirmed BOOLEAN NOT NULL DEFAULT FALSE;

-- Profs de démo déjà actifs : accès immédiat aux offres.
UPDATE teachers SET needs_confirmed = TRUE;
