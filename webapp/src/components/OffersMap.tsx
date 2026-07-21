import { useEffect, useMemo, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

/** Coordonnées approximatives des communes / zones CI */
export const PLACE_COORDS: Record<string, [number, number]> = {
  cocody: [5.3599, -3.9769],
  "cocody riviera": [5.37, -3.96],
  riviera: [5.37, -3.96],
  plateau: [5.3204, -4.0197],
  marcory: [5.2994, -3.9886],
  yopougon: [5.3364, -4.0847],
  treichville: [5.2893, -4.0078],
  bingerville: [5.3556, -3.8853],
  abobo: [5.4167, -4.0167],
  koumassi: [5.2889, -3.9553],
  abidjan: [5.36, -4.0083],
  bouaké: [7.6906, -5.0303],
  yamoussoukro: [6.8276, -5.2893],
  "san-pedro": [4.7485, -6.6363],
  korhogo: [9.458, -5.6296],
};

export const TEACHER_HOME: [number, number] = [5.3599, -3.9769]; // Cocody par défaut
const CI_BOUNDS = L.latLngBounds([4.2, -8.7], [10.8, -2.4]);

export type MapOffer = {
  id: string;
  label: string;
  place?: string | null;
  subject?: string;
  priceLabel?: string;
};

export function resolveCoords(place?: string | null): [number, number] | null {
  if (!place) return null;
  const raw = place.toLowerCase().normalize("NFD").replace(/\p{M}/gu, "");
  if (/en ligne|online|visio/.test(raw)) return null;
  for (const [key, coords] of Object.entries(PLACE_COORDS)) {
    if (raw.includes(key)) return coords;
  }
  return TEACHER_HOME;
}

/** Distance approx. (km) depuis le domicile prof */
export function distanceKmFromHome(place?: string | null): number | null {
  const c = resolveCoords(place);
  if (!c) return null;
  const [lat1, lon1] = TEACHER_HOME;
  const [lat2, lon2] = c;
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)) * 100) / 100;
}

const offerDot = L.divIcon({
  className: "",
  html: `<div style="width:16px;height:16px;border-radius:50%;background:#0E5A43;border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.35)"></div>`,
  iconSize: [16, 16],
  iconAnchor: [8, 8],
  popupAnchor: [0, -10],
});

const homeIcon = L.divIcon({
  className: "",
  html: `<div style="width:28px;height:28px;border-radius:8px;background:#2b6cb0;display:flex;align-items:center;justify-content:center;box-shadow:0 1px 4px rgba(0,0,0,.35);border:2px solid #fff">
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.5"><path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1v-9.5z"/></svg>
  </div>`,
  iconSize: [28, 28],
  iconAnchor: [14, 14],
  popupAnchor: [0, -14],
});

export function CoteIvoireOffersMap({
  offers,
  className,
  home = TEACHER_HOME,
}: {
  offers: MapOffer[];
  className?: string;
  home?: [number, number];
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);

  const markers = useMemo(() => {
    return offers
      .map((o) => {
        const coords = resolveCoords(o.place);
        if (!coords) return null;
        return { ...o, coords };
      })
      .filter(Boolean) as (MapOffer & { coords: [number, number] })[];
  }, [offers]);

  useEffect(() => {
    if (!containerRef.current) return;

    if (!mapRef.current) {
      const map = L.map(containerRef.current, {
        center: home,
        zoom: 11,
        scrollWheelZoom: true,
        attributionControl: true,
        zoomControl: true,
      });
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 18,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      }).addTo(map);
      map.setMaxBounds(CI_BOUNDS.pad(0.2));
      mapRef.current = map;
    }

    const map = mapRef.current;
    const layer = L.layerGroup().addTo(map);

    L.marker(home, { icon: homeIcon }).bindPopup("Mon domicile").addTo(layer);

    const latLngs: L.LatLngExpression[] = [home];
    for (const m of markers) {
      latLngs.push(m.coords);
      L.marker(m.coords, { icon: offerDot })
        .bindPopup(
          `<strong>${m.label}</strong><br/>${m.subject || ""}${m.priceLabel ? `<br/>${m.priceLabel}` : ""}<br/><span style="color:#0E5A43">Côte d'Ivoire</span>`,
        )
        .addTo(layer);
    }

    if (latLngs.length > 1) {
      map.fitBounds(L.latLngBounds(latLngs).pad(0.25), { maxZoom: 13 });
    } else {
      map.setView(home, 11);
    }

    const t1 = setTimeout(() => map.invalidateSize(), 50);
    const t2 = setTimeout(() => map.invalidateSize(), 300);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      layer.remove();
    };
  }, [markers, home]);

  useEffect(() => {
    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);

  return <div ref={containerRef} className={className || "h-full min-h-[320px] w-full"} />;
}

export function formatLieuCi(place?: string | null, format?: string | null): string {
  const f = format || "";
  const p = (place || "").trim();
  if (/en ligne|online/i.test(f) || /en ligne|online/i.test(p)) {
    return "En ligne · Côte d'Ivoire";
  }
  if (!p) return "Côte d'Ivoire";
  if (/côte\s*d['’]?ivoire|cote\s*d['’]?ivoire/i.test(p)) return p;
  return `${p}, Côte d'Ivoire`;
}
