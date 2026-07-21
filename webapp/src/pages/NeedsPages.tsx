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

type Child = { id: number; name: string; level?: string; school?: string };
type Need = {
  id: number;
  reference?: string;
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

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(",").pop() || "");
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function openOwnDocument(needId: number, fileName: string) {
  const t = tokenStore.get();
  const res = await fetch(`${apiBase()}/api/needs/${needId}/document`, {
    headers: t ? { Authorization: `Bearer ${t}` } : {},
  });
  if (!res.ok) return;
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
  const { data, offline, reload } = useLive<Child[]>("/api/children", fallback.children as Child[]);
  const [err, setErr] = useState("");

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
              const fd = new FormData(e.currentTarget);
              try {
                await api("/api/children", {
                  method: "POST",
                  body: {
                    name: fd.get("name"),
                    level: fd.get("level"),
                    school: fd.get("school"),
                    gender: "garcon",
                    program: "standard",
                  },
                });
                e.currentTarget.reset();
                void reload();
              } catch (ex) {
                setErr(ex instanceof Error ? ex.message : "Erreur");
              }
            }}
          >
            <div className="space-y-1.5">
              <Label className="text-welcome">Prénom</Label>
              <Input name="name" required />
            </div>
            <div className="space-y-1.5">
              <Label className="text-welcome">Niveau</Label>
              <Input name="level" placeholder="3ème" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-welcome">Établissement</Label>
              <Input name="school" />
            </div>
            {err ? <p className="text-sm text-destructive">{err}</p> : null}
            <Button type="submit" className="w-full">
              Ajouter
            </Button>
          </form>
        </ContentCard>
        <div>
          {!data.length ? <Empty>Aucun élève n&apos;a été trouvé</Empty> : null}
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
  const navigate = useNavigate();
  const [children, setChildren] = useState<Child[]>([]);
  const [err, setErr] = useState("");

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
              const fd = new FormData(e.currentTarget);
              const file = fd.get("document") as File | null;
              try {
                const documentBase64 = file && file.size ? await fileToBase64(file) : undefined;
                await api("/api/needs", {
                  method: "POST",
                  body: {
                    childId: Number(fd.get("childId")),
                    subject: fd.get("subject"),
                    level: fd.get("level"),
                    format: fd.get("format"),
                    location: fd.get("location"),
                    notes: fd.get("notes"),
                    documentBase64,
                    documentFileName: file?.name,
                    documentMimeType: file?.type || undefined,
                  },
                });
                navigate("/mes-besoins");
              } catch (ex) {
                setErr(ex instanceof Error ? ex.message : "Erreur");
              }
            }}
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5 sm:col-span-2">
                <Label className="text-welcome">Enfant</Label>
                <Select name="childId" required defaultValue="">
                  <option value="" disabled>
                    Choisir…
                  </option>
                  {children.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-welcome">Matière</Label>
                <Input name="subject" required />
              </div>
              <div className="space-y-1.5">
                <Label className="text-welcome">Niveau</Label>
                <Input name="level" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-welcome">Format</Label>
                <Select name="format" defaultValue="home">
                  <option value="home">À domicile</option>
                  <option value="online">En ligne</option>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-welcome">Lieu</Label>
                <Input name="location" placeholder="Cocody" />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label className="text-welcome">Précisions</Label>
                <Textarea name="notes" />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label className="text-welcome">Document utile (bulletin, etc.) — optionnel</Label>
                <input name="document" type="file" accept="image/*,application/pdf" className="text-sm" />
              </div>
            </div>
            {err ? <p className="text-sm text-destructive">{err}</p> : null}
            <Button type="submit" className="mt-3 w-full">
              Envoyer
            </Button>
          </form>
        </ContentCard>
      </PageStack>
    </AppShell>
  );
}

export function MyNeedsPage() {
  const { data, offline, reload } = useLive<Need[]>("/api/needs", []);
  const [msg, setMsg] = useState("");

  return (
    <AppShell title="Mes besoins" back="/compte" active="compte">
      {offline ? <OfflineBanner onRetry={() => void reload()} /> : null}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Button asChild>
          <Link to="/exprimer-besoin">Nouveau besoin</Link>
        </Button>
        {msg ? <p className="text-sm font-semibold text-primary">{msg}</p> : null}
      </div>
      {!data.length ? <Empty>Aucune demande n&apos;a été trouvée</Empty> : null}
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
              <Button size="sm" variant="outline" onClick={() => void openOwnDocument(n.id, n.documentName!)}>
                Voir mon document
              </Button>
            ) : null}
            {n.status === "priced" ? (
              <Button
                size="sm"
                onClick={async () => {
                  try {
                    await api(`/api/needs/${n.id}/accept-price`, { method: "POST", body: {} });
                    setMsg("Tarif accepté");
                    void reload();
                  } catch (ex) {
                    setMsg(ex instanceof Error ? ex.message : "Erreur");
                  }
                }}
              >
                Accepter le tarif
              </Button>
            ) : null}
          </ContentCard>
        ))}
      </PageGrid>
    </AppShell>
  );
}
