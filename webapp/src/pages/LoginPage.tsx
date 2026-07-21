import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "@/lib/api";
import { redirectAfterLogin, useAuth, type User } from "@/lib/auth";
import { normalizePhone } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";

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
    <div className="mx-auto flex min-h-dvh max-w-md flex-col justify-center p-4">
      <a href="/" className="mb-4 text-sm text-muted-foreground">
        ← Retour au site
      </a>
      <Card>
        <CardHeader>
          <img src="/assets/mp2-logo.png" alt="MP²" className="mb-2 h-14 w-14 rounded-2xl" onError={(e) => ((e.target as HTMLImageElement).style.display = "none")} />
          <CardTitle className="text-2xl">Mon Prof Perso</CardTitle>
          <CardDescription>Connectez-vous ou créez un compte pour accéder à votre espace.</CardDescription>
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
                <span>
                  J&apos;accepte les CGU et la confidentialité.
                </span>
              </label>
              <Button className="w-full" disabled={busy} type="submit">
                Créer mon compte
              </Button>
            </form>
          )}

          {err ? <p className="text-sm font-semibold text-destructive">{err}</p> : null}
          <p className="text-center text-xs text-muted-foreground">
            <Link to="/accueil" className="underline">
              Continuer vers l&apos;espace
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
