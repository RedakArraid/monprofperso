import type { Router, Request, Response, NextFunction } from "express";
import { pool } from "./db";
import { AuthError, isDemoMode, normalizeAuthPhone, signJwt } from "./auth";
import { ValidationError, optionalEmail, optionalEnum, optionalPhone, optionalString, requiredString } from "./validate";
import { validateConsentVersion } from "./consent";
import {
  beginLoginChallenge, beginSignupChallenge, getOtpChannels, resendChallenge, verifyChallenge,
  type Registration, type OtpChannel,
} from "./otp";

const ROLES = ["parent", "student", "teacher"] as const;
const CHANNELS = ["whatsapp", "email"] as const;

const wrap = (handler: (req: Request, res: Response) => Promise<void>) =>
  (req: Request, res: Response, next: NextFunction) => {
    res.setHeader("Cache-Control", "no-store");
    handler(req, res).catch((error: unknown) => {
      if (error instanceof ValidationError) {
        res.status(400).json({ error: "validation_error", field: error.field, message: error.message });
      } else if (error instanceof AuthError) {
        if (error.retryAfter) res.setHeader("Retry-After", String(error.retryAfter));
        res.status(error.statusCode).json({ error: error.code, message: error.message });
      } else {
        next(error);
      }
    });
  };

function phoneFrom(body: any): string {
  const phone = optionalPhone(body);
  if (!phone) throw new ValidationError("phone", "téléphone requis");
  return normalizeAuthPhone(phone);
}

function clientIp(req: Request): string {
  // req.ip n'utilise Forwarded/X-Forwarded-For que lorsque le serveur configure un proxy de confiance.
  return req.ip || req.socket.remoteAddress || "unknown";
}

function session(res: Response, user: any): void {
  res.status(200).json({ token: signJwt(user.id, user.role), user, verified: true, demo: isDemoMode() });
}

async function demoLogin(phone: string): Promise<any> {
  const user = (await pool.query("SELECT * FROM users WHERE phone=$1 AND deleted_at IS NULL", [phone])).rows[0];
  if (!user) throw new AuthError(401, "invalid_credentials", "Compte introuvable");
  return user;
}

export function registerAuthRoutes(api: Router): void {
  api.get("/auth/login", (_req, res) => res.redirect(302, "/connexion.html"));

  api.get("/auth/otp-channels", wrap(async (_req, res) => {
    res.json(await getOtpChannels());
  }));

  api.post("/auth/login", wrap(async (req, res) => {
    const phone = phoneFrom(req.body);
    if (isDemoMode()) { session(res, await demoLogin(phone)); return; }
    const channel = optionalEnum(req.body, "channel", CHANNELS) as OtpChannel | undefined;
    const challenge = await beginLoginChallenge({ phone, channel, email: optionalEmail(req.body), ip: clientIp(req) });
    res.status(202).json(challenge);
  }));

  api.post("/auth/signup", wrap(async (req, res) => {
    const b = req.body ?? {};
    const fullName = requiredString(b, "fullName", { max: 120 });
    const phone = phoneFrom(b);
    const role = (optionalEnum(b, "role", ROLES) ?? "parent") as Registration["role"];
    const consent = b.consent === true || b.consent === "true";
    const parentalConsent = b.parentalConsent === true || b.parentalConsent === "true";
    if (!consent) throw new ValidationError("consent", "acceptation des CGU requise");
    if (role === "student" && !parentalConsent) throw new ValidationError("parentalConsent", "consentement parental requis pour un compte élève");
    const consentVersion = await validateConsentVersion(b.consentVersion);
    const registration: Registration = {
      fullName, phone, role, email: optionalEmail(b), parentalConsent, consentVersion,
    };
    if (isDemoMode()) {
      const initials = fullName.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase();
      const inserted = await pool.query(
        `INSERT INTO users (full_name,phone,role,initials,consent_version,consent_at,parental_consent,email)
         VALUES ($1,$2,$3,$4,$5,now(),$6,$7) ON CONFLICT (phone) DO NOTHING RETURNING *`,
        [fullName,phone,role,initials,consentVersion,parentalConsent,registration.email ?? null],
      );
      session(res, inserted.rows[0] ?? await demoLogin(phone));
      return;
    }
    const channel = (optionalEnum(b, "channel", CHANNELS) ?? "whatsapp") as OtpChannel;
    res.status(202).json(await beginSignupChallenge(registration, clientIp(req), channel));
  }));

  api.post("/auth/request-otp", wrap(async (req, res) => {
    const challengeId = optionalString(req.body, "challengeId", { max: 36 });
    if (challengeId) {
      res.status(202).json(await resendChallenge(challengeId, clientIp(req)));
      return;
    }
    const phone = phoneFrom(req.body);
    const channel = optionalEnum(req.body, "channel", CHANNELS) as OtpChannel | undefined;
    const email = optionalEmail(req.body);
    if (channel === "email" && !email) throw new ValidationError("email", "e-mail requis");
    if (isDemoMode()) {
      await demoLogin(phone);
      res.json({ sent: false, demo: true, expiresInMinutes: 10, channel: channel ?? "whatsapp", destination: phone });
      return;
    }
    res.status(202).json(await beginLoginChallenge({ phone, channel, email, ip: clientIp(req) }));
  }));

  api.post("/auth/verify-otp", wrap(async (req, res) => {
    const challengeId = optionalString(req.body, "challengeId", { max: 36 });
    // Compatibilité des outils de démo locaux ; ce chemin n'est jamais disponible en production.
    if (isDemoMode() && !challengeId) { session(res, await demoLogin(phoneFrom(req.body))); return; }
    if (!challengeId) throw new ValidationError("challengeId", "identifiant de vérification requis");
    const code = requiredString(req.body, "code", { max: 6 });
    // Ni phone ni email fournis dans cette requête ne peuvent remplacer le compte fixé par le challenge.
    const user = await verifyChallenge(challengeId, code);
    session(res, user);
  }));
}
