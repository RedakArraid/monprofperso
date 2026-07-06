-- OTP par WhatsApp (OpenWA) et e-mail (SMTP), configurable via l'admin.

CREATE TABLE otp_codes (
  id           SERIAL PRIMARY KEY,
  destination  TEXT NOT NULL,
  channel      TEXT NOT NULL CHECK (channel IN ('whatsapp', 'email')),
  code_hash    TEXT NOT NULL,
  expires_at   TIMESTAMPTZ NOT NULL,
  consumed_at  TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_otp_codes_active ON otp_codes (destination, expires_at DESC)
  WHERE consumed_at IS NULL;

INSERT INTO app_settings (key, value) VALUES
  ('otp_enabled',              'false'),
  ('otp_demo_mode',            'true'),
  ('otp_whatsapp_enabled',     'false'),
  ('otp_whatsapp_base_url',    ''),
  ('otp_whatsapp_api_key',     ''),
  ('otp_smtp_enabled',         'false'),
  ('otp_smtp_host',            ''),
  ('otp_smtp_port',            '587'),
  ('otp_smtp_secure',          'false'),
  ('otp_smtp_user',            ''),
  ('otp_smtp_pass',            ''),
  ('otp_smtp_from',            'Mon Prof Perso <noreply@monprofperso.com>'),
  ('otp_code_ttl_minutes',     '10'),
  ('otp_default_channel',      'whatsapp')
ON CONFLICT (key) DO NOTHING;
