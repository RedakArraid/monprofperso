-- Up Migration
-- Back-office d'administration : catalogue dynamique (niveaux) + ressources
-- pédagogiques (cours, devoirs, exercices) avec fichiers. Ajoute un utilisateur
-- administrateur de démo et illustre le catalogue dynamique (musique + langues).

-- Niveaux scolaires gérables — incluent désormais le supérieur / universitaire.
CREATE TABLE levels (
  id   SERIAL PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  ord  INT NOT NULL DEFAULT 0      -- ordre d'affichage
);

INSERT INTO levels (slug, name, ord) VALUES
  ('primaire',   'Primaire',   1),
  ('college',    'Collège',    2),
  ('lycee',      'Lycée',      3),
  ('superieur',  'Supérieur',  4),
  ('universite', 'Université', 5);

-- Ressources pédagogiques : cours, devoirs, exercices. Le fichier est stocké en
-- base (BYTEA) — suffisant et sans dépendance pour le prototype démo.
CREATE TABLE resources (
  id           SERIAL PRIMARY KEY,
  type         TEXT NOT NULL,            -- course | homework | exercise
  subject_slug TEXT REFERENCES subjects(slug) ON DELETE SET NULL,
  level        TEXT,
  title        TEXT NOT NULL,
  description  TEXT,
  file_name    TEXT,
  mime_type    TEXT,
  size_bytes   INT,
  content      BYTEA,
  created_by   INT REFERENCES users(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Démontre le catalogue dynamique : musique + langues hors FR/EN.
INSERT INTO subjects (slug, name, icon, accent) VALUES
  ('musique',  'Musique',  'music',     'orange'),
  ('espagnol', 'Espagnol', 'translate', 'green'),
  ('allemand', 'Allemand', 'translate', 'orange')
ON CONFLICT (slug) DO NOTHING;

-- Utilisateur administrateur de démonstration (login via ce numéro -> token admin).
INSERT INTO users (full_name, phone, role, initials) VALUES
  ('Admin Akwaba', '+2250700000001', 'admin', 'AA')
ON CONFLICT (phone) DO NOTHING;

-- Down Migration
DROP TABLE IF EXISTS resources;
DROP TABLE IF EXISTS levels;
DELETE FROM subjects WHERE slug IN ('musique', 'espagnol', 'allemand');
DELETE FROM users WHERE phone = '+2250700000001';
