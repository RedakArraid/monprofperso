-- Seed staging : parents, enfants, besoins publiés (offres prof) + réservations en attente.
-- Idempotent : ON CONFLICT / NOT EXISTS. Commission 15 %.

BEGIN;

-- Activer les offres pour tous les profs de démo (dont comptes connectés staging)
UPDATE teachers SET needs_confirmed = TRUE WHERE needs_confirmed IS DISTINCT FROM TRUE;

-- ---------- Parents ----------
INSERT INTO users (full_name, phone, role, initials, consent_version, consent_at)
VALUES
  ('Fatou Bamba',       '+2250701001001', 'parent', 'FB', '1.0', now()),
  ('Yao Kouassi',       '+2250701001002', 'parent', 'YK', '1.0', now()),
  ('Aminata Traoré',    '+2250701001003', 'parent', 'AT', '1.0', now()),
  ('Jean-Baptiste Aka', '+2250701001004', 'parent', 'JA', '1.0', now()),
  ('Mariame Soro',      '+2250701001005', 'parent', 'MS', '1.0', now()),
  ('Adjoua Koné',       '+2250701001006', 'parent', 'AK', '1.0', now()),
  ('Sekou Diabaté',     '+2250701001007', 'parent', 'SD', '1.0', now())
ON CONFLICT (phone) DO UPDATE
  SET full_name = EXCLUDED.full_name,
      initials  = EXCLUDED.initials,
      consent_version = COALESCE(users.consent_version, EXCLUDED.consent_version),
      consent_at = COALESCE(users.consent_at, EXCLUDED.consent_at);

-- ---------- Enfants (si absents) ----------
INSERT INTO children (user_id, name, level, gender, school, program)
SELECT u.id, v.name, v.level, v.gender, v.school, v.program
FROM users u
JOIN (VALUES
  ('+2250758421903', 'Aya',      '3ème',   'fille',  'Collège Moderne Cocody', 'standard'),
  ('+2250758421903', 'Moussa',   '5ème',   'garcon', 'Collège Moderne Cocody', 'standard'),
  ('+2250701001001', 'Ibrahim',  'Terminale', 'garcon', 'Lycée Classique Abidjan', 'standard'),
  ('+2250701001001', 'Aïcha',    '1ère',   'fille',  'Lycée Classique Abidjan', 'francais'),
  ('+2250701001002', 'Koffi',    '4ème',   'garcon', 'Collège Anoumabo', 'standard'),
  ('+2250701001003', 'Salimata', 'CM2',    'fille',  'École Primaire Plateau', 'standard'),
  ('+2250701001004', 'Paul',     '2nde',   'garcon', 'Lycée Sainte-Marie', 'francais'),
  ('+2250701001005', 'Rokia',    '6ème',   'fille',  'Collège Bingerville', 'standard'),
  ('+2250701001006', 'Nadia',    'Terminale', 'fille', 'Lycée Mami Adjoua', 'standard'),
  ('+2250701001007', 'Omar',     '3ème',   'garcon', 'Collège Treichville', 'standard'),
  ('+2250700000097', 'Lina',     '5ème',   'fille',  'Collège Test Staging', 'standard')
) AS v(phone, name, level, gender, school, program) ON u.phone = v.phone
WHERE NOT EXISTS (
  SELECT 1 FROM children c WHERE c.user_id = u.id AND c.name = v.name
);

-- ---------- Tarif + publier le besoin web déjà présent ----------
UPDATE course_needs
   SET parent_price = 10000,
       commission_pct = 15,
       net_teacher_amount = 8500,
       net_teacher_hourly = 5667,
       frequency = '2× / semaine',
       duration = '1h30',
       status = 'published',
       priced_at = now(),
       priced_by = (SELECT id FROM users WHERE phone = '+2250700000001'),
       parent_accepted_at = now(),
       start_date = CURRENT_DATE + 7,
       updated_at = now()
 WHERE id = 1 AND status = 'submitted';

-- ---------- Besoins publiés = offres visibles dans /teacher/requests ----------
INSERT INTO course_needs (
  user_id, child_id, subject, level, format, location, frequency, duration,
  availability_week, availability_weekend, availability_holidays, description,
  parent_price, commission_pct, net_teacher_amount, net_teacher_hourly,
  status, priced_at, priced_by, parent_accepted_at, start_date, source,
  lat, lng
)
SELECT
  u.id,
  c.id,
  v.subject, v.level, v.format, v.location, v.frequency, v.duration,
  v.aw, v.awe, v.ah, v.description,
  v.parent_price, 15,
  ROUND(v.parent_price * 0.85)::int,
  ROUND((v.parent_price * 0.85) / v.hours)::int,
  'published', now(),
  (SELECT id FROM users WHERE phone = '+2250700000001'),
  now(),
  CURRENT_DATE + v.start_in_days,
  v.source,
  v.lat, v.lng
