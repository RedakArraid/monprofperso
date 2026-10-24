import { createHash } from "crypto";
import { pool } from "./db";
import { AuthError } from "./auth";

export async function currentLegalConsent() {
  const documents = (await pool.query(`SELECT slug,title,version,revision_id,
    (content IS NOT NULL OR storage_key IS NOT NULL) AS published FROM legal_documents
    WHERE slug IN ('cgu','confidentialite') ORDER BY slug`)).rows;
  const identity = documents.map((row: any) => [row.slug, row.version, row.revision_id]);
  const digest = createHash("sha256").update(JSON.stringify(identity)).digest("hex").slice(0, 24);
  const version = `${documents.map((row: any) => row.version || "sans-version").join("/")}:${digest}`;
  return { version, published: documents.length === 2 && documents.every((row: any) => row.published && row.version),
    revisions: documents.map(({ slug, version, revision_id }: any) => ({ slug, version, revisionId: revision_id })),
    documents: documents.map(({ slug, title, version }: any) => ({ slug, title, version })) };
}

export async function currentConsentVersion(): Promise<string> { return (await currentLegalConsent()).version; }

/** The browser/app must submit the revision displayed when the checkbox was accepted. */
export async function validateConsentVersion(submitted: unknown): Promise<string> {
  const legal = await currentLegalConsent();
  if (process.env.NODE_ENV === "production" && !legal.published)
    throw new AuthError(503, "legal_documents_unavailable", "Les documents contractuels doivent être publiés avant inscription.");
  if ((submitted !== undefined && submitted !== legal.version) || (process.env.NODE_ENV === "production" && submitted !== legal.version))
    throw new AuthError(409, "consent_version_changed", "Les conditions ont changé. Relisez les documents et confirmez à nouveau votre accord.");
  await pool.query("INSERT INTO legal_consent_versions(version,documents) VALUES($1,$2::jsonb) ON CONFLICT DO NOTHING",
    [legal.version, JSON.stringify(legal.revisions)]);
  return legal.version;
}
