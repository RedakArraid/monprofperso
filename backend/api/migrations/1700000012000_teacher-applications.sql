-- Up Migration
-- Candidatures professeurs : formulaire public, pièces jointes, validation admin.

CREATE TABLE teacher_applications (
  id                   SERIAL PRIMARY KEY,
  full_name            TEXT NOT NULL,
  phone                TEXT NOT NULL,
  email                TEXT,
  subjects             TEXT NOT NULL,
  location             TEXT NOT NULL DEFAULT 'Abidjan',
  price_per_hour       INT,
  bio                  TEXT,
  experience           TEXT,
  levels               TEXT[] NOT NULL DEFAULT '{}',
  formats              TEXT[] NOT NULL DEFAULT '{home,online}',
  programs             TEXT[] NOT NULL DEFAULT '{standard}',
  negotiable           BOOLEAN NOT NULL DEFAULT FALSE,
  status               TEXT NOT NULL DEFAULT 'pending',
  rejection_reason     TEXT,
  id_card_file_name    TEXT,
  id_card_mime_type    TEXT,
  id_card_storage_key  TEXT,
  id_card_content      BYTEA,
  diploma_file_name    TEXT,
  diploma_mime_type    TEXT,
  diploma_storage_key  TEXT,
  diploma_content      BYTEA,
  photo_file_name      TEXT,
  photo_mime_type      TEXT,
  photo_storage_key    TEXT,
  photo_content        BYTEA,
  consent_version      TEXT,
  consent_at           TIMESTAMPTZ,
  teacher_id           INT REFERENCES teachers(id) ON DELETE SET NULL,
  user_id              INT REFERENCES users(id) ON DELETE SET NULL,
  reviewed_by          INT REFERENCES users(id) ON DELETE SET NULL,
  reviewed_at          TIMESTAMPTZ,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT teacher_applications_status_chk
    CHECK (status IN ('pending', 'approved', 'rejected'))
);

CREATE INDEX teacher_applications_status_idx ON teacher_applications (status, created_at DESC);
CREATE UNIQUE INDEX teacher_applications_phone_pending_uq
  ON teacher_applications (phone) WHERE status = 'pending';

-- Down Migration
DROP TABLE IF EXISTS teacher_applications;
