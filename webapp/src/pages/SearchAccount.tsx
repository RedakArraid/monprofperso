import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { AppShell, OfflineBanner, Empty, MenuRow } from "@/components/layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { useAuth } from "@/lib/auth";
import { fallback } from "@/lib/fallback";
import { fcfa } from "@/lib/utils";
import { useLive } from "@/hooks/useLive";
import { apiBase } from "@/lib/api";

type Teacher = {
  id: number;
  initials?: string;
  name: string;
  subjects?: string;
  rating?: number;
  reviews_count?: number;
  location?: string;
  price_per_hour?: number;
  reviews?: { rating: number; author_name?: string; text?: string }[];
};

export function SearchPage() {
  const [sp] = useSearchParams();
  const format = sp.get("format");
  const level = sp.get("level");
  const qs = [format && `format=${encodeURIComponent(format)}`, level && `level=${encodeURIComponent(level)}`]
    .filter(Boolean)
    .join("&");
  const { data, offline, reload } = useLive<Teacher[]>(`/api/teachers${qs ? `?${qs}` : ""}`, fallback.teachers);

  return (
    <AppShell title="Recherche" active="recherche">
      {offline ? <OfflineBanner onRetry={() => void reload()} /> : null}
      <p className="text-sm text-muted-foreground">
        <Link to="/recherche/filtres" className="font-semibold text-primary">
          Filtres
        </Link>{" "}
        · {data.length} professeur(s)
      </p>
      {!data.length ? <Empty>Aucun professeur trouvé.</Empty> : null}
      {data.map((t) => (
        <Link key={t.id} to={`/prof/${t.id}`}>
          <Card className="transition hover:border-primary/40">
            <CardContent className="flex items-center gap-3 pt-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-secondary font-display font-extrabold text-primary">
                {t.initials || t.name.slice(0, 2).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-semibold">{t.name}</div>
                <div className="truncate text-sm text-muted-foreground">
                  {t.subjects} · {t.location}
                </div>
                <div className="text-sm text-muted-foreground">
                  ★ {t.rating ?? "—"} · {fcfa(t.price_per_hour)} F/h
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>
      ))}
    </AppShell>
  );
}

export function FiltersPage() {
  const navigate = useNavigate();
  return (
    <AppShell title="Filtres" back="/recherche" active="recherche" hideNav>
      <form
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          const parts = [];
          if (fd.get("format")) parts.push(`format=${fd.get("format")}`);
          if (fd.get("level")) parts.push(`level=${fd.get("level")}`);
          navigate(`/recherche${parts.length ? `?${parts.join("&")}` : ""}`);
        }}
      >
        <div className="space-y-1.5">
          <Label>Format</Label>
          <Select name="format" defaultValue="">
            <option value="">Tous</option>
            <option value="home">À domicile</option>
            <option value="online">En ligne</option>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Niveau</Label>
          <Select name="level" defaultValue="">
            <option value="">Tous</option>
            <option value="college">Collège</option>
            <option value="lycee">Lycée</option>
          </Select>
        </div>
        <Button type="submit" className="w-full">
          Appliquer
        </Button>
      </form>
    </AppShell>
  );
}

export function TeacherProfilePage() {
  const { id } = useParams();
  const { data, offline, reload } = useLive<Teacher | null>(
    id ? `/api/teachers/${id}` : null,
    fallback.teachers[0],
  );
  if (!data) {
    return (
      <AppShell title="Profil" back active="recherche">
        <Empty>Professeur introuvable.</Empty>
      </AppShell>
    );
  }
  return (
    <AppShell title="Profil prof" back active="recherche">
      {offline ? <OfflineBanner onRetry={() => void reload()} /> : null}
      <Card>
        <CardContent className="flex gap-3 pt-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-secondary font-display text-lg font-extrabold text-primary">
            {data.initials || "?"}
          </div>
          <div>
            <div className="font-display text-lg font-bold">{data.name}</div>
            <div className="text-sm text-muted-foreground">{data.subjects}</div>
            <div className="text-sm text-muted-foreground">
              ★ {data.rating} ({data.reviews_count || 0} avis) · {data.location}
            </div>
            <div className="mt-1 font-bold">{fcfa(data.price_per_hour)} F/h</div>
          </div>
        </CardContent>
      </Card>
      <Button asChild className="w-full">
        <Link
          to={`/reservation?teacherId=${data.id}&name=${encodeURIComponent(data.name)}&price=${data.price_per_hour || 6000}`}
        >
          Réserver un cours
        </Link>
      </Button>
      {(data.reviews || []).map((r, i) => (
        <Card key={i}>
          <CardContent className="pt-4">
            <div className="text-sm text-muted-foreground">
              ★ {r.rating} · {r.author_name}
            </div>
            <p className="mt-1 text-sm">{r.text}</p>
          </CardContent>
        </Card>
      ))}
    </AppShell>
  );
}

