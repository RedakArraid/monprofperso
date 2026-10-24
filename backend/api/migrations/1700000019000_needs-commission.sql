-- Up Migration
-- Besoins parents (parcours sans négociation) + commission plateforme (admin).

INSERT INTO app_settings (key, value) VALUES
  ('commission_pct', '15')
ON CONFLICT (key) DO NOTHING;

CREATE TABLE children (
  id         SERIAL PRIMARY KEY,
  user_id    INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  level      TEXT NOT NULL,
  gender     TEXT,
  school     TEXT,
  program    TEXT NOT NULL DEFAULT 'standard',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX children_user_idx ON children (user_id);

CREATE TABLE course_needs (
  id                   SERIAL PRIMARY KEY,
  user_id              INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  child_id             INT REFERENCES children(id) ON DELETE SET NULL,
  subject              TEXT NOT NULL,
  level                TEXT NOT NULL,
  format               TEXT NOT NULL CHECK (format IN ('home', 'online')),
  location             TEXT,
  frequency            TEXT,
  duration             TEXT,
  availability_week    BOOLEAN NOT NULL DEFAULT TRUE,
  availability_weekend BOOLEAN NOT NULL DEFAULT FALSE,
  availability_holidays BOOLEAN NOT NULL DEFAULT FALSE,
  description          TEXT,
  parent_price         INT,
  commission_pct       NUMERIC(5,2),
  net_teacher_amount   INT,
  net_teacher_hourly   INT,
  status               TEXT NOT NULL DEFAULT 'submitted'
    CHECK (status IN ('submitted', 'priced', 'published', 'matched', 'cancelled')),
  teacher_id           INT REFERENCES teachers(id) ON DELETE SET NULL,
  course_id            INT REFERENCES courses(id) ON DELETE SET NULL,
  priced_at            TIMESTAMPTZ,
  priced_by            INT REFERENCES users(id) ON DELETE SET NULL,
  parent_accepted_at   TIMESTAMPTZ,
  matched_at           TIMESTAMPTZ,
  start_date           DATE,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX course_needs_user_idx ON course_needs (user_id);
CREATE INDEX course_needs_status_idx ON course_needs (status);
CREATE INDEX course_needs_published_idx ON course_needs (status) WHERE status = 'published' AND teacher_id IS NULL;

-- Down Migration
DROP TABLE IF EXISTS course_needs;
DROP TABLE IF EXISTS children;
DELETE FROM app_settings WHERE key = 'commission_pct';
