import { Link } from "react-router-dom";
import {
  AppShell,
  OfflineBanner,
  ContentCard,
  PageGrid,
  PageStack,
  SectionHeading,
  DocLink,
} from "@/components/layout";
import { BrandIllustration } from "@/components/brand-illustration";
import { useAuth } from "@/lib/auth";
import { useCapabilities } from "@/lib/capabilities";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api";
import { fileToBase64 } from "@/lib/uploads";
import { fallback } from "@/lib/fallback";
import { useLive } from "@/hooks/useLive";
import { useState } from "react";

type Dash = typeof fallback.teacherDashboard & {
  profileCompletion?: { percent: number; complete: boolean };
};

export function TeacherDashboardPage() {
  const { data, loading, offline, reload } = useLive<Dash>("/api/teacher/dashboard", fallback.teacherDashboard);
  const { user } = useAuth();
  const { capabilities } = useCapabilities();
  const first = user?.full_name?.split(" ")[0];
  return (
    <AppShell title="Accueil" active="prof-espace" welcome={false}>
      {!loading && !offline && data.needsConfirmed === false ? <p role="status" className="mb-4 rounded-xl bg-orange-soft px-4 py-3 text-sm text-[#744521]">Votre accès aux offres est en cours de validation par l’équipe Mon Prof Perso.</p> : null}
      {offline ? <OfflineBanner onRetry={() => void reload()} /> : null}
      <div className="mx-auto max-w-7xl space-y-5">
        <section aria-labelledby="teacher-welcome" className="grid min-w-0 items-center gap-6 rounded-3xl border border-border bg-[#f5f2eb] p-5 sm:p-8 md:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
          <div className="min-w-0">
            <p className="mb-3 text-sm font-semibold text-primary">Votre espace professeur</p>
            <h2 id="teacher-welcome" className="font-display text-3xl font-extrabold leading-tight text-welcome sm:text-4xl">Bonjour{first ? ` ${first}` : ""}.</h2>
            <p className="mt-4 max-w-lg text-base leading-relaxed text-muted-foreground">Préparez vos prochains cours et accompagnez chaque élève dans ses progrès.</p>
            <div className="mt-6 flex flex-wrap gap-3"><Button asChild size="lg"><Link to="/prof-offres">Voir les offres de cours</Link></Button><Button asChild variant="outline" size="lg"><Link to="/cours">Mes élèves et mes cours</Link></Button></div>
          </div>
          <BrandIllustration className="hidden w-full max-w-sm justify-self-end rounded-2xl md:block" />
        </section>
        <PageGrid cols={2}>
          <ContentCard>
            <SectionHeading>À suivre aujourd’hui</SectionHeading>
            {loading ? <p role="status" className="text-sm text-muted-foreground">Chargement de votre activité…</p> : offline ? <p className="text-sm text-muted-foreground">Votre activité est momentanément indisponible.</p> : <>
              <div className="rounded-xl bg-secondary/60 p-5"><p className="text-xl font-bold text-welcome">{data.pendingRequests} demande{data.pendingRequests > 1 ? "s" : ""} à consulter</p><p className="mt-2 text-sm leading-relaxed text-muted-foreground">{data.pendingRequests ? "Consultez les besoins des familles et les détails des cours proposés." : "Vos prochaines demandes apparaîtront ici."}</p><DocLink to="/prof-offres">Ouvrir mes offres de cours</DocLink></div>
              {data.profileCompletion && !data.profileCompletion.complete ? <div className="mt-4 rounded-xl border border-border p-4"><p className="text-sm font-semibold text-welcome">Votre profil est complété à {data.profileCompletion.percent} %.</p><Button asChild variant="outline" className="mt-3"><Link to="/prof-profil">Compléter mon profil</Link></Button></div> : null}
            </>}
          </ContentCard>
          <ContentCard>
            <SectionHeading>Vos outils au quotidien</SectionHeading>
            <p className="mb-4 text-sm leading-relaxed text-muted-foreground">Un accès direct à votre planning, vos documents et le suivi de vos règlements.</p>
            <div className="divide-y divide-border">
              {capabilities.agenda ? <DocLink to="/agenda">Consulter mon agenda</DocLink> : null}
              {capabilities.payouts ? <DocLink to="/prof-revenus">Mes revenus et reversements</DocLink> : null}
              <DocLink to="/ressources">Mes documents pédagogiques</DocLink>
              <DocLink to="/prof-profil">Mettre à jour mon profil</DocLink>
              <DocLink to="/aide">Contacter l’équipe</DocLink>
            </div>
          </ContentCard>
        </PageGrid>
      </div>
    </AppShell>
  );
}

type TeacherProfile = {
  location?: string; subjects?: string; programs?: string[]; levels?: string[];
  pricePerHour?: number; negotiable?: boolean; hasIdCard?: boolean; hasDiploma?: boolean;
  hasPhoto?: boolean; completion?: { percent: number; complete: boolean; missing: string[] };
};

