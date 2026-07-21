import { useEffect, useMemo, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

/** Coordonnées approximatives des communes / zones CI (Abidjan + hors Abidjan) */
const PLACE_COORDS: Record<string, [number, number]> = {
  cocody: [5.3599, -3.9769],
  "cocody riviera": [5.37, -3.96],
  riviera: [5.37, -3.96],
  plateau: [5.3204, -4.0197],
  marcory: [5.2994, -3.9886],
  yopougon: [5.3364, -4.0847],
  treichville: [5.2893, -4.0078],
  bingerville: [5.3556, -3.8853],
  abidjan: [5.36, -4.0083],
  bouaké: [7.6906, -5.0303],
  yamoussoukro: [6.8276, -5.2893],
  san: [4.7485, -6.6363],
  "san-pedro": [4.7485, -6.6363],
  korhogo: [9.458, -5.6296],
};

const ABIDJAN: [number, number] = [5.36, -4.0083];
const CI_BOUNDS = L.latLngBounds([4.2, -8.7], [10.8, -2.4]);

export type MapOffer = {
  id: string;
  label: string;
  place?: string | null;
  subject?: string;
  priceLabel?: string;
};

function resolveCoords(place?: string | null): [number, number] | null {
  if (!place) return null;
  const raw = place.toLowerCase().normalize("NFD").replace(/\p{M}/gu, "");
  if (/en ligne|online|visio/.test(raw)) return null;
  for (const [key, coords] of Object.entries(PLACE_COORDS)) {
    if (raw.includes(key)) return coords;
  }
  if (/cote.?d.?ivoire|côte.?d.?ivoire|ci\b/.test(raw)) return ABIDJAN;
  return ABIDJAN;
}

const pinIcon = L.divIcon({
  className: "",
  html: `<div style="width:18px;height:18px;border-radius:50% 50% 50% 0;background:#0E5A43;transform:rotate(-45deg);border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.35)"></div>`,
  iconSize: [18, 18],
  iconAnchor: [9, 18],
  popupAnchor: [0, -16],
});

export function CoteIvoireOffersMap({ offers }: { offers: MapOffer[] }) {
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
        center: ABIDJAN,
        zoom: 7,
        scrollWheelZoom: false,
        attributionControl: true,
      });
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 18,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      }).addTo(map);
      map.setMaxBounds(CI_BOUNDS.pad(0.15));
      mapRef.current = map;
    }

    const map = mapRef.current;
    const layer = L.layerGroup().addTo(map);

    const latLngs: L.LatLngExpression[] = [];
    for (const m of markers) {
      latLngs.push(m.coords);
      L.marker(m.coords, { icon: pinIcon })
        .bindPopup(
          `<strong>${m.label}</strong><br/>${m.subject || ""}${m.priceLabel ? `<br/>${m.priceLabel}` : ""}<br/><span style="color:#0E5A43">Côte d'Ivoire</span>`,
        )
        .addTo(layer);
    }

    if (latLngs.length === 1) {
      map.setView(latLngs[0], 12);
    } else if (latLngs.length > 1) {
      map.fitBounds(L.latLngBounds(latLngs).pad(0.35), { maxZoom: 12 });
    } else {
      map.setView(ABIDJAN, 7);
    }

    // Leaflet needs a size recalc after mount in responsive layouts
    setTimeout(() => map.invalidateSize(), 80);

    return () => {
      layer.remove();
    };
  }, [markers]);

  useEffect(() => {
    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);

  return (
    <div className="overflow-hidden rounded-xl border border-[#e5e5e5] bg-white shadow-[0_1px_4px_rgba(0,0,0,0.06)]">
      <div className="flex items-center justify-between border-b border-[#eee] px-4 py-3">
        <div>
          <div className="text-[15px] font-semibold text-welcome">Carte — Côte d&apos;Ivoire</div>
          <div className="text-xs text-[#888]">
            {markers.length} offre{markers.length > 1 ? "s" : ""} géolocalisée
            {markers.length > 1 ? "s" : ""}
            {offers.length - markers.length > 0
              ? ` · ${offers.length - markers.length} en ligne`
              : ""}
          </div>
        </div>
        <span className="text-xs font-semibold text-primary">CI</span>
      </div>
      <div ref={containerRef} className="h-[240px] w-full sm:h-[320px]" />
    </div>
  );
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
