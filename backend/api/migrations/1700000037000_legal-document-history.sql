-- Les révisions auxquelles un consentement fait référence restent consultables.
-- Une nouvelle publication n'efface ni le PDF précédent ni son identifiant.
CREATE TABLE legal_document_versions (
  slug TEXT NOT NULL REFERENCES legal_documents(slug),
  revision_id UUID NOT NULL,
  title TEXT NOT NULL,
  version TEXT,
  file_name TEXT,
  mime_type TEXT,
  size_bytes INT,
  content BYTEA,
  storage_key TEXT,
  published_at TIMESTAMPTZ NOT NULL,
  published_by INT REFERENCES users(id),
  PRIMARY KEY(slug,revision_id)
);
INSERT INTO legal_document_versions
  (slug,revision_id,title,version,file_name,mime_type,size_bytes,content,storage_key,published_at,published_by)
SELECT slug,revision_id,title,version,file_name,mime_type,size_bytes,content,storage_key,updated_at,updated_by
FROM legal_documents WHERE content IS NOT NULL OR storage_key IS NOT NULL;

CREATE FUNCTION mpp_archive_legal_document_version() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.content IS NOT NULL OR NEW.storage_key IS NOT NULL THEN
    INSERT INTO legal_document_versions
      (slug,revision_id,title,version,file_name,mime_type,size_bytes,content,storage_key,published_at,published_by)
    VALUES(NEW.slug,NEW.revision_id,NEW.title,NEW.version,NEW.file_name,NEW.mime_type,NEW.size_bytes,
      NEW.content,NEW.storage_key,NEW.updated_at,NEW.updated_by)
    ON CONFLICT(slug,revision_id) DO NOTHING;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER legal_document_history AFTER INSERT OR UPDATE ON legal_documents
  FOR EACH ROW EXECUTE FUNCTION mpp_archive_legal_document_version();
