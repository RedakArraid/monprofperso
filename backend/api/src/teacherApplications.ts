import type { Router } from "express";
import { pool } from "./db";
import { putFile } from "./storage";
import {
  ValidationError,
  optionalString,
  optionalPhone,
  optionalNumber,
  requiredString,
} from "./validate";
import { currentUserId } from "./auth";

type ServeFile = (res: any, row: any) => Promise<void>;
type StrArray = (body: any, field: string) => string[] | undefined;

const APP_STATUS = ["pending", "approved", "rejected"] as const;
const FILE_KINDS = ["id_card", "diploma", "photo"] as const;
type FileKind = (typeof FILE_KINDS)[number];

const APP_LIST_COLS = `id, full_name, phone, email, subjects, location, price_per_hour,
  status, rejection_reason, created_at, reviewed_at,
  (id_card_storage_key IS NOT NULL OR id_card_content IS NOT NULL) AS "hasIdCard",
  (diploma_storage_key IS NOT NULL OR diploma_content IS NOT NULL) AS "hasDiploma",
  (photo_storage_key IS NOT NULL OR photo_content IS NOT NULL) AS "hasPhoto"`;

function strArray(body: any, field: string): string[] | undefined {
  const v = body?.[field];
  if (v === undefined || v === null) return undefined;
  if (!Array.isArray(v) || v.some((x) => typeof x !== "string"))
    throw new ValidationError(field, `${field} doit être une liste de chaînes`);
  return v;
}

async function storeUpload(
  contentBase64: string | undefined,
  fileName: string | null,
  mimeType: string | null,
  prefix: string,
) {
  if (!contentBase64) {
    return { storageKey: null as string | null, content: null as Buffer | null, size: null as number | null };
  }
  const buffer = Buffer.from(contentBase64, "base64");
  if (buffer.length > 8_000_000) throw new ValidationError("file", "fichier trop volumineux (max 8 Mo)");
  const storageKey = await putFile(buffer, mimeType, fileName, prefix);
  return { storageKey, content: storageKey ? null : buffer, size: buffer.length };
}

function fileCols(kind: FileKind) {
  const p = kind === "id_card" ? "id_card" : kind;
  return {
    name: `${p}_file_name`,
    mime: `${p}_mime_type`,
    key: `${p}_storage_key`,
    content: `${p}_content`,
  };
}

function appFileRow(row: any, kind: FileKind) {
  const c = fileCols(kind);
  return {
    file_name: row[c.name],
    mime_type: row[c.mime],
    storage_key: row[c.key],
    content: row[c.content],
  };
}

async function seedTeacherProfile(client: any, teacherId: number) {
  await client.query(
    `INSERT INTO teacher_profiles
       (teacher_id, revenue, trend, courses_per_week, rating_label, new_students,
        earnings_total, earnings_trend, courses_given, hours_taught, avg_per_hour)
     VALUES ($1, 0, '0%', '0', '5,0', '0', 0, '0%', '0', '0 h', '0 F')
     ON CONFLICT (teacher_id) DO NOTHING`,
    [teacherId],
  );
  const weeks = await client.query(
    "SELECT 1 FROM teacher_earning_weeks WHERE teacher_id=$1 LIMIT 1",
    [teacherId],
  );
  if (!weeks.rows[0]) {
    await client.query(
      `INSERT INTO teacher_earning_weeks (teacher_id, label, fraction, ord) VALUES
         ($1, 'S1', 0, 1), ($1, 'S2', 0, 2), ($1, 'S3', 0, 3), ($1, 'S4', 0, 4)`,
      [teacherId],
    );
  }
}