FROM (VALUES
  -- phone, child, subject, level, format, location, freq, dur, hours, aw, awe, ah, desc, price, start, source, lat, lng
  ('+2250758421903', 'Aya',      'Maths',     '3ème',       'home',   'Cocody Angré',         '2× / semaine', '1h30', 1.5, true,  false, false, 'Préparation BEPC — algèbre et géométrie', 12000, 5,  'app', 5.389500, -3.958000),
  ('+2250758421903', 'Moussa',   'Français',  '5ème',       'home',   'Cocody Deux-Plateaux', '1× / semaine', '1h',   1.0, true,  true,  false, 'Orthographe et rédaction',                8000,  8,  'app', 5.371000, -3.989000),
  ('+2250701001001', 'Ibrahim',  'Physique',  'Terminale',  'home',   'Plateau Centre',       '2× / semaine', '2h',   2.0, true,  false, true,  'Prépa BAC C — mécanique et électricité',  15000, 3,  'app', 5.320400, -4.019700),
  ('+2250701001001', 'Aïcha',    'Anglais',   '1ère',       'online', 'En ligne',             '1× / semaine', '1h30', 1.5, true,  true,  false, 'Conversation et préparation oral',        9000,  10, 'app', NULL::numeric, NULL::numeric),
  ('+2250701001002', 'Koffi',    'SVT',       '4ème',       'home',   'Marcory Zone 4',       '1× / semaine', '1h30', 1.5, true,  false, false, 'Renforcement programme standard',         8500,  6,  'app', 5.291000, -3.981000),
  ('+2250701001003', 'Salimata', 'Maths',     'CM2',        'home',   'Koumassi Remblais',    '2× / semaine', '1h',   1.0, true,  false, true,  'Calcul et problèmes — vacances',          6000,  2,  'web', 5.288900, -3.955300),
  ('+2250701001004', 'Paul',     'Histoire',  '2nde',       'home',   'Cocody Riviera 3',     '1× / semaine', '1h30', 1.5, true,  true,  false, 'Méthode et dissertations',                10000, 12, 'app', 5.352000, -3.967500),
  ('+2250701001005', 'Rokia',    'Anglais',   '6ème',       'online', 'En ligne',             '1× / semaine', '1h',   1.0, true,  false, false, 'Bases oral et vocabulaire',               7000,  4,  'app', NULL::numeric, NULL::numeric),
  ('+2250701001006', 'Nadia',    'Maths',     'Terminale',  'home',   'Yopougon Sicogi',      '3× / semaine', '2h',   2.0, true,  true,  true,  'Intensif BAC D — analyse et probabilités',18000, 1,  'app', 5.348000, -4.102000),
  ('+2250701001007', 'Omar',     'Chimie',    '3ème',       'home',   'Treichville',          '1× / semaine', '1h30', 1.5, true,  false, false, 'Préparation BEPC sciences',               9500,  9,  'web', 5.289300, -4.007800),
  ('+2250700000097', 'Lina',     'Français',  '5ème',       'home',   'Abobo Avocatier',      '1× / semaine', '1h',   1.0, true,  true,  false, 'Lecture et expression écrite',            7500,  7,  'app', 5.430000, -4.020000),
  ('+2250701001002', 'Koffi',    'Maths',     '4ème',       'home',   'Bingerville',          '2× / semaine', '1h30', 1.5, true,  true,  false, 'Fractions et proportionnalité',           9000,  11, 'app', 5.355600, -3.885300),
  ('+2250701001004', 'Paul',     'Anglais',   '2nde',       'home',   'Port-Bouët',           '1× / semaine', '1h',   1.0, true,  false, true,  'Oral et compréhension',                   8500,  14, 'web', 5.256000, -3.924000),
  ('+2250701001006', 'Nadia',    'Physique',  'Terminale',  'home',   'Anyama',               '2× / semaine', '2h',   2.0, true,  false, false, 'Optique et électricité',                  14000, 6,  'app', 5.494000, -4.051000),
  ('+2250701001003', 'Salimata', 'Français',  'CM2',        'home',   'Grand-Bassam',         '1× / semaine', '1h',   1.0, true,  true,  true,  'Lecture suivie',                          6500,  9,  'app', 5.211000, -3.738000)
) AS v(phone, child_name, subject, level, format, location, frequency, duration, hours, aw, awe, ah, description, parent_price, start_in_days, source, lat, lng)
JOIN users u ON u.phone = v.phone
LEFT JOIN children c ON c.user_id = u.id AND c.name = v.child_name
WHERE NOT EXISTS (
  SELECT 1 FROM course_needs n
   WHERE n.user_id = u.id AND n.subject = v.subject AND n.level = v.level AND n.status = 'published'
     AND COALESCE(n.location, '') = v.location
);

-- Animaux de compagnie (badges Chat / Chien Completude)
UPDATE course_needs SET has_cat = TRUE
 WHERE status = 'published' AND subject IN ('Maths', 'Français', 'Histoire')
   AND location ILIKE '%Cocody%';
UPDATE course_needs SET has_dog = TRUE
 WHERE status = 'published' AND subject IN ('Physique', 'SVT', 'Chimie') AND format = 'home';
UPDATE course_needs SET has_cat = TRUE, has_dog = TRUE
 WHERE status = 'published' AND location ILIKE '%Yopougon%';

