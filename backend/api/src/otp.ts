import crypto from "crypto";
import nodemailer from "nodemailer";
import { pool } from "./db";
import { ValidationError } from "./validate";

export const OTP_SETTING_KEYS = [
  "otp_enabled",
  "otp_demo_mode",
  "otp_whatsapp_enabled",
  "otp_whatsapp_base_url",
  "otp_whatsapp_api_key",
  "otp_whatsapp_provider",
  "otp_whatsapp_session_id",
  "otp_whatsapp_session_in_path",
  "otp_smtp_enabled",
  "otp_smtp_host",
  "otp_smtp_port",
  "otp_smtp_secure",
  "otp_smtp_user",
  "otp_smtp_pass",
  "otp_smtp_from",
  "otp_code_ttl_minutes",
  "otp_default_channel",
] as const;

const SECRET_KEYS = new Set(["otp_whatsapp_api_key", "otp_smtp_pass"]);
export const OTP_SECRET_MASK = "********";

const OTP_CHANNELS = ["whatsapp", "email"] as const;
export type OtpChannel = (typeof OTP_CHANNELS)[number];

function isTrue(v: string | undefined): boolean {
  return v === "true" || v === "1";
}

function hashCode(code: string): string {
  const pepper = process.env.JWT_SECRET || "otp-pepper";
  return crypto.createHash("sha256").update(`${code}:${pepper}`).digest("hex");
}

function generateCode(length = 6): string {
  const max = 10 ** length;
  return String(crypto.randomInt(0, max)).padStart(length, "0");
}

function toWhatsAppId(phone: string): string {
  return `${phone.replace(/\D/g, "")}@c.us`;
}

const WHATSAPP_PROVIDERS = ["gateway", "wa-automate"] as const;
type WhatsAppProvider = (typeof WHATSAPP_PROVIDERS)[number];

function whatsAppProvider(settings: Record<string, string>): WhatsAppProvider {
  const p = settings.otp_whatsapp_provider?.trim();
  return p === "wa-automate" ? "wa-automate" : "gateway";
}

function normalizeWhatsAppBaseUrl(base: string): string {
  return base.trim().replace(/\/$/, "");
}

/**
 * URL d'envoi WhatsApp :
 * - gateway (rmyndharis/OpenWA) : POST /api/sessions/{sessionId}/messages/send-text
 * - wa-automate (legacy @open-wa) : POST /sendText ou /{sessionId}/sendText
 */
export function openWaSendTextUrl(settings: Record<string, string>): string {
  const base = normalizeWhatsAppBaseUrl(settings.otp_whatsapp_base_url);
  const sessionId = settings.otp_whatsapp_session_id?.trim();

  if (whatsAppProvider(settings) === "gateway") {
    const apiBase = base.endsWith("/api") ? base : `${base}/api`;
    return `${apiBase}/sessions/${encodeURIComponent(sessionId!)}/messages/send-text`;
  }

  if (isTrue(settings.otp_whatsapp_session_in_path) && sessionId) {
    return `${base}/${encodeURIComponent(sessionId)}/sendText`;
  }
  return `${base}/sendText`;
}

function whatsAppAuthHeaders(settings: Record<string, string>): Record<string, string> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const key = settings.otp_whatsapp_api_key?.trim();
  if (!key) return headers;
  if (whatsAppProvider(settings) === "gateway") {
    headers["X-API-Key"] = key;
  } else {
    headers.Authorization = key;
  }
  return headers;
}

function whatsAppSendBody(settings: Record<string, string>, to: string, content: string): string {
  const chatId = toWhatsAppId(to);
  if (whatsAppProvider(settings) === "gateway") {
    return JSON.stringify({ chatId, text: content });
  }
  return JSON.stringify({ args: { to: chatId, content } });
}

const WHATSAPP_FETCH_MS = 15_000;

async function postOpenWaSendText(
  settings: Record<string, string>,
  to: string,
  content: string
): Promise<void> {
  const url = openWaSendTextUrl(settings);
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), WHATSAPP_FETCH_MS);
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: whatsAppAuthHeaders(settings),
      body: whatsAppSendBody(settings, to, content),
      signal: ac.signal,
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      throw new Error(`OpenWA ${res.status}${detail ? `: ${detail.slice(0, 200)}` : ""}`);
    }
  } catch (e: unknown) {
    if (e instanceof Error && e.name === "AbortError") {
      throw new Error(`OpenWA timeout (${WHATSAPP_FETCH_MS / 1000}s) — URL injoignable : ${url}`);
    }
    if (e instanceof TypeError) {
      throw new Error(`OpenWA injoignable (${url}) : ${e.message}`);
    }
    throw e;
  } finally {
    clearTimeout(timer);
  }
}

