import type { ReactNode } from "react";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  BookOpen,
  Calendar,
  ChartLine,
  FileText,
  HelpCircle,
  Home,
  Inbox,
  Menu,
  Phone,
  Search,
  User,
  Users,
  Wallet,
  X,
  ArrowLeft,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";

type NavItem = { to: string; label: string; icon: typeof Home; match?: string };

const parentTabs: NavItem[] = [
  { to: "/accueil", label: "Accueil", icon: Home },
  { to: "/recherche", label: "Recherche", icon: Search },
  { to: "/cours", label: "Mes cours", icon: BookOpen },
  { to: "/progres", label: "Progrès", icon: ChartLine },
  { to: "/mes-besoins", label: "Mes besoins", icon: Inbox },
  { to: "/ressources", label: "Ressources", icon: FileText },
  { to: "/aide", label: "Aide", icon: HelpCircle },
  { to: "/compte", label: "Mon compte", icon: User },
];

/** Nav prof calquée sur Completude (labels métier MP²) */
const teacherTabs: NavItem[] = [
  { to: "/prof-espace", label: "Accueil", icon: Home },
  { to: "/prof-offres", label: "Mes offres de cours", icon: Search },
  { to: "/cours", label: "Mes élèves", icon: Users, match: "cours" },
  { to: "/prof-revenus", label: "Mes revenus", icon: Wallet },
  { to: "/agenda", label: "Mon agenda", icon: Calendar },
  { to: "/ressources", label: "Mes documents", icon: FileText },
  { to: "/aide", label: "Mes contacts", icon: Phone },
  { to: "/compte", label: "Mon compte", icon: User },
];

