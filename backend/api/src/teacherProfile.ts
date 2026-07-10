import type { Router } from "express";
import { pool } from "./db";
import { putFile } from "./storage";
import {
  ValidationError,
  optionalString,
  optionalNumber,
  requiredString,
} from "./validate";

type Deps = {
  wrap: (fn: (req: any, res: any) => Promise<void>) => any;
  currentTeacherId: (res: any) => Promise<number>;
  currentUserId: (res: any) => number;
};

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
    return { storageKey: null as string | null, content: null as Buffer | null };
  }
  const buffer = Buffer.from(contentBase64, "base64");
  if (buffer.length > 8_000_000) throw new ValidationError("file", "fichier trop volumineux (max 8 Mo)");
  const storageKey = await putFile(buffer, mimeType, fileName, prefix);
  return { storageKey, content: storageKey ? null : buffer };
}

function hasFile(row: any, prefix: string) {
  return Boolean(row?.[`${prefix}_storage_key`] || row?.[`${prefix}_content`]);
}

export function computeProfileCompletion(teacher: any, app: any | null) {
  const checks: { key: string; ok: boolean }[] = [
    { key: "location", ok: Boolean(teacher.location?.trim()) },
    { key: "programs", ok: Array.isArray(teacher.programs) && teacher.programs.length > 0 },
    { key: "subjects", ok: Boolean(teacher.subjects?.trim()) },
    { key: "levels", ok: Array.isArray(teacher.levels) && teacher.levels.length > 0 },
    { key: "id_card", ok: app ? hasFile(app, "id_card") : false },
    { key: "diploma", ok: app ? hasFile(app, "diploma") : false },
    { key: "photo", ok: app ? hasFile(app, "photo") : false },
  ];
  const done = checks.filter((c) => c.ok).length;
  const total = checks.length;
  return {
    percent: Math.round((done / total) * 100),
    complete: done === total,
    missing: checks.filter((c) => !c.ok).map((c) => c.key),
  };
}

async function loadTeacherBundle(teacherId: number) {
  const t = (await pool.query("SELECT * FROM teachers WHERE id=$1", [teacherId])).rows[0];
  if (!t) return null;
  const app = (await pool.query(
    `SELECT * FROM teacher_applications WHERE teacher_id=$1 ORDER BY created_at DESC LIMIT 1`,
    [teacherId],
  )).rows[0] ?? null;
  const user = app?.user_id
    ? (await pool.query("SELECT email FROM users WHERE id=$1", [app.user_id])).rows[0]
    : null;
  return { teacher: t, app, email: user?.email ?? null };
}

function profilePayload(teacher: any, app: any | null, email: string | null) {
  const completion = computeProfileCompletion(teacher, app);
  return {
    name: teacher.name,
    subjects: teacher.subjects,
    email,
    location: teacher.location,
    pricePerHour: teacher.price_per_hour,
    experience: teacher.experience,
    bio: teacher.bio,
    levels: teacher.levels ?? [],
    formats: teacher.formats ?? [],
    programs: teacher.programs ?? [],
    negotiable: Boolean(teacher.negotiable),
    hasIdCard: app ? hasFile(app, "id_card") : false,
    hasDiploma: app ? hasFile(app, "diploma") : false,
    hasPhoto: app ? hasFile(app, "photo") : false,
    completion,
  };
}

async function upsertApplicationDocs(
  teacherId: number,
  userId: number,
  teacherName: string,
  teacherSubjects: string,
  teacherLevels: string[],
  files: {
    idCard?: Awaited<ReturnType<typeof storeUpload>> & { fileName?: string; mime?: string };
    diploma?: Awaited<ReturnType<typeof storeUpload>> & { fileName?: string; mime?: string };
    photo?: Awaited<ReturnType<typeof storeUpload>> & { fileName?: string; mime?: string };
  },
) {
  const existing = (await pool.query(
    "SELECT id FROM teacher_applications WHERE teacher_id=$1 ORDER BY created_at DESC LIMIT 1",
    [teacherId],
  )).rows[0];

  const sets: string[] = [];
  const vals: any[] = [];
  let i = 1;

  const addFile = (prefix: string, file: typeof files.idCard, defaultName: string, defaultMime: string) => {
    if (!file?.storageKey && !file?.content) return;
    sets.push(
      `${prefix}_file_name=$${i++}`, `${prefix}_mime_type=$${i++}`,
      `${prefix}_storage_key=$${i++}`, `${prefix}_content=$${i++}`,
    );
    vals.push(file.fileName ?? defaultName, file.mime ?? defaultMime, file.storageKey, file.content);
  };
  addFile("id_card", files.idCard, "cni.pdf", "application/pdf");
  addFile("diploma", files.diploma, "diplome.pdf", "application/pdf");
  addFile("photo", files.photo, "photo.jpg", "image/jpeg");

  if (!sets.length) return;

  if (existing) {
    await pool.query(
      `UPDATE teacher_applications SET ${sets.join(", ")} WHERE id=$${i}`,
      [...vals, existing.id],
    );
    return;
  }

  await pool.query(
    `INSERT INTO teacher_applications (
       full_name, phone, subjects, location, levels, formats, programs, status,
       teacher_id, user_id, consent_at,
       id_card_file_name, id_card_mime_type, id_card_storage_key, id_card_content,
       diploma_file_name, diploma_mime_type, diploma_storage_key, diploma_content,
       photo_file_name, photo_mime_type, photo_storage_key, photo_content
     )
     SELECT $1, u.phone, $2, $3, $4, $5, $6, 'approved', $7, $8, now(),
            $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19
       FROM users u WHERE u.id=$8`,
    [
      teacherName, teacherSubjects, "Abidjan", teacherLevels,
      ["home", "online"], ["standard"],
      teacherId, userId,
      files.idCard?.fileName ?? null, files.idCard?.mime ?? null, files.idCard?.storageKey ?? null, files.idCard?.content ?? null,
      files.diploma?.fileName ?? null, files.diploma?.mime ?? null, files.diploma?.storageKey ?? null, files.diploma?.content ?? null,
      files.photo?.fileName ?? null, files.photo?.mime ?? null, files.photo?.storageKey ?? null, files.photo?.content ?? null,
    ],
  );
}

