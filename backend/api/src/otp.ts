import crypto from "crypto";
import nodemailer from "nodemailer";
import { pool } from "./db";
import { ValidationError } from "./validate";
import { AuthError, isDemoMode } from "./auth";

export const OTP_SETTING_KEYS = [
  "otp_enabled",
  "otp_demo_mode",
  "otp_whatsapp_enabled",
  "otp_whatsapp_base_url",
  "otp_whatsapp_api_key",
  "otp_whatsapp_session_id",
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

function hashCode(challengeId: string, code: string): string {
  const pepper = process.env.JWT_SECRET || "local-development-secret-do-not-use-in-production";
  return crypto.createHmac("sha256", pepper).update(`${challengeId}:${code}`).digest("hex");
}

function ipHash(ip: string): string {
  const pepper = process.env.JWT_SECRET || "local-development-secret-do-not-use-in-production";
  return crypto.createHmac("sha256", pepper).update(`otp-ip:${ip}`).digest("hex");
}

function generateCode(length = 6): string {
  const max = 10 ** length;
  return String(crypto.randomInt(0, max)).padStart(length, "0");
}

function toWhatsAppId(phone: string): string {
  return `${phone.replace(/\D/g, "")}@c.us`;
}

function normalizeWhatsAppBaseUrl(base: string): string {
  return base.trim().replace(/\/$/, "");
}

/** OpenWA Gateway — POST /api/sessions/{sessionId}/messages/send-text */
export function openWaSendTextUrl(settings: Record<string, string>): string {
  const base = normalizeWhatsAppBaseUrl(settings.otp_whatsapp_base_url);
  const sessionId = settings.otp_whatsapp_session_id?.trim();
  const apiBase = base.endsWith("/api") ? base : `${base}/api`;
  return `${apiBase}/sessions/${encodeURIComponent(sessionId!)}/messages/send-text`;
}

function whatsAppAuthHeaders(apiKey: string | undefined): Record<string, string> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const key = apiKey?.trim();
  if (key) headers["X-API-Key"] = key;
  return headers;
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
      headers: whatsAppAuthHeaders(settings.otp_whatsapp_api_key),
      body: JSON.stringify({ chatId: toWhatsAppId(to), text: content }),
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
  // Configuration possible avant la première connexion administrateur.
  for (const key of OTP_SETTING_KEYS) {
    const configured = process.env[key.toUpperCase()];
    if (configured !== undefined) out[key] = configured;
  }
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
  const demo = isDemoMode();
  const enabled = isTrue(s.otp_enabled);
  const whatsapp = enabled && isTrue(s.otp_whatsapp_enabled)
    && !!s.otp_whatsapp_base_url.trim() && !!s.otp_whatsapp_session_id.trim();
  const email = enabled && isTrue(s.otp_smtp_enabled) && !!s.otp_smtp_host.trim();
  const configuredDefault = OTP_CHANNELS.includes(s.otp_default_channel as OtpChannel)
    ? s.otp_default_channel : "whatsapp";
  const defaultChannel = configuredDefault === "email" && email ? "email" : "whatsapp";
  const parsedTtl = parseInt(s.otp_code_ttl_minutes || "10", 10);
  const ttl = Number.isFinite(parsedTtl) ? Math.min(30, Math.max(1, parsedTtl)) : 10;
  return { demo, enabled, whatsapp, email, defaultChannel, codeLength: 6, ttlMinutes: ttl };
}

async function sendWhatsApp(settings: Record<string, string>, phone: string, code: string, ttl: number) {
  const content = `Votre code Mon Prof Perso : ${code}. Valide ${ttl} minute${ttl > 1 ? "s" : ""}. Ne le partagez pas.`;
  await postOpenWaSendText(settings, phone, content);
}