function isActive(item: NavItem, active?: string) {
  const key = active?.replace(/^\//, "") || "";
  if (item.match) return key === item.match || key.startsWith(item.match);
  const slug = item.to.replace(/^\//, "");
  return key === slug || active === item.to;
}

function NavItemLink({
  item,
  active,
  onNavigate,
  variant,
}: {
  item: NavItem;
  active?: string;
  onNavigate?: () => void;
  variant: "top" | "side";
}) {
  const Icon = item.icon;
  const on = isActive(item, active);
  if (variant === "top") {
    return (
      <Link
        to={item.to}
        onClick={onNavigate}
        className={cn(
          "inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-md px-2.5 py-1.5 text-[13px] font-medium transition-colors",
          on ? "bg-primary text-white" : "text-[#555] hover:bg-[#f0f0f0]",
        )}
      >
        <Icon className="h-3.5 w-3.5" />
        {item.label}
      </Link>
    );
  }
  return (
    <Link
      to={item.to}
      onClick={onNavigate}
      className={cn(
        "flex items-center gap-3 border-b border-[#eee] px-4 py-3.5 text-[15px] font-medium transition-colors",
        on ? "bg-primary text-white" : "text-[#444] hover:bg-[#f7f7f7]",
      )}
    >
      <Icon className={cn("h-5 w-5", on ? "text-white" : "text-[#888]")} />
      {item.label}
    </Link>
  );
}

/** Padding horizontal plein écran, responsive */
export const shellPad = "px-3 sm:px-4 md:px-6 xl:px-8 2xl:px-10";

export function AppShell({
  title,
  back,
  children,
  active,
  hideNav,
  welcome,
  stickyFooter,
  fullBleed,
}: {
  title: string;
  back?: string | true;
  children: ReactNode;
  active?: string;
  hideNav?: boolean;
  /** Sous-titre type « Bienvenue Prénom NOM » — Accueil uniquement par défaut (Completude) */
  welcome?: string | false;
  stickyFooter?: ReactNode;
  /** Contenu bord à bord (ex. offres 3 colonnes Completude) — sans padding main */
  fullBleed?: boolean;
}) {
  const { isTeacher, user } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const tabs = isTeacher ? teacherTabs : parentTabs;
  const firstName = user?.full_name || "";
  const isHome = active === "accueil" || active === "prof-espace";
  const welcomeText =
    welcome === false
      ? null
      : welcome
        ? welcome
        : isHome
          ? firstName
            ? `Bienvenue ${firstName}`
            : "Bienvenue"
          : null;

  return (
    <div className={cn("flex min-h-dvh w-full flex-col bg-background", stickyFooter && "pb-16")}>
      <header className="sticky top-0 z-40 w-full border-b border-[#e8e8e8] bg-white">
        <div className={cn("flex h-14 w-full items-center gap-2 sm:gap-3 lg:h-[58px]", shellPad)}>
          {!hideNav ? (
            <button
              type="button"
              className="flex flex-col items-center justify-center px-1 text-primary xl:hidden"
              aria-label="Menu"
              onClick={() => setMenuOpen(true)}
            >
              <Menu className="h-6 w-6" />
              <span className="text-[10px] font-medium leading-none">Menu</span>
            </button>
          ) : back ? (
            <Button
              variant="ghost"
              size="icon"
              aria-label="Retour"
              onClick={() => (typeof back === "string" ? navigate(back) : navigate(-1))}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
          ) : null}

          <a href="/" className="hidden shrink-0 items-center gap-2 xl:flex">
            <img src="/assets/mp2-logo.png" alt="" className="h-9 w-9 rounded-lg" />
            <span className="leading-tight">
              <span className="block font-display text-[15px] font-extrabold text-welcome">mon prof perso</span>
              <span className="block text-[11px] font-semibold text-primary">soutien scolaire</span>
            </span>
          </a>

          <h1 className="min-w-0 flex-1 truncate text-center text-base font-semibold text-welcome xl:hidden">{title}</h1>

          {!hideNav ? (
            <nav className="hidden min-w-0 flex-1 items-center justify-center gap-0.5 overflow-x-auto overscroll-x-contain px-1 xl:flex">
              {tabs.map((t) => (
                <NavItemLink key={t.to + t.label} item={t} active={active} variant="top" />
              ))}
            </nav>
          ) : (
            <div className="hidden flex-1 xl:block" />
          )}

          <Link
            to="/compte"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary text-white"
            aria-label="Mon compte"
          >
            <User className="h-5 w-5" />
          </Link>
        </div>
      </header>

      {menuOpen ? (
        <div className="fixed inset-0 z-50 xl:hidden">
          <button type="button" className="absolute inset-0 bg-black/35" aria-label="Fermer" onClick={() => setMenuOpen(false)} />
          <aside className="absolute inset-y-0 left-0 flex w-[min(320px,88vw)] flex-col bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-[#eee] px-4 py-3">
              <a href="/" className="flex items-center gap-2" onClick={() => setMenuOpen(false)}>
                <img src="/assets/mp2-logo.png" alt="" className="h-8 w-8 rounded-lg" />
                <span className="leading-tight">
                  <span className="block font-display text-sm font-extrabold text-welcome">mon prof perso</span>
                  <span className="block text-[11px] font-semibold text-primary">soutien scolaire</span>
                </span>
              </a>
              <button type="button" className="p-2 text-[#666]" onClick={() => setMenuOpen(false)} aria-label="Fermer">
                <X className="h-5 w-5" />
              </button>
            </div>
            <nav className="flex-1 overflow-y-auto">
              {tabs.map((t) => (
                <NavItemLink
                  key={t.to + t.label}
                  item={t}
                  active={active}
                  variant="side"
                  onNavigate={() => setMenuOpen(false)}
                />
              ))}
            </nav>
          </aside>
        </div>
      ) : null}

      {welcomeText ? (
        <div className="w-full border-b border-[#e8e8e8] bg-white">
          <div className={cn("w-full py-4 sm:py-5", shellPad)}>
            <p className="font-display text-xl font-bold text-welcome sm:text-2xl lg:text-[28px]">{welcomeText}</p>
          </div>
        </div>
      ) : null}

      <main
        className={cn(
          "w-full flex-1",
          fullBleed ? "pb-0" : cn(shellPad, stickyFooter ? "py-4 pb-6 sm:py-5" : "py-4 pb-8 sm:py-5 lg:py-6"),
        )}
      >
        {children}
      </main>

      {stickyFooter ? (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-primary/20 bg-primary">
          <div className={cn("w-full", shellPad)}>{stickyFooter}</div>
        </div>
      ) : null}
    </div>
  );
}

export function ContentCard({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("h-full rounded-xl bg-white p-4 shadow-[0_1px_4px_rgba(0,0,0,0.08)] sm:p-5 md:p-6", className)}>
      {children}
    </div>
  );
}

/** Titre de section violet Completude → vert sombre MP² */
export function SectionHeading({ children, className }: { children: ReactNode; className?: string }) {
  return <h2 className={cn("mb-4 text-[17px] font-semibold text-welcome sm:text-lg", className)}>{children}</h2>;
}

/** Grille responsive pleine largeur (listes, cartes) */
export function PageGrid({
  children,
  className,
  cols = 3,
}: {
  children: ReactNode;
  className?: string;
  /** 2 = accueil / contenu long ; 3–4 = listes */
  cols?: 2 | 3 | 4;
}) {
  const colClass =
    cols === 2
      ? "md:grid-cols-2"
      : cols === 4
        ? "sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4"
        : "sm:grid-cols-2 xl:grid-cols-3";
  return <div className={cn("grid w-full gap-4 sm:gap-5", colClass, className)}>{children}</div>;
}

/** Empilement pleine largeur ; `narrow` pour formulaires centrés */
export function PageStack({
  children,
  className,
  narrow,
}: {
  children: ReactNode;
  className?: string;
  narrow?: boolean;
}) {
  return (
    <div className={cn("flex w-full flex-col gap-4", narrow && "mx-auto max-w-2xl", className)}>{children}</div>
  );
}

export function SectionTitle({ children }: { children: ReactNode }) {
  return <SectionHeading>{children}</SectionHeading>;
}

export function PageTabs({
  tabs,
  value,
  onChange,
}: {
  tabs: { id: string; label: string }[];
  value: string;
  onChange: (id: string) => void;
}) {
  return (
    <div className="mb-5 flex border-b border-[#ddd] bg-white">
      {tabs.map((t) => {
        const on = t.id === value;
        return (
          <button
            key={t.id}
            type="button"
            onClick={() => onChange(t.id)}
            className={cn(
              "flex-1 px-3 py-3.5 text-center text-[12px] font-bold uppercase tracking-wide transition-colors sm:text-[13px]",
              on ? "border-b-[3px] border-welcome text-welcome" : "text-[#888]",
            )}
          >
            {t.label}
          </button>
        );
      })}
    </div>
  );
}

export function CheckRow({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3 border-b border-[#eee] py-3 last:border-0">
      <input
        type="checkbox"
        className="mt-0.5 h-5 w-5 shrink-0 accent-primary"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span className="text-[15px] text-[#333]">{label}</span>
    </label>
  );
}

export function InfoRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="border-b border-[#eee] py-3 last:border-0">
      <div className="text-[15px] font-semibold text-welcome">{label}&nbsp;:</div>
      <div className="mt-0.5 text-[15px] text-[#333]">{children}</div>
    </div>
  );
}

