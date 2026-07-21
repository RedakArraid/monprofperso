import { api } from "@/lib/api";
import { redirectAfterLogin, useAuth, type User } from "@/lib/auth";
import { normalizePhone } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { useEffect, useState } from "react";

type AuthRes = { token: string; user: User };

export function LoginPage() {
  const { login, user, loading } = useAuth();
  const [tab, setTab] = useState<"login" | "signup">(
    typeof window !== "undefined" && window.location.hash.includes("inscription") ? "signup" : "login",
  );

  useEffect(() => {
    if (!loading && user) redirectAfterLogin(user);
  }, [loading, user]);
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState("parent");
  const [consent, setConsent] = useState(false);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  async function onLogin(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    setBusy(true);
    try {
      const p = normalizePhone(phone);
      const channels = await api<{ demo?: boolean; enabled?: boolean }>("/api/auth/otp-channels").catch(() => null);
      if (channels && !channels.demo && channels.enabled) {
        await api("/api/auth/request-otp", { method: "POST", body: { phone: p, channel: "whatsapp" } });
        setErr("OTP activé — utilisez l'app native pour le moment, ou mode démo.");
        return;
      }
      const r = await api<AuthRes>("/api/auth/login", { method: "POST", body: { phone: p } });
      login(r.token, r.user);
      redirectAfterLogin(r.user);
    } catch (ex) {
      setErr(ex instanceof Error ? ex.message : "Connexion impossible");
    } finally {
      setBusy(false);
    }
  }

  async function onSignup(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    if (!consent) {
      setErr("Acceptez les CGU pour continuer.");
      return;
    }
    setBusy(true);
    try {
      const r = await api<AuthRes>("/api/auth/signup", {
        method: "POST",
        body: {
          fullName: name.trim(),
          phone: normalizePhone(phone),
          role,
          consent: true,
        },
      });
      login(r.token, r.user);
      redirectAfterLogin(r.user);
    } catch (ex) {
      setErr(ex instanceof Error ? ex.message : "Inscription impossible");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="relative min-h-dvh overflow-hidden bg-background">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_#e2efe9_0%,_transparent_50%),radial-gradient(ellipse_at_bottom_left,_#fbe9da_0%,_transparent_45%)]" />
      <div className="relative mx-auto grid min-h-dvh max-w-6xl items-center gap-10 px-4 py-10 lg:grid-cols-2 lg:px-6">
        <div className="hidden lg:block">
          <img src="/assets/mp2-logo.png" alt="MP²" className="mb-6 h-16 w-16 rounded-2xl" />
          <h1 className="font-display text-4xl font-black leading-tight text-primary xl:text-5xl">
            Mon Prof Perso
          </h1>
          <p className="mt-4 max-w-md text-lg text-muted-foreground">
            Soutien scolaire à domicile en Côte d&apos;Ivoire. Profs vérifiés, Mobile Money, suivi des progrès.
          </p>
        </div>
        <div>
          <a href="/" className="mb-4 inline-block text-sm text-muted-foreground hover:text-foreground">
            ← Retour au site
          </a>
          <Card className="shadow-lg">
            <CardHeader>
              <img
                src="/assets/mp2-logo.png"
                alt="MP²"
                className="mb-2 h-12 w-12 rounded-2xl lg:hidden"
                onError={(e) => ((e.target as HTMLImageElement).style.display = "none")}
              />
              <CardTitle className="text-2xl">Connexion</CardTitle>
              <CardDescription>Accédez à votre espace parent ou professeur.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-2">
                <Button variant={tab === "login" ? "secondary" : "outline"} onClick={() => setTab("login")}>
                  Connexion
                </Button>
                <Button variant={tab === "signup" ? "secondary" : "outline"} onClick={() => setTab("signup")}>
                  Inscription
                </Button>
              </div>

              {tab === "login" ? (
                <form className="space-y-3" onSubmit={onLogin}>
                  <div className="space-y-1.5">
                    <Label htmlFor="phone">Numéro de téléphone</Label>
                    <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+2250700000000" />
                  </div>
                  <Button className="w-full" disabled={busy} type="submit">
                    Se connecter
                  </Button>
                  <p className="text-xs text-muted-foreground">
                    Démo parent : <code>+2250758421903</code> · prof : <code>+2250707001234</code>
                  </p>
                </form>
              ) : (
                <form className="space-y-3" onSubmit={onSignup}>
                  <div className="space-y-1.5">
                    <Label htmlFor="name">Nom complet</Label>
                    <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Aya Koné" />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="sphone">Téléphone</Label>
                    <Input id="sphone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+22507…" />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="role">Je suis</Label>
                    <Select id="role" value={role} onChange={(e) => setRole(e.target.value)}>
                      <option value="parent">Parent</option>
                      <option value="student">Élève</option>
                    </Select>
                  </div>
                  <label className="flex items-start gap-2 text-sm">
                    <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-1" />
                    <span>J&apos;accepte les CGU et la confidentialité.</span>
                  </label>
                  <Button className="w-full" disabled={busy} type="submit">
                    Créer mon compte
                  </Button>
                </form>
              )}

              {err ? <p className="text-sm font-semibold text-destructive">{err}</p> : null}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
