-- Distingue un cours de groupe régulier d'un stage intensif de vacances
-- (dates de début/fin), façon stages Toussaint/été.
ALTER TABLE group_courses
  ADD COLUMN IF NOT EXISTS kind TEXT NOT NULL DEFAULT 'regular' CHECK (kind IN ('regular', 'stage')),
  ADD COLUMN IF NOT EXISTS start_date DATE,
  ADD COLUMN IF NOT EXISTS end_date DATE;
