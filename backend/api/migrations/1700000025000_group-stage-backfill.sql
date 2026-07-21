-- La migration précédente (group-course-stages) a ajouté group_courses.kind
-- avec un défaut 'regular' : les lignes déjà en base (dont le stage de vacances
-- seedé, tag VACANCES) n'ont donc pas été basculées sur 'stage'. Backfill ciblé.
UPDATE group_courses SET kind = 'stage' WHERE tag = 'VACANCES' AND kind = 'regular';
