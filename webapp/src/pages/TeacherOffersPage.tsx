import { useNavigate } from "react-router-dom";
import {
  AppShell,
  OfflineBanner,
  Empty,
  CheckRow,
} from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { fallback } from "@/lib/fallback";
import { fcfa } from "@/lib/utils";
import { useLive } from "@/hooks/useLive";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
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
import { CoteIvoireOffersMap } from "@/components/OffersMap";
import { distanceKmFromHome, resolveCoords } from "@/lib/geography";

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
type PropFilters = { option: boolean; thinking: boolean; refused: boolean };

const LS_MARKS = "mpp_offer_marks";
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

function loadMarks(key: string): Record<string, OfferMark> {
  try {
    return JSON.parse(localStorage.getItem(key) || "{}") as Record<string, OfferMark>;
  } catch {
    return {};
  }
}

function offerId(r: OfferReq) {
  return r.needId != null ? `need-${r.needId}` : `course-${r.courseId}`;
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
  home?: [number, number] | null;
  selected?: boolean;
  cardRef?: (el: HTMLElement | null) => void;
  onSelect?: () => void;
  mark?: OfferMark | null;
}) {
  const place = (r.name || r.slot || "Localisation à préciser").replace(/,?\s*Côte d'Ivoire/i, "").trim();
  const title = place.toUpperCase() || "LOCALISATION À PRÉCISER";
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
            <Briefcase className="h-3.5 w-3.5 text-muted-foreground" />
            {r.subject || "—"}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <GraduationCap className="h-3.5 w-3.5 text-muted-foreground" />
            {level !== "—" ? level : pupil}
          </span>
          {gender || (pupil !== "Élève" && level !== "—") ? (
            <span className="inline-flex items-center gap-1.5">
              <UserRound className="h-3.5 w-3.5 text-muted-foreground" />
              {gender || pupil}
            </span>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
          <span className="inline-flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5 text-muted-foreground" />
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
                  className="inline-flex items-center gap-1 rounded bg-[#24649f] px-2 py-0.5 text-[11px] font-semibold text-white"
                  title="Famille avec chat(s)"
                >
                  <Cat className="h-3 w-3" />
                  Chat
                </span>
              ) : null}
              {r.hasDog ? (
                <span
                  className="inline-flex items-center gap-1 rounded bg-[#24649f] px-2 py-0.5 text-[11px] font-semibold text-white"
                  title="Famille avec chien(s)"
                >
                  <Dog className="h-3 w-3" />
                  Chien
                </span>
              ) : null}
            </div>
          ) : null}
          <div className="text-[11px] text-muted-foreground">
            {ref} — {r.ago || "nouveau"}
          </div>
        </div>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onConsult();
          }}
          className="min-h-11 rounded-lg bg-primary px-4 py-2 text-sm font-bold uppercase tracking-wide text-white hover:bg-welcome"
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
  home: [number, number] | null;
  mark?: OfferMark | null;
  busy?: boolean;
  onClose: () => void;
  onAccept: () => void;
  onMark: (m: OfferMark) => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const overflow = document.body.style.overflow;
    const trigger = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    document.body.style.overflow = "hidden";
    dialog.showModal();
    return () => {
      dialog.close();
      document.body.style.overflow = overflow;
      if (trigger?.isConnected) trigger.focus({ preventScroll: true });
    };
  }, []);
  const place = (r.name || r.slot || "Localisation à préciser").replace(/,?\s*Côte d'Ivoire/i, "").trim();
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
    <dialog ref={dialogRef} aria-label="Détail de l’offre" className="fixed inset-0 m-auto max-h-[90dvh] w-[calc(100%_-_2rem)] max-w-lg overflow-y-auto rounded-2xl border-0 bg-white p-0 text-foreground shadow-xl backdrop:bg-black/40"
      onCancel={(event) => { event.preventDefault(); onClose(); }}
      onClick={(event) => { if (event.target !== event.currentTarget) return; const bounds = event.currentTarget.getBoundingClientRect(); if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) onClose(); }}>
      <div className="p-5 sm:p-6">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-welcome">Détail de l&apos;offre</p>
            <h2 className="mt-1 text-xl font-bold uppercase text-[#222]">{place || "Offre"}</h2>
          </div>
          <button type="button" autoFocus className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary" onClick={onClose} aria-label="Fermer">
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
              Enregistrer pour plus tard
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
    </dialog>
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
  const dialogRef = useRef<HTMLDialogElement>(null);
  const title = align === "right" ? "Trier les offres" : "Filtrer les offres";
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!open || !dialog) return;
    const overflow = document.body.style.overflow;
    const trigger = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    document.body.style.overflow = "hidden";
    dialog.showModal();
    return () => {
      dialog.close();
      document.body.style.overflow = overflow;
      if (trigger?.isConnected) trigger.focus({ preventScroll: true });
    };
  }, [open]);
  if (!open) return null;
  return <dialog ref={dialogRef} aria-label={title}
    className="fixed inset-0 m-auto max-h-[85dvh] w-[calc(100%_-_2rem)] max-w-sm overflow-y-auto rounded-2xl border border-border bg-white p-5 text-foreground shadow-xl backdrop:bg-black/40"
    onCancel={(event) => { event.preventDefault(); onClose(); }}
    onClick={(event) => { if (event.target !== event.currentTarget) return; const bounds = event.currentTarget.getBoundingClientRect(); if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) onClose(); }}>
    <div className="mb-4 flex items-center justify-between gap-3"><h2 className="font-display text-lg font-bold text-welcome">{title}</h2><button type="button" autoFocus onClick={onClose} aria-label={align === "right" ? "Fermer le tri" : "Fermer les filtres"} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg hover:bg-secondary"><X className="h-5 w-5" aria-hidden="true" /></button></div>
    {children}
  </dialog>;
}

