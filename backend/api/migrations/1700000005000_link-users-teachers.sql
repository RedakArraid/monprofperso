-- Up Migration
-- Premier pas vers le multi-utilisateur réel : relie un compte `users` (rôle
-- teacher) à sa fiche `teachers`, de sorte que l'espace prof (/teacher/*) soit
-- désormais scopé sur le professeur connecté plutôt que figé sur la démo.
-- Ajoute un second professeur (Ibrahim Diallo) avec son propre espace, pour
-- démontrer/tester l'isolation entre comptes.

ALTER TABLE users ADD COLUMN teacher_id INT REFERENCES teachers(id) ON DELETE SET NULL;

-- Le compte prof de démo (Koffi N'Guessan, seedé en 002) pointe sur sa fiche (teachers.id=1).
UPDATE users SET teacher_id = 1 WHERE phone = '+2250707001234';

-- Second compte prof, relié à la fiche Ibrahim Diallo (teachers.id=2).
INSERT INTO users (full_name, phone, role, initials, teacher_id) VALUES
  ('Ibrahim Diallo', '+2250705001122', 'teacher', 'ID', 2)
ON CONFLICT (phone) DO NOTHING;

-- Espace prof d'Ibrahim : valeurs distinctes de Koffi pour prouver l'isolation.
INSERT INTO teacher_profiles
  (teacher_id, revenue, trend, courses_per_week, rating_label, new_students,
   earnings_total, earnings_trend, courses_given, hours_taught, avg_per_hour) VALUES
  (2, 96000, '+8%', '9', '4,7', '2', 96000, '+8%', '21', '28 h', '3 000');

INSERT INTO teacher_earning_weeks (teacher_id, label, fraction, ord) VALUES
  (2, 'S1', 0.40, 1), (2, 'S2', 0.52, 2), (2, 'S3', 0.61, 3), (2, 'S4', 0.70, 4);

INSERT INTO teacher_requests
  (teacher_id, initials, accent, name, ago, price, student, subject, slot, format, ord) VALUES
  (2, 'KM', 'green', 'Koffi Mensah', 'il y a 2 h', 3000, 'Adjoua · 1re', 'Statistiques', 'Lun. 30 juin · 18h00', 'En ligne', 1);

INSERT INTO teacher_payouts (teacher_id, provider, payout_date, amount, color, ord) VALUES
  (2, 'Retrait Orange Money', '10 juin', 45000, 'orange', 1);

-- Down Migration
DELETE FROM teacher_payouts       WHERE teacher_id = 2;
DELETE FROM teacher_requests      WHERE teacher_id = 2;
DELETE FROM teacher_earning_weeks WHERE teacher_id = 2;
DELETE FROM teacher_profiles      WHERE teacher_id = 2;
DELETE FROM users WHERE phone = '+2250705001122';
ALTER TABLE users DROP COLUMN IF EXISTS teacher_id;
