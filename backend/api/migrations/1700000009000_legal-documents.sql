-- Up Migration
-- Documents légaux gérables par l'admin (CGU, politique de confidentialité,
-- mentions légales) — conformité Loi CI N°2013-450 (cf. docs/COMPLIANCE.md).
-- Chaque document est un singleton identifié par son slug ; l'admin téléverse un
-- PDF (stocké sur MinIO/S3 via storage_key, repli BYTEA) et versionne le texte.
-- Les textes sources rédigés vivent dans docs/legal/*.md.

CREATE TABLE legal_documents (
  slug        TEXT PRIMARY KEY,   -- cgu | confidentialite | mentions-legales
  title       TEXT NOT NULL,
  version     TEXT,               -- ex. "2026-06"
  file_name   TEXT,
  mime_type   TEXT,
  size_bytes  INT,
  content     BYTEA,              -- repli si stockage objet indisponible
  storage_key TEXT,               -- clé d'objet MinIO/S3
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by  INT REFERENCES users(id) ON DELETE SET NULL
);

INSERT INTO legal_documents (slug, title, version) VALUES
  ('cgu',              'Conditions Générales d''Utilisation', '2026-06'),
  ('confidentialite',  'Politique de confidentialité',        '2026-06'),
  ('mentions-legales', 'Mentions légales',                    '2026-06');

-- Down Migration
DROP TABLE IF EXISTS legal_documents;
