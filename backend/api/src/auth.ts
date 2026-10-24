import { createHmac, timingSafeEqual } from "crypto";
import type { Request, Response, NextFunction } from "express";
import { pool } from "./db";

const TOKEN_VERSION = 2;
const TOKEN_AUDIENCE = "monprofperso-api";
const TOKEN_ISSUER = "monprofperso-auth";
const TTL_SECONDS = 60 * 60 * 24;
const ROLES = new Set(["parent", "student", "teacher", "admin"]);

/** Un raccourci de démo doit être choisi explicitement et ne fonctionne jamais en production. */
export function isDemoMode(): boolean {
  return process.env.DEMO_MODE === "true" && process.env.NODE_ENV !== "production";
}

export function assertAuthConfiguration(): void {
  if (process.env.NODE_ENV !== "production") return;
  const secret = process.env.JWT_SECRET?.trim() ?? "";
  if (secret.length < 32 || new Set(secret).size < 8
      || /^(dev-secret|GENERER_|change.?me|local-only|local-development|test-?secret)/i.test(secret)) {
    throw new Error("JWT_SECRET doit être un secret aléatoire de 32 caractères minimum en production");
  }
  if (process.env.DEMO_MODE === "true") throw new Error("DEMO_MODE est interdit en production");
}

assertAuthConfiguration();

function secret(): string {
  return process.env.JWT_SECRET?.trim() || "local-development-secret-do-not-use-in-production";
}

// Conservé pour les fixtures locales uniquement. Aucune requête anonyme n'utilise cet identifiant.
export const DEMO_USER = 1;

/** À utiliser après validation du numéro ; conserve les numéros internationaux des comptes existants. */
export function normalizeAuthPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 10 && digits.startsWith("0")) return `+225${digits}`;
  return `+${digits}`;
}

const b64url = (value: Buffer | string) => Buffer.from(value).toString("base64url");
const b64urlJson = (value: unknown) => b64url(JSON.stringify(value));
const sign = (value: string) => createHmac("sha256", secret()).update(value).digest("base64url");

export interface JwtPayload {
  sub: number;
  role?: string;
  iat: number;
  exp: number;
  v: number;
  aud: string;
  iss: string;
  auth_time?: number;
}

/** Les jetons v2 remplacent les anciens JWT délivrés sans preuve de possession. */
export function signJwt(sub: number, role?: string): string {
  if (!Number.isSafeInteger(sub) || sub < 1 || (role !== undefined && !ROLES.has(role))) {
    throw new Error("Identité de session invalide");
  }
  const now = Math.floor(Date.now() / 1000);
  const header = b64urlJson({ alg: "HS256", typ: "JWT" });
  const payload = b64urlJson({
    sub, role, iat: now, auth_time: now, exp: now + TTL_SECONDS,
    v: TOKEN_VERSION, aud: TOKEN_AUDIENCE, iss: TOKEN_ISSUER,
  } satisfies JwtPayload);
  const body = `${header}.${payload}`;
  return `${body}.${sign(body)}`;
}

export function verifyJwt(token: string): JwtPayload | null {
  if (token.length > 4096) return null;
  const parts = token.split(".");
  if (parts.length !== 3 || parts.some((part) => !/^[A-Za-z0-9_-]+$/.test(part))) return null;
  const [header, payload, signature] = parts;
  const expected = Buffer.from(sign(`${header}.${payload}`));
  const provided = Buffer.from(signature);
  if (provided.length !== expected.length || !timingSafeEqual(provided, expected)) return null;
  try {
    const meta = JSON.parse(Buffer.from(header, "base64url").toString("utf8"));
    if (meta?.alg !== "HS256" || meta?.typ !== "JWT") return null;
    const claims = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as JwtPayload;
    const now = Math.floor(Date.now() / 1000);
    if (!Number.isSafeInteger(claims.sub) || claims.sub < 1) return null;
    if (!Number.isSafeInteger(claims.exp) || claims.exp <= now) return null;
    if (!Number.isSafeInteger(claims.iat) || claims.iat > now + 30 || claims.iat > claims.exp) return null;
    if (claims.v !== TOKEN_VERSION || claims.aud !== TOKEN_AUDIENCE || claims.iss !== TOKEN_ISSUER) return null;
    if (claims.role !== undefined && !ROLES.has(claims.role)) return null;
    if (claims.auth_time !== undefined && (!Number.isSafeInteger(claims.auth_time)
      || claims.auth_time > claims.iat || claims.auth_time < 0)) return null;
    return claims;
  } catch {
    return null;
  }
}

export class AuthError extends Error {
  constructor(public statusCode: number, public code: string, message: string, public retryAfter?: number) {
    super(message);
    this.name = "AuthError";
  }
}

/** Le rôle vient de la base courante : une rétrogradation prend effet sans attendre l'expiration du JWT. */
export function optionalAuth(req: Request, res: Response, next: NextFunction): void {
  res.locals.userId = undefined;
  res.locals.userRole = undefined;
  res.locals.teacherId = undefined;
  res.locals.authTime = undefined;
  const match = (req.header("authorization") ?? "").match(/^Bearer\s+(.+)$/i);
  const claims = match ? verifyJwt(match[1]) : null;
  if (!claims) { next(); return; }
  pool.query("SELECT id, role, teacher_id FROM users WHERE id=$1 AND deleted_at IS NULL", [claims.sub])
    .then(({ rows }) => {
      const user = rows[0];
      if (user && ROLES.has(user.role)) {
        res.locals.userId = user.id;
        res.locals.userRole = user.role;
        res.locals.teacherId = user.teacher_id;
        res.locals.authTime = claims.auth_time ?? claims.iat;
      }
      next();
    })
    .catch(next);
}

export function currentUserId(res: Response): number {
  const id = res.locals.userId;
  if (!Number.isSafeInteger(id) || id < 1) throw new AuthError(401, "unauthorized", "Connexion requise");
  return id;
}

export function currentRole(res: Response): string | undefined {
  return res.locals.userRole as string | undefined;
}

export function requireAuth(_req: Request, res: Response, next: NextFunction): void {
  if (!Number.isSafeInteger(res.locals.userId) || res.locals.userId < 1) {
    res.status(401).json({ error: "unauthorized", message: "Connexion requise" });
    return;
  }
  next();
}

export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  requireAuth(req, res, () => {
    if (currentRole(res) !== "admin") {
      res.status(403).json({ error: "forbidden", message: "Accès administrateur requis" });
      return;
    }
    next();
  });
}

/** Sensitive account actions require a recently proven session, never a refreshed timestamp. */
export function requireRecentAuth(req: Request, res: Response, next: NextFunction): void {
  requireAuth(req, res, () => {
    const authenticatedAt = res.locals.authTime;
    if (!Number.isSafeInteger(authenticatedAt) || Date.now() / 1000 - authenticatedAt > 900) {
      res.status(403).json({ error: "reauthentication_required", message: "Reconnectez-vous pour confirmer cette action sur votre compte." });
      return;
    }
    next();
  });
}

export function requireTeacher(req: Request, res: Response, next: NextFunction): void {
  requireAuth(req, res, () => {
    if (currentRole(res) !== "teacher" || !Number.isSafeInteger(res.locals.teacherId) || res.locals.teacherId < 1) {
      res.status(403).json({ error: "forbidden", message: "Compte professeur validé requis" });
      return;
    }
    next();
  });
}
