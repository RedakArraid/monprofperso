import type { Pool } from "pg";
import { pool } from "./db";
import { normalizeAuthPhone } from "./auth";
import { optionalPhone } from "./validate";

export const SEED_ADMIN_PHONE = "+2250700000001";

/** Validation distincte pour rendre l'erreur de configuration explicite au démarrage. */
export function validateBootstrapPhone(value: unknown): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error("ADMIN_BOOTSTRAP_PHONE est obligatoire en production tant que l'administrateur de démonstration existe");
  }
  let phone: string;
  try {
    const validated = optionalPhone({ phone: value.trim().replace(/[\s().-]/g, "") });
    if (!validated) throw new Error("missing phone");
    phone = normalizeAuthPhone(validated);
  } catch {
    throw new Error("ADMIN_BOOTSTRAP_PHONE doit contenir un numéro de téléphone valide");
  }
  if (phone === SEED_ADMIN_PHONE) {
    throw new Error("ADMIN_BOOTSTRAP_PHONE doit être différent du numéro public de démonstration");
  }
  return phone;
}

/**
 * À appeler après les migrations, avant l'écoute HTTP. Aucun compte n'est créé,
 * promu ou supprimé : seul le téléphone du seed admin encore présent est remplacé.
 * Une connexion injectable permet de tester l'opération dans un schéma isolé.
 */
export async function bootstrapProductionAdmin(database: Pick<Pool, "connect"> = pool): Promise<void> {
  if (process.env.NODE_ENV !== "production") return;
  const client = await database.connect();
  let transactionOpen = false;
  try {
    await client.query("BEGIN");
    transactionOpen = true;
    await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", ["monprofperso:production-admin-bootstrap-v1"]);
    const seed = (await client.query("SELECT id FROM users WHERE phone=$1 AND role='admin' FOR UPDATE", [SEED_ADMIN_PHONE])).rows[0];
    if (!seed) {
      await client.query("COMMIT");
      transactionOpen = false;
      return;
    }
    const phone = validateBootstrapPhone(process.env.ADMIN_BOOTSTRAP_PHONE);
    // Les comptes historiques peuvent encore contenir un numéro local non normalisé.
    const duplicate = await client.query(
      `SELECT id FROM users WHERE id<>$1 AND (phone=$2 OR
        (CASE WHEN regexp_replace(phone, '[^0-9]', '', 'g') ~ '^0[0-9]{9}$'
          THEN '225' || regexp_replace(phone, '[^0-9]', '', 'g')
          ELSE regexp_replace(phone, '[^0-9]', '', 'g') END) = $3) LIMIT 1`,
      [seed.id, phone, phone.slice(1)],
    );
    if (duplicate.rowCount) throw new Error("ADMIN_BOOTSTRAP_PHONE est déjà associé à un autre compte ; aucun administrateur n'a été modifié");
    await client.query("UPDATE users SET phone=$2 WHERE id=$1 AND phone=$3 AND role='admin'", [seed.id, phone, SEED_ADMIN_PHONE]);
    await client.query("COMMIT");
    transactionOpen = false;
  } catch (error) {
    if (transactionOpen) await client.query("ROLLBACK");
    if ((error as { code?: string }).code === "23505") {
      throw new Error("ADMIN_BOOTSTRAP_PHONE est déjà associé à un autre compte ; aucun administrateur n'a été modifié");
    }
    throw error;
  } finally {
    client.release();
  }
}
