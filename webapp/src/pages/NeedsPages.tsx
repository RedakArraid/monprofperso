import { useCapabilities } from "@/lib/capabilities";
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AppShell, OfflineBanner, Empty, ContentCard, PageStack, PageGrid, SectionHeading } from "@/components/layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { api, apiBase, tokenStore } from "@/lib/api";
import { fallback } from "@/lib/fallback";
import { fcfa, needStatusLabel } from "@/lib/utils";
import { useLive } from "@/hooks/useLive";
import { needFields } from "@/lib/flows";
import { fileToBase64 } from "@/lib/uploads";

type Child = { id: number; name: string; level?: string; school?: string };
type Need = {
  id: number;
  reference?: string;
  courseId?: number | null;
  subject: string;
  level: string;
  format?: string;
  location?: string;
  status: string;
  parentPrice?: number | null;
  documentName?: string | null;
  recommendedTeacherName?: string | null;
  recommendedNote?: string | null;
};

async function openOwnDocument(needId: number, fileName: string) {
  const t = tokenStore.get();
  const res = await fetch(`${apiBase()}/api/needs/${needId}/document`, {
    headers: t ? { Authorization: `Bearer ${t}` } : {},
  });
  if (!res.ok) throw new Error("Téléchargement du document impossible.");
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const w = window.open(url, "_blank", "noopener");
  if (!w) {
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName || "document";
    a.click();
  }
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

export function ChildrenPage() {
  const { data, offline, loading, reload } = useLive<Child[]>("/api/children", fallback.children as Child[]);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  return (
    <AppShell title="Mes enfants" back="/compte" active="compte">
      {offline ? <OfflineBanner onRetry={() => void reload()} /> : null}
      <div className="grid w-full gap-4 sm:gap-5 lg:grid-cols-[minmax(280px,400px)_1fr]">
        <ContentCard>
          <SectionHeading>Ajouter un enfant</SectionHeading>
          <form
            className="space-y-3"
            onSubmit={async (e) => {
              e.preventDefault();
              setErr("");
              if (busy) return;
              const form = e.currentTarget;
              const fd = new FormData(form);
              setBusy(true);
              try {
                await api("/api/children", {
                  method: "POST",
                  body: {
                    name: fd.get("name"),
                    level: fd.get("level"),
                    school: fd.get("school"),
                    program: "standard",
                  },
                });
                form.reset();
                void reload();
              } catch (ex) {
                setErr(ex instanceof Error ? ex.message : "Erreur");
              } finally {
                setBusy(false);
              }
            }}
          >
            <div className="space-y-1.5">
              <Label htmlFor="child-name" className="text-welcome">Prénom</Label>
              <Input id="child-name" name="name" required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="child-level" className="text-welcome">Niveau</Label>
              <Input id="child-level" name="level" placeholder="3ème" required maxLength={40} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="child-school" className="text-welcome">Établissement</Label>
              <Input id="child-school" name="school" />
            </div>
            {err ? <p role="alert" className="text-sm text-destructive">{err}</p> : null}
            <Button type="submit" className="w-full" disabled={busy || offline}>
              Ajouter
            </Button>
          </form>
        </ContentCard>
        <div>
          {!data.length && !offline ? <Empty>{loading ? "Chargement des profils…" : "Aucun enfant enregistré pour le moment."}</Empty> : null}
          <PageGrid>
            {data.map((c) => (
              <ContentCard key={c.id}>
                <SectionHeading className="mb-1">{c.name}</SectionHeading>
                <div className="text-sm text-[#666]">
                  {c.level} · {c.school}
                </div>
              </ContentCard>
            ))}
          </PageGrid>
        </div>
      </div>
    </AppShell>
  );
}

export function ExpressNeedPage() {
  const { capabilities } = useCapabilities();
  const [format, setFormat] = useState("home");
  const navigate = useNavigate();
  const [children, setChildren] = useState<Child[]>([]);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api<Child[]>("/api/children")
      .then(setChildren)
      .catch(() => setChildren([]));
  }, []);

  return (
    <AppShell title="Exprimer un besoin" back active="accueil" hideNav>
      <PageStack narrow>
        <ContentCard>
          <SectionHeading>Décrivez votre besoin</SectionHeading>
          <form
            className="space-y-3"
            onSubmit={async (e) => {
              e.preventDefault();
              setErr("");
              if (busy) return;
              const form = e.currentTarget;
              const fd = new FormData(form);
              setBusy(true);
              const file = fd.get("document") as File | null;
              try {
                const documentBase64 = file && file.size ? await fileToBase64(file) : undefined;
                await api("/api/needs", {
                  method: "POST",
                  body: {
                    ...needFields(fd),
                    documentBase64,
                    documentFileName: file?.name,
                    documentMimeType: file?.type || undefined,
                  },
                });
                navigate("/mes-besoins");
              } catch (ex) {
                setErr(ex instanceof Error ? ex.message : "Erreur");
              } finally {
                setBusy(false);
              }
            }}
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="need-childId" className="text-welcome">Enfant</Label>
                <Select id="need-childId" name="childId" defaultValue="">
                  <option value="">
                    Pour moi / sans enfant associé
                  </option>
                  {children.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="need-subject" className="text-welcome">Matière</Label>
                <Input id="need-subject" name="subject" required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="need-level" className="text-welcome">Niveau</Label>
                <Input id="need-level" name="level" required maxLength={40} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="need-format" className="text-welcome">Format</Label>
                <Select id="need-format" name="format" value={format} onChange={(e) => setFormat(e.target.value)}>
                  <option value="home">À domicile</option>
                  {capabilities.onlineCourses ? <option value="online">En ligne (lien externe)</option> : null}
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="need-location" className="text-welcome">Lieu</Label>
                <Input id="need-location" name="location" required={format === "home"} maxLength={200} placeholder="Commune / quartier" />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="need-description" className="text-welcome">Précisions</Label>
                <Textarea id="need-description" name="description" maxLength={2000} />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="need-document" className="text-welcome">Document utile (bulletin, etc.) — optionnel</Label>
                <Input id="need-document" name="document" type="file" accept="image/*,application/pdf" />
              </div>
            </div>
            {err ? <p role="alert" className="text-sm text-destructive">{err}</p> : null}
            <Button type="submit" className="mt-3 w-full" disabled={busy}>
              Envoyer
            </Button>
          </form>
        </ContentCard>
      </PageStack>
    </AppShell>
  );
}

