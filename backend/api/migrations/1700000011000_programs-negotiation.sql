-- Up Migration
-- 1) Programmes scolaires (jusqu'en Terminale) : « Programme standard » (ivoirien)
--    et « Programme français ». Catalogue gérable par l'admin, comme les niveaux ;
--    chaque professeur déclare les programmes qu'il suit (teachers.programs).
-- 2) Négociation : un professeur peut activer « à négocier » sur ses offres
--    (teachers.negotiable). Le client propose alors un tarif et une fréquence à la
--    réservation ; le prof accepte, refuse, ou fait une contre-proposition.

-- ---------------------------------------------------------------- Programmes
CREATE TABLE programs (
  id   SERIAL PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  ord  INT NOT NULL DEFAULT 0
);

INSERT INTO programs (slug, name, ord) VALUES
  ('standard', 'Programme standard', 1),
  ('francais', 'Programme français', 2);

ALTER TABLE teachers ADD COLUMN programs   TEXT[] NOT NULL DEFAULT '{}';
ALTER TABLE teachers ADD COLUMN negotiable BOOLEAN NOT NULL DEFAULT FALSE;

-- Démo : tous suivent le programme standard ; Mariam Touré (langues) ajoute le
-- programme français ; Koffi N'Guessan accepte la négociation.
UPDATE teachers SET programs = ARRAY['standard'];
UPDATE teachers SET programs = ARRAY['standard','francais'] WHERE name = 'Mariam Touré';
UPDATE teachers SET negotiable = TRUE WHERE name = 'Koffi N''Guessan';

-- ---------------------------------------------------------------- Négociation
ALTER TABLE courses ADD COLUMN negotiable         BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE courses ADD COLUMN proposed_price     INT;     -- tarif proposé par le client
ALTER TABLE courses ADD COLUMN proposed_frequency TEXT;    -- fréquence proposée (ex. « 2 cours / sem »)
ALTER TABLE courses ADD COLUMN counter_price      INT;     -- contre-proposition du prof
ALTER TABLE courses ADD COLUMN counter_frequency  TEXT;
ALTER TABLE courses ADD COLUMN negotiation_status TEXT NOT NULL DEFAULT 'none';
  -- none | proposed (client a proposé) | countered (prof a contre-proposé)
  -- | accepted | refused

-- Down Migration
ALTER TABLE courses DROP COLUMN IF EXISTS negotiation_status;
ALTER TABLE courses DROP COLUMN IF EXISTS counter_frequency;
ALTER TABLE courses DROP COLUMN IF EXISTS counter_price;
ALTER TABLE courses DROP COLUMN IF EXISTS proposed_frequency;
ALTER TABLE courses DROP COLUMN IF EXISTS proposed_price;
ALTER TABLE courses DROP COLUMN IF EXISTS negotiable;
ALTER TABLE teachers DROP COLUMN IF EXISTS negotiable;
ALTER TABLE teachers DROP COLUMN IF EXISTS programs;
DROP TABLE IF EXISTS programs;
