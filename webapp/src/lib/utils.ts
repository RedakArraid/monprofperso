import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function fcfa(n: number | null | undefined) {
  if (n == null) return "—";
  return Number(n).toLocaleString("fr-FR");
}

export { normalizeCiPhone as normalizePhone } from "./flows";

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
