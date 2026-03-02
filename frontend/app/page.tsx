import { Suspense } from "react";
import { AddExtension } from "@/components/AddExtension";
import { ExtensionsGrid } from "@/components/ExtensionsGrid";
import { PageLoader } from "@/components/PageLoader";
import { ParticleField } from "@/components/ParticleField";
import { Origami } from "lucide-react";

export const dynamic = "force-dynamic";

export default function Home() {
  return (
    <main className="relative min-h-screen overflow-hidden">
      {/* particle field — overhangs above fold, fades out before connect section */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-0" style={{ height: "280px" }}>
        <ParticleField />
      </div>

      <div className="relative z-10 mx-auto max-w-4xl px-6 py-16">

        {/* cosmic header */}
        <header className="mb-8 text-center">
          {/* glowing icon orb */}
          <div className="mb-6 inline-flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 ring-1 ring-primary/25 shadow-[0_0_32px_4px_hsl(var(--primary)/0.12)]">
            <Origami className="h-7 w-7 text-primary" strokeWidth={1.5} />
          </div>

          <h1 className="mb-3 text-6xl tracking-tight leading-none [font-family:var(--font-display)]">
            <span className="gradient-heading">JESSE</span><span className="heading-outline">VERSE</span>
          </h1>
          <p className="mx-auto max-w-sm text-xs text-muted-foreground/75 leading-relaxed tracking-wide">
            I like building things for fun, and now they're actually useful 🔥
          </p>

          {/* soft radial divider */}
          <div className="mt-8 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
        </header>

        {/* add extension */}
        <section className="mb-10">
          <p className="mb-2.5 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/60">
            Connect extension
          </p>
          <AddExtension />
        </section>

        {/* divider */}
        <div className="mb-8 border-t border-border/60" />

        {/* extensions grid with loading animation */}
        <PageLoader>
          <Suspense fallback={null}>
            <ExtensionsGrid />
          </Suspense>
        </PageLoader>

      </div>
    </main>
  );
}