export function TeacherProfileEditPage() {
  const { data, offline, loading, reload } = useLive<TeacherProfile | null>("/api/teacher/profile", null);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const documents = [
    { field: "idCard", label: "Pièce d'identité", present: data?.hasIdCard, accept: "application/pdf,image/*" },
    { field: "diploma", label: "Diplôme", present: data?.hasDiploma, accept: "application/pdf,image/*" },
    { field: "photo", label: "Photo", present: data?.hasPhoto, accept: "image/*" },
  ];

  return (
    <AppShell title="Mon profil" back="/compte" active="compte">
      {offline ? <OfflineBanner onRetry={() => void reload()} /> : null}
      <PageStack narrow>
        <ContentCard>
          <SectionHeading>Compléter mon profil</SectionHeading>
          {loading ? <p>Chargement du profil…</p> : null}
          <form className="space-y-4" onSubmit={async (e) => {
            e.preventDefault();
            if (busy || !data || offline) return;
            const form = e.currentTarget;
            const fd = new FormData(form);
            const split = (value: FormDataEntryValue | null) => String(value || "").split(",").map((s) => s.trim()).filter(Boolean);
            setError(""); setMsg(""); setBusy(true);
            try {
              const files: Record<string, string> = {};
              let totalBytes = 0;
              for (const { field } of documents) {
                const file = fd.get(field) as File | null;
                if (!file?.size) continue;
                totalBytes += file.size;
                if (totalBytes > 10_000_000) throw new Error("Envoyez au maximum 10 Mo de documents à la fois.");
                files[`${field}Base64`] = await fileToBase64(file);
                files[`${field}FileName`] = file.name;
                files[`${field}MimeType`] = file.type || "application/octet-stream";
              }
              await api("/api/teacher/profile", {
                method: "PUT",
                body: {
                  location: fd.get("location"), subjects: fd.get("subjects"),
                  programs: split(fd.get("programs")), levels: split(fd.get("levels")),
                  pricePerHour: Number(fd.get("pricePerHour")), negotiable: fd.get("negotiable") === "on", ...files,
                },
              });
              form.reset();
              setMsg("Profil et documents enregistrés.");
              await reload();
            } catch (ex) {
              setError(ex instanceof Error ? ex.message : "Enregistrement impossible");
            } finally {
              setBusy(false);
            }
          }}>
            <fieldset disabled={!data || loading || offline || busy} className="space-y-4">
              <div><Label htmlFor="profile-location">Localisation</Label><Input id="profile-location" name="location" required maxLength={120} defaultValue={data?.location || ""} key={data?.location} className="mt-1" /></div>
              <div><Label htmlFor="profile-subjects">Matières</Label><Input id="profile-subjects" name="subjects" required maxLength={200} defaultValue={data?.subjects || ""} key={data?.subjects} className="mt-1" /></div>
              <div><Label htmlFor="profile-programs">Programmes (séparés par des virgules)</Label><Input id="profile-programs" name="programs" required defaultValue={(data?.programs || []).join(", ")} key={(data?.programs || []).join()} className="mt-1" /></div>
              <div><Label htmlFor="profile-levels">Niveaux (séparés par des virgules)</Label><Input id="profile-levels" name="levels" required defaultValue={(data?.levels || []).join(", ")} key={(data?.levels || []).join()} className="mt-1" /></div>
              <div><Label htmlFor="profile-pricePerHour">Tarif horaire souhaité (F)</Label><Input id="profile-pricePerHour" name="pricePerHour" type="number" required min={1} max={1000000} step={1} defaultValue={data?.pricePerHour ?? ""} key={data?.pricePerHour} className="mt-1" /></div>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="negotiable" defaultChecked={data?.negotiable ?? false} key={String(data?.negotiable)} /><span>Tarif négociable</span></label>
              <div className="space-y-3 border-t pt-4">
                <h3 className="font-semibold">Justificatifs</h3>
                <p className="text-xs text-muted-foreground">8 Mo maximum par fichier. Un nouveau fichier remplace le précédent.</p>
                {documents.map(({ field, label, present, accept }) => (
                  <div key={field} className="space-y-1.5"><Label htmlFor={field}>{label} — {present ? "déjà transmis" : "à fournir"}</Label>
                    <Input id={field} name={field} type="file" accept={accept} />
                  </div>
                ))}
              </div>
              <Button type="submit" className="w-full">{busy ? "Enregistrement…" : "Enregistrer"}</Button>
            </fieldset>
            {data?.completion ? <p className="text-sm">Profil complété à {data.completion.percent}%.</p> : null}
            {msg ? <p role="status" className="text-sm font-semibold text-primary">{msg}</p> : null}
            {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
          </form>
        </ContentCard>
      </PageStack>
    </AppShell>
  );
}
