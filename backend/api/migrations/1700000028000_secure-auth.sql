-- Up Migration
-- Aucun ancien code OTP ni ancien JWT ne peut établir une nouvelle session v2.
UPDATE otp_codes SET consumed_at = now() WHERE consumed_at IS NULL;

ALTER TABLE users ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified_at TIMESTAMPTZ;

CREATE TABLE auth_challenges (
  id                   UUID PRIMARY KEY,
  phone                TEXT NOT NULL,
  user_id              INT REFERENCES users(id) ON DELETE CASCADE,
  purpose              TEXT NOT NULL CHECK (purpose IN ('login', 'signup')),
  channel              TEXT NOT NULL CHECK (channel IN ('whatsapp', 'email')),
  destination          TEXT NOT NULL,
  registration         JSONB,
  code_hash            TEXT NOT NULL,
  attempts             INT NOT NULL DEFAULT 0 CHECK (attempts BETWEEN 0 AND 5),
  expires_at           TIMESTAMPTZ NOT NULL,
  delivered_at         TIMESTAMPTZ,
  consumed_at          TIMESTAMPTZ,
  client_ip_hash       TEXT NOT NULL,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK ((purpose = 'login' AND user_id IS NOT NULL AND registration IS NULL)
      OR (purpose = 'signup' AND user_id IS NULL AND registration IS NOT NULL))
);

CREATE INDEX auth_challenges_phone_created_idx ON auth_challenges(phone, created_at DESC);
CREATE INDEX auth_challenges_ip_created_idx ON auth_challenges(client_ip_hash, created_at DESC);
CREATE INDEX auth_challenges_active_idx ON auth_challenges(expires_at) WHERE consumed_at IS NULL;

-- Down Migration
DROP TABLE IF EXISTS auth_challenges;
ALTER TABLE users DROP COLUMN IF EXISTS email_verified_at;
ALTER TABLE users DROP COLUMN IF EXISTS email;