export function registerTeacherApplicationRoutes(
  api: Router,
  admin: Router,
  deps: { wrap: any; serveFile: ServeFile; consentVersion: string },
) {
  const { wrap, serveFile, consentVersion } = deps;

  // --- Public : statut d'une candidature par téléphone ---
  api.get("/teacher-applications/status", wrap(async (req: any, res: any) => {
    const raw = req.query.phone;
    const phone = optionalPhone({ phone: Array.isArray(raw) ? raw[0] : raw });
    if (!phone) {
      res.status(400).json({ error: "validation_error", message: "phone requis" });
      return;
    }
    const r = await pool.query(
      `SELECT id, status, rejection_reason, created_at, reviewed_at
         FROM teacher_applications
        WHERE phone = $1
        ORDER BY created_at DESC
        LIMIT 1`,
      [phone],
    );
    if (!r.rows[0]) {
      res.json({ status: "none" });
      return;
    }
    const row = r.rows[0];
    res.json({
      status: row.status,
      rejectionReason: row.rejection_reason,
      createdAt: row.created_at,
      reviewedAt: row.reviewed_at,
      id: row.id,
    });
  }));

  // --- Public : déposer une candidature ---
  api.post("/teacher-applications", wrap(async (req: any, res: any) => {
    const b = req.body ?? {};
    const fullName = requiredString(b, "fullName", { max: 120 });
    const phone = optionalPhone(b);
    if (!phone) throw new ValidationError("phone", "numéro de téléphone requis");
    const subjects = requiredString(b, "subjects", { max: 200 });
    const consent = b.consent === true || b.consent === "true";
    if (!consent) throw new ValidationError("consent", "acceptation des CGU requise");

    const pending = await pool.query(
      "SELECT id FROM teacher_applications WHERE phone=$1 AND status='pending'",
      [phone],
    );
    if (pending.rows[0]) {
      res.status(409).json({ error: "conflict", message: "candidature déjà en cours pour ce numéro" });
      return;
    }

    const idCard = await storeUpload(
      optionalString(b, "idCardBase64", { max: 12_000_000 }),
      optionalString(b, "idCardFileName", { max: 200 }) ?? "cni.pdf",
      optionalString(b, "idCardMimeType", { max: 100 }) ?? "application/pdf",
      "applications/id-cards",
    );
    const diploma = await storeUpload(
      optionalString(b, "diplomaBase64", { max: 12_000_000 }),
      optionalString(b, "diplomaFileName", { max: 200 }) ?? "diplome.pdf",
      optionalString(b, "diplomaMimeType", { max: 100 }) ?? "application/pdf",
      "applications/diplomas",
    );
    const photo = await storeUpload(
      optionalString(b, "photoBase64", { max: 12_000_000 }),
      optionalString(b, "photoFileName", { max: 200 }) ?? "photo.jpg",
      optionalString(b, "photoMimeType", { max: 100 }) ?? "image/jpeg",
      "applications/photos",
    );
    if (!idCard.storageKey && !idCard.content) {
      throw new ValidationError("idCardBase64", "pièce d'identité requise");
    }
    if (!diploma.storageKey && !diploma.content) {
      throw new ValidationError("diplomaBase64", "diplôme ou attestation requis");
    }
    if (!photo.storageKey && !photo.content) {
      throw new ValidationError("photoBase64", "photo de profil requise");
    }

    const email = optionalString(b, "email", { max: 120 });
    const location = optionalString(b, "location", { max: 120 }) ?? "Abidjan";
    const pricePerHour = optionalNumber(b, "pricePerHour", { min: 0, max: 1_000_000 });
    const bio = optionalString(b, "bio", { max: 2000 });
    const experience = optionalString(b, "experience", { max: 40 });
    const levels = strArray(b, "levels") ?? [];
    const formats = strArray(b, "formats") ?? ["home", "online"];
    const programs = strArray(b, "programs") ?? ["standard"];
    const negotiable = b.negotiable === true || b.negotiable === "true";

    const r = await pool.query(
      `INSERT INTO teacher_applications (
         full_name, phone, email, subjects, location, price_per_hour, bio, experience,
         levels, formats, programs, negotiable,
         id_card_file_name, id_card_mime_type, id_card_storage_key, id_card_content,
         diploma_file_name, diploma_mime_type, diploma_storage_key, diploma_content,
         photo_file_name, photo_mime_type, photo_storage_key, photo_content,
         consent_version, consent_at
       ) VALUES (
         $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,
         $13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26
       )
       RETURNING id, full_name, phone, status, created_at`,
      [
        fullName, phone, email ?? null, subjects, location, pricePerHour ?? null,
        bio ?? null, experience ?? null, levels, formats, programs, negotiable,
        optionalString(b, "idCardFileName", { max: 200 }) ?? "cni.pdf",
        optionalString(b, "idCardMimeType", { max: 100 }) ?? "application/pdf",
        idCard.storageKey, idCard.content,
        optionalString(b, "diplomaFileName", { max: 200 }) ?? "diplome.pdf",
        optionalString(b, "diplomaMimeType", { max: 100 }) ?? "application/pdf",
        diploma.storageKey, diploma.content,
        optionalString(b, "photoFileName", { max: 200 }) ?? "photo.jpg",
        optionalString(b, "photoMimeType", { max: 100 }) ?? "image/jpeg",
        photo.storageKey, photo.content,
        consentVersion, new Date(),
      ],
    );
    res.status(201).json(r.rows[0]);
  }));

  // --- Admin : liste ---
  admin.get("/teacher-applications", wrap(async (req: any, res: any) => {
    const status = optionalString(req.query, "status", { max: 20 });
    const params: any[] = [];
    let where = "";
    if (status && APP_STATUS.includes(status as any)) {
      params.push(status);
      where = `WHERE status = $${params.length}`;
    }
    const r = await pool.query(
      `SELECT ${APP_LIST_COLS} FROM teacher_applications ${where}
       ORDER BY CASE status WHEN 'pending' THEN 0 ELSE 1 END, created_at DESC`,
      params,
    );
    res.json(r.rows);
  }));

  // --- Admin : détail ---
  admin.get("/teacher-applications/:id", wrap(async (req: any, res: any) => {
    const r = await pool.query(
      `SELECT id, full_name, phone, email, subjects, location, price_per_hour, bio, experience,
              levels, formats, programs, negotiable, status, rejection_reason,
              teacher_id, user_id, created_at, reviewed_at, reviewed_by,
              id_card_file_name, diploma_file_name, photo_file_name,
              (id_card_storage_key IS NOT NULL OR id_card_content IS NOT NULL) AS "hasIdCard",
              (diploma_storage_key IS NOT NULL OR diploma_content IS NOT NULL) AS "hasDiploma",
              (photo_storage_key IS NOT NULL OR photo_content IS NOT NULL) AS "hasPhoto"
         FROM teacher_applications WHERE id = $1`,
      [req.params.id],
    );
    if (!r.rows[0]) { res.status(404).json({ error: "not_found" }); return; }
    res.json(r.rows[0]);
  }));

  // --- Admin : pièce jointe ---
  admin.get("/teacher-applications/:id/files/:kind", wrap(async (req: any, res: any) => {
    const kind = req.params.kind as FileKind;
    if (!FILE_KINDS.includes(kind)) {
      res.status(400).json({ error: "validation_error", message: "kind invalide" });
      return;
    }
    const r = await pool.query("SELECT * FROM teacher_applications WHERE id=$1", [req.params.id]);
    const row = r.rows[0];
    if (!row) { res.status(404).json({ error: "not_found" }); return; }
    const file = appFileRow(row, kind);
    if (!file.storage_key && !file.content) { res.status(404).json({ error: "not_found" }); return; }
    await serveFile(res, file);
  }));

  // --- Admin : refuser ---
  admin.post("/teacher-applications/:id/reject", wrap(async (req: any, res: any) => {
    const reason = requiredString(req.body ?? {}, "reason", { max: 500 });
    const r = await pool.query(
      `UPDATE teacher_applications
          SET status = 'rejected', rejection_reason = $2,
              reviewed_by = $3, reviewed_at = now()
        WHERE id = $1 AND status = 'pending'
        RETURNING id, status, rejection_reason, reviewed_at`,
      [req.params.id, reason, currentUserId(res)],
    );
    if (!r.rows[0]) {
      res.status(404).json({ error: "not_found", message: "candidature introuvable ou déjà traitée" });
      return;
    }
    res.json(r.rows[0]);
  }));

  // --- Admin : accepter (crée prof + compte) ---
  admin.post("/teacher-applications/:id/approve", wrap(async (req: any, res: any) => {
    const b = req.body ?? {};
    const appRes = await pool.query("SELECT * FROM teacher_applications WHERE id=$1", [req.params.id]);
    const app = appRes.rows[0];
    if (!app) { res.status(404).json({ error: "not_found" }); return; }
    if (app.status !== "pending") {
      res.status(409).json({ error: "conflict", message: "candidature déjà traitée" });
      return;
    }

    const name = optionalString(b, "name", { max: 120 }) ?? app.full_name;
    const subjects = optionalString(b, "subjects", { max: 200 }) ?? app.subjects;
    const location = optionalString(b, "location", { max: 120 }) ?? app.location;
    const pricePerHour = optionalNumber(b, "pricePerHour", { min: 0, max: 1_000_000 })
      ?? app.price_per_hour ?? 4000;
    const bio = optionalString(b, "bio", { max: 2000 }) ?? app.bio;
    const experience = optionalString(b, "experience", { max: 40 }) ?? app.experience;
    const levels = strArray(b, "levels") ?? app.levels ?? [];
    const formats = strArray(b, "formats") ?? app.formats ?? ["home", "online"];
    const programs = strArray(b, "programs") ?? app.programs ?? ["standard"];
    const negotiable = b.negotiable === undefined
      ? Boolean(app.negotiable)
      : (b.negotiable === true || b.negotiable === "true");
    const initials = name.split(" ").map((s: string) => s[0]).join("").slice(0, 2).toUpperCase();

    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      const teacherIns = await client.query(
        `INSERT INTO teachers (initials, name, subjects, rating, reviews_count, location, price_per_hour,
           experience, bio, levels, formats, programs, accent, verified, special_bepc, negotiable)
         VALUES ($1,$2,$3,5.0,0,$4,$5,$6,$7,$8,$9,$10,'green',TRUE,FALSE,$11)
         RETURNING id`,
        [initials, name, subjects, location, pricePerHour, experience ?? null, bio ?? null,
         levels, formats, programs, negotiable],
      );
      const teacherId = teacherIns.rows[0].id;

      const userIns = await client.query(
        `INSERT INTO users (full_name, phone, role, initials, teacher_id, consent_version, consent_at)
         VALUES ($1,$2,'teacher',$3,$4,$5,$6)
         ON CONFLICT (phone) DO UPDATE SET
           full_name = EXCLUDED.full_name,
           role = 'teacher',
           initials = EXCLUDED.initials,
           teacher_id = EXCLUDED.teacher_id,
           consent_version = COALESCE(users.consent_version, EXCLUDED.consent_version),
           consent_at = COALESCE(users.consent_at, EXCLUDED.consent_at)
         RETURNING id`,
        [name, app.phone, initials, teacherId, app.consent_version, app.consent_at],
      );
      const userId = userIns.rows[0].id;

      await seedTeacherProfile(client, teacherId);

      const upd = await client.query(
        `UPDATE teacher_applications
            SET status = 'approved', teacher_id = $2, user_id = $3,
                reviewed_by = $4, reviewed_at = now(), rejection_reason = NULL
          WHERE id = $1 AND status = 'pending'
          RETURNING id, status, teacher_id, user_id, reviewed_at`,
        [app.id, teacherId, userId, currentUserId(res)],
      );

      await client.query("COMMIT");
      res.json({ application: upd.rows[0], teacherId, userId });
    } catch (e) {
      await client.query("ROLLBACK");
      throw e;
    } finally {
      client.release();
    }
  }));
}
