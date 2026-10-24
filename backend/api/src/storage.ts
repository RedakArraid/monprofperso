import { Client } from "minio";
import { randomUUID } from "crypto";
import type { Readable } from "stream";
import * as http from "http";
import * as https from "https";

/**
 * Stockage objet des fichiers de ressources sur un service S3-compatible (MinIO).
 * Remplace le stockage en base (BYTEA) par un stockage durable et hors-Postgres.
 *
 * Activé dès que `S3_ENDPOINT` est défini. Sinon (ou en cas d'échec d'upload),
 * l'appelant retombe sur le stockage `BYTEA`, rétrocompatible avec l'existant.
 */
const endPoint = process.env.S3_ENDPOINT;
const port = Number(process.env.S3_PORT ?? 9000);
const useSSL = process.env.S3_USE_SSL === "true";
const accessKey = process.env.S3_ACCESS_KEY ?? "";
const secretKey = process.env.S3_SECRET_KEY ?? "";
const bucket = process.env.S3_BUCKET ?? "monprofperso";

export const storageEnabled = Boolean(endPoint);

const protocol = useSSL ? https : http;
const boundedTransport = { ...protocol, request: ((options: https.RequestOptions, callback?: (response: http.IncomingMessage) => void) => {
  const request = protocol.request(options, callback);
  const deadline = setTimeout(() => request.destroy(new Error("storage_request_timeout")), 15_000);
  deadline.unref();
  request.once("close", () => clearTimeout(deadline));
  return request;
}) as typeof https.request };

const client: Client | null = storageEnabled
  ? new Client({ endPoint: endPoint as string, port, useSSL, accessKey, secretKey, transport: boundedTransport })
  : null;

/** Crée le bucket au démarrage s'il n'existe pas (idempotent, avec quelques essais). */
export async function ensureBucket(retries = 2): Promise<void> {
  if (!client) return;
  for (let i = 0; i < retries; i++) {
    try {
      if (!(await client.bucketExists(bucket))) await client.makeBucket(bucket, "");
      console.log(`Stockage objet prêt (bucket « ${bucket} »).`);
      return;
    } catch {
      await new Promise((r) => setTimeout(r, 1500));
    }
  }
  console.warn("Stockage objet indisponible, repli sur le stockage en base (BYTEA).");
}

/** Téléverse un fichier et renvoie sa clé d'objet, ou null si le stockage a échoué. */
export async function putFile(
  buffer: Buffer,
  mimeType: string | null,
  fileName: string | null,
  prefix = "resources",
): Promise<string | null> {
  if (!client) return null;
  const ext = fileName && fileName.includes(".") ? "." + fileName.split(".").pop() : "";
  const key = `${prefix.replace(/\/+$/, "")}/${randomUUID()}${ext}`;
  try {
    await client.putObject(bucket, key, buffer, buffer.length, {
      "Content-Type": mimeType ?? "application/octet-stream",
    });
    return key;
  } catch (e) {
    console.error("Échec d'upload vers le stockage objet :", e);
    return null;
  }
}

/** Récupère un objet sous forme de flux lisible (à piper vers la réponse HTTP). */
export async function getFileStream(key: string): Promise<Readable> {
  if (!client) throw new Error("storage_disabled");
  return client.getObject(bucket, key);
}

/** Supprime un objet (best-effort, ignoré si le stockage est désactivé). */
export async function removeFile(key: string | null | undefined): Promise<void> {
  if (!client || !key) return;
  try {
    await client.removeObject(bucket, key);
  } catch (e) {
    console.warn("Échec de suppression objet :", key, e);
  }
}

/** Durable privacy cleanup: failures must remain queued instead of being silently ignored. */
export async function deleteFileStrict(key: string): Promise<void> {
  if (!client) throw new Error("storage_not_configured");
  await client.removeObject(bucket, key);
}

export async function assertEmptyRestoreBucket(): Promise<void> {
  if (!client) throw new Error("storage_not_configured");
  if (!(await client.bucketExists(bucket))) throw new Error("restore_bucket_must_exist");
  for await (const object of client.listObjectsV2(bucket, "", true)) {
    if (object.name) throw new Error("restore_bucket_must_be_empty");
  }
}

export async function restoreExactFile(key: string, filePath: string): Promise<void> {
  if (!client) throw new Error("storage_not_configured");
  await client.fPutObject(bucket, key, filePath, { "Content-Type": "application/octet-stream" });
}
