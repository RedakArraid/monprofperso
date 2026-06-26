import type { Request, Response, NextFunction } from "express";

/**
 * Middlewares transverses : journalisation des requêtes et réponses d'erreur
 * standardisées (forme JSON stable `{ error, message? }` consommée par les apps).
 */

/** Journalise chaque requête terminée : `MÉTHODE chemin -> code (durée)`. Sans dépendance. */
export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const start = process.hrtime.bigint();
  res.on("finish", () => {
    const ms = Number(process.hrtime.bigint() - start) / 1e6;
    const line = `${req.method} ${req.originalUrl} -> ${res.statusCode} (${ms.toFixed(1)}ms)`;
    if (res.statusCode >= 500) console.error(line);
    else console.log(line);
  });
  next();
}

/** Route inconnue : réponse JSON cohérente au lieu de la page HTML par défaut d'Express. */
export function notFound(_req: Request, res: Response): void {
  res.status(404).json({ error: "not_found", message: "route inconnue" });
}

/**
 * Filet de sécurité final (middleware Express à 4 arguments). Capture les erreurs
 * non gérées — y compris un corps JSON illisible ou trop volumineux — et renvoie
 * toujours du JSON, sans fuiter le détail interne (consigné côté serveur).
 */
export function errorHandler(err: any, req: Request, res: Response, _next: NextFunction): void {
  if (res.headersSent) return;
  if (err?.type === "entity.parse.failed" || err instanceof SyntaxError) {
    res.status(400).json({ error: "bad_json", message: "corps JSON invalide" });
    return;
  }
  if (err?.type === "entity.too.large") {
    res.status(413).json({ error: "payload_too_large", message: "fichier trop volumineux" });
    return;
  }
  console.error(`[${req.method} ${req.originalUrl}]`, err);
  res.status(500).json({ error: "internal_error", message: "erreur interne" });
}
