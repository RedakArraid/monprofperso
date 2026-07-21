import type { ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  BookOpen,
  Calendar,
  ChartLine,
  Home,
  Inbox,
  Search,
  User,
  Wallet,
  ArrowLeft,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";

const parentTabs = [
  { to: "/accueil", label: "Accueil", icon: Home },
  { to: "/recherche", label: "Recherche", icon: Search },
  { to: "/cours", label: "Cours", icon: BookOpen },
  { to: "/progres", label: "Progrès", icon: ChartLine },
  { to: "/compte", label: "Compte", icon: User },
];

const teacherTabs = [
  { to: "/prof-espace", label: "Tableau", icon: ChartLine },
  { to: "/prof-offres", label: "Demandes", icon: Inbox },
  { to: "/agenda", label: "Agenda", icon: Calendar },
  { to: "/prof-revenus", label: "Revenus", icon: Wallet },
  { to: "/compte", label: "Compte", icon: User },
];

function NavLinks({
  tabs,
  active,
  variant,
}: {
  tabs: typeof parentTabs;
  active?: string;
  variant: "top" | "bottom";
}) {
  return tabs.map((t) => {
    const Icon = t.icon;
    const on = active === t.to.replace(/^\//, "") || active === t.to;
    if (variant === "top") {
      return (
        <Link
          key={t.to}
          to={t.to}
          className={cn(
            "inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold transition-colors",
            on ? "bg-secondary text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground",
          )}
        >
          <Icon className="h-4 w-4" />
          {t.label}
        </Link>
      );
    }
    return (
      <Link
        key={t.to}
        to={t.to}
        className={cn(
          "flex min-w-[56px] flex-col items-center gap-0.5 px-2 text-[10px] font-semibold",
          on ? "text-primary" : "text-muted-foreground",
        )}
      >
        <Icon className="h-5 w-5" />
        {t.label}
      </Link>
    );
  });
}

export function AppShell({
  title,
  back,
  children,
  active,
  hideNav,
  wide,
}: {
  title: string;
  back?: string | true;
  children: ReactNode;
  active?: string;
  hideNav?: boolean;
  /** Contenu encore plus large (listes, tableaux) */
  wide?: boolean;
}) {
  const { isTeacher, user } = useAuth();
  const navigate = useNavigate();
  const tabs = isTeacher ? teacherTabs : parentTabs;

  return (
    <div className="min-h-dvh bg-background">
      <header className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3 lg:px-6">
          <a href="/" className="hidden shrink-0 items-center gap-2 sm:flex">
            <img src="/assets/mp2-logo.png" alt="" className="h-9 w-9 rounded-xl" />
            <span className="font-display text-sm font-extrabold text-primary">Mon Prof Perso</span>
          </a>
          {back ? (
            <Button
              variant="ghost"
              size="icon"
              aria-label="Retour"
              onClick={() => (typeof back === "string" ? navigate(back) : navigate(-1))}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
          ) : null}
          <h1 className="font-display min-w-0 flex-1 truncate text-xl font-extrabold sm:text-2xl">{title}</h1>
          {!hideNav ? (
            <nav className="hidden items-center gap-1 md:flex">
              <NavLinks tabs={tabs} active={active} variant="top" />
            </nav>
          ) : null}
          {user ? (
            <div className="hidden text-right text-xs text-muted-foreground lg:block">
              <div className="font-semibold text-foreground">{user.full_name}</div>
              <div>{user.phone}</div>
            </div>
          ) : null}
        </div>
      </header>

      <main
        className={cn(
          "mx-auto w-full px-4 py-6 lg:px-6",
          wide ? "max-w-7xl" : "max-w-6xl",
          !hideNav && "pb-24 md:pb-10",
        )}
      >
        {children}
      </main>

      {!hideNav ? (
        <nav className="fixed bottom-0 left-0 right-0 z-30 border-t border-border bg-card pb-[env(safe-area-inset-bottom)] md:hidden">
          <div className="flex justify-around px-1 py-2">
            <NavLinks tabs={tabs} active={active} variant="bottom" />
          </div>
        </nav>
      ) : null}
    </div>
  );
}

export function PageGrid({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("grid gap-4 sm:grid-cols-2 xl:grid-cols-3", className)}>{children}</div>;
}

export function PageStack({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("mx-auto flex max-w-2xl flex-col gap-4", className)}>{children}</div>;
}

export function SectionTitle({ children }: { children: ReactNode }) {
  return <h2 className="font-display mb-1 text-lg font-bold">{children}</h2>;
}

export function OfflineBanner({ onRetry }: { onRetry?: () => void }) {
  return (
    <div className="mb-4 rounded-xl bg-orange-soft px-4 py-3 text-sm text-[#8a5b33]">
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
  return <p className="py-12 text-center text-muted-foreground">{children}</p>;
}

export function MenuRow({ to, label, external }: { to: string; label: string; external?: boolean }) {
  const className =
    "flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3.5 text-sm font-semibold transition hover:border-primary/30 hover:bg-secondary/40";
  if (external) {
    return (
      <a href={to} className={className}>
        <span>{label}</span>
        <span className="text-muted-foreground">›</span>
      </a>
    );
  }
  return (
    <Link to={to} className={className}>
      <span>{label}</span>
      <span className="text-muted-foreground">›</span>
    </Link>
  );
}