export async function loadOtpSettings(): Promise<Record<string, string>> {
  const r = await pool.query(
    "SELECT key, value FROM app_settings WHERE key = ANY($1::text[])",
    [OTP_SETTING_KEYS]
  );
  const out: Record<string, string> = {};
  for (const k of OTP_SETTING_KEYS) out[k] = "";
  for (const row of r.rows) out[row.key] = row.value ?? "";
  return out;
}

export function maskOtpSettings(settings: Record<string, string>): Record<string, string> {
  const out = { ...settings };
  for (const k of SECRET_KEYS) {
    if (out[k]) out[k] = OTP_SECRET_MASK;
  }
  return out;
}

export async function saveOtpSettings(
  updates: Record<string, string>,
  updatedBy: number
): Promise<void> {
  for (const [key, value] of Object.entries(updates)) {
    if (!OTP_SETTING_KEYS.includes(key as (typeof OTP_SETTING_KEYS)[number])) continue;
    await pool.query(
      `INSERT INTO app_settings (key, value, updated_at, updated_by)
       VALUES ($1, $2, now(), $3)
       ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value,
         updated_at = now(), updated_by = EXCLUDED.updated_by`,
      [key, value, updatedBy]
    );
  }
}

export async function getOtpChannels() {
  const s = await loadOtpSettings();
  const demo = isTrue(s.otp_demo_mode) || !isTrue(s.otp_enabled);
  const whatsapp = isTrue(s.otp_whatsapp_enabled) && !!s.otp_whatsapp_base_url.trim();
  const email = isTrue(s.otp_smtp_enabled) && !!s.otp_smtp_host.trim();
  const defaultChannel = OTP_CHANNELS.includes(s.otp_default_channel as OtpChannel)
    ? s.otp_default_channel
    : "whatsapp";
  const ttl = Math.max(1, parseInt(s.otp_code_ttl_minutes || "10", 10) || 10);
  return { demo, whatsapp, email, defaultChannel, codeLength: 6, ttlMinutes: ttl };
}

async function sendWhatsApp(settings: Record<string, string>, phone: string, code: string, ttl: number) {
  const content = `Votre code Mon Prof Perso : ${code}. Valide ${ttl} minute${ttl > 1 ? "s" : ""}. Ne le partagez pas.`;
  await postOpenWaSendText(settings, phone, content);
}

async function sendEmail(settings: Record<string, string>, email: string, code: string, ttl: number) {
  const port = parseInt(settings.otp_smtp_port || "587", 10) || 587;
  const transporter = nodemailer.createTransport({
    host: settings.otp_smtp_host.trim(),
    port,
    secure: isTrue(settings.otp_smtp_secure),
    auth: settings.otp_smtp_user.trim()
      ? { user: settings.otp_smtp_user.trim(), pass: settings.otp_smtp_pass }
      : undefined,
  });
  await transporter.sendMail({
    from: settings.otp_smtp_from.trim() || settings.otp_smtp_user.trim(),
    to: email,
    subject: "Votre code Mon Prof Perso",
    text: `Bonjour,\n\nVotre code de vérification Mon Prof Perso est : ${code}\n\nIl est valide ${ttl} minute${ttl > 1 ? "s" : ""}. Ne le partagez avec personne.\n\n— Mon Prof Perso`,
  });
}

export async function createAndSendOtp(opts: {
  phone?: string;
  email?: string;
  channel: OtpChannel;
}): Promise<{ sent: boolean; demo: boolean; expiresInMinutes: number }> {
  const settings = await loadOtpSettings();
  const channels = await getOtpChannels();
  if (channels.demo) {
    return { sent: false, demo: true, expiresInMinutes: channels.ttlMinutes };
  }

  const ttl = channels.ttlMinutes;
  const destination = opts.channel === "email" ? opts.email?.trim() : opts.phone?.trim();
  if (!destination) {
    throw new ValidationError(
      opts.channel === "email" ? "email" : "phone",
      opts.channel === "email" ? "e-mail requis" : "téléphone requis"
    );
  }

  if (opts.channel === "whatsapp" && !channels.whatsapp) {
    throw new ValidationError("channel", "WhatsApp OTP non configuré");
  }
  if (opts.channel === "email" && !channels.email) {
    throw new ValidationError("channel", "e-mail OTP non configuré");
  }

  const code = generateCode(6);
  await pool.query(
    `UPDATE otp_codes SET consumed_at = now()
     WHERE destination = $1 AND consumed_at IS NULL`,
    [destination]
  );
  await pool.query(
    `INSERT INTO otp_codes (destination, channel, code_hash, expires_at)
     VALUES ($1, $2, $3, now() + ($4::text || ' minutes')::interval)`,
    [destination, opts.channel, hashCode(code), String(ttl)]
  );

  if (opts.channel === "whatsapp") {
    await sendWhatsApp(settings, opts.phone!, code, ttl);
  } else {
    await sendEmail(settings, opts.email!, code, ttl);
  }

  return { sent: true, demo: false, expiresInMinutes: ttl };
}