-- ---------- Besoins encore à tarifer (admin) + tarifés en attente parent ----------
INSERT INTO course_needs (
  user_id, child_id, subject, level, format, location, frequency, duration,
  availability_week, availability_weekend, description, status, source
)
SELECT u.id, c.id, v.subject, v.level, v.format, v.location, v.frequency, v.duration,
       true, false, v.description, v.status, 'app'
FROM (VALUES
  ('+2250701001002', 'Koffi', 'Maths',    '4ème', 'home',   'Marcory',  '2× / semaine', '1h30', 'Difficultés en fractions', 'submitted'),
  ('+2250701001005', 'Rokia', 'Français', '6ème', 'online', 'En ligne', '1× / semaine', '1h',   'Lecture suivie',          'submitted')
) AS v(phone, child_name, subject, level, format, location, frequency, duration, description, status)
JOIN users u ON u.phone = v.phone
LEFT JOIN children c ON c.user_id = u.id AND c.name = v.child_name
WHERE NOT EXISTS (
  SELECT 1 FROM course_needs n
   WHERE n.user_id = u.id AND n.subject = v.subject AND n.status = v.status
);

INSERT INTO course_needs (
  user_id, child_id, subject, level, format, location, frequency, duration,
  availability_week, description,
  parent_price, commission_pct, net_teacher_amount, net_teacher_hourly,
  status, priced_at, priced_by, source
)
SELECT u.id, c.id, 'SVT', 'CM2', 'home', 'Plateau', '1× / semaine', '1h',
       true, 'Découverte sciences',
       5500, 15, 4675, 4675,
       'priced', now(),
       (SELECT id FROM users WHERE phone = '+2250700000001'),
       'app'
FROM users u
LEFT JOIN children c ON c.user_id = u.id AND c.name = 'Salimata'
WHERE u.phone = '+2250701001003'
  AND NOT EXISTS (
    SELECT 1 FROM course_needs n WHERE n.user_id = u.id AND n.status = 'priced' AND n.subject = 'SVT'
  );

-- ---------- Réservations directes en attente d'acceptation prof ----------
INSERT INTO courses (
  user_id, teacher_id, teacher_name, subject, level, day_label, day_num, time, duration,
  format, location, price, status, badge, accepted, payment_status
)
SELECT
  u.id,
  t.id,
  t.name,
  v.subject, v.level, v.day_label, v.day_num, v.time, v.duration,
  v.format, v.location, v.price, 'upcoming', 'En attente', FALSE, 'unpaid'
FROM (VALUES
  ('+2250701001001', 1, 'Maths',    'Terminale', 'MER', '29', '17h00', '2h',   'home',   'Plateau', 15000),
  ('+2250701001004', 1, 'Physique', '2nde',      'VEN', '31', '16h00', '1h30', 'home',   'Cocody',  11000),
  ('+2250701001006', 2, 'Anglais',  'Terminale', 'SAM', '01', '10h00', '1h30', 'online', NULL,     9000),
  ('+2250701001007', 2, 'Chimie',   '3ème',      'LUN', '27', '18h00', '1h30', 'home',   'Treichville', 9500),
  ('+2250758421903', 1, 'Français', '3ème',      'MAR', '28', '15h30', '1h',   'home',   'Cocody',  8000)
) AS v(phone, teacher_id, subject, level, day_label, day_num, time, duration, format, location, price)
JOIN users u ON u.phone = v.phone
JOIN teachers t ON t.id = v.teacher_id
WHERE NOT EXISTS (
  SELECT 1 FROM courses c
   WHERE c.user_id = u.id AND c.teacher_id = v.teacher_id
     AND c.subject = v.subject AND c.accepted = FALSE AND c.status = 'upcoming'
);

-- ---------- Notifs parents (aperçu espace) ----------
INSERT INTO notifications (user_id, icon, accent, text, time_ago, unread, section)
SELECT u.id, 'tag', 'orange',
       'Tarif proposé pour votre besoin — consultez Mes besoins.',
       'à l''instant', TRUE, 'today'
FROM users u
WHERE u.phone IN ('+2250701001003', '+2250758421903', '+2250700000097')
  AND NOT EXISTS (
    SELECT 1 FROM notifications n
     WHERE n.user_id = u.id AND n.text LIKE 'Tarif proposé%'
  );

COMMIT;

-- Récap
SELECT 'parents' AS kind, count(*)::int AS n FROM users WHERE role = 'parent'
UNION ALL
SELECT 'children', count(*)::int FROM children
UNION ALL
SELECT 'needs_published', count(*)::int FROM course_needs WHERE status = 'published' AND teacher_id IS NULL
UNION ALL
SELECT 'needs_priced', count(*)::int FROM course_needs WHERE status = 'priced'
UNION ALL
SELECT 'needs_submitted', count(*)::int FROM course_needs WHERE status = 'submitted'
UNION ALL
SELECT 'courses_pending', count(*)::int FROM courses WHERE accepted = FALSE AND status = 'upcoming';
