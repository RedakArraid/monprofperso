-- Une nouvelle publication légale invalide réellement la révision acceptée.
ALTER TABLE legal_documents ADD COLUMN revision_id UUID NOT NULL DEFAULT gen_random_uuid();
CREATE FUNCTION mpp_legal_revision() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.version IS DISTINCT FROM OLD.version OR NEW.title IS DISTINCT FROM OLD.title
    OR NEW.content IS DISTINCT FROM OLD.content OR NEW.storage_key IS DISTINCT FROM OLD.storage_key THEN
    NEW.revision_id := gen_random_uuid();
    DELETE FROM production_checks WHERE check_key='legal_review';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER legal_revision BEFORE UPDATE ON legal_documents FOR EACH ROW EXECUTE FUNCTION mpp_legal_revision();

CREATE TABLE public_form_quotas (
  ip_hash TEXT NOT NULL,
  purpose TEXT NOT NULL,
  window_start TIMESTAMPTZ NOT NULL,
  count INT NOT NULL CHECK(count>0),
  PRIMARY KEY(ip_hash,purpose,window_start)
);