export function TeacherRequestsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const storageKey = useCallback((name: string) => `${name}:${user?.id ?? "anonymous"}`, [user?.id]);
  const { data: rawData, offline, reload } = useLive<OfferReq[]>(
    "/api/teacher/requests",
    fallback.teacherRequests as OfferReq[],
  );
  // Published opportunities and direct booking requests have distinct identifiers and actions.
  const bookings = rawData.filter((r) => !r.isOpportunity && r.needId == null);
  const data = useMemo(
    () => rawData.filter((r) => Boolean(r.isOpportunity) || r.needId != null),
    [rawData],
  );
  const { data: profile } = useLive<{ location?: string } | null>("/api/teacher/profile", null);

  const savedSearch = loadJson(storageKey(LS_SEARCH), {
    location: "",
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

  const [marks, setMarks] = useState<Record<string, OfferMark>>(() => loadMarks(storageKey(LS_MARKS)));
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
    localStorage.setItem(storageKey(LS_MARKS), JSON.stringify(marks));
  }, [marks, storageKey]);

  const homeCoords = useMemo(
    () => resolveCoords(applied.location) || resolveCoords(profile?.location),
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
    () => (consultId ? rawData.find((r) => offerId(r) === consultId) || null : null),
    [consultId, rawData],
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
      storageKey(LS_SEARCH),
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
      const path = r.needId != null
        ? `/api/teacher/opportunities/${r.needId}/accept`
        : `/api/teacher/requests/${r.courseId}/accept`;
      const result = await api<{ courseId?: number }>(path, { method: "POST", body: {} });
      const acceptedCourseId = r.needId != null ? result.courseId : r.courseId;
      setMsg("Demande acceptée. Le parent a été informé.");
      setConsultId(null);
      setMarks((m) => {
        const next = { ...m };
        delete next[offerId(r)];
        return next;
      });
      void reload();
      if (acceptedCourseId) navigate(`/cours/${acceptedCourseId}`);
    } catch (ex) {
      setMsg(ex instanceof Error ? ex.message : "Erreur");
    } finally {
      setBusy(false);
    }
  }

  async function markOffer(r: OfferReq, mark: OfferMark) {
    const id = offerId(r);
    if (mark === "refused" && !r.isOpportunity && r.needId == null) {
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
        ? "Offre enregistrée pour plus tard sur cet appareil"
        : mark === "thinking"
          ? "Offre classée en réflexion sur cet appareil"
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
          <button type="button" className="text-xs font-normal text-muted-foreground" onClick={() => setMsg("")}>
            Fermer
          </button>
        </p>
      ) : null}


      {bookings.length ? (
        <section className="space-y-3 border-b bg-white p-4" aria-labelledby="direct-bookings-title">
          <h2 id="direct-bookings-title" className="text-lg font-bold">Réservations directes à traiter</h2>
          <div className="grid gap-3 md:grid-cols-2">
            {bookings.map((booking) => (
              <article key={`booking-${booking.courseId}`} className="rounded-lg border p-4">
                <h3 className="font-semibold">{booking.name} · {booking.subject}</h3>
                <p className="text-sm text-muted-foreground">{booking.student} · {booking.slot} · {booking.format}</p>
                <p className="mt-2 text-sm">Tarif de la séance : {fcfa(booking.price)} F</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button disabled={busy || offline} onClick={() => void acceptOffer(booking)}>Accepter</Button>
                  <Button variant="outline" disabled={busy || offline} onClick={() => void markOffer(booking, "refused")}>Refuser</Button>
                </div>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      <div className="flex flex-col lg:flex-row lg:items-start">
        <aside className="flex w-full shrink-0 flex-col border-b border-[#e8e8e8] bg-[#f7f7f7] lg:sticky lg:top-14 lg:h-[calc(100dvh-3.5rem)] lg:w-[min(320px,28vw)] lg:border-b-0 lg:border-r xl:top-[58px] xl:h-[calc(100dvh-58px)] xl:w-[300px]">
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
                  <p className="mt-1 text-[11px] text-muted-foreground">Côte d&apos;Ivoire — recentre la carte au clic sur Voir les offres</p>
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
                    <p className="mt-2 text-[11px] text-muted-foreground">Sans véhicule : offres à plus de {NO_VEHICLE_MAX_KM} km exclues.</p>
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
                  <div className="mb-1 text-[14px] font-semibold text-welcome">Notifications</div>
                  <a className="link-green text-sm" href="/espace/#/parametres">Régler mes alertes de cours et de paiement</a>
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
                  <p className="mt-2 text-[11px] text-muted-foreground">
                    Classement conservé sur cet appareil. Seule l’acceptation transmet votre décision.
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
                    className="min-h-11 w-full rounded-lg border border-border bg-white px-2 py-2 text-sm font-semibold text-foreground hover:border-primary"
                    aria-haspopup="dialog" aria-expanded={filterOpen}
                    onClick={() => {
                      setDraftList(applied.list);
                      setFilterOpen((o) => !o);
                      setSortOpen(false);
                    }}
                  >
                    Filtrer ({filtered.length} offre{filtered.length > 1 ? "s" : ""})
                  </button>
                  <PopMenu open={filterOpen} onClose={() => setFilterOpen(false)}>
                    <div className="mb-2 max-h-36 space-y-1 overflow-y-auto">
                      <p className="text-[11px] font-semibold uppercase text-muted-foreground">Matières</p>
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
                        <p className="text-[12px] text-muted-foreground">Aucune matière</p>
                      )}
                    </div>
                    <p className="mb-1 text-[11px] font-semibold uppercase text-muted-foreground">Format</p>
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
                    <p className="mb-1 mt-2 text-[11px] font-semibold uppercase text-muted-foreground">Distance max</p>
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
                          aria-pressed={draftList.maxKm === o.v}
                          className={`min-h-11 rounded-full border px-3 py-2 text-sm font-semibold ${
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
                    className="min-h-11 w-full rounded-lg border border-border bg-white px-2 py-2 text-sm font-semibold text-foreground hover:border-primary"
                    aria-haspopup="dialog" aria-expanded={sortOpen}
                    onClick={() => {
                      setSortOpen((o) => !o);
                      setFilterOpen(false);
                    }}
                  >
                    Trier · {sortLabel}
                  </button>
                  <PopMenu open={sortOpen} onClose={() => setSortOpen(false)} align="right">
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
                        aria-pressed={sort === key}
                        className="flex min-h-11 w-full items-center justify-between gap-2 rounded-lg px-2 py-2 text-left text-sm hover:bg-secondary"
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
                      : "Aucune offre n’a été trouvée — ajustez vos filtres puis « Voir les offres »."}
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

        <section className="relative hidden min-h-[420px] flex-1 lg:sticky lg:top-14 lg:block lg:h-[calc(100dvh-3.5rem)] xl:top-[58px] xl:h-[calc(100dvh-58px)]">
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
