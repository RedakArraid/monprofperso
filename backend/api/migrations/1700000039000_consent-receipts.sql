-- Conserver la preuve exacte des accords successifs sans inventer les documents
-- associés aux anciens consentements dont seule la version texte est connue.
CREATE TABLE legal_consent_versions (
  version TEXT PRIMARY KEY,
  documents JSONB NOT NULL,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE account_consent_receipts (
  id BIGSERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  consent_version TEXT NOT NULL,
  accepted_at TIMESTAMPTZ NOT NULL,
  parental_consent BOOLEAN NOT NULL,
  legal_revisions JSONB,
  UNIQUE(user_id,consent_version,accepted_at)
);
INSERT INTO account_consent_receipts(user_id,consent_version,accepted_at,parental_consent)
  SELECT id,consent_version,consent_at,COALESCE(parental_consent,false) FROM users
  WHERE consent_at IS NOT NULL AND consent_version IS NOT NULL;

CREATE FUNCTION mpp_consent_receipt() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.consent_at IS NULL OR NEW.consent_version IS NULL THEN RETURN NEW; END IF;
  IF TG_OP='UPDATE' THEN
    IF NEW.consent_at IS NOT DISTINCT FROM OLD.consent_at
      AND NEW.consent_version IS NOT DISTINCT FROM OLD.consent_version THEN RETURN NEW; END IF;
  END IF;
  INSERT INTO account_consent_receipts(user_id,consent_version,accepted_at,parental_consent,legal_revisions)
    VALUES(NEW.id,NEW.consent_version,NEW.consent_at,COALESCE(NEW.parental_consent,false),
      (SELECT documents FROM legal_consent_versions WHERE version=NEW.consent_version))
    ON CONFLICT DO NOTHING;
  RETURN NEW;
END $$;
CREATE TRIGGER account_consent_receipt AFTER INSERT OR UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION mpp_consent_receipt();

-- Les cours historiques restent NULL ; les nouveaux cours portent l'accord
-- connu du demandeur au moment de leur création.
ALTER TABLE courses ADD COLUMN consent_version TEXT;
CREATE FUNCTION mpp_course_consent() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.consent_version := (SELECT consent_version FROM users WHERE id=NEW.user_id);
  RETURN NEW;
END $$;
CREATE TRIGGER course_consent BEFORE INSERT ON courses
  FOR EACH ROW EXECUTE FUNCTION mpp_course_consent();
