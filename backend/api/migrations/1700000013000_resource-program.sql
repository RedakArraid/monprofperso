-- Up Migration
-- Chaque ressource pédagogique est rattachée à un programme scolaire
-- (standard, francais, ou libellé personnalisé pour « Autre »).

ALTER TABLE resources ADD COLUMN program TEXT NOT NULL DEFAULT 'standard';

CREATE INDEX IF NOT EXISTS idx_resources_program ON resources (program);

-- Down Migration
DROP INDEX IF EXISTS idx_resources_program;
ALTER TABLE resources DROP COLUMN IF EXISTS program;
