-- Origine d'un besoin parent : depuis l'app (compte déjà onboardé) ou
-- depuis le formulaire public du site vitrine (compte auto-créé, à rappeler).
ALTER TABLE course_needs ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'app'
  CHECK (source IN ('app', 'web'));
