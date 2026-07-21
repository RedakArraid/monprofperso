-- Répartition géographique des offres publiées (pins distincts sur la carte).
-- Quartiers Abidjan + quelques villes CI. Idempotent.

BEGIN;

-- Assurer les colonnes (si migration pas encore passée)
ALTER TABLE course_needs ADD COLUMN IF NOT EXISTS lat NUMERIC(9,6);
ALTER TABLE course_needs ADD COLUMN IF NOT EXISTS lng NUMERIC(9,6);

-- Positions distinctes par id (ordre stable)
WITH geo AS (
  SELECT * FROM (VALUES
    (1,  'Cocody Angré',        5.3895, -3.9580),
    (2,  'Cocody Deux-Plateaux',5.3710, -3.9890),
    (3,  'Cocody Riviera 3',    5.3520, -3.9675),
    (4,  'Marcory Zone 4',      5.2910, -3.9810),
    (5,  'Plateau Centre',      5.3204, -4.0197),
    (6,  'Yopougon Sicogi',     5.3480, -4.1020),
    (7,  'Treichville',         5.2893, -4.0078),
    (8,  'Koumassi Remblais',   5.2889, -3.9553),
    (9,  'Abobo Avocatier',     5.4300, -4.0200),
    (10, 'Bingerville',         5.3556, -3.8853),
    (11, 'Port-Bouët',          5.2560, -3.9240),
    (12, 'Anyama',              5.4940, -4.0510),
    (13, 'Songon',              5.3200, -4.2500),
    (14, 'Grand-Bassam',        5.2110, -3.7380),
    (15, 'Bouaké',              7.6906, -5.0303),
    (16, 'Yamoussoukro',        6.8276, -5.2893)
  ) AS t(ord, location, lat, lng)
),
ranked AS (
  SELECT n.id,
         ROW_NUMBER() OVER (ORDER BY n.id) AS rn
  FROM course_needs n
  WHERE n.status = 'published'
    AND n.format = 'home'
    AND n.teacher_id IS NULL
)
UPDATE course_needs n
SET location = g.location,
    lat = g.lat,
    lng = g.lng
FROM ranked r
JOIN geo g ON g.ord = ((r.rn - 1) % 16) + 1
WHERE n.id = r.id;

-- Offres en ligne : pas de pin
UPDATE course_needs
SET lat = NULL, lng = NULL, location = COALESCE(NULLIF(location, ''), 'En ligne')
WHERE status = 'published' AND format = 'online';

COMMIT;
