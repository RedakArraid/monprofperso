import { useEffect, useMemo, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

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

export const TEACHER_HOME: [number, number] = [5.3599, -3.9769]; // Cocody par défaut
const CI_BOUNDS = L.latLngBounds([4.2, -8.7], [10.8, -2.4]);

export type MapOffer = {
  id: string;
  label: string;
  place?: string | null;
  subject?: string;
  priceLabel?: string;
  lat?: number | null;
  lng?: number | null;
};

export function resolveCoords(place?: string | null, lat?: number | null, lng?: number | null): [number, number] | null {
  if (lat != null && lng != null && Number.isFinite(lat) && Number.isFinite(lng)) {
    return [lat, lng];
  }
  if (!place) return null;
  const raw = place.toLowerCase().normalize("NFD").replace(/\p{M}/gu, "");
  if (/en ligne|online|visio/.test(raw)) return null;
  // Plus long d'abord pour « cocody riviera » avant « cocody »
  const keys = Object.keys(PLACE_COORDS).sort((a, b) => b.length - a.length);
  for (const key of keys) {
    if (raw.includes(key)) return PLACE_COORDS[key];
  }
  return TEACHER_HOME;
}

/** Distance approx. (km) depuis le domicile prof */
export function distanceKmFromHome(
  place?: string | null,
  home: [number, number] = TEACHER_HOME,
  lat?: number | null,
  lng?: number | null,
): number | null {
  const c = resolveCoords(place, lat, lng);
  if (!c) return null;
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

function makeOfferDot(selected: boolean) {
  const size = selected ? 22 : 16;
  const bg = selected ? "#E8722A" : "#0E5A43";
  return L.divIcon({
    className: "",
    html: `<div style="width:${size}px;height:${size}px;border-radius:50%;background:${bg};border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.35)"></div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2],
  });
}

const homeIcon = L.divIcon({
  className: "mpp-home-marker",
  html: `<div style="display:flex;flex-direction:column;align-items:center;pointer-events:none">
    <div style="width:40px;height:40px;border-radius:12px;background:#2b6cb0;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 8px rgba(0,0,0,.4);border:3px solid #fff">
      <svg width="22" height="22" viewBox="0 0 24 24" fill="#fff" aria-hidden="true">
        <path d="M12 3.2 3.5 10.2c-.3.25-.15.7.25.7H6v8.3c0 .4.3.7.7.7h3.6v-5.2h3.4v5.2h3.6c.4 0 .7-.3.7-.7V10.9h2.25c.4 0 .55-.45.25-.7L12 3.2z"/>
      </svg>
    </div>
    <div style="margin-top:2px;padding:1px 6px;border-radius:4px;background:#2b6cb0;color:#fff;font:700 10px/1.2 system-ui,sans-serif;box-shadow:0 1px 3px rgba(0,0,0,.3);white-space:nowrap">Ma case</div>
  </div>`,
  iconSize: [48, 56],
  iconAnchor: [24, 56],
  popupAnchor: [0, -56],
});

export function CoteIvoireOffersMap({
  offers,
  className,
  home = TEACHER_HOME,
  initialZoom = 12,
  selectedId = null,
  onSelectOffer,
}: {
  offers: MapOffer[];
  className?: string;
  home?: [number, number];
  /** Zoom initial centré sur le domicile prof (Completude) */
  initialZoom?: number;
  selectedId?: string | null;
  /** Clic pin → sélectionne l'offre dans la liste */
  onSelectOffer?: (id: string) => void;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const homeKey = `${home[0]},${home[1]}`;
  const lastHomeKey = useRef<string>("");
  const didInitialFocus = useRef(false);
  const onSelectRef = useRef(onSelectOffer);
  onSelectRef.current = onSelectOffer;

  const markers = useMemo(() => {
    return offers
      .map((o) => {
        const coords = resolveCoords(o.place, o.lat, o.lng);
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
        zoom: initialZoom,
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
      lastHomeKey.current = homeKey;
    }

    const map = mapRef.current;
    const layer = L.layerGroup().addTo(map);

    L.marker(home, { icon: homeIcon, zIndexOffset: 1000 })
      .bindPopup("<strong>Ma case</strong><br/>Votre domicile (point de départ)")
      .addTo(layer);

    for (const m of markers) {
      const selected = selectedId != null && selectedId === m.id;
      const marker = L.marker(m.coords, { icon: makeOfferDot(selected), zIndexOffset: selected ? 500 : 0 });
      marker.bindPopup(
        `<strong>${m.label}</strong><br/>${m.subject || ""}${m.priceLabel ? `<br/>${m.priceLabel}` : ""}<br/><span style="color:#0E5A43">Côte d'Ivoire</span>`,
      );
      marker.on("click", () => {
        onSelectRef.current?.(m.id);
      });
      marker.addTo(layer);
      if (selected) marker.openPopup();
    }

    const focusHome = () => {
      map.setView(home, initialZoom, { animate: false });
      lastHomeKey.current = homeKey;
    };

    if (lastHomeKey.current !== homeKey) {
      focusHome();
    }

    const t1 = setTimeout(() => map.invalidateSize(), 50);
    const t2 = setTimeout(() => {
      map.invalidateSize();
      if (!didInitialFocus.current || lastHomeKey.current !== homeKey) {
        focusHome();
        didInitialFocus.current = true;
      }
    }, 300);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      layer.remove();
    };
  }, [markers, home, homeKey, initialZoom, selectedId]);

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
