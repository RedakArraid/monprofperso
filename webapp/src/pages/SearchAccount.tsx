import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { AppShell, OfflineBanner, Empty, MenuRow, PageGrid, PageStack } from "@/components/layout";
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
    <AppShell title="Recherche" active="recherche" wide>
      {offline ? <OfflineBanner onRetry={() => void reload()} /> : null}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-muted-foreground">{data.length} professeur(s)</p>
        <Button asChild variant="outline">
          <Link to="/recherche/filtres">Filtres</Link>
        </Button>
      </div>
      {!data.length ? <Empty>Aucun professeur trouvé.</Empty> : null}
      <PageGrid>
        {data.map((t) => (
          <Link key={t.id} to={`/prof/${t.id}`} className="block h-full">
            <Card className="h-full transition hover:border-primary/40 hover:shadow-md">
              <CardContent className="flex h-full items-start gap-3 pt-5">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-secondary font-display text-lg font-extrabold text-primary">
                  {t.initials || t.name.slice(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-display text-lg font-bold">{t.name}</div>
                  <div className="mt-1 text-sm text-muted-foreground">
                    {t.subjects} · {t.location}
                  </div>
                  <div className="mt-2 text-sm font-semibold">
                    ★ {t.rating ?? "—"} · {fcfa(t.price_per_hour)} F/h
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </PageGrid>
    </AppShell>
  );
}

export function FiltersPage() {
  const navigate = useNavigate();
  return (
    <AppShell title="Filtres" back="/recherche" active="recherche">
      <PageStack>
        <form
          className="space-y-4 rounded-2xl border border-border bg-card p-6"
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            const parts = [];
            if (fd.get("format")) parts.push(`format=${fd.get("format")}`);
            if (fd.get("level")) parts.push(`level=${fd.get("level")}`);
            navigate(`/recherche${parts.length ? `?${parts.join("&")}` : ""}`);
          }}
        >
          <div className="grid gap-4 sm:grid-cols-2">
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
          </div>
          <Button type="submit" className="w-full sm:w-auto">
            Appliquer
          </Button>
        </form>
      </PageStack>
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
      <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
        <Card>
          <CardContent className="flex gap-4 p-6 pt-6 sm:p-8">
            <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-secondary font-display text-2xl font-extrabold text-primary">
              {data.initials || "?"}
            </div>
            <div>
              <div className="font-display text-2xl font-bold sm:text-3xl">{data.name}</div>
              <div className="mt-1 text-muted-foreground">{data.subjects}</div>
              <div className="mt-2 text-sm text-muted-foreground">
                ★ {data.rating} ({data.reviews_count || 0} avis) · {data.location}
              </div>
              <div className="mt-3 text-xl font-bold">{fcfa(data.price_per_hour)} F/h</div>
              <Button asChild className="mt-5" size="lg">
                <Link
                  to={`/reservation?teacherId=${data.id}&name=${encodeURIComponent(data.name)}&price=${data.price_per_hour || 6000}`}
                >
                  Réserver un cours
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
        <div className="space-y-3">
          <h2 className="font-display text-lg font-bold">Avis</h2>
          {(data.reviews || []).length === 0 ? (
            <p className="text-sm text-muted-foreground">Pas encore d&apos;avis.</p>
          ) : null}
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
        </div>
      </div>
    </AppShell>
  );
}

export function CoursesPage() {
  const { data, offline, reload } = useLive<typeof fallback.courses>("/api/courses", fallback.courses);
  return (
    <AppShell title="Mes cours" active="cours" wide>
      {offline ? <OfflineBanner onRetry={() => void reload()} /> : null}
      {!data.length ? <Empty>Aucun cours pour le moment.</Empty> : null}
      <PageGrid>
        {data.map((c) => (
          <Card key={c.id}>
            <CardContent className="flex items-center justify-between gap-3 pt-5">
              <div>
                <div className="font-display text-lg font-bold">
                  {c.subject} · {c.level}
                </div>
                <div className="text-sm text-muted-foreground">{c.teacher_name}</div>
                <div className="text-sm text-muted-foreground">
                  {c.day_label} {c.day_num} · {c.time}
                </div>
                {c.badge ? <Badge className="mt-2">{c.badge}</Badge> : null}
              </div>
              <strong className="text-lg">{fcfa(c.price)} F</strong>
            </CardContent>
          </Card>
        ))}
      </PageGrid>
    </AppShell>
  );
}

export function ProgressPage() {
  const { data, offline, reload } = useLive<typeof fallback.progress>("/api/progress", fallback.progress);
  return (
    <AppShell title="Progrès" active="progres">
      {offline ? <OfflineBanner onRetry={() => void reload()} /> : null}
      <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground">Moyenne générale</div>
            <div className="font-display text-5xl font-black">{data.average}</div>
            <p className="mt-2 text-sm text-muted-foreground">
              {data.trend} · {data.goal}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="space-y-5 pt-6">
            {data.subjects.map((s) => (
              <div key={s.subject} className="space-y-2">
                <div className="flex justify-between text-sm font-semibold">
                  <span>{s.subject}</span>
                  <span className={s.warn ? "text-accent" : "text-primary"}>{s.grade}</span>
                </div>
                <div className="h-2.5 overflow-hidden rounded-full bg-muted">
                  <div
                    className={`h-full rounded-full ${s.warn ? "bg-accent" : "bg-primary"}`}
                    style={{ width: `${Math.round((s.fraction || 0) * 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}

export function AccountPage() {
  const { user, isTeacher, logout } = useAuth();
  return (
    <AppShell title="Mon compte" active="compte">
      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <Card>
          <CardContent className="space-y-4 pt-6">
            <div className="font-display text-2xl font-bold">{user?.full_name || "Utilisateur"}</div>
            <div className="text-muted-foreground">{user?.phone}</div>
            <Button
              variant="destructive"
              className="w-full"
              onClick={() => {
                logout();
                window.location.href = "/connexion.html";
              }}
            >
              Déconnexion
            </Button>
          </CardContent>
        </Card>
        <PageGrid className="xl:grid-cols-2">
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
        </PageGrid>
      </div>
    </AppShell>
  );
}

export function LegalPage() {
  const { data, offline, reload } = useLive<{ slug: string; title?: string; hasFile?: boolean }[]>("/api/legal", []);
  return (
    <AppShell title="Documents légaux" back="/compte" active="compte">
      {offline ? <OfflineBanner onRetry={() => void reload()} /> : null}
      {!data.length ? <Empty>Documents indisponibles.</Empty> : null}
      <PageGrid className="xl:grid-cols-2">
        {data.map((d) => (
          <MenuRow
            key={d.slug}
            to={d.hasFile ? `${apiBase()}/api/legal/${d.slug}/file` : "#"}
            label={d.title || d.slug}
            external
          />
        ))}
      </PageGrid>
    </AppShell>
  );
}
