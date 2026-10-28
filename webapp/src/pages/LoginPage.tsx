import { api, apiBase, ApiError } from "@/lib/api";
import { redirectAfterLogin, useAuth, type User } from "@/lib/auth";
import { normalizePhone } from "@/lib/utils";
import { isOtpChallenge, type OtpChallenge } from "@/lib/flows";
import { loginDestination } from "@/lib/operations";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { BrandIllustration } from "@/components/brand-illustration";
import { useEffect, useState, type FormEvent } from "react";

type Session = { token: string; user: User };
type Channels = { demo: boolean; whatsapp: boolean; email: boolean; defaultChannel: "whatsapp" | "email"; consentVersion: string };

function finishLogin(user: User) {
  const next = new URLSearchParams(window.location.hash.split("?")[1] || "").get("next");
  const destination = loginDestination(next);
  if (destination) window.location.href = destination;
  else redirectAfterLogin(user);
}

export function LoginPage() {
  const { login, user, loading } = useAuth();
  const reauthenticate = new URLSearchParams(window.location.hash.split("?")[1] || "").get("reauth") === "1";
  const phoneProof = new URLSearchParams(window.location.hash.split("?")[1] || "").get("phone") === "1";
  const [tab, setTab] = useState<"login" | "signup">(
    window.location.hash.includes("inscription") ? "signup" : "login",
  );
  const [phone, setPhone] = useState(user?.phone || "");
  const [name, setName] = useState("");
  const [role, setRole] = useState("parent");
  const [consent, setConsent] = useState(false);
  const [parentalConsent, setParentalConsent] = useState(false);
  const [channels, setChannels] = useState<Channels | null>(null);
  const [channelAttempt, setChannelAttempt] = useState(0);
  const [channel, setChannel] = useState<"whatsapp" | "email">("whatsapp");
  const [email, setEmail] = useState("");
  const [challenge, setChallenge] = useState<OtpChallenge | null>(null);
  const [code, setCode] = useState("");
  const [expiresAt, setExpiresAt] = useState(0);
  const [resendAt, setResendAt] = useState(0);
  const [now, setNow] = useState(Date.now());
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && user && !reauthenticate) finishLogin(user);
    if (user && reauthenticate) setPhone(user.phone);
  }, [loading, user, reauthenticate]);

  useEffect(() => {
    let active = true;
    setErr("");
    api<Channels>("/api/auth/otp-channels").then((c) => {
      if (!active) return;
      setChannels(c);
      setChannel(!phoneProof && (c.defaultChannel === "email" || !c.whatsapp) && c.email ? "email" : "whatsapp");
    }).catch(() => {
      if (active) setErr("Les moyens de vérification sont indisponibles. Réessayez dans un instant.");
    });
    return () => { active = false; };
  }, [phoneProof, channelAttempt]);

  useEffect(() => {
    if (!challenge) return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [challenge]);

  function acceptResponse(result: unknown) {
    if (isOtpChallenge(result)) {
      setChallenge(result);
      setCode("");
      const time = Date.now();
      setExpiresAt(time + result.expiresInMinutes * 60_000);
      setResendAt(time + 60_000);
      setNow(time);
      return;
    }
    const session = result as Partial<Session> | null;
    if (!session?.token || !session.user || !Number.isInteger(session.user.id)) {
      throw new Error("La connexion n'a pas été confirmée. Réessayez.");
    }
    login(session.token, session.user);
    finishLogin(session.user);
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    setErr("");
    setBusy(true);
    try {
      if (challenge) {
        if (Date.now() >= expiresAt) throw new Error("Ce code a expiré. Demandez un nouveau code.");
        acceptResponse(await api("/api/auth/verify-otp", {
          method: "POST", body: { challengeId: challenge.challengeId, code },
        }));
      } else if (tab === "signup") {
        if (!channels?.consentVersion) throw new Error("La version des documents n’a pas pu être chargée. Actualisez la page avant de créer votre compte.");
        if (!consent || (role === "student" && !parentalConsent)) {
          throw new Error("Confirmez les consentements requis pour créer votre compte.");
        }
        acceptResponse(await api("/api/auth/signup", {
          method: "POST",
          body: { fullName: name.trim(), phone: normalizePhone(phone), role, consent, parentalConsent, consentVersion: channels.consentVersion },
        }));
      } else {
        acceptResponse(await api("/api/auth/login", {
          method: "POST",
          body: { phone: normalizePhone(phone), channel, email: channel === "email" ? email.trim() : undefined },
        }));
      }
    } catch (ex) {
      setErr(ex instanceof Error ? ex.message : "Connexion impossible");
      if (ex instanceof ApiError && (ex.data as { error?: string } | null)?.error === "consent_version_changed") {
        setConsent(false); setParentalConsent(false); setChallenge(null); setCode(""); setChannels(null);
        try {
          setChannels(await api<Channels>("/api/auth/otp-channels"));
          setErr("Les documents ont changé. Consultez les nouvelles versions puis acceptez-les à nouveau pour continuer.");
        } catch { setErr("Les documents ont changé, mais leur nouvelle version n’a pas pu être chargée. Actualisez la page pour continuer."); }
      }
    } finally {
      setBusy(false);
    }
  }

  async function resend() {
    if (!challenge || busy || Date.now() < resendAt) return;
    setErr("");
    setBusy(true);
    try {
      const result = await api("/api/auth/request-otp", {
        method: "POST", body: { challengeId: challenge.challengeId },
      });
      if (!isOtpChallenge(result)) throw new Error("Impossible de renouveler la vérification.");
      acceptResponse(result);
    } catch (ex) {
      setErr(ex instanceof Error ? ex.message : "Envoi impossible");
    } finally {
      setBusy(false);
    }
  }

  const channelAvailable = Boolean(channels && (tab === "signup" || phoneProof ? channels.whatsapp : channel === "email" ? channels.email : channels.whatsapp));

  return (
    <main className="relative min-h-dvh bg-background">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_#e2efe9_0%,_transparent_50%),radial-gradient(ellipse_at_bottom_left,_#fbe9da_0%,_transparent_45%)]" />
      <div className="relative mx-auto grid min-h-dvh w-full max-w-6xl items-center gap-8 px-4 py-6 sm:px-6 sm:py-10 lg:grid-cols-2 lg:gap-12">
        <div className="hidden min-w-0 lg:block">
          <div className="flex items-center gap-3"><img src="/assets/mp2-logo.png" alt="" className="h-12 w-12 rounded-xl" /><p className="font-display text-lg font-extrabold text-primary">Mon Prof Perso</p></div>
          <p className="mt-8 max-w-lg font-display text-4xl font-extrabold leading-tight text-primary">Un accompagnement qui fait grandir.</p>
          <p className="mt-4 max-w-md text-lg leading-relaxed text-muted-foreground">Vos cours, votre professeur et le suivi de vos apprentissages, réunis dans un même espace.</p>
          <BrandIllustration priority className="mt-6 w-full max-w-lg rounded-3xl" />
        </div>
        <div className="mx-auto w-full min-w-0 max-w-lg">
          <div className="mb-3 flex items-center gap-3 lg:hidden"><img src="/assets/mp2-logo.png" alt="" className="h-11 w-11 rounded-xl" /><p className="font-display text-lg font-extrabold text-primary">Mon Prof Perso</p></div>
          <a href="/" className="mb-3 inline-flex min-h-11 items-center rounded-lg text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground">← Retour au site</a>
          <Card className="shadow-[0_12px_48px_rgba(14,90,67,0.08)]">
            <CardHeader className="p-5 pb-3 sm:p-7 sm:pb-4">
              <CardTitle as="h1" className="text-2xl text-welcome">{challenge ? "Vérifiez votre identité" : tab === "signup" ? "Créer un compte" : "Connexion"}</CardTitle>
              <CardDescription>{reauthenticate ? "Vérifiez à nouveau votre identité pour protéger les données de votre compte." : "Accédez à votre espace parent ou professeur."}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5 p-5 pt-2 sm:p-7 sm:pt-2">
              {!challenge && !reauthenticate ? (
                <div className="grid grid-cols-2 gap-2" role="group" aria-label="Accès au compte">
                  {(["login", "signup"] as const).map((value) => (
                    <Button key={value} variant={tab === value ? "secondary" : "outline"} disabled={busy} aria-pressed={tab === value}
                      onClick={() => { setTab(value); setErr(""); if (!channels) setChannelAttempt((attempt) => attempt + 1); }}>
                      {value === "login" ? "Connexion" : "Inscription"}
                    </Button>
                  ))}
                </div>
              ) : null}
              <form className="space-y-4" onSubmit={submit}>
                {challenge ? (
                  <>
                    <p className="break-words text-sm">Un code a été envoyé par {challenge.channel === "email" ? "e-mail" : "WhatsApp"} à {challenge.destination}.</p>
                    <div className="space-y-1.5">
                      <Label htmlFor="code">Code à 6 chiffres</Label>
                      <Input id="code" autoFocus required inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} className="text-center text-xl font-semibold tracking-[.35em]"
                        value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} />
                    </div>
                    <p className="text-xs text-muted-foreground">{now >= expiresAt ? "Code expiré." : `Code valable encore ${Math.ceil((expiresAt - now) / 60_000)} minute(s).`}</p>
                  </>
                ) : (
                  <>
                    {tab === "signup" ? (
                      <>
                        <div className="space-y-1.5"><Label htmlFor="role">Je suis</Label>
                          <Select id="role" value={role} onChange={(e) => setRole(e.target.value)}>
                            <option value="parent">Un parent / responsable</option><option value="student">Un élève</option>
                          </Select>
                        </div>
                        <div className="space-y-1.5"><Label htmlFor="name">Nom complet</Label>
                          <Input id="name" required maxLength={120} autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} />
                        </div>
                      </>
                    ) : null}
                    <div className="space-y-1.5"><Label htmlFor="phone">Téléphone</Label>
                      <Input id="phone" type="tel" required autoComplete="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+2250700000000" />
                    </div>
                    {phoneProof ? <p className="text-sm">Vérifiez votre numéro par WhatsApp pour demander un reversement vers ce numéro.</p> : null}
                    {tab === "login" && channels?.email && !phoneProof ? (
                      <>
                        <div className="space-y-1.5"><Label htmlFor="channel">Recevoir le code</Label>
                          <Select id="channel" value={channel} onChange={(e) => setChannel(e.target.value as "whatsapp" | "email")}>
                            <option value="whatsapp" disabled={!channels.whatsapp}>WhatsApp</option><option value="email">Adresse e-mail vérifiée</option>
                          </Select>
                        </div>
                        {channel === "email" ? <div className="space-y-1.5"><Label htmlFor="email">E-mail déjà vérifié sur votre compte</Label>
                          <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" /></div> : null}
                      </>
                    ) : null}
                    {tab === "signup" ? (
                      <>
                        <p className="text-xs text-muted-foreground">Votre numéro sera vérifié par WhatsApp.</p>
                        <label className="flex items-start gap-2 text-sm"><input type="checkbox" required disabled={!channels?.consentVersion} checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-1" />
                          <span>J&apos;accepte les <a href={`${apiBase()}/api/legal/cgu/file?v=${encodeURIComponent(channels?.consentVersion || "")}`} target="_blank" rel="noreferrer" className="underline">CGU</a> et la <a href={`${apiBase()}/api/legal/confidentialite/file?v=${encodeURIComponent(channels?.consentVersion || "")}`} target="_blank" rel="noreferrer" className="underline">politique de confidentialité</a>.</span>
                        </label>
                        {channels?.consentVersion ? <details className="rounded-lg border border-border px-3 text-xs text-muted-foreground"><summary className="flex min-h-11 cursor-pointer items-center font-semibold">Version des documents présentés</summary><p className="break-all pb-3 leading-relaxed">{channels.consentVersion}</p></details> : <p role="status" className="text-sm text-muted-foreground">Chargement de la version des documents…</p>}
                        {role === "student" ? <label className="flex items-start gap-2 text-sm"><input type="checkbox" required checked={parentalConsent} onChange={(e) => setParentalConsent(e.target.checked)} className="mt-1" />
                          <span>Je dispose de l&apos;accord de mon responsable légal.</span></label> : null}
                      </>
                    ) : null}
                  </>
                )}
                {err ? <p role="alert" className="text-sm font-semibold text-destructive">{err}</p> : null}
                {!challenge && !channels ? (err ? <Button type="button" variant="outline" className="w-full" onClick={() => setChannelAttempt((value) => value + 1)}>Réessayer le chargement</Button> : <p role="status" className="text-sm text-muted-foreground">Chargement des moyens de connexion…</p>) : null}
                {!challenge && channels && !channelAvailable ? <p role="alert" className="text-sm text-destructive">Ce moyen de vérification est temporairement indisponible.</p> : null}
                <Button className="w-full" disabled={busy || (!challenge && !channelAvailable) || (!challenge && tab === "signup" && !channels?.consentVersion) || (Boolean(challenge) && now >= expiresAt)} type="submit">
                  {busy ? "Vérification…" : challenge ? "Valider le code" : tab === "signup" ? "Créer mon compte" : "Se connecter"}
                </Button>
              </form>
              {challenge ? (
                <div className="flex flex-wrap gap-3">
                  <Button variant="outline" disabled={busy || now < resendAt} onClick={() => void resend()}>
                    {now < resendAt ? `Renvoyer dans ${Math.ceil((resendAt - now) / 1000)} s` : "Renvoyer un code"}
                  </Button>
                  <Button variant="ghost" disabled={busy} onClick={() => { setChallenge(null); setCode(""); setErr(""); }}>Recommencer</Button>
                </div>
              ) : channels?.demo ? <p className="text-xs text-muted-foreground">Environnement de démonstration activé par le serveur.</p> : null}
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}
