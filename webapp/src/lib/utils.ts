import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function fcfa(n: number | null | undefined) {
  if (n == null) return "—";
  return Number(n).toLocaleString("fr-FR");
}

export function normalizePhone(raw: string) {
  let p = String(raw ?? "").trim().replace(/[\s.-]/g, "");
  if (/^0\d{9}$/.test(p)) p = "+225" + p.slice(1);
  else if (/^225\d{8,12}$/.test(p)) p = "+" + p;
  return p;
}

export function needStatusLabel(s: string) {
  return (
    {
      submitted: "En analyse",
      priced: "Tarif proposé",
      published: "Recherche prof",
      matched: "Prof trouvé",
      cancelled: "Annulé",
    } as Record<string, string>
  )[s] || s;
}
