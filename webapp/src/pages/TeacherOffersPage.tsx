import {
  AppShell,
  OfflineBanner,
  Empty,
  CheckRow,
} from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api";
import { fallback } from "@/lib/fallback";
import { fcfa } from "@/lib/utils";
import { useLive } from "@/hooks/useLive";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  Briefcase,
  Cat,
  Check,
  Clock,
  Dog,
  GraduationCap,
  MapPin,
  UserRound,
  X,
} from "lucide-react";
import { CoteIvoireOffersMap, distanceKmFromHome, resolveCoords, TEACHER_HOME } from "@/components/OffersMap";

export type OfferReq = {
  courseId?: number;
  needId?: number | null;
  initials?: string;
  accent?: string;
  name?: string;
  ago?: string;
  subject?: string;
  student?: string;
  slot?: string;
  format?: string;
  frequency?: string | null;
  duration?: string | null;
  startDate?: string | null;
  price?: number;
  netHourly?: number | null;
  isOpportunity?: boolean;
  availabilityWeek?: boolean;
  availabilityWeekend?: boolean;
  availabilityHolidays?: boolean;
  hasCat?: boolean;
  hasDog?: boolean;
  lat?: number | null;
  lng?: number | null;
};

type WhenOpts = { week: boolean; weekend: boolean; vacations: boolean };
type Prefs = { vehicle: boolean; acceptDogs: boolean; acceptCats: boolean };
type ListFilters = {
  subjects: string[];
  home: boolean;
  online: boolean;
  maxKm: number | null;
};
type SortMode = "recent" | "price_desc" | "price_asc" | "distance";
type OfferMark = "option" | "thinking" | "refused";
type Channels = { sms: boolean; notif: boolean };
type PropFilters = { option: boolean; thinking: boolean; refused: boolean };

const LS_MARKS = "mpp_offer_marks";
const LS_CHANNELS = "mpp_offer_channels";
const LS_SEARCH = "mpp_offer_search";
const NO_VEHICLE_MAX_KM = 12;

function loadJson<T>(key: string, fallbackVal: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallbackVal;
    return { ...fallbackVal, ...JSON.parse(raw) } as T;
  } catch {
    return fallbackVal;
  }
}

function loadMarks(): Record<string, OfferMark> {
  try {
    return JSON.parse(localStorage.getItem(LS_MARKS) || "{}") as Record<string, OfferMark>;
  } catch {
    return {};
  }
}

function offerId(r: OfferReq) {
  return String(r.needId || r.courseId);
}

function parseStudent(student?: string) {
  const s = (student || "").trim();
  if (!s) return { name: "—", level: "—", gender: "" };
  const parts = s.split(/·|-/).map((x) => x.trim()).filter(Boolean);
  if (parts.length >= 2) return { name: parts[0], level: parts[1], gender: parts[2] || "" };
  if (/ème|ere|ère|terminale|cm|cp|6e|5e|4e|3e|2nde|1ère/i.test(s)) {
    return { name: "Élève", level: s, gender: "" };
  }
  return { name: s, level: "—", gender: "" };
}

function formatStart(startDate?: string | null) {
  if (!startDate) return null;
  const d = String(startDate).slice(0, 10);
  const [y, m, day] = d.split("-");
  if (!y || !m || !day) return null;
  return `${day}/${m}/${y}`;
}

function isOnline(r: OfferReq) {
  return /ligne|online/i.test(r.format || "") || /ligne|online/i.test(r.slot || "") || /ligne|online/i.test(r.name || "");
}

function matchesWhen(r: OfferReq, when: WhenOpts) {
  if (!when.week && !when.weekend && !when.vacations) return false;
  const hits: boolean[] = [];
  if (when.week) hits.push(r.availabilityWeek !== false);
  if (when.weekend) hits.push(Boolean(r.availabilityWeekend));
  if (when.vacations) hits.push(Boolean(r.availabilityHolidays));
  return hits.some(Boolean);
}

