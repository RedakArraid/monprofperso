-- OpenWA : session ID dans le chemin API (/{sessionId}/sendText).

INSERT INTO app_settings (key, value) VALUES
  ('otp_whatsapp_session_id',       ''),
  ('otp_whatsapp_session_in_path',  'true')
ON CONFLICT (key) DO NOTHING;
