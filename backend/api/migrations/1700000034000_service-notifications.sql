-- Alertes transactionnelles : destinataires prouvés, préférences et reprise durable.
ALTER TABLE users
  ADD COLUMN phone_verified_at TIMESTAMPTZ,
  ADD COLUMN notifications_whatsapp BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN notifications_email BOOLEAN NOT NULL DEFAULT FALSE;

CREATE TABLE notification_deliveries (
  id BIGSERIAL PRIMARY KEY,
  notification_id INT NOT NULL REFERENCES notifications(id) ON DELETE CASCADE,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  channel TEXT NOT NULL CHECK (channel IN ('whatsapp','email')),
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued','sent','skipped','failed')),
  attempts INT NOT NULL DEFAULT 0,
  next_attempt_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  lease_until TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  last_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(notification_id,channel)
);
CREATE INDEX notification_delivery_due ON notification_deliveries(next_attempt_at,id) WHERE status='queued';

CREATE FUNCTION mpp_enqueue_service_notification() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE account_row users%ROWTYPE;
BEGIN
  -- Cadeaux/parrainage et messages promotionnels ne sont jamais expédiés ici.
  IF NEW.icon NOT IN ('calendar','wallet','seal','check','alert','clock','file') THEN RETURN NEW; END IF;
  SELECT * INTO account_row FROM users WHERE id=NEW.user_id AND deleted_at IS NULL;
  IF NOT FOUND THEN RETURN NEW; END IF;
  IF account_row.notifications_whatsapp AND account_row.phone_verified_at IS NOT NULL THEN
    INSERT INTO notification_deliveries(notification_id,user_id,channel) VALUES(NEW.id,NEW.user_id,'whatsapp');
  END IF;
  IF account_row.notifications_email AND account_row.email_verified_at IS NOT NULL THEN
    INSERT INTO notification_deliveries(notification_id,user_id,channel) VALUES(NEW.id,NEW.user_id,'email');
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER notifications_delivery AFTER INSERT ON notifications
  FOR EACH ROW EXECUTE FUNCTION mpp_enqueue_service_notification();

CREATE TABLE course_reminders (
  course_id INT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('day_before','hour_before')),
  starts_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY(course_id,user_id,kind,starts_at)
);
