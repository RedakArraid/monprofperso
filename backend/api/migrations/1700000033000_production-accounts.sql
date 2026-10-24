-- Comptes fermés, demandes traçables et préparation de l'ouverture réelle.
CREATE TABLE IF NOT EXISTS installation_metadata (key TEXT PRIMARY KEY, value TEXT NOT NULL);
INSERT INTO installation_metadata (key,value) VALUES ('data_origin','legacy') ON CONFLICT DO NOTHING;

ALTER TABLE users ADD COLUMN deleted_at TIMESTAMPTZ;
ALTER TABLE teachers ADD COLUMN archived_at TIMESTAMPTZ;
UPDATE teachers SET rating=0 WHERE reviews_count=0;
UPDATE teacher_profiles SET rating_label='—'
  WHERE teacher_id IN (SELECT id FROM teachers WHERE reviews_count=0);

CREATE TABLE account_deletion_requests (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(id),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','cancelled','completed')),
  requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  cancelled_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  completed_by INT REFERENCES users(id)
);
CREATE UNIQUE INDEX account_deletion_one_pending ON account_deletion_requests(user_id) WHERE status='pending';

CREATE TABLE storage_deletion_queue (
  storage_key TEXT PRIMARY KEY,
  account_request_id INT REFERENCES account_deletion_requests(id),
  attempts INT NOT NULL DEFAULT 0,
  next_attempt_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE production_checks (
  check_key TEXT PRIMARY KEY CHECK (check_key IN ('data_review','provider_e2e','backup_restore','monitoring','legal_review')),
  evidence TEXT NOT NULL CHECK (length(evidence) BETWEEN 20 AND 4000),
  revision TEXT NOT NULL,
  validated_by INT NOT NULL REFERENCES users(id),
  validated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE worker_heartbeats (
  worker TEXT PRIMARY KEY,
  last_started_at TIMESTAMPTZ NOT NULL,
  last_success_at TIMESTAMPTZ,
  last_error TEXT
);

-- Les requêtes arrivées avant la fermeture du compte ne doivent pas pouvoir
-- créer un nouveau cours après elle : le verrou est partagé avec l'anonymisation.
CREATE FUNCTION mpp_require_active_account() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE account_deleted TIMESTAMPTZ; teacher_archived TIMESTAMPTZ;
BEGIN
  IF NEW.user_id IS NOT NULL THEN
    SELECT deleted_at INTO account_deleted FROM users WHERE id=NEW.user_id FOR KEY SHARE;
    IF account_deleted IS NOT NULL OR EXISTS (
      SELECT 1 FROM account_deletion_requests WHERE user_id=NEW.user_id AND status='pending'
    ) THEN
      RAISE EXCEPTION 'account_closing' USING ERRCODE='23514';
    END IF;
  END IF;
  IF TG_TABLE_NAME='courses' THEN
    IF NEW.teacher_id IS NOT NULL THEN
    SELECT archived_at INTO teacher_archived FROM teachers WHERE id=NEW.teacher_id FOR KEY SHARE;
    IF teacher_archived IS NOT NULL OR EXISTS (
      SELECT 1 FROM users u JOIN account_deletion_requests d ON d.user_id=u.id AND d.status='pending'
      WHERE u.teacher_id=NEW.teacher_id
    ) THEN
      RAISE EXCEPTION 'teacher_account_closing' USING ERRCODE='23514';
    END IF;
    END IF;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER courses_active_account BEFORE INSERT ON courses
  FOR EACH ROW EXECUTE FUNCTION mpp_require_active_account();
CREATE TRIGGER needs_active_account BEFORE INSERT ON course_needs
  FOR EACH ROW EXECUTE FUNCTION mpp_require_active_account();
CREATE TRIGGER children_active_account BEFORE INSERT ON children
  FOR EACH ROW EXECUTE FUNCTION mpp_require_active_account();

CREATE FUNCTION mpp_require_existing_actor() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE account_deleted TIMESTAMPTZ; actor INT;
BEGIN
  actor := (to_jsonb(NEW)->>TG_ARGV[0])::INT;
  IF actor IS NOT NULL THEN
    SELECT deleted_at INTO account_deleted FROM users WHERE id=actor FOR KEY SHARE;
    IF account_deleted IS NOT NULL THEN
      RAISE EXCEPTION 'account_closed' USING ERRCODE='23514';
    END IF;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER reports_active_actor BEFORE INSERT ON course_reports
  FOR EACH ROW EXECUTE FUNCTION mpp_require_existing_actor('actor_id');
CREATE TRIGGER reviews_active_actor BEFORE INSERT ON reviews
  FOR EACH ROW EXECUTE FUNCTION mpp_require_existing_actor('user_id');
CREATE TRIGGER finance_active_actor BEFORE INSERT ON finance_operations
  FOR EACH ROW EXECUTE FUNCTION mpp_require_existing_actor('requested_by');

-- Aucune suppression automatique d'historique financier ou de données existantes.
