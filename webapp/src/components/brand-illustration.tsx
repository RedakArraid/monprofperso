import { cn } from "@/lib/utils";

/** Illustration éditoriale décorative ; les contenus utiles restent dans le DOM. */
export function BrandIllustration({ className, priority = false }: { className?: string; priority?: boolean }) {
  return <picture className={cn("block overflow-hidden rounded-2xl bg-[#f5f2eb]", className)}>
    <source media="(max-width: 639px)" srcSet="/assets/illustrations/learning-together-small.webp" />
    <img src="/assets/illustrations/learning-together.webp" width={1200} height={900}
      alt="" aria-hidden="true" loading={priority ? "eager" : "lazy"} decoding="async"
      fetchPriority={priority ? "high" : "auto"} className="h-auto w-full object-contain" />
  </picture>;
}