export function registerTeacherProfileRoutes(api: Router, deps: Deps) {
  const { wrap, currentTeacherId, currentUserId } = deps;

  api.get("/teacher/profile", wrap(async (_req, res) => {
    const teacherId = await currentTeacherId(res);
    const bundle = await loadTeacherBundle(teacherId);
    if (!bundle) { res.status(404).json({ error: "not_found" }); return; }
    res.json(profilePayload(bundle.teacher, bundle.app, bundle.email));
  }));

  api.put("/teacher/profile", wrap(async (req, res) => {
    const teacherId = await currentTeacherId(res);
    const userId = currentUserId(res);
    const bundle = await loadTeacherBundle(teacherId);
    if (!bundle) { res.status(404).json({ error: "not_found" }); return; }

    const b = req.body ?? {};
    const fields: string[] = [];
    const vals: any[] = [];
    let n = 1;

    const add = (col: string, val: any) => {
      fields.push(`${col}=$${n++}`);
      vals.push(val);
    };

    if (b.subjects !== undefined) add("subjects", requiredString(b, "subjects", { max: 200 }));
    if (b.location !== undefined) add("location", requiredString(b, "location", { max: 120 }));
    if (b.pricePerHour !== undefined) add("price_per_hour", optionalNumber(b, "pricePerHour", { min: 0, max: 1_000_000 }));
    if (b.experience !== undefined) add("experience", optionalString(b, "experience", { max: 40 }));
    if (b.bio !== undefined) add("bio", optionalString(b, "bio", { max: 2000 }));
    if (b.levels !== undefined) add("levels", strArray(b, "levels") ?? []);
    if (b.formats !== undefined) {
      const formats = strArray(b, "formats") ?? [];
      if (!formats.length) throw new ValidationError("formats", "au moins une modalité requise");
      add("formats", formats);
    }
    if (b.programs !== undefined) {
      const programs = strArray(b, "programs") ?? [];
      if (!programs.length) throw new ValidationError("programs", "au moins un programme requis");
      add("programs", programs);
    }
    if (b.negotiable !== undefined) {
      add("negotiable", b.negotiable === true || b.negotiable === "true");
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

    if (fields.length) {
      vals.push(teacherId);
      await pool.query(`UPDATE teachers SET ${fields.join(", ")} WHERE id=$${n}`, vals);
    }

    await upsertApplicationDocs(teacherId, userId, bundle.teacher.name, bundle.teacher.subjects, bundle.teacher.levels ?? [], {
      idCard: idCard.storageKey || idCard.content
        ? { ...idCard, fileName: optionalString(b, "idCardFileName", { max: 200 }) ?? "cni.pdf", mime: optionalString(b, "idCardMimeType", { max: 100 }) ?? "application/pdf" }
        : undefined,
      diploma: diploma.storageKey || diploma.content
        ? { ...diploma, fileName: optionalString(b, "diplomaFileName", { max: 200 }) ?? "diplome.pdf", mime: optionalString(b, "diplomaMimeType", { max: 100 }) ?? "application/pdf" }
        : undefined,
      photo: photo.storageKey || photo.content
        ? { ...photo, fileName: optionalString(b, "photoFileName", { max: 200 }) ?? "photo.jpg", mime: optionalString(b, "photoMimeType", { max: 100 }) ?? "image/jpeg" }
        : undefined,
    });

    const updated = await loadTeacherBundle(teacherId);
    if (!updated) { res.status(404).json({ error: "not_found" }); return; }
    res.json(profilePayload(updated.teacher, updated.app, updated.email));
  }));
}
