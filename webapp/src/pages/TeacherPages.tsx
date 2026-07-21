import { Link } from "react-router-dom";
import { AppShell, OfflineBanner, Empty, MenuRow, PageGrid } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api";
import { fallback } from "@/lib/fallback";
import { fcfa } from "@/lib/utils";
import { useLive } from "@/hooks/useLive";
import { useState } from "react";

type Dash = typeof fallback.teacherDashboard & {
  profileCompletion?: { percent: number; complete: boolean };
};
type Req = {
  courseId?: number;
  needId?: number | null;
  subject?: string;
  student?: string;
  slot?: string;
  format?: string;
  price?: number;
  netHourly?: number | null;
  isOpportunity?: boolean;
};

export function TeacherDashboardPage() {
  const { data, offline, reload } = useLive<Dash>("/api/teacher/dashboard", fallback.teacherDashboard);
  return (
    <AppShell title="Tableau de bord" active="prof-espace" wide>
      {data.needsConfirmed === false ? (
        <div className="mb-4 rounded-xl bg-orange-soft px-4 py-3 text-sm text-[#8a5b33]">
          Votre accès aux offres est en cours de validation par l&apos;équipe.
        </div>
      ) : null}
      {offline ? <OfflineBanner onRetry={() => void reload()} /> : null}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card className="border-primary bg-primary text-primary-foreground md:col-span-2">
          <CardContent className="pt-6">
            <div className="text-sm text-white/80">Revenus du mois</div>
            <div className="font-display text-4xl font-black sm:text-5xl">{fcfa(data.revenue)} F</div>
            <p className="mt-1 text-sm text-white/85">{data.trend}</p>
          </CardContent>
        </Card>
        {(data.stats || []).map((s) => (
          <Card key={s.label}>
            <CardContent className="pt-6 text-center">
              <div className="font-display text-3xl font-extrabold">{s.value}</div>
              <div className="mt-1 text-sm text-muted-foreground">{s.label}</div>
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="mt-6 flex flex-wrap gap-3">
        {data.pendingRequests ? (
          <Button asChild size="lg">
            <Link to="/prof-offres">{data.pendingRequests} demande(s) en attente</Link>
          </Button>
        ) : null}
        {data.profileCompletion && !data.profileCompletion.complete ? (
          <Button asChild variant="outline" size="lg">
            <Link to="/prof-profil">Compléter mon profil ({data.profileCompletion.percent}%)</Link>
          </Button>
        ) : null}
      </div>
    </AppShell>
  );
}

export function TeacherRequestsPage() {
  const { data, offline, reload } = useLive<Req[]>("/api/teacher/requests", fallback.teacherRequests as Req[]);
  const [msg, setMsg] = useState("");

  async function act(id: number, accept: boolean) {
    try {
      await api(`/api/teacher/requests/${id}/${accept ? "accept" : "refuse"}`, { method: "POST", body: {} });
      setMsg(accept ? "Demande acceptée" : "Demande refusée");
      void reload();
    } catch (ex) {
      setMsg(ex instanceof Error ? ex.message : "Erreur");
    }
  }

  return (
    <AppShell title="Demandes" active="prof-offres" wide>
      {offline ? <OfflineBanner onRetry={() => void reload()} /> : null}
      {msg ? <p className="mb-3 text-sm font-semibold text-primary">{msg}</p> : null}
      {!data.length ? <Empty>Aucune demande pour le moment.</Empty> : null}
      <PageGrid>
        {data.map((r) => {
          const id = r.needId || r.courseId;
          return (
            <Card key={String(id)}>
              <CardContent className="space-y-3 pt-5">
                <div className="font-display text-lg font-bold">
                  {r.subject} · {r.student}
                </div>
                <div className="text-sm text-muted-foreground">{r.slot || r.format}</div>
                {r.price != null ? (
                  <div className="font-bold">
                    {fcfa(r.price)} F
                    {r.netHourly != null ? ` · ${fcfa(r.netHourly)} F/h net` : ""}
                  </div>
                ) : null}
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => void act(Number(id), true)}>
                    Accepter
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => void act(Number(id), false)}>
                    Refuser
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </PageGrid>
    </AppShell>
  );
}

export function TeacherEarningsPage() {
  const { data, offline, reload } = useLive<typeof fallback.teacherEarnings>(
    "/api/teacher/earnings",
    fallback.teacherEarnings,
  );
  return (
    <AppShell title="Revenus" active="prof-revenus" wide>
      {offline ? <OfflineBanner onRetry={() => void reload()} /> : null}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card className="md:col-span-2">
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground">Total</div>
            <div className="font-display text-4xl font-black">{fcfa(data.total)} F</div>
            <p className="text-sm text-muted-foreground">{data.trend}</p>
          </CardContent>
        </Card>
        {(data.stats || []).map((s) => (
          <Card key={s.label}>
            <CardContent className="pt-6 text-center">
              <div className="font-display text-2xl font-extrabold">{s.value}</div>
              <div className="text-sm text-muted-foreground">{s.label}</div>
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="mt-6 max-w-md">
        <MenuRow to="/prof-retrait" label="Demander un retrait" />
      </div>
    </AppShell>
  );
}

export function TeacherProfileEditPage() {
  const { data, offline, reload } = useLive<{
    location?: string;
    subjects?: string;
    programs?: string[];
    levels?: string[];
    profileCompletion?: { percent: number };
  } | null>("/api/teacher/profile", null);
  const [msg, setMsg] = useState("");

  return (
    <AppShell title="Mon profil prof" back="/compte" active="compte">
      {offline ? <OfflineBanner onRetry={() => void reload()} /> : null}
      <form
        className="mx-auto max-w-2xl space-y-4 rounded-2xl border border-border bg-card p-6"
        onSubmit={async (e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          const split = (s: FormDataEntryValue | null) =>
            String(s || "")
              .split(",")
              .map((x) => x.trim())
              .filter(Boolean);
          try {
            await api("/api/teacher/profile", {
              method: "PUT",
              body: {
                location: fd.get("location"),
                subjects: fd.get("subjects"),
                programs: split(fd.get("programs")),
                levels: split(fd.get("levels")),
              },
            });
            setMsg("Profil mis à jour");
            void reload();
          } catch (ex) {
            setMsg(ex instanceof Error ? ex.message : "Erreur");
          }
        }}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Localisation</Label>
            <Input name="location" defaultValue={data?.location || ""} key={data?.location} />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Matières</Label>
            <Input name="subjects" defaultValue={data?.subjects || ""} key={data?.subjects} />
          </div>
          <div className="space-y-1.5">
            <Label>Programmes (virgules)</Label>
            <Input name="programs" defaultValue={(data?.programs || []).join(", ")} key={(data?.programs || []).join()} />
          </div>
          <div className="space-y-1.5">
            <Label>Niveaux (virgules)</Label>
            <Input name="levels" defaultValue={(data?.levels || []).join(", ")} key={(data?.levels || []).join()} />
          </div>
        </div>
        {data?.profileCompletion ? (
          <p className="text-sm text-muted-foreground">Profil complété à {data.profileCompletion.percent}%</p>
        ) : null}
        {msg ? <p className="text-sm font-semibold text-primary">{msg}</p> : null}
        <Button type="submit">Enregistrer</Button>
      </form>
    </AppShell>
  );
}