export function MyNeedsPage() {
  const [busy, setBusy] = useState<number | null>(null);
  const [error, setError] = useState("");
  const { data, offline, loading, reload } = useLive<Need[]>("/api/needs", []);
  const [msg, setMsg] = useState("");

  return (
    <AppShell title="Mes besoins" back="/compte" active="compte">
      {offline ? <OfflineBanner onRetry={() => void reload()} /> : null}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Button asChild>
          <Link to="/exprimer-besoin">Nouveau besoin</Link>
        </Button>
        {msg ? <p role="status" className="text-sm font-semibold text-primary">{msg}</p> : null}
      </div>
      {error ? <p role="alert" className="mb-4 text-sm text-destructive">{error}</p> : null}
      {!data.length && !offline ? <Empty>{loading ? "Chargement des demandes…" : "Aucune demande de cours pour le moment."}</Empty> : null}
      <PageGrid>
        {data.map((n) => (
          <ContentCard key={n.id} className="space-y-2">
            <SectionHeading className="mb-1">
              {n.reference || `Besoin #${n.id}`} · {n.subject}
            </SectionHeading>
            <div className="text-sm text-[#666]">
              {n.level} · {n.format === "online" ? "En ligne" : n.location || "À domicile"}
            </div>
            <Badge>{needStatusLabel(n.status)}</Badge>
            {n.parentPrice != null ? (
              <div className="text-sm">
                Tarif proposé : <strong>{fcfa(n.parentPrice)} F</strong>
              </div>
            ) : null}
            {n.recommendedTeacherName ? (
              <div className="text-sm">
                Professeur recommandé : <strong>{n.recommendedTeacherName}</strong>
                {n.recommendedNote ? ` — ${n.recommendedNote}` : ""}
              </div>
            ) : null}
            {n.documentName ? (
              <Button size="sm" variant="outline" onClick={() => void openOwnDocument(n.id, n.documentName!).catch((e: Error) => setMsg(e.message))}>
                Voir mon document
              </Button>
            ) : null}
            {n.courseId ? <Button asChild size="sm" variant="outline"><Link to={`/cours/${n.courseId}`}>Ouvrir le cours et son planning</Link></Button> : null}
            {n.status === "priced" ? (
              <Button
                size="sm"
                disabled={busy !== null || offline}
                onClick={async () => {
                  if (busy !== null) return; setBusy(n.id); setError("");
                  try {
                    await api(`/api/needs/${n.id}/accept-price`, { method: "POST", body: {} });
                    setMsg("Tarif accepté");
                    void reload();
                  } catch (ex) {
                    setError(ex instanceof Error ? ex.message : "Erreur");
                  } finally { setBusy(null); }
                }}
              >
                Accepter le tarif
              </Button>
            ) : null}
            {["submitted", "priced", "published"].includes(n.status) ? <Button size="sm" variant="outline" disabled={busy !== null || offline} onClick={async () => {
              if (busy !== null || !window.confirm("Annuler cette demande de cours ?")) return;
              setBusy(n.id); setError("");
              try { await api(`/api/needs/${n.id}/cancel`, { method: "POST", body: {} }); setMsg("Demande annulée"); await reload(); }
              catch (ex) { setError(ex instanceof Error ? ex.message : "Annulation impossible"); }
              finally { setBusy(null); }
            }}>Annuler la demande</Button> : null}
          </ContentCard>
        ))}
      </PageGrid>
    </AppShell>
  );
}
