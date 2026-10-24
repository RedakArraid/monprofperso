import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { useLive } from "@/hooks/useLive";
import { CapabilitiesContext, DISABLED, useCapabilities, type Capabilities } from "@/lib/capabilities";
import { AppShell, ContentCard, OfflineBanner, SectionHeading } from "@/components/layout";

export function CapabilitiesProvider({ children }: { children: ReactNode }) {
  const { data, loading, offline, reload } = useLive<Capabilities>("/api/capabilities", DISABLED);
  return <CapabilitiesContext.Provider value={{ capabilities: data, loading, offline, reload }}>{children}</CapabilitiesContext.Provider>;
}

export function CapabilityGate({ name, title, children }: { name: keyof Capabilities; title: string; children: ReactNode }) {
  const { capabilities, loading, offline, reload } = useCapabilities();
  if (capabilities[name]) return children;
  return <AppShell title={title} active="compte">
    {offline ? <OfflineBanner onRetry={() => void reload()} /> : null}
    <ContentCard><SectionHeading>{title}</SectionHeading>
      <p>{loading ? "Vérification de la disponibilité…" : "Ce service n’est pas disponible actuellement. Aucune opération ne sera effectuée."}</p>
      <Link className="link-green mt-4 inline-block" to="/cours">Consulter mes cours</Link>
    </ContentCard>
  </AppShell>;
}
