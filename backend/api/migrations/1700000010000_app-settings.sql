-- Up Migration
-- Paramètres de plateforme gérables par l'admin : liens réseaux sociaux et
-- coordonnées de contact. Table clé/valeur simple (un singleton par clé), lue
-- publiquement par la vitrine web et les apps, écrite par l'espace admin.

CREATE TABLE app_settings (
  key        TEXT PRIMARY KEY,
  value      TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by INT REFERENCES users(id) ON DELETE SET NULL
);

-- Clés connues (réseaux sociaux + contact). Valeurs vides = non affichées.
INSERT INTO app_settings (key, value) VALUES
  ('social_facebook',  ''),
  ('social_instagram', ''),
  ('social_tiktok',    ''),
  ('social_whatsapp',  ''),
  ('social_linkedin',  ''),
  ('social_x',         ''),
  ('social_youtube',   ''),
  ('contact_email',    ''),
  ('contact_phone',    '');

-- Down Migration
DROP TABLE IF EXISTS app_settings;
