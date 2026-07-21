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

export function AppShell({
  title,
  back,
  children,
  active,
  hideNav,
}: {
  title: string;
  back?: string | true;
  children: ReactNode;
  active?: string;
  hideNav?: boolean;
}) {
  const { isTeacher } = useAuth();
  const navigate = useNavigate();
  const tabs = isTeacher ? teacherTabs : parentTabs;

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col">
      <header className="sticky top-0 z-20 flex items-center gap-2 border-b border-border bg-background/90 px-4 py-3 backdrop-blur">
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
        <h1 className="font-display flex-1 text-lg font-extrabold">{title}</h1>
      </header>
      <main className={cn("flex-1 space-y-3 p-4", !hideNav && "pb-24")}>{children}</main>
      {!hideNav ? (
        <nav className="fixed bottom-0 left-0 right-0 z-30 border-t border-border bg-card pb-[env(safe-area-inset-bottom)]">
          <div className="mx-auto flex max-w-md justify-around px-1 py-2">
            {tabs.map((t) => {
              const Icon = t.icon;
              const on = active === t.to.replace(/^\//, "") || active === t.to;
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
            })}
          </div>
        </nav>
      ) : null}
    </div>
  );
}

export function OfflineBanner({ onRetry }: { onRetry?: () => void }) {
  return (
    <div className="rounded-xl bg-orange-soft px-3 py-2.5 text-sm text-[#8a5b33]">
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
  return <p className="py-8 text-center text-sm text-muted-foreground">{children}</p>;
}

export function MenuRow({ to, label, external }: { to: string; label: string; external?: boolean }) {
  const className =
    "mb-2 flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3.5 text-sm font-semibold";
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