export function DocLink({ to, children, external }: { to: string; children: ReactNode; external?: boolean }) {
  const className = "link-green block py-1.5 text-[15px] underline-offset-2";
  if (external) {
    return (
      <a href={to} className={className} target="_blank" rel="noreferrer">
        {children}
      </a>
    );
  }
  return (
    <Link to={to} className={className}>
      {children}
    </Link>
  );
}

export function OfflineBanner({ onRetry }: { onRetry?: () => void }) {
  return (
    <div className="mb-4 rounded-lg bg-orange-soft px-4 py-3 text-sm text-[#8a5b33]">
      Hors-ligne — données de démonstration.{" "}
      {onRetry ? (
        <button type="button" className="font-bold underline" onClick={onRetry}>
          Réessayer
        </button>
      ) : null}
    </div>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-[40vh] items-center justify-center px-4">
      <p className="text-center text-[15px] text-[#888]">{children}</p>
    </div>
  );
}

export function MenuRow({ to, label, external }: { to: string; label: string; external?: boolean }) {
  const className =
    "flex items-center justify-between border-b border-[#eee] px-1 py-3.5 text-[15px] font-medium text-[#333] transition hover:text-primary last:border-0";
  if (external) {
    return (
      <a href={to} className={className}>
        <span>{label}</span>
        <span className="text-[#aaa]">›</span>
      </a>
    );
  }
  return (
    <Link to={to} className={className}>
      <span>{label}</span>
      <span className="text-[#aaa]">›</span>
    </Link>
  );
}
