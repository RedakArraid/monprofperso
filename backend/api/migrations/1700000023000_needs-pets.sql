-- Up Migration
-- Animaux de compagnie sur les besoins parents (badge Completude Chat / Chien).

ALTER TABLE course_needs
  ADD COLUMN IF NOT EXISTS has_cat BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS has_dog BOOLEAN NOT NULL DEFAULT FALSE;

-- Down Migration
ALTER TABLE course_needs DROP COLUMN IF EXISTS has_cat;
ALTER TABLE course_needs DROP COLUMN IF EXISTS has_dog;
