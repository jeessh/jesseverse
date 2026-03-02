import { Suspense } from "react";
import { AddExtension } from "@/components/AddExtension";
import { ExtensionsGrid, ExtensionsGridSkeleton } from "@/components/ExtensionsGrid";
import { PageLoader } from "@/components/PageLoader";
import { Blocks } from "lucide-react";

export const dynamic = "force-dynamic";

export default function Home() {
  return (
    <main className="relative min-h-screen">
      <div className="relative z-10 mx-auto max-w-4xl px-6 py-16">

        {/* editorial header */}
        <header className="mb-14">
          {/* eyebrow label */}
          <p className="mb-4 text-[10px] font-bold uppercase tracking-[0.2em] text-primary/70">
            Jesse&apos;s workspace
          </p>

          <div className="flex items-start gap-4">
            {/* accent stripe */}
            <div className="mt-1 h-12 w-1 shrink-0 rounded-full bg-primary" />

            <div>
              <h1 className="gradient-heading text-4xl font-black tracking-tight leading-none mb-2">
                Jesseverse
              </h1>
              <p className="text-sm text-muted-foreground leading-relaxed max-w-sm">
                I like building for fun, and now it&apos;ll actually be useful 🔥
              </p>
            </div>

            {/* floating icon */}
            <div className="ml-auto hidden sm:flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary/10 ring-1 ring-primary/20 shadow-sm">
              <Blocks className="h-6 w-6 text-primary" />
            </div>
          </div>

          <div className="mt-6 h-px bg-gradient-to-r from-primary/40 via-border/60 to-transparent" />
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
          <Suspense fallback={<ExtensionsGridSkeleton />}>
            <ExtensionsGrid />
          </Suspense>
        </PageLoader>

      </div>
    </main>
  );
}
