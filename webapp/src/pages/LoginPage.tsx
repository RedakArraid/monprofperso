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
    api<Channels>("/api/auth/otp-channels").then((c) => {
      if (!active) return;
      setChannels(c);
      setChannel(!phoneProof && c.defaultChannel === "email" && c.email ? "email" : "whatsapp");
    }).catch(() => {
      if (active) setErr("Les moyens de vérification sont indisponibles. Réessayez dans un instant.");
    });
    return () => { active = false; };
  }, [phoneProof]);

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

  return (
    <div className="relative min-h-dvh overflow-hidden bg-background">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_#e2efe9_0%,_transparent_50%),radial-gradient(ellipse_at_bottom_left,_#fbe9da_0%,_transparent_45%)]" />
      <div className="relative mx-auto grid min-h-dvh w-full max-w-[1400px] items-center gap-8 px-4 py-8 sm:px-6 lg:grid-cols-2 lg:gap-12 lg:px-10">
        <div className="hidden lg:block">
          <img src="/assets/mp2-logo.png" alt="MP²" className="mb-6 h-16 w-16 rounded-2xl" />
          <h1 className="font-display text-4xl font-black leading-tight text-primary xl:text-5xl">Mon Prof Perso</h1>
          <p className="mt-4 max-w-md text-lg text-muted-foreground">Soutien scolaire à domicile en Côte d&apos;Ivoire.</p>
        </div>
        <div>
          <a href="/" className="mb-4 inline-block text-sm text-muted-foreground hover:text-foreground">← Retour au site</a>
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="text-2xl">{challenge ? "Vérifiez votre identité" : tab === "signup" ? "Créer un compte" : "Connexion"}</CardTitle>
              <CardDescription>{reauthenticate ? "Vérifiez à nouveau votre identité pour protéger les données de votre compte." : "Accédez à votre espace parent ou professeur."}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {!challenge && !reauthenticate ? (
                <div className="grid grid-cols-2 gap-2">
                  {(["login", "signup"] as const).map((value) => (
                    <Button key={value} variant={tab === value ? "secondary" : "outline"} disabled={busy}
                      onClick={() => { setTab(value); setErr(""); }}>
                      {value === "login" ? "Connexion" : "Inscription"}
                    </Button>
                  ))}
                </div>
              ) : null}
              <form className="space-y-4" onSubmit={submit}>
                {challenge ? (
                  <>
                    <p className="text-sm">Un code a été envoyé par {challenge.channel === "email" ? "e-mail" : "WhatsApp"} à {challenge.destination}.</p>
                    <div className="space-y-1.5">
                      <Label htmlFor="code">Code à 6 chiffres</Label>
                      <Input id="code" autoFocus required inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6}
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
                        <p className="text-xs text-muted-foreground">{channels?.consentVersion ? `Version présentée : ${channels.consentVersion}` : "Chargement de la version des documents…"}</p>
                        {role === "student" ? <label className="flex items-start gap-2 text-sm"><input type="checkbox" required checked={parentalConsent} onChange={(e) => setParentalConsent(e.target.checked)} className="mt-1" />
                          <span>Je dispose de l&apos;accord de mon responsable légal.</span></label> : null}
                      </>
                    ) : null}
                  </>
                )}
                {err ? <p role="alert" className="text-sm font-semibold text-destructive">{err}</p> : null}
                <Button className="w-full" disabled={busy || (!challenge && tab === "signup" && !channels?.consentVersion) || (Boolean(challenge) && now >= expiresAt)} type="submit">
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
    </div>
  );
}