/** Carte offre — disposition Completude desktop */
function OfferCard({
  r,
  onConsult,
  home,
  selected,
  cardRef,
  onSelect,
  mark,
}: {
  r: OfferReq;
  onConsult: () => void;
  home?: [number, number];
  selected?: boolean;
  cardRef?: (el: HTMLElement | null) => void;
  onSelect?: () => void;
  mark?: OfferMark | null;
}) {
  const place = (r.name || r.slot || "Abidjan").replace(/,?\s*Côte d'Ivoire/i, "").trim();
  const title = place.toUpperCase() || "ABIDJAN";
  const dist = distanceKmFromHome(r.slot || r.name || place, home, r.lat, r.lng);
  const { name: pupil, level, gender } = parseStudent(r.student);
  const freq =
    [r.frequency, r.duration].filter(Boolean).join(" - ") ||
    (isOnline(r) ? "En ligne" : "À domicile");
  const pay =
    r.isOpportunity && r.netHourly != null
      ? `${fcfa(r.netHourly)} F/h net${r.price != null ? ` · ${fcfa(r.price)} F/séance` : ""}`
      : r.price != null
        ? `${fcfa(r.price)} F`
        : "—";
  const start = formatStart(r.startDate);
  const ref = `Réf. ${2000 + Number(r.needId || r.courseId || 0)}`;
  const badges = [
    r.availabilityWeek !== false ? "SE" : null,
    r.availabilityWeekend ? "WE" : null,
    r.availabilityHolidays ? "VS" : null,
  ].filter(Boolean) as string[];
  const markLabel =
    mark === "option" ? "Option" : mark === "thinking" ? "En réflexion" : mark === "refused" ? "Refusée" : null;

  return (
    <article
      ref={cardRef}
      onClick={onSelect}
      className={`cursor-pointer rounded-xl border bg-white p-4 shadow-[0_1px_3px_rgba(0,0,0,0.06)] transition-shadow ${
        selected
          ? "border-primary ring-2 ring-primary/30 shadow-[0_2px_8px_rgba(14,90,67,0.18)]"
          : "border-[#e8e8e8] hover:border-primary/40"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-[15px] font-bold uppercase tracking-wide text-[#222]">{title}</h3>
        {dist != null ? (
          <div className="flex shrink-0 items-center gap-1 text-[12px] text-[#666]">
            <span>{dist.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} km</span>
            <MapPin className="h-3.5 w-3.5 text-primary" />
          </div>
        ) : (
          <div className="flex shrink-0 items-center gap-1 text-[12px] text-[#666]">
            <span>CI</span>
            <MapPin className="h-3.5 w-3.5 text-primary" />
          </div>
        )}
      </div>

      <div className="mt-3 space-y-1.5 text-[13px] text-[#333]">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
          <span className="inline-flex items-center gap-1.5">
            <Briefcase className="h-3.5 w-3.5 text-[#888]" />
            {r.subject || "—"}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <GraduationCap className="h-3.5 w-3.5 text-[#888]" />
            {level !== "—" ? level : pupil}
          </span>
          {gender || (pupil !== "Élève" && level !== "—") ? (
            <span className="inline-flex items-center gap-1.5">
              <UserRound className="h-3.5 w-3.5 text-[#888]" />
              {gender || pupil}
            </span>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
          <span className="inline-flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5 text-[#888]" />
            {freq}
          </span>
          <span className="font-bold text-[#222]">{pay}</span>
        </div>
      </div>

      {badges.length ? (
        <div className="mt-2.5 flex gap-1.5">
          {badges.map((b) => (
            <span
              key={b}
              className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-white"
              title={b === "SE" ? "Semaine" : b === "WE" ? "Week-end" : "Vacances scolaires"}
            >
              {b}
            </span>
          ))}
        </div>
      ) : null}

      {start ? <p className="mt-2 text-[12px] text-[#666]">À partir du {start}</p> : null}
      {markLabel ? (
        <p className="mt-1 text-[11px] font-semibold uppercase tracking-wide text-welcome">{markLabel}</p>
      ) : null}

      <div className="mt-3 flex items-end justify-between gap-2 border-t border-[#f0f0f0] pt-3">
        <div>
          {r.hasCat || r.hasDog ? (
            <div className="mb-1.5 flex flex-wrap gap-1.5">
              {r.hasCat ? (
                <span
                  className="inline-flex items-center gap-1 rounded bg-[#4a90d9] px-2 py-0.5 text-[11px] font-semibold text-white"
                  title="Famille avec chat(s)"
                >
                  <Cat className="h-3 w-3" />
                  Chat
                </span>
              ) : null}
              {r.hasDog ? (
                <span
                  className="inline-flex items-center gap-1 rounded bg-[#4a90d9] px-2 py-0.5 text-[11px] font-semibold text-white"
                  title="Famille avec chien(s)"
                >
                  <Dog className="h-3 w-3" />
                  Chien
                </span>
              ) : null}
            </div>
          ) : null}
          <div className="text-[11px] text-[#999]">
            {ref} — {r.ago || "nouveau"}
          </div>
        </div>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onConsult();
          }}
          className="rounded-md bg-primary px-4 py-2 text-[12px] font-bold uppercase tracking-wide text-white hover:bg-welcome"
        >
          Consulter
        </button>
      </div>
    </article>
  );
}

function OfferDetailModal({
  r,
  home,
  mark,
  busy,
  onClose,
  onAccept,
  onMark,
}: {
  r: OfferReq;
  home: [number, number];
  mark?: OfferMark | null;
  busy?: boolean;
  onClose: () => void;
  onAccept: () => void;
  onMark: (m: OfferMark) => void;
}) {
  const place = (r.name || r.slot || "Abidjan").replace(/,?\s*Côte d'Ivoire/i, "").trim();
  const dist = distanceKmFromHome(r.slot || r.name || place, home, r.lat, r.lng);
  const { name: pupil, level, gender } = parseStudent(r.student);
  const start = formatStart(r.startDate);
  const pay =
    r.isOpportunity && r.netHourly != null
      ? `${fcfa(r.netHourly)} F/h net`
      : r.price != null
        ? `${fcfa(r.price)} F`
        : "—";

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center" role="dialog" aria-modal>
      <button type="button" className="absolute inset-0 bg-black/40" aria-label="Fermer" onClick={onClose} />
      <div className="relative z-10 max-h-[90dvh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-white p-5 shadow-xl sm:rounded-2xl sm:p-6">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-welcome">Détail de l&apos;offre</p>
            <h2 className="mt-1 text-xl font-bold uppercase text-[#222]">{place || "Offre"}</h2>
          </div>
          <button type="button" className="rounded-md p-2 text-[#666] hover:bg-[#f5f5f5]" onClick={onClose} aria-label="Fermer">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-2 text-[14px] text-[#333]">
          <p>
            <span className="font-semibold text-welcome">Matière :</span> {r.subject || "—"}
          </p>
          <p>
            <span className="font-semibold text-welcome">Élève :</span>{" "}
            {[pupil, level, gender].filter(Boolean).join(" · ") || "—"}
          </p>
          <p>
            <span className="font-semibold text-welcome">Format :</span> {isOnline(r) ? "En ligne" : "À domicile"}
            {dist != null && !isOnline(r) ? ` · ${dist.toLocaleString("fr-FR", { maximumFractionDigits: 1 })} km` : ""}
          </p>
          <p>
            <span className="font-semibold text-welcome">Rythme :</span>{" "}
            {[r.frequency, r.duration].filter(Boolean).join(" — ") || "—"}
          </p>
          <p>
            <span className="font-semibold text-welcome">Rémunération :</span> {pay}
            {r.isOpportunity && r.price != null ? ` · ${fcfa(r.price)} F / séance` : ""}
          </p>
          {start ? (
            <p>
              <span className="font-semibold text-welcome">Début :</span> à partir du {start}
            </p>
          ) : null}
          <p>
            <span className="font-semibold text-welcome">Disponibilités :</span>{" "}
            {[
              r.availabilityWeek !== false ? "semaine" : null,
              r.availabilityWeekend ? "week-end" : null,
              r.availabilityHolidays ? "vacances" : null,
            ]
              .filter(Boolean)
              .join(", ") || "—"}
          </p>
          {(r.hasCat || r.hasDog) && (
            <p>
              <span className="font-semibold text-welcome">Animaux :</span>{" "}
              {[r.hasCat ? "chat" : null, r.hasDog ? "chien" : null].filter(Boolean).join(", ")}
            </p>
          )}
          {mark ? (
            <p className="rounded-md bg-[#f5f5f5] px-3 py-2 text-sm">
              Statut actuel :{" "}
              <strong>
                {mark === "option" ? "Avec option" : mark === "thinking" ? "En réflexion" : "Refusée"}
              </strong>
            </p>
          ) : null}
        </div>

        <div className="mt-5 space-y-2">
          <Button className="w-full" disabled={busy} onClick={onAccept}>
            Accepter cette offre
          </Button>
          <div className="grid grid-cols-2 gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={busy}
              onClick={() => onMark("option")}
            >
              Prendre une option
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={busy}
              onClick={() => onMark("thinking")}
            >
              En réflexion
            </Button>
          </div>
          <Button
            type="button"
            variant="outline"
            className="w-full border-red-200 text-red-700 hover:bg-red-50"
            disabled={busy}
            onClick={() => onMark("refused")}
          >
            Refuser / masquer
          </Button>
        </div>
      </div>
    </div>
  );
}

function PopMenu({
  open,
  onClose,
  children,
  align = "left",
}: {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  align?: "left" | "right";
}) {
  if (!open) return null;
  return (
    <>
      <button type="button" className="fixed inset-0 z-20 cursor-default" aria-label="Fermer" onClick={onClose} />
      <div
        className={`absolute top-full z-30 mt-1 w-[min(320px,calc(100vw-2rem))] rounded-lg border border-[#ddd] bg-white p-3 shadow-lg ${
          align === "right" ? "right-0" : "left-0"
        }`}
      >
        {children}
      </div>
    </>
  );
}

export function TeacherRequestsPage() {
  const { data: rawData, offline, reload } = useLive<OfferReq[]>(
    "/api/teacher/requests",
    fallback.teacherRequests as OfferReq[],
  );
  // Page Completude « Mes offres » = besoins publiés uniquement (pas les réservations legacy)
  const data = useMemo(
    () => rawData.filter((r) => Boolean(r.isOpportunity) || r.needId != null),
    [rawData],
  );
  const { data: profile } = useLive<{ location?: string } | null>("/api/teacher/profile", null);

  const savedSearch = loadJson(LS_SEARCH, {
    location: "Cocody, Abidjan",
    when: { week: true, weekend: true, vacations: true } as WhenOpts,
    prefs: { vehicle: false, acceptDogs: true, acceptCats: true } as Prefs,
  });

  const [sideTab, setSideTab] = useState<"search" | "props">("search");
  const [showResults, setShowResults] = useState(true);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  // Brouillon sidebar
  const [location, setLocation] = useState(savedSearch.location);
  const [whenOpts, setWhenOpts] = useState<WhenOpts>(savedSearch.when);
  const [prefs, setPrefs] = useState<Prefs>(savedSearch.prefs);
  const [channels, setChannels] = useState<Channels>(() => loadJson(LS_CHANNELS, { sms: true, notif: true }));
  const [propFilters, setPropFilters] = useState<PropFilters>({ option: true, thinking: true, refused: false });

  // Filtres appliqués (après « Voir les offres »)
  const [applied, setApplied] = useState({
    location: savedSearch.location,
    when: savedSearch.when,
    prefs: savedSearch.prefs,
    list: { subjects: [] as string[], home: true, online: true, maxKm: null as number | null } as ListFilters,
  });

  const [sort, setSort] = useState<SortMode>("recent");
  const [filterOpen, setFilterOpen] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);
  const [draftList, setDraftList] = useState<ListFilters>(applied.list);

  const [marks, setMarks] = useState<Record<string, OfferMark>>(loadMarks);
  const [selectedOfferId, setSelectedOfferId] = useState<string | null>(null);
  const [consultId, setConsultId] = useState<string | null>(null);
  const cardEls = useRef<Record<string, HTMLElement | null>>({});
  const profileLocApplied = useRef(false);

  useEffect(() => {
    if (profile?.location && !profileLocApplied.current) {
      profileLocApplied.current = true;
      setLocation(profile.location);
      setApplied((a) => ({ ...a, location: profile.location! }));
    }
  }, [profile?.location]);

  useEffect(() => {
    localStorage.setItem(LS_CHANNELS, JSON.stringify(channels));
  }, [channels]);

  useEffect(() => {
    localStorage.setItem(LS_MARKS, JSON.stringify(marks));
  }, [marks]);

  const homeCoords = useMemo(
    () => resolveCoords(applied.location) || resolveCoords(profile?.location) || TEACHER_HOME,
    [applied.location, profile?.location],
  );

  const allSubjects = useMemo(() => {
    const s = new Set<string>();
    for (const r of data) if (r.subject) s.add(r.subject);
    return [...s].sort((a, b) => a.localeCompare(b, "fr"));
  }, [data]);

  const filtered = useMemo(() => {
    let list = [...data];

    // Onglet propositions : seulement les offres marquées
    if (sideTab === "props") {
      list = list.filter((r) => {
        const m = marks[offerId(r)];
        if (!m) return false;
        if (m === "option" && propFilters.option) return true;
        if (m === "thinking" && propFilters.thinking) return true;
        if (m === "refused" && propFilters.refused) return true;
        return false;
      });
    } else {
      // Recherche : masquer les refusées localement
      list = list.filter((r) => marks[offerId(r)] !== "refused");
    }

    list = list.filter((r) => matchesWhen(r, applied.when));

    if (!applied.prefs.acceptCats) list = list.filter((r) => !r.hasCat);
    if (!applied.prefs.acceptDogs) list = list.filter((r) => !r.hasDog);

    if (!applied.list.home) list = list.filter((r) => isOnline(r));
    if (!applied.list.online) list = list.filter((r) => !isOnline(r));
    if (applied.list.subjects.length) {
      list = list.filter((r) => r.subject && applied.list.subjects.includes(r.subject));
    }

    list = list.filter((r) => {
      if (isOnline(r)) return true;
      const d = distanceKmFromHome(r.slot || r.name || r.format, homeCoords, r.lat, r.lng);
      if (d == null) return true;
      if (!applied.prefs.vehicle && d > NO_VEHICLE_MAX_KM) return false;
      if (applied.list.maxKm != null && d > applied.list.maxKm) return false;
      return true;
    });

    if (sort === "price_desc") {
      list.sort((a, b) => (b.netHourly || b.price || 0) - (a.netHourly || a.price || 0));
    } else if (sort === "price_asc") {
      list.sort((a, b) => (a.netHourly || a.price || 0) - (b.netHourly || b.price || 0));
    } else if (sort === "distance") {
      list.sort((a, b) => {
        const da = distanceKmFromHome(a.slot || a.name, homeCoords, a.lat, a.lng) ?? 9999;
        const db = distanceKmFromHome(b.slot || b.name, homeCoords, b.lat, b.lng) ?? 9999;
        return da - db;
      });
    }

    return list;
  }, [data, sideTab, marks, propFilters, applied, homeCoords, sort]);

  useEffect(() => {
    if (!selectedOfferId) return;
    const el = cardEls.current[selectedOfferId];
    if (el) el.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [selectedOfferId, filtered]);

  const consultOffer = useMemo(
    () => (consultId ? data.find((r) => offerId(r) === consultId) || null : null),
    [consultId, data],
  );

  function applySearch() {
    const next = {
      location,
      when: whenOpts,
      prefs,
      list: applied.list,
    };
    setApplied(next);
    localStorage.setItem(
      LS_SEARCH,
      JSON.stringify({ location, when: whenOpts, prefs }),
    );
    setShowResults(true);
    setSelectedOfferId(null);
    setFilterOpen(false);
    setSortOpen(false);
    setMsg(
      sideTab === "search"
        ? "Recherche mise à jour"
        : "Propositions filtrées",
    );
  }

  function applyListFilters() {
    setApplied((a) => ({ ...a, list: draftList }));
    setFilterOpen(false);
    setMsg("Filtres appliqués");
  }

  async function acceptOffer(r: OfferReq) {
    const id = Number(r.needId || r.courseId);
    if (!id) return;
    setBusy(true);
    try {
      await api(`/api/teacher/requests/${id}/accept`, { method: "POST", body: {} });
      setMsg("Offre acceptée — elle apparaît dans vos cours");
      setConsultId(null);
      setMarks((m) => {
        const next = { ...m };
        delete next[offerId(r)];
        return next;
      });
      void reload();
    } catch (ex) {
      setMsg(ex instanceof Error ? ex.message : "Erreur");
    } finally {
      setBusy(false);
    }
  }

  async function markOffer(r: OfferReq, mark: OfferMark) {
    const id = offerId(r);
    if (mark === "refused" && !r.isOpportunity) {
      setBusy(true);
      try {
        await api(`/api/teacher/requests/${Number(r.courseId)}/refuse`, { method: "POST", body: {} });
        setMsg("Demande refusée");
        setMarks((m) => ({ ...m, [id]: "refused" }));
        setConsultId(null);
        void reload();
      } catch (ex) {
        setMsg(ex instanceof Error ? ex.message : "Erreur");
      } finally {
        setBusy(false);
      }
      return;
    }
    setMarks((m) => ({ ...m, [id]: mark }));
    setMsg(
      mark === "option"
        ? "Option prise sur cette offre"
        : mark === "thinking"
          ? "Offre mise en réflexion"
          : "Offre masquée",
    );
    setConsultId(null);
    if (mark === "refused" && sideTab === "search") {
      setSelectedOfferId(null);
    }
  }

  const mapOffers = filtered.map((r) => ({
    id: offerId(r),
    label: r.name || r.slot || "Offre",
    place: r.slot || r.name || r.format,
    subject: r.subject,
    lat: r.lat ?? null,
    lng: r.lng ?? null,
    priceLabel:
      r.isOpportunity && r.netHourly != null
        ? `${fcfa(r.netHourly)} F/h net`
        : r.price != null
          ? `${fcfa(r.price)} F`
          : undefined,
  }));

  const sortLabel =
    sort === "recent"
      ? "Récent"
      : sort === "price_desc"
        ? "Tarif ↓"
        : sort === "price_asc"
          ? "Tarif ↑"
          : "Distance";

  return (
    <AppShell title="Mes offres de cours" active="prof-offres" fullBleed>
      {offline ? (
        <div className="px-4 pt-3">
          <OfflineBanner onRetry={() => void reload()} />
        </div>
      ) : null}
      {msg ? (
        <p className="flex items-center justify-between gap-2 px-4 pt-2 text-sm font-semibold text-primary">
          <span>{msg}</span>
          <button type="button" className="text-xs font-normal text-[#888]" onClick={() => setMsg("")}>
            Fermer
          </button>
        </p>
      ) : null}

      <div className="flex flex-col lg:flex-row lg:items-start">
        <aside className="flex w-full shrink-0 flex-col border-b border-[#e8e8e8] bg-[#f7f7f7] lg:sticky lg:top-[58px] lg:h-[calc(100dvh-58px)] lg:w-[280px] lg:border-b-0 lg:border-r xl:w-[300px]">
          <div className="grid shrink-0 grid-cols-2 border-b border-[#ddd] bg-white">
            <button
              type="button"
              onClick={() => {
                setSideTab("search");
                setShowResults(true);
              }}
              className={`px-2 py-3.5 text-center text-[11px] font-bold uppercase leading-tight tracking-wide sm:text-[12px] ${
                sideTab === "search" ? "bg-welcome text-white" : "bg-white text-[#666]"
              }`}
            >
              Nouvelle recherche
            </button>
            <button
              type="button"
              onClick={() => {
                setSideTab("props");
                setShowResults(true);
              }}
              className={`px-2 py-3.5 text-center text-[11px] font-bold uppercase leading-tight tracking-wide sm:text-[12px] ${
                sideTab === "props" ? "bg-welcome text-white" : "bg-white text-[#666]"
              }`}
            >
              Propositions et options
            </button>
          </div>

          <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-3">
            {sideTab === "search" ? (
              <>
                <div className="rounded-lg bg-white p-3 shadow-sm">
                  <div className="mb-2 text-[14px] font-semibold text-welcome">Mon adresse</div>
                  <Input
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="Ex. Cocody, Marcory…"
                    className="rounded-none border-0 border-b border-[#ccc] bg-transparent px-0 shadow-none focus-visible:ring-0"
                  />
                  <p className="mt-1 text-[11px] text-[#888]">Côte d&apos;Ivoire — recentre la carte au clic sur Voir les offres</p>
                </div>
                <div className="rounded-lg bg-white p-3 shadow-sm">
                  <div className="mb-1 text-[14px] font-semibold text-welcome">Quand ?</div>
                  <CheckRow
                    label="Pendant la semaine en période scolaire"
                    checked={whenOpts.week}
                    onChange={(v) => setWhenOpts((s) => ({ ...s, week: v }))}
                  />
                  <CheckRow
                    label="Pendant les week-ends en période scolaire"
                    checked={whenOpts.weekend}
                    onChange={(v) => setWhenOpts((s) => ({ ...s, weekend: v }))}
                  />
                  <CheckRow
                    label="Seulement pendant les vacances scolaires"
                    checked={whenOpts.vacations}
                    onChange={(v) => setWhenOpts((s) => ({ ...s, vacations: v }))}
                  />
                </div>
                <div className="rounded-lg bg-white p-3 shadow-sm">
                  <div className="mb-1 text-[14px] font-semibold text-welcome">Mes préférences</div>
                  <CheckRow
                    label="J'ai un véhicule"
                    checked={prefs.vehicle}
                    onChange={(v) => setPrefs((s) => ({ ...s, vehicle: v }))}
                  />
                  <CheckRow
                    label="J'accepte les offres des familles avec des chiens"
                    checked={prefs.acceptDogs}
                    onChange={(v) => setPrefs((s) => ({ ...s, acceptDogs: v }))}
                  />
                  <CheckRow
                    label="J'accepte les offres des familles avec des chats"
                    checked={prefs.acceptCats}
                    onChange={(v) => setPrefs((s) => ({ ...s, acceptCats: v }))}
                  />
                  {!prefs.vehicle ? (
                    <p className="mt-2 text-[11px] text-[#888]">Sans véhicule : offres à plus de {NO_VEHICLE_MAX_KM} km exclues.</p>
                  ) : null}
                </div>
              </>
            ) : (
              <>
                <div className="rounded-lg bg-white p-3 shadow-sm">
                  <div className="mb-2 text-[14px] font-semibold text-welcome">Mon adresse</div>
                  <Input
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="rounded-none border-0 border-b border-[#ccc] bg-transparent px-0 shadow-none focus-visible:ring-0"
                  />
                </div>
                <div className="rounded-lg bg-white p-3 shadow-sm">
                  <div className="mb-1 text-[14px] font-semibold text-welcome">Propositions reçues</div>
                  <CheckRow label="SMS" checked={channels.sms} onChange={(v) => setChannels((s) => ({ ...s, sms: v }))} />
                  <CheckRow
                    label="Notification application"
                    checked={channels.notif}
                    onChange={(v) => setChannels((s) => ({ ...s, notif: v }))}
                  />
                  <p className="mt-2 text-[11px] text-[#888]">Préférences enregistrées sur cet appareil.</p>
                </div>
                <div className="rounded-lg bg-white p-3 shadow-sm">
                  <div className="mb-1 text-[14px] font-semibold text-welcome">Mes préférences</div>
                  <CheckRow
                    label="Avec option"
                    checked={propFilters.option}
                    onChange={(v) => setPropFilters((s) => ({ ...s, option: v }))}
                  />
                  <CheckRow
                    label="En réflexion"
                    checked={propFilters.thinking}
                    onChange={(v) => setPropFilters((s) => ({ ...s, thinking: v }))}
                  />
                  <CheckRow
                    label="Refusées"
                    checked={propFilters.refused}
                    onChange={(v) => setPropFilters((s) => ({ ...s, refused: v }))}
                  />
                  <p className="mt-2 text-[11px] text-[#888]">
                    Issues de « Consulter » → option / réflexion / refus.
                  </p>
                </div>
              </>
            )}
          </div>

          <div className="shrink-0 border-t border-[#e0e0e0] bg-primary p-0">
            <button
              type="button"
              className="w-full py-3.5 text-center text-[13px] font-bold uppercase tracking-wide text-white hover:bg-welcome"
              onClick={applySearch}
            >
              Voir les offres
            </button>
          </div>
        </aside>

        <section className="w-full bg-[#f2f2f2] lg:w-[420px] lg:shrink-0 xl:w-[460px]">
          {!showResults ? (
            <Empty>Lancez une recherche pour voir les offres</Empty>
          ) : (
            <>
              <div className="sticky top-14 z-10 flex gap-2 border-b border-[#e8e8e8] bg-white px-3 py-2.5 lg:top-[58px]">
                <div className="relative flex-1">
                  <button
                    type="button"
                    className="w-full rounded border border-[#ddd] bg-[#fafafa] py-2 text-[12px] font-semibold text-[#444] hover:border-primary"
                    onClick={() => {
                      setDraftList(applied.list);
                      setFilterOpen((o) => !o);
                      setSortOpen(false);
                    }}
                  >
                    Filtrer ({filtered.length} offre{filtered.length > 1 ? "s" : ""})
                  </button>
                  <PopMenu open={filterOpen} onClose={() => setFilterOpen(false)}>
                    <p className="mb-2 text-[13px] font-semibold text-welcome">Filtrer les offres</p>
                    <div className="mb-2 max-h-36 space-y-1 overflow-y-auto">
                      <p className="text-[11px] font-semibold uppercase text-[#888]">Matières</p>
                      {allSubjects.length ? (
                        allSubjects.map((s) => (
                          <label key={s} className="flex items-center gap-2 text-[13px]">
                            <input
                              type="checkbox"
                              className="accent-primary"
                              checked={draftList.subjects.includes(s)}
                              onChange={(e) =>
                                setDraftList((d) => ({
                                  ...d,
                                  subjects: e.target.checked
                                    ? [...d.subjects, s]
                                    : d.subjects.filter((x) => x !== s),
                                }))
                              }
                            />
                            {s}
                          </label>
                        ))
                      ) : (
                        <p className="text-[12px] text-[#888]">Aucune matière</p>
                      )}
                    </div>
                    <p className="mb-1 text-[11px] font-semibold uppercase text-[#888]">Format</p>
                    <CheckRow
                      label="À domicile"
                      checked={draftList.home}
                      onChange={(v) => setDraftList((d) => ({ ...d, home: v }))}
                    />
                    <CheckRow
                      label="En ligne"
                      checked={draftList.online}
                      onChange={(v) => setDraftList((d) => ({ ...d, online: v }))}
                    />
                    <p className="mb-1 mt-2 text-[11px] font-semibold uppercase text-[#888]">Distance max</p>
                    <div className="mb-3 flex flex-wrap gap-1.5">
                      {[
                        { label: "Illimitée", v: null },
                        { label: "5 km", v: 5 },
                        { label: "10 km", v: 10 },
                        { label: "20 km", v: 20 },
                        { label: "50 km", v: 50 },
                      ].map((o) => (
                        <button
                          key={String(o.v)}
                          type="button"
                          className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${
                            draftList.maxKm === o.v
                              ? "border-primary bg-primary text-white"
                              : "border-[#ddd] text-[#444]"
                          }`}
                          onClick={() => setDraftList((d) => ({ ...d, maxKm: o.v }))}
                        >
                          {o.label}
                        </button>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() =>
                          setDraftList({ subjects: [], home: true, online: true, maxKm: null })
                        }
                      >
                        Réinit.
                      </Button>
                      <Button type="button" size="sm" className="flex-1" onClick={applyListFilters}>
                        Appliquer
                      </Button>
                    </div>
                  </PopMenu>
                </div>

                <div className="relative flex-1">
                  <button
                    type="button"
                    className="w-full rounded border border-[#ddd] bg-[#fafafa] py-2 text-[12px] font-semibold text-[#444] hover:border-primary"
                    onClick={() => {
                      setSortOpen((o) => !o);
                      setFilterOpen(false);
                    }}
                  >
                    Trier · {sortLabel}
                  </button>
                  <PopMenu open={sortOpen} onClose={() => setSortOpen(false)} align="right">
                    <p className="mb-2 text-[13px] font-semibold text-welcome">Trier par</p>
                    {(
                      [
                        ["recent", "Plus récentes"],
                        ["price_desc", "Tarif (plus élevé)"],
                        ["price_asc", "Tarif (plus bas)"],
                        ["distance", "Distance (plus proche)"],
                      ] as const
                    ).map(([key, label]) => (
                      <button
                        key={key}
                        type="button"
                        className="flex w-full items-center justify-between rounded px-2 py-2 text-left text-[13px] hover:bg-[#f5f5f5]"
                        onClick={() => {
                          setSort(key);
                          setSortOpen(false);
                          setMsg(`Tri : ${label}`);
                        }}
                      >
                        {label}
                        {sort === key ? <Check className="h-4 w-4 text-primary" /> : null}
                      </button>
                    ))}
                  </PopMenu>
                </div>
              </div>

              <div className="space-y-3 p-3">
                {!filtered.length ? (
                  <Empty>
                    {sideTab === "props"
                      ? "Aucune proposition dans ces catégories — consultez une offre pour la classer."
                      : "Aucune offre n'a été trouvée — ajustez vos filtres puis « Voir les offres »."}
                  </Empty>
                ) : (
                  filtered.map((r) => {
                    const id = offerId(r);
                    return (
                      <OfferCard
                        key={`${r.isOpportunity ? "opp" : "req"}-${id}`}
                        r={r}
                        home={homeCoords}
                        selected={selectedOfferId === id}
                        mark={marks[id] || null}
                        cardRef={(el) => {
                          cardEls.current[id] = el;
                        }}
                        onSelect={() => setSelectedOfferId(id)}
                        onConsult={() => {
                          setSelectedOfferId(id);
                          setConsultId(id);
                        }}
                      />
                    );
                  })
                )}
              </div>
            </>
          )}
        </section>

        <section className="relative hidden flex-1 lg:sticky lg:top-[58px] lg:block lg:h-[calc(100dvh-58px)]">
          <CoteIvoireOffersMap
            offers={mapOffers}
            home={homeCoords}
            selectedId={selectedOfferId}
            onSelectOffer={setSelectedOfferId}
            className="absolute inset-0 h-full w-full"
          />
        </section>

        <section className="relative h-[240px] w-full border-t border-[#e8e8e8] bg-[#e8e8e8] lg:hidden">
          <CoteIvoireOffersMap
            offers={mapOffers}
            home={homeCoords}
            selectedId={selectedOfferId}
            onSelectOffer={setSelectedOfferId}
            className="absolute inset-0 h-full w-full"
          />
        </section>
      </div>

      {consultOffer ? (
        <OfferDetailModal
          r={consultOffer}
          home={homeCoords}
          mark={marks[offerId(consultOffer)] || null}
          busy={busy}
          onClose={() => setConsultId(null)}
          onAccept={() => void acceptOffer(consultOffer)}
          onMark={(m) => void markOffer(consultOffer, m)}
        />
      ) : null}
    </AppShell>
  );
}
// offers-clean 1784636834
