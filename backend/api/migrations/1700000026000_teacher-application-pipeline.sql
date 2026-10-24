-- Up Migration
-- Pipeline de recrutement complet : dossier → entretien → test/mise en
-- situation → formation → accès aux offres (au lieu de pending/approved/rejected).

ALTER TABLE teacher_applications DROP CONSTRAINT teacher_applications_status_chk;
ALTER TABLE teacher_applications ADD CONSTRAINT teacher_applications_status_chk
  CHECK (status IN ('pending', 'interview', 'test', 'training', 'approved', 'rejected'));

ALTER TABLE teacher_applications
  ADD COLUMN interview_at TIMESTAMPTZ,
  ADD COLUMN interview_notes TEXT,
  ADD COLUMN test_result TEXT CHECK (test_result IN ('passed', 'failed')),
  ADD COLUMN test_notes TEXT;

-- Down Migration
ALTER TABLE teacher_applications DROP COLUMN IF EXISTS interview_at;
ALTER TABLE teacher_applications DROP COLUMN IF EXISTS interview_notes;
ALTER TABLE teacher_applications DROP COLUMN IF EXISTS test_result;
ALTER TABLE teacher_applications DROP COLUMN IF EXISTS test_notes;
ALTER TABLE teacher_applications DROP CONSTRAINT teacher_applications_status_chk;
ALTER TABLE teacher_applications ADD CONSTRAINT teacher_applications_status_chk
  CHECK (status IN ('pending', 'approved', 'rejected'));
