-- Up Migration
-- Ne jamais résoudre des dossiers historiques en doublon en rejetant des
-- candidatures silencieusement. Le déploiement s'arrête pour permettre à
-- l'administration de choisir le dossier actif avant de relancer la migration.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM teacher_applications
     WHERE status IN ('pending', 'interview', 'test', 'training')
     GROUP BY phone HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION 'Plusieurs candidatures actives pour un même téléphone : résoudre les doublons avant la migration business-integrity';
  END IF;
END $$;

DROP INDEX teacher_applications_phone_pending_uq;
CREATE UNIQUE INDEX teacher_applications_phone_active_uq
  ON teacher_applications (phone)
  WHERE status IN ('pending', 'interview', 'test', 'training');

-- Le repli BYTEA conserve réellement les pièces lorsque S3 est indisponible.
ALTER TABLE course_needs
  ADD COLUMN document_content BYTEA,
  ADD COLUMN duration_minutes INT,
  ADD CONSTRAINT course_needs_document_size_chk
    CHECK (document_content IS NULL OR octet_length(document_content) BETWEEN 1 AND 8000000),
  ADD CONSTRAINT course_needs_duration_minutes_chk
    CHECK (duration_minutes IS NULL OR duration_minutes BETWEEN 15 AND 1440);

-- Convertit les formats connus, sans attribuer une durée inventée à un ancien
-- libellé invalide. Ces lignes devront recevoir une durée valide à la tarification.
WITH labels AS (
  SELECT id, replace(regexp_replace(lower(COALESCE(duration, '')), '\s', '', 'g'), ',', '.') AS label
    FROM course_needs
), parsed AS (
  SELECT id, CASE
    WHEN label = '' THEN 90::numeric
    WHEN label ~ '^[0-9]+h([0-5]?[0-9])?$'
      THEN split_part(label, 'h', 1)::numeric * 60 + COALESCE(NULLIF(split_part(label, 'h', 2), ''), '0')::numeric
    WHEN label ~ '^[0-9]+\.[0-9]+h$'
      THEN replace(label, 'h', '')::numeric * 60
    WHEN label ~ '^[0-9]+min(ute)?s?$'
      THEN regexp_replace(label, '[^0-9]', '', 'g')::numeric
    ELSE NULL
  END AS minutes FROM labels
)
UPDATE course_needs n
   SET duration_minutes = p.minutes::int,
       duration = COALESCE(NULLIF(trim(n.duration), ''), '1h30')
  FROM parsed p
 WHERE n.id = p.id AND p.minutes BETWEEN 15 AND 1440 AND p.minutes = trunc(p.minutes);

-- Corrige le taux horaire d'affichage ; le prix accepté et le net par séance
-- demeurent inchangés.
UPDATE course_needs
   SET net_teacher_hourly = round(net_teacher_amount::numeric * 60 / duration_minutes)::int
 WHERE duration_minutes IS NOT NULL AND net_teacher_amount IS NOT NULL;

-- Down Migration
ALTER TABLE course_needs DROP CONSTRAINT IF EXISTS course_needs_document_size_chk;
ALTER TABLE course_needs DROP CONSTRAINT IF EXISTS course_needs_duration_minutes_chk;
ALTER TABLE course_needs DROP COLUMN IF EXISTS document_content;
ALTER TABLE course_needs DROP COLUMN IF EXISTS duration_minutes;
DROP INDEX IF EXISTS teacher_applications_phone_active_uq;
CREATE UNIQUE INDEX teacher_applications_phone_pending_uq
  ON teacher_applications (phone) WHERE status = 'pending';