export function CoursesPage() {
  const { data, offline, reload } = useLive<typeof fallback.courses>("/api/courses", fallback.courses);
  return (
    <AppShell title="Mes cours" active="cours">
      {offline ? <OfflineBanner onRetry={() => void reload()} /> : null}
      {!data.length ? <Empty>Aucun cours pour le moment.</Empty> : null}
      {data.map((c) => (
        <Card key={c.id}>
          <CardContent className="flex items-center justify-between pt-4">
            <div>
              <div className="font-semibold">
                {c.subject} · {c.level}
              </div>
              <div className="text-sm text-muted-foreground">{c.teacher_name}</div>
              <div className="text-sm text-muted-foreground">
                {c.day_label} {c.day_num} · {c.time}
              </div>
              {c.badge ? <Badge className="mt-1">{c.badge}</Badge> : null}
            </div>
            <strong>{fcfa(c.price)} F</strong>
          </CardContent>
        </Card>
      ))}
    </AppShell>
  );
}

export function ProgressPage() {
  const { data, offline, reload } = useLive<typeof fallback.progress>("/api/progress", fallback.progress);
  return (
    <AppShell title="Progrès" active="progres">
      {offline ? <OfflineBanner onRetry={() => void reload()} /> : null}
      <Card>
        <CardContent className="pt-4">
          <div className="text-xs text-muted-foreground">Moyenne générale</div>
          <div className="font-display text-4xl font-black">{data.average}</div>
          <p className="text-sm text-muted-foreground">
            {data.trend} · {data.goal}
          </p>
        </CardContent>
      </Card>
      {data.subjects.map((s) => (
        <div key={s.subject} className="space-y-1">
          <div className="flex justify-between text-sm font-semibold">
            <span>{s.subject}</span>
            <span className={s.warn ? "text-accent" : "text-primary"}>{s.grade}</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-muted">
            <div
              className={`h-full rounded-full ${s.warn ? "bg-accent" : "bg-primary"}`}
              style={{ width: `${Math.round((s.fraction || 0) * 100)}%` }}
            />
          </div>
        </div>
      ))}
    </AppShell>
  );
}

export function AccountPage() {
  const { user, isTeacher, logout } = useAuth();
  return (
    <AppShell title="Mon compte" active="compte">
      <Card>
        <CardContent className="pt-4">
          <div className="font-display text-lg font-bold">{user?.full_name || "Utilisateur"}</div>
          <div className="text-sm text-muted-foreground">{user?.phone}</div>
        </CardContent>
      </Card>
      <MenuRow to="/notifications" label="Notifications" />
      <MenuRow to="/portefeuille" label="Portefeuille" />
      <MenuRow to="/mes-besoins" label="Mes besoins" />
      <MenuRow to="/enfants" label="Mes enfants" />
      <MenuRow to="/ressources" label="Ressources" />
      <MenuRow to="/abonnement" label="Abonnement" />
      <MenuRow to="/parrainage" label="Parrainage" />
      <MenuRow to="/legal" label="Documents légaux" />
      <MenuRow to="/aide" label="Aide" />
      <MenuRow to="/parametres" label="Paramètres" />
      {isTeacher ? (
        <MenuRow to="/prof-profil" label="Compléter mon profil" />
      ) : (
        <MenuRow to="/devenir-prof.html" label="Devenir professeur" external />
      )}
      <Button
        variant="destructive"
        className="mt-4 w-full"
        onClick={() => {
          logout();
          window.location.href = "/connexion.html";
        }}
      >
        Déconnexion
      </Button>
    </AppShell>
  );
}

export function LegalPage() {
  const { data, offline, reload } = useLive<{ slug: string; title?: string; hasFile?: boolean }[]>("/api/legal", []);
  return (
    <AppShell title="Documents légaux" back="/compte" active="compte">
      {offline ? <OfflineBanner onRetry={() => void reload()} /> : null}
      {!data.length ? <Empty>Documents indisponibles.</Empty> : null}
      {data.map((d) => (
        <MenuRow
          key={d.slug}
          to={d.hasFile ? `${apiBase()}/api/legal/${d.slug}/file` : "#"}
          label={d.title || d.slug}
          external
        />
      ))}
    </AppShell>
  );
}
