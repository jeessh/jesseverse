import { Suspense } from "react";
import { AddExtension } from "@/components/AddExtension";
import { ExtensionsGrid, ExtensionsGridSkeleton } from "@/components/ExtensionsGrid";
import { Blocks } from "lucide-react";

export const dynamic = "force-dynamic";

export default function Home() {
  return (
    <main className="min-h-screen">
      <div className="mx-auto max-w-4xl px-6 py-16">

        {/* header */}
        <div className="mb-12">
          <div className="mb-3 flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 ring-1 ring-primary/20 shadow-sm">
              <Blocks className="h-4.5 w-4.5 text-primary" />
            </div>
            <h1 className="gradient-heading text-2xl font-bold tracking-tight">Jesseverse</h1>
          </div>
          <p className="text-sm text-muted-foreground/80 pl-0.5">
            Your personal hub. Paste an extension URL below to connect it.
          </p>
        </div>

        {/* add extension */}
        <section className="mb-10">
          <p className="mb-2.5 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/60">
            Connect extension
          </p>
          <AddExtension />
        </section>

        {/* divider */}
        <div className="mb-8 border-t border-border/60" />

        {/* extensions grid — streams in independently */}
        <Suspense fallback={<ExtensionsGridSkeleton />}>
          <ExtensionsGrid />
        </Suspense>

      </div>
    </main>
  );
}
