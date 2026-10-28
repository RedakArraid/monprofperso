import { useEffect, useMemo, useRef } from "react";
import L from "leaflet";
import { cn } from "@/lib/utils";
import { resolveCoords } from "@/lib/geography";
import { offerPopupContent } from "@/lib/map-popup";
import "leaflet/dist/leaflet.css";

const MAP_CENTER: [number, number] = [5.36, -4.0083]; // Initial map view only; never a user address.
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

function makeOfferDot(selected: boolean) {
  const size = selected ? 22 : 16;
  const bg = selected ? "#E8722A" : "#0E5A43";
  return L.divIcon({
    className: "mpp-offer-marker",
    html: `<div style="display:flex;width:44px;height:44px;align-items:center;justify-content:center"><span aria-hidden="true" style="width:${size}px;height:${size}px;border-radius:50%;background:${bg};border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.35)"></span></div>`,
    iconSize: [44, 44],
    iconAnchor: [22, 22],
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
    <div style="margin-top:2px;padding:1px 6px;border-radius:4px;background:#2b6cb0;color:#fff;font:700 10px/1.2 system-ui,sans-serif;box-shadow:0 1px 3px rgba(0,0,0,.3);white-space:nowrap">Zone de départ</div>
  </div>`,
  iconSize: [48, 56],
  iconAnchor: [24, 56],
  popupAnchor: [0, -56],
});

export function CoteIvoireOffersMap({
  offers,
  className,
  home = null,
  initialZoom = 12,
  selectedId = null,
  onSelectOffer,
}: {
  offers: MapOffer[];
  className?: string;
  home?: [number, number] | null;
  /** Zoom initial centré sur le domicile prof (Completude) */
  initialZoom?: number;
  selectedId?: string | null;
  /** Clic pin → sélectionne l'offre dans la liste */
  onSelectOffer?: (id: string) => void;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const homeKey = home ? `${home[0]},${home[1]}` : "unknown";
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
        center: home || MAP_CENTER,
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

    if (home) {
      // This reference marker is decorative: it must not cover the interactive
      // offers when both coordinates resolve to the same commune centre.
      const reference = L.marker(home, { icon: homeIcon, interactive: false, keyboard: false, zIndexOffset: -100 }).addTo(layer);
      const element = reference.getElement();
      if (element) { element.style.pointerEvents = "none"; element.setAttribute("aria-hidden", "true"); }
    }

    for (const m of markers) {
      const selected = selectedId != null && selectedId === m.id;
      const label = `Offre de cours : ${m.label}${m.subject ? ` — ${m.subject}` : ""}`;
      const marker = L.marker(m.coords, { icon: makeOfferDot(selected), title: label, alt: label, keyboard: true, zIndexOffset: selected ? 500 : 0 });
      marker.bindPopup(offerPopupContent(m));
      marker.on("click", () => {
        onSelectRef.current?.(m.id);
      });
      marker.addTo(layer);
      marker.getElement()?.setAttribute("aria-label", label);
      marker.getElement()?.addEventListener("keydown", (event) => {
        if (event.key === " ") { event.preventDefault(); marker.fire("click"); marker.openPopup(); }
      });
      if (selected) marker.openPopup();
    }

    const focusHome = () => {
      map.setView(home || MAP_CENTER, home ? initialZoom : 10, { animate: false });
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

  return <div className={cn("flex w-full min-h-0 flex-col", className || "h-full min-h-[320px]")}><p className="shrink-0 bg-white px-3 py-2 text-xs text-muted-foreground">Repères de communes approximatifs, y compris la zone de départ. Distances indicatives ; les lieux non reconnus ne sont pas positionnés.</p><div ref={containerRef} role="region" aria-label="Carte des offres de cours" className="min-h-0 w-full flex-1" /></div>;
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
