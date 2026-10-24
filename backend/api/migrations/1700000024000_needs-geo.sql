-- Up Migration
-- Coordonnées géographiques des besoins (pins carte distincts).

ALTER TABLE course_needs
  ADD COLUMN IF NOT EXISTS lat NUMERIC(9,6),
  ADD COLUMN IF NOT EXISTS lng NUMERIC(9,6);

COMMENT ON COLUMN course_needs.lat IS 'Latitude offre (Abidjan / CI)';
COMMENT ON COLUMN course_needs.lng IS 'Longitude offre (Abidjan / CI)';

-- Down Migration
ALTER TABLE course_needs DROP COLUMN IF EXISTS lat;
ALTER TABLE course_needs DROP COLUMN IF EXISTS lng;
