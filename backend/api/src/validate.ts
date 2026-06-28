// Validation légère des entrées, sans dépendance externe.
//
// Philosophie : rester *permissif* (les apps s'appuient sur des valeurs par
// défaut côté serveur quand un champ manque), mais *rejeter* tout ce qui est
// présent et malformé (mauvais type, hors énumération, format invalide, trop
// long). Une ValidationError est transformée en HTTP 400 par `wrap` (routes.ts).

export class ValidationError extends Error {
  constructor(public field: string, message: string) {
    super(message);
    this.name = "ValidationError";
  }
}

/** Numéro de téléphone ivoirien : 8 à 15 chiffres, indicatif `+` optionnel. */
const PHONE_RE = /^\+?\d{8,15}$/;

/** Chaîne optionnelle : `undefined`/absente OK ; sinon doit être une chaîne bornée. */
export function optionalString(
  body: any,
  field: string,
  { max = 200 }: { max?: number } = {}
): string | undefined {
  const v = body?.[field];
  if (v === undefined || v === null) return undefined;
  if (typeof v !== "string") throw new ValidationError(field, `${field} doit être une chaîne`);
  if (v.length > max) throw new ValidationError(field, `${field} dépasse ${max} caractères`);
  return v;
}

/** Téléphone optionnel : si présent, doit respecter le format. */
export function optionalPhone(body: any, field = "phone"): string | undefined {
  const v = optionalString(body, field, { max: 20 });
  if (v === undefined) return undefined;
  const trimmed = v.trim();
  if (trimmed === "") return undefined;
  if (!PHONE_RE.test(trimmed)) throw new ValidationError(field, `${field} invalide`);
  return trimmed;
}

/** Énumération optionnelle : si présent, doit faire partie des valeurs autorisées. */
export function optionalEnum(body: any, field: string, allowed: readonly string[]): string | undefined {
  const v = optionalString(body, field, { max: 50 });
  if (v === undefined) return undefined;
  if (!allowed.includes(v)) throw new ValidationError(field, `${field} doit être parmi : ${allowed.join(", ")}`);
  return v;
}

/** Chaîne obligatoire (non vide). Pour les écritures admin où le champ est requis. */
export function requiredString(body: any, field: string, { max = 200 }: { max?: number } = {}): string {
  const v = optionalString(body, field, { max });
  if (v === undefined || v.trim() === "") throw new ValidationError(field, `${field} est requis`);
  return v.trim();
}

/** Énumération obligatoire. */
export function requiredEnum(body: any, field: string, allowed: readonly string[]): string {
  const v = requiredString(body, field, { max: 50 });
  if (!allowed.includes(v)) throw new ValidationError(field, `${field} doit être parmi : ${allowed.join(", ")}`);
  return v;
}

/** Nombre optionnel : accepte number ou chaîne numérique ; rejette le reste. */
export function optionalNumber(
  body: any,
  field: string,
  { min, max }: { min?: number; max?: number } = {}
): number | undefined {
  const v = body?.[field];
  if (v === undefined || v === null || v === "") return undefined;
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n)) throw new ValidationError(field, `${field} doit être un nombre`);
  if (min !== undefined && n < min) throw new ValidationError(field, `${field} < ${min}`);
  if (max !== undefined && n > max) throw new ValidationError(field, `${field} > ${max}`);
  return n;
}
