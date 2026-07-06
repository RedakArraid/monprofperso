-- Retrait des réglages wa-automate legacy (OpenWA Gateway uniquement).

DELETE FROM app_settings WHERE key IN (
  'otp_whatsapp_provider',
  'otp_whatsapp_session_in_path'
);
