-- Up Migration
-- Sort les derniers endpoints codés en dur vers la base : espace professeur
-- (dashboard, demandes, revenus), comptes Mobile Money du portefeuille, et
-- programme des cours en groupe. Le seed reproduit à l'identique les payloads
-- jusqu'ici figés dans le code, de sorte que le contrat des apps reste inchangé.

-- Comptes Mobile Money rattachés à un utilisateur (auparavant figés dans /wallet).
CREATE TABLE payment_accounts (
  id         SERIAL PRIMARY KEY,
  user_id    INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider   TEXT NOT NULL,
  number     TEXT NOT NULL,
  color      TEXT NOT NULL,
  is_default BOOLEAN NOT NULL DEFAULT FALSE,
  ord        INT NOT NULL DEFAULT 0
);
INSERT INTO payment_accounts (user_id, provider, number, color, is_default, ord) VALUES
  (1, 'Orange Money', '07 ** ** ** 42', 'orange', TRUE,  1),
  (1, 'Wave',         '05 ** ** ** 11', 'wave',   FALSE, 2);

-- Programme détaillé par cours en groupe (auparavant identique et figé pour tous).
CREATE TABLE group_programs (
  id       SERIAL PRIMARY KEY,
  group_id INT NOT NULL REFERENCES group_courses(id) ON DELETE CASCADE,
  line     TEXT NOT NULL,
  ord      INT NOT NULL DEFAULT 0
);
INSERT INTO group_programs (group_id, line, ord) VALUES
  (1, 'Fonctions, limites & continuité', 1),
  (1, 'Probabilités & suites',           2),
  (1, 'Annales & sujets type BAC',       3),
  (2, 'Calcul littéral & équations',     1),
  (2, 'Théorème de Pythagore & Thalès',  2),
  (2, 'Sujets type BEPC',                3),
  (3, 'Lecture & compréhension',         1),
  (3, 'Grammaire & conjugaison',         2),
  (3, 'Expression écrite',               3);

-- Profil « espace prof » : agrégats affichés sur le dashboard et les revenus.
CREATE TABLE teacher_profiles (
  teacher_id       INT PRIMARY KEY REFERENCES teachers(id) ON DELETE CASCADE,
  revenue          INT  NOT NULL,
  trend            TEXT NOT NULL,
  courses_per_week TEXT NOT NULL,
  rating_label     TEXT NOT NULL,
  new_students     TEXT NOT NULL,
  earnings_total   INT  NOT NULL,
  earnings_trend   TEXT NOT NULL,
  courses_given    TEXT NOT NULL,
  hours_taught     TEXT NOT NULL,
  avg_per_hour     TEXT NOT NULL
);
INSERT INTO teacher_profiles
  (teacher_id, revenue, trend, courses_per_week, rating_label, new_students,
   earnings_total, earnings_trend, courses_given, hours_taught, avg_per_hour) VALUES
  (1, 184000, '+12%', '14', '4,9', '3', 184000, '+12%', '38', '52 h', '3 800');

-- Histogramme des revenus hebdomadaires (espace prof / revenus).
CREATE TABLE teacher_earning_weeks (
  id         SERIAL PRIMARY KEY,
  teacher_id INT NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
  label      TEXT NOT NULL,
  fraction   NUMERIC(4,2) NOT NULL,
  ord        INT NOT NULL DEFAULT 0
);
INSERT INTO teacher_earning_weeks (teacher_id, label, fraction, ord) VALUES
  (1, 'S1', 0.48, 1), (1, 'S2', 0.66, 2), (1, 'S3', 0.58, 3), (1, 'S4', 0.88, 4);

-- Demandes de cours en attente côté professeur.
CREATE TABLE teacher_requests (
  id         SERIAL PRIMARY KEY,
  teacher_id INT NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
  initials   TEXT, accent TEXT, name TEXT, ago TEXT, price INT,
  student    TEXT, subject TEXT, slot TEXT, format TEXT,
  ord        INT NOT NULL DEFAULT 0
);
INSERT INTO teacher_requests
  (teacher_id, initials, accent, name, ago, price, student, subject, slot, format, ord) VALUES
  (1, 'FB', 'green',  'Fatou Bamba', 'il y a 1 h', 6000, 'Awa · 2nde',    'Mathématiques',   'Sam. 28 juin · 15h00', 'À domicile · Marcory', 1),
  (1, 'YK', 'orange', 'Yao Kouamé',  'il y a 3 h', 4000, 'Junior · 3ᵉ',   'Physique-Chimie', 'Dim. 29 juin · 10h00', 'En ligne',             2);

-- Retraits / versements (espace prof / revenus).
CREATE TABLE teacher_payouts (
  id          SERIAL PRIMARY KEY,
  teacher_id  INT NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
  provider    TEXT NOT NULL,
  payout_date TEXT NOT NULL,
  amount      INT  NOT NULL,
  color       TEXT NOT NULL,
  ord         INT NOT NULL DEFAULT 0
);
INSERT INTO teacher_payouts (teacher_id, provider, payout_date, amount, color, ord) VALUES
  (1, 'Retrait Wave',         '15 juin', 60000, 'wave',   1),
  (1, 'Retrait Orange Money', '1 juin',  80000, 'orange', 2);

-- Down Migration
DROP TABLE IF EXISTS teacher_payouts;
DROP TABLE IF EXISTS teacher_requests;
DROP TABLE IF EXISTS teacher_earning_weeks;
DROP TABLE IF EXISTS teacher_profiles;
DROP TABLE IF EXISTS group_programs;
DROP TABLE IF EXISTS payment_accounts;