async function sendEmail(settings: Record<string, string>, email: string, code: string, ttl: number) {
  const port = parseInt(settings.otp_smtp_port || "587", 10) || 587;
  const transporter = nodemailer.createTransport({
    host: settings.otp_smtp_host.trim(),
    connectionTimeout: 10_000, greetingTimeout: 10_000, socketTimeout: 15_000,
    disableFileAccess: true, disableUrlAccess: true,
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

export type Registration = {
  fullName: string;
  phone: string;
  role: "parent" | "student" | "teacher";
  email?: string;
  consentVersion: string;
  parentalConsent: boolean;
};

export type ChallengeResponse = {
  otpRequired: true;
  challengeId: string;
  channel: OtpChannel;
  destination: string;
  expiresInMinutes: number;
  sent: true;
  demo: false;
};

/** La destination réelle reste dans le challenge et chez le fournisseur uniquement. */
export function maskOtpDestination(channel: OtpChannel, destination: string): string {
  if (channel === "email") {
    const [local, domain = ""] = destination.split("@");
    const suffix = domain.includes(".") ? `.${domain.split(".").pop()}` : "";
    return `${local.slice(0, 1)}***@${domain.slice(0, 1)}***${suffix}`;
  }
  const digits = destination.replace(/\D/g, "");
  return `+${digits.slice(0, 3)} ******${digits.slice(-2)}`;
}

type ChallengeInput = {
  phone: string;
  userId: number | null;
  purpose: "login" | "signup";
  channel: OtpChannel;
  destination: string;
  registration?: Registration;
  ip: string;
};

/** Réserve le challenge avant l'envoi ; les limites sont partagées entre processus API. */
async function issueChallenge(input: ChallengeInput): Promise<ChallengeResponse> {
  const settings = await loadOtpSettings();
  const channels = await getOtpChannels();
  if (!channels.enabled || !(input.channel === "whatsapp" ? channels.whatsapp : channels.email)) {
    throw new AuthError(503, "otp_unavailable", "La vérification n'est pas configurée pour ce canal. Contactez l'assistance.");
  }
  const id = crypto.randomUUID();
  const code = generateCode();
  const hashedIp = ipHash(input.ip);
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [`otp-phone:${input.phone}`]);
    await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [`otp-ip:${hashedIp}`]);
    const recent = (await client.query(
      `SELECT count(*)::int AS count,
              COALESCE(extract(epoch FROM (now() - max(created_at))), 9999) AS elapsed
         FROM auth_challenges WHERE phone=$1 AND created_at > now() - interval '15 minutes'`,
      [input.phone],
    )).rows[0];
    const ipCount = (await client.query(
      "SELECT count(*)::int AS count FROM auth_challenges WHERE client_ip_hash=$1 AND created_at > now() - interval '15 minutes'",
      [hashedIp],
    )).rows[0].count;
    if (recent.count >= 5 || ipCount >= 25) {
      throw new AuthError(429, "otp_rate_limited", "Trop de demandes. Réessayez dans quelques minutes.", 900);
    }
    const elapsed = Number(recent.elapsed);
    if (elapsed < 60) {
      throw new AuthError(429, "otp_rate_limited", "Patientez une minute avant de demander un nouveau code.", Math.ceil(60 - elapsed));
    }
    await client.query("UPDATE auth_challenges SET consumed_at=now() WHERE phone=$1 AND consumed_at IS NULL", [input.phone]);
    await client.query(
      `INSERT INTO auth_challenges (id, phone, user_id, purpose, channel, destination, registration,
                                    code_hash, expires_at, client_ip_hash)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,now() + ($9 * interval '1 minute'),$10)`,
      [id, input.phone, input.userId, input.purpose, input.channel, input.destination,
        input.registration ? JSON.stringify(input.registration) : null, hashCode(id, code), channels.ttlMinutes, hashedIp],
    );
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
  try {
    if (input.channel === "whatsapp") await sendWhatsApp(settings, input.destination, code, channels.ttlMinutes);
    else await sendEmail(settings, input.destination, code, channels.ttlMinutes);
    await pool.query("UPDATE auth_challenges SET delivered_at=now() WHERE id=$1 AND consumed_at IS NULL", [id]);
  } catch {
    await pool.query("UPDATE auth_challenges SET consumed_at=now() WHERE id=$1", [id]);
    throw new AuthError(503, "otp_delivery_failed", "L'envoi du code a échoué. Réessayez plus tard.");
  }
  return {
    otpRequired: true, challengeId: id, channel: input.channel, destination: maskOtpDestination(input.channel, input.destination),
    expiresInMinutes: channels.ttlMinutes, sent: true, demo: false,
  };
}

export async function beginLoginChallenge(opts: {
  phone: string; email?: string; channel?: OtpChannel; ip: string;
}): Promise<ChallengeResponse> {
  const channels = await getOtpChannels();
  if (!channels.enabled || (!channels.whatsapp && !channels.email)) {
    throw new AuthError(503, "otp_unavailable", "La vérification n'est pas configurée. Contactez l'assistance.");
  }
  const user = (await pool.query("SELECT id, phone, email, email_verified_at FROM users WHERE phone=$1", [opts.phone])).rows[0];
  if (!user) throw new AuthError(401, "invalid_credentials", "Compte introuvable. Inscrivez-vous pour continuer.");
  const channel = opts.channel ?? (channels.defaultChannel as OtpChannel);
  let destination = user.phone;
  if (channel === "email") {
    if (!user.email_verified_at || !user.email || (opts.email && opts.email !== user.email.toLowerCase())) {
      throw new AuthError(400, "unverified_email", "Utilisez WhatsApp : aucune adresse e-mail vérifiée n'est liée à ce compte.");
    }
    destination = user.email.toLowerCase();
  }
  return issueChallenge({ phone: user.phone, userId: user.id, purpose: "login", channel, destination, ip: opts.ip });
}

export async function beginSignupChallenge(registration: Registration, ip: string, channel: OtpChannel = "whatsapp"): Promise<ChallengeResponse> {
  // Posséder une adresse e-mail ne prouve jamais la possession du numéro revendiqué à l'inscription.
  if (channel !== "whatsapp") throw new ValidationError("channel", "L'inscription nécessite la vérification du téléphone par WhatsApp");
  const existing = (await pool.query("SELECT id FROM users WHERE phone=$1", [registration.phone])).rows[0];
  if (existing) return beginLoginChallenge({ phone: registration.phone, channel: "whatsapp", ip });
  return issueChallenge({ phone: registration.phone, userId: null, purpose: "signup", channel: "whatsapp",
    destination: registration.phone, registration, ip });
}

export function isChallengeId(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export async function resendChallenge(challengeId: string, ip: string): Promise<ChallengeResponse> {
  if (!isChallengeId(challengeId)) throw new ValidationError("challengeId", "Identifiant de vérification invalide");
  const row = (await pool.query(
    `SELECT * FROM auth_challenges WHERE id=$1 AND consumed_at IS NULL
      AND created_at > now() - interval '1 hour'`, [challengeId],
  )).rows[0];
  if (!row) throw new AuthError(401, "invalid_challenge", "Vérification expirée. Recommencez la connexion.");
  if (row.purpose === "login") {
    return beginLoginChallenge({ phone: row.phone, channel: row.channel, email: row.channel === "email" ? row.destination : undefined, ip });
  }
  return beginSignupChallenge(row.registration, ip, "whatsapp");
}

/** Consomme un challenge sous verrou, et crée le compte uniquement après la preuve. */
export async function verifyChallenge(challengeId: string, code: string): Promise<any> {
  if (!isChallengeId(challengeId)) throw new ValidationError("challengeId", "Identifiant de vérification invalide");
  if (!/^\d{6}$/.test(code)) throw new ValidationError("code", "Le code doit contenir 6 chiffres");
  const client = await pool.connect();
  let transactionOpen = false;
  try {
    await client.query("BEGIN");
    transactionOpen = true;
    const row = (await client.query(
      `SELECT *, expires_at > now() AS unexpired FROM auth_challenges WHERE id=$1 FOR UPDATE`, [challengeId],
    )).rows[0];
    if (!row || row.consumed_at || !row.delivered_at || !row.unexpired || row.attempts >= 5) {
      throw new AuthError(401, "invalid_otp", "Code invalide ou expiré");
    }
    const expected = Buffer.from(row.code_hash, "hex");
    const supplied = Buffer.from(hashCode(challengeId, code), "hex");
    const valid = expected.length === supplied.length && crypto.timingSafeEqual(expected, supplied);
    await client.query(
      `UPDATE auth_challenges SET attempts=attempts+1,
        consumed_at=CASE WHEN attempts+1 >= 5 THEN now() ELSE consumed_at END WHERE id=$1`, [challengeId],
    );
    if (!valid) {
      // Les tentatives incorrectes doivent persister malgré le refus HTTP.
      await client.query("COMMIT");
      transactionOpen = false;
      throw new AuthError(401, "invalid_otp", "Code invalide ou expiré");
    }
    let user;
    if (row.purpose === "login") {
      user = (await client.query("SELECT * FROM users WHERE id=$1 AND phone=$2 FOR UPDATE", [row.user_id, row.phone])).rows[0];
      if (!user || (row.channel === "email" && (!user.email_verified_at || user.email?.toLowerCase() !== row.destination))) {
        throw new AuthError(401, "invalid_otp", "Le compte associé à cette vérification a changé");
      }
    } else {
      const registration = row.registration as Registration;
      const initials = registration.fullName.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase();
      const inserted = await client.query(
        `INSERT INTO users (full_name, phone, role, initials, consent_version, consent_at, parental_consent, email)
         VALUES ($1,$2,$3,$4,$5,now(),$6,$7) ON CONFLICT (phone) DO NOTHING RETURNING *`,
        [registration.fullName, row.phone, registration.role, initials, registration.consentVersion,
          registration.parentalConsent, registration.email ?? null],
      );
      // Un autre processus a pu créer le compte ; la preuve est bien celle du même téléphone.
      // Ne modifier ni son nom ni son rôle ni son e-mail avec le formulaire d'inscription.
      user = inserted.rows[0] ?? (await client.query("SELECT * FROM users WHERE phone=$1 FOR UPDATE", [row.phone])).rows[0];
      if (!user) throw new AuthError(401, "invalid_otp", "Compte introuvable");
    }
    await client.query("UPDATE auth_challenges SET consumed_at=now() WHERE id=$1", [challengeId]);
    await client.query("COMMIT");
    transactionOpen = false;
    return user;
  } catch (error) {
    if (transactionOpen) await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

/** Compatibilité d'import : les anciens codes par destination ne peuvent plus ouvrir de session. */
export async function createAndSendOtp(opts: { phone?: string; email?: string; channel: OtpChannel; ip?: string }) {
  if (!opts.phone) throw new ValidationError("phone", "téléphone requis");
  return beginLoginChallenge({ ...opts, phone: opts.phone, ip: opts.ip ?? "unknown" });
}
export async function verifyOtpCode(_destination: string, _code: string): Promise<boolean> {
  return false;
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
  if (!settings.otp_whatsapp_session_id?.trim()) {
    throw new ValidationError("otp_whatsapp_session_id", "session ID requis (nom de session OpenWA)");
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
