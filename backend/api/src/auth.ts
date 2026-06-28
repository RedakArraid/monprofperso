// Authentification JWT (HS256), implémentée avec le module `crypto` natif,
// sans dépendance externe.
//
// Stratégie de migration *rétrocompatible* :
//   - login/signup/verify-otp émettent désormais un vrai JWT (claim `sub` = id user).
//   - `optionalAuth` lit `Authorization: Bearer <jwt>` ; si valide, fixe l'utilisateur
//     courant à `sub`. Sinon (absent, malformé, expiré, ancien "demo-token") il
//     retombe sur DEMO_USER. Les apps actuelles, qui n'envoient pas d'en-tête,
//     continuent donc de fonctionner à l'identique.
//
// ⚠️ Pour de la vraie prod : ajouter révocation/rotation et un `JWT_SECRET` fort.

import { createHmac, timingSafeEqual } from "crypto";
import type { Request, Response, NextFunction } from "express";

const SECRET = process.env.JWT_SECRET ?? "dev-secret-change-me";
const TTL_SECONDS = 60 * 60 * 24 * 30; // 30 jours

// Utilisateur de démonstration (repli quand aucun token valide n'est fourni).
export const DEMO_USER = 1;

const b64url = (buf: Buffer | string) =>
  Buffer.from(buf).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

const b64urlJson = (obj: unknown) => b64url(JSON.stringify(obj));

function sign(data: string): string {
  return b64url(createHmac("sha256", SECRET).update(data).digest());
}

export interface JwtPayload {
  sub: number;
  role?: string;
  iat: number;
  exp: number;
}

/** Émet un JWT signé pour un utilisateur. */
export function signJwt(sub: number, role?: string): string {
  const now = Math.floor(Date.now() / 1000);
  const header = b64urlJson({ alg: "HS256", typ: "JWT" });
  const payload = b64urlJson({ sub, role, iat: now, exp: now + TTL_SECONDS } satisfies JwtPayload);
  const body = `${header}.${payload}`;
  return `${body}.${sign(body)}`;
}

/** Vérifie signature + expiration. Renvoie le payload ou `null` si invalide. */
export function verifyJwt(token: string): JwtPayload | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [header, payload, sig] = parts;
  const expected = sign(`${header}.${payload}`);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const claims = JSON.parse(Buffer.from(payload, "base64").toString()) as JwtPayload;
    if (typeof claims.sub !== "number") return null;
    if (typeof claims.exp === "number" && claims.exp < Math.floor(Date.now() / 1000)) return null;
    return claims;
  } catch {
    return null;
  }
}

/**
 * Middleware : résout l'utilisateur courant dans `res.locals.userId`.
 * Token valide -> son `sub` ; sinon repli sur DEMO_USER (rétrocompat).
 */
export function optionalAuth(req: Request, res: Response, next: NextFunction): void {
  const header = req.header("authorization") ?? "";
  const m = header.match(/^Bearer\s+(.+)$/i);
  const claims = m ? verifyJwt(m[1]) : null;
  res.locals.userId = claims?.sub ?? DEMO_USER;
  res.locals.userRole = claims?.role; // rôle du token (undefined en repli démo)
  next();
}

/** Identifiant de l'utilisateur courant (posé par `optionalAuth`). */
export function currentUserId(res: Response): number {
  return (res.locals.userId as number | undefined) ?? DEMO_USER;
}

/** Rôle de l'utilisateur courant (issu du token), ou `undefined` en repli démo. */
export function currentRole(res: Response): string | undefined {
  return res.locals.userRole as string | undefined;
}

/**
 * Garde admin : exige un token JWT valide avec `role === "admin"`.
 * 401 si pas de token valide, 403 si l'utilisateur n'est pas administrateur.
 * À monter APRÈS `optionalAuth`.
 */
export function requireAdmin(_req: Request, res: Response, next: NextFunction): void {
  const role = currentRole(res);
  if (role === undefined) { res.status(401).json({ error: "unauthorized" }); return; }
  if (role !== "admin") { res.status(403).json({ error: "forbidden" }); return; }
  next();
}
