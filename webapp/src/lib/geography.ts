/** Coordonnées approximatives des communes / zones CI */
export const PLACE_COORDS: Record<string, [number, number]> = {
  "cocody angre": [5.3895, -3.958],
  "cocody angré": [5.3895, -3.958],
  "deux-plateaux": [5.371, -3.989],
  "cocody deux-plateaux": [5.371, -3.989],
  "riviera 3": [5.352, -3.9675],
  "cocody riviera": [5.37, -3.96],
  riviera: [5.37, -3.96],
  cocody: [5.3599, -3.9769],
  "marcory zone 4": [5.291, -3.981],
  marcory: [5.2994, -3.9886],
  "plateau centre": [5.3204, -4.0197],
  plateau: [5.3204, -4.0197],
  "yopougon sicogi": [5.348, -4.102],
  yopougon: [5.3364, -4.0847],
  treichville: [5.2893, -4.0078],
  "koumassi remblais": [5.2889, -3.9553],
  koumassi: [5.2889, -3.9553],
  "abobo avocatier": [5.43, -4.02],
  abobo: [5.4167, -4.0167],
  bingerville: [5.3556, -3.8853],
  "port-bouet": [5.256, -3.924],
  "port-bouët": [5.256, -3.924],
  anyama: [5.494, -4.051],
  songon: [5.32, -4.25],
  "grand-bassam": [5.211, -3.738],
  abidjan: [5.36, -4.0083],
  bouaké: [7.6906, -5.0303],
  yamoussoukro: [6.8276, -5.2893],
  "san-pedro": [4.7485, -6.6363],
  korhogo: [9.458, -5.6296],
};

export function resolveCoords(place?: string | null, lat?: number | null, lng?: number | null): [number, number] | null {
  if (lat != null && lng != null && Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180) {
    return [lat, lng];
  }
  if (!place) return null;
  const raw = place.toLowerCase().normalize("NFD").replace(/\p{M}/gu, "");
  if (/en ligne|online|visio/.test(raw)) return null;
  // Plus long d'abord pour « cocody riviera » avant « cocody »
  const keys = Object.keys(PLACE_COORDS).sort((a, b) => b.length - a.length);
  for (const key of keys) {
    if (raw.includes(key.normalize("NFD").replace(/\p{M}/gu, ""))) return PLACE_COORDS[key];
  }
  return null;
}

/** Distance approx. (km) depuis le domicile prof */
export function distanceKmFromHome(
  place?: string | null,
  home: [number, number] | null = null,
  lat?: number | null,
  lng?: number | null,
): number | null {
  const c = resolveCoords(place, lat, lng);
  if (!c || !home) return null;
  const [lat1, lon1] = home;
  const [lat2, lon2] = c;
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)) * 100) / 100;
}
