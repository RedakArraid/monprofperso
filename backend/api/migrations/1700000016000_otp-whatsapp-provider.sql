-- Provider WhatsApp : gateway OpenWA (rmyndharis) par défaut, wa-automate legacy optionnel.

INSERT INTO app_settings (key, value) VALUES
  ('otp_whatsapp_provider', 'gateway')
ON CONFLICT (key) DO NOTHING;