export async function verifyOtpCode(destination: string, code: string): Promise<boolean> {
  const channels = await getOtpChannels();
  if (channels.demo) return true;

  const r = await pool.query(
    `SELECT id, code_hash FROM otp_codes
     WHERE destination = $1 AND consumed_at IS NULL AND expires_at > now()
     ORDER BY created_at DESC LIMIT 1`,
    [destination]
  );
  const row = r.rows[0];
  if (!row || hashCode(code.trim()) !== row.code_hash) return false;

  await pool.query("UPDATE otp_codes SET consumed_at = now() WHERE id = $1", [row.id]);
  return true;
}

export function mergeOtpSettingsBody(
  body: Record<string, unknown>,
  current: Record<string, string>
): Record<string, string> {
  const updates: Record<string, string> = {};
  for (const key of OTP_SETTING_KEYS) {
    const raw = body[key];
    if (raw === undefined || raw === null) continue;
    if (typeof raw !== "string") continue;
    const v = raw.trim();
    if (SECRET_KEYS.has(key)) {
      if (!v || v === OTP_SECRET_MASK) continue;
      updates[key] = v;
      continue;
    }
    updates[key] = v;
  }
  return updates;
}

/** Fusionne formulaire admin + config sauvegardée (secrets masqués → valeur en base). */
export function mergeOtpSettingsForTest(
  form: Record<string, unknown> | undefined,
  saved: Record<string, string>
): Record<string, string> {
  const merged = { ...saved };
  const src = form ?? {};
  for (const key of OTP_SETTING_KEYS) {
    const raw = src[key];
    if (raw === undefined || raw === null) continue;
    if (typeof raw !== "string") continue;
    const v = raw.trim();
    if (SECRET_KEYS.has(key)) {
      if (!v || v === OTP_SECRET_MASK) continue;
      merged[key] = v;
      continue;
    }
    merged[key] = v;
  }
  return merged;
}

const TEST_WHATSAPP_MSG = "Test Mon Prof Perso — intégration WhatsApp OK.";
const TEST_EMAIL_SUBJECT = "Test Mon Prof Perso — intégration e-mail";
const TEST_EMAIL_BODY =
  "Bonjour,\n\nCeci est un message de test de la configuration SMTP Mon Prof Perso.\n\n— Mon Prof Perso";

export async function testWhatsApp(settings: Record<string, string>, phone: string): Promise<void> {
  if (!settings.otp_whatsapp_base_url?.trim()) {
    throw new ValidationError("otp_whatsapp_base_url", "URL OpenWA requise");
  }
  const provider = whatsAppProvider(settings);
  if (provider === "gateway" && !settings.otp_whatsapp_session_id?.trim()) {
    throw new ValidationError("otp_whatsapp_session_id", "session ID requis (nom de session OpenWA)");
  }
  if (
    provider === "wa-automate" &&
    isTrue(settings.otp_whatsapp_session_in_path) &&
    !settings.otp_whatsapp_session_id?.trim()
  ) {
    throw new ValidationError("otp_whatsapp_session_id", "session ID requis (chemin /{sessionId}/sendText)");
  }
  await postOpenWaSendText(settings, phone, TEST_WHATSAPP_MSG);
}

export async function testSmtp(settings: Record<string, string>, email: string): Promise<void> {
  const host = settings.otp_smtp_host?.trim();
  if (!host) throw new ValidationError("otp_smtp_host", "serveur SMTP requis");
  const port = parseInt(settings.otp_smtp_port || "587", 10) || 587;
  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: isTrue(settings.otp_smtp_secure),
    auth: settings.otp_smtp_user?.trim()
      ? { user: settings.otp_smtp_user.trim(), pass: settings.otp_smtp_pass }
      : undefined,
  });
  await transporter.sendMail({
    from: settings.otp_smtp_from?.trim() || settings.otp_smtp_user?.trim(),
    to: email,
    subject: TEST_EMAIL_SUBJECT,
    text: TEST_EMAIL_BODY,
  });
}

export async function runOtpIntegrationTest(opts: {
  channel: OtpChannel;
  phone?: string;
  email?: string;
  formSettings?: Record<string, unknown>;
}): Promise<{ ok: true; channel: OtpChannel; destination: string; message: string }> {
  const saved = await loadOtpSettings();
  const settings = mergeOtpSettingsForTest(opts.formSettings, saved);

  if (opts.channel === "whatsapp") {
    const phone = opts.phone?.trim();
    if (!phone) throw new ValidationError("phone", "téléphone requis pour le test WhatsApp");
    await testWhatsApp(settings, phone);
    return {
      ok: true,
      channel: "whatsapp",
      destination: phone,
      message: "Message de test WhatsApp envoyé.",
    };
  }

  const email = opts.email?.trim().toLowerCase();
  if (!email) throw new ValidationError("email", "e-mail requis pour le test SMTP");
  await testSmtp(settings, email);
  return {
    ok: true,
    channel: "email",
    destination: email,
    message: "E-mail de test envoyé.",
  };
}
