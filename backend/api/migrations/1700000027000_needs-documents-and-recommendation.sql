-- Up Migration
-- Documents utiles joints à un besoin, et professeur recommandé par MPP
-- (proposition curée, en complément de la diffusion aux profs confirmés).

ALTER TABLE course_needs
  ADD COLUMN document_key TEXT,
  ADD COLUMN document_name TEXT,
  ADD COLUMN document_mime_type TEXT,
  ADD COLUMN recommended_teacher_id INT REFERENCES teachers(id) ON DELETE SET NULL,
  ADD COLUMN recommended_note TEXT;

-- Down Migration
ALTER TABLE course_needs DROP COLUMN IF EXISTS document_key;
ALTER TABLE course_needs DROP COLUMN IF EXISTS document_name;
ALTER TABLE course_needs DROP COLUMN IF EXISTS document_mime_type;
ALTER TABLE course_needs DROP COLUMN IF EXISTS recommended_teacher_id;
ALTER TABLE course_needs DROP COLUMN IF EXISTS recommended_note;
