-- Up Migration
-- Schéma initial (repris de l'ancien db/init.sql, désormais versionné).

CREATE TABLE subjects (
  id      SERIAL PRIMARY KEY,
  slug    TEXT UNIQUE NOT NULL,
  name    TEXT NOT NULL,
  icon    TEXT NOT NULL,        -- nom logique (mappé côté client)
  accent  TEXT NOT NULL         -- 'green' | 'orange'
);

CREATE TABLE teachers (
  id             SERIAL PRIMARY KEY,
  initials       TEXT NOT NULL,
  name           TEXT NOT NULL,
  subjects       TEXT NOT NULL,
  rating         NUMERIC(2,1) NOT NULL,
  reviews_count  INT NOT NULL,
  location       TEXT NOT NULL,
  price_per_hour INT NOT NULL,        -- FCFA
  experience     TEXT,
  students       TEXT,
  bac_success    TEXT,
  bio            TEXT,
  levels         TEXT[] DEFAULT '{}',
  formats        TEXT[] DEFAULT '{}', -- 'home' | 'online'
  distance_km    NUMERIC(3,1),
  accent         TEXT NOT NULL DEFAULT 'green',
  verified       BOOLEAN NOT NULL DEFAULT TRUE,
  special_bepc   BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE reviews (
  id              SERIAL PRIMARY KEY,
  teacher_id      INT REFERENCES teachers(id) ON DELETE CASCADE,
  author_initials TEXT NOT NULL,
  author_name     TEXT NOT NULL,
  rating          INT NOT NULL,
  time_ago        TEXT NOT NULL,
  text            TEXT NOT NULL
);

CREATE TABLE users (
  id         SERIAL PRIMARY KEY,
  full_name  TEXT NOT NULL,
  phone      TEXT UNIQUE NOT NULL,
  role       TEXT NOT NULL DEFAULT 'parent', -- parent | student | teacher
  initials   TEXT NOT NULL DEFAULT 'AK',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE courses (
  id          SERIAL PRIMARY KEY,
  user_id     INT REFERENCES users(id) ON DELETE CASCADE,
  teacher_id  INT REFERENCES teachers(id),
  teacher_name TEXT NOT NULL,
  subject     TEXT NOT NULL,
  level       TEXT NOT NULL,
  day_label   TEXT NOT NULL,      -- 'SAM'
  day_num     TEXT NOT NULL,      -- '22'
  time        TEXT NOT NULL,      -- '16h00'
  duration    TEXT NOT NULL,      -- '1h30'
  format      TEXT NOT NULL,      -- 'home' | 'online'
  location    TEXT,
  price       INT NOT NULL,
  status      TEXT NOT NULL DEFAULT 'upcoming', -- upcoming | done | cancelled
  badge       TEXT
);

CREATE TABLE notifications (
  id        SERIAL PRIMARY KEY,
  user_id   INT REFERENCES users(id) ON DELETE CASCADE,
  icon      TEXT NOT NULL,
  accent    TEXT NOT NULL DEFAULT 'green',
  text      TEXT NOT NULL,
  time_ago  TEXT NOT NULL,
  unread    BOOLEAN NOT NULL DEFAULT FALSE,
  section   TEXT NOT NULL DEFAULT 'today'  -- today | week
);

CREATE TABLE transactions (
  id       SERIAL PRIMARY KEY,
  user_id  INT REFERENCES users(id) ON DELETE CASCADE,
  title    TEXT NOT NULL,
  subtitle TEXT NOT NULL,
  amount   INT NOT NULL,           -- négatif = débit
  credit   BOOLEAN NOT NULL
);

CREATE TABLE group_courses (
  id           SERIAL PRIMARY KEY,
  tag          TEXT NOT NULL,
  tag_accent   TEXT NOT NULL,      -- green | orange
  price        INT NOT NULL,
  title        TEXT NOT NULL,
  detail       TEXT NOT NULL,
  teacher_initials TEXT,
  teacher_name TEXT,
  teacher_accent TEXT DEFAULT 'green',
  enrolled     INT,
  capacity     INT,
  places_left  INT
);

CREATE TABLE subscription_plans (
  id        SERIAL PRIMARY KEY,
  name      TEXT NOT NULL,
  detail    TEXT NOT NULL,
  price     INT NOT NULL,
  popular   BOOLEAN NOT NULL DEFAULT FALSE,
  suffix    TEXT
);

CREATE TABLE progress_subjects (
  id       SERIAL PRIMARY KEY,
  user_id  INT REFERENCES users(id) ON DELETE CASCADE,
  subject  TEXT NOT NULL,
  grade    TEXT NOT NULL,          -- '14/20'
  fraction NUMERIC(3,2) NOT NULL,  -- 0.70
  warn     BOOLEAN NOT NULL DEFAULT FALSE
);

-- Down Migration
DROP TABLE IF EXISTS progress_subjects;
DROP TABLE IF EXISTS subscription_plans;
DROP TABLE IF EXISTS group_courses;
DROP TABLE IF EXISTS transactions;
DROP TABLE IF EXISTS notifications;
DROP TABLE IF EXISTS courses;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS reviews;
DROP TABLE IF EXISTS teachers;
DROP TABLE IF EXISTS subjects;
