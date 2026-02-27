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
        <div className="mb-10">
          <div className="mb-4 flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
              <Blocks className="h-4 w-4 text-primary" />
            </div>
            <h1 className="text-xl font-semibold tracking-tight">Jesseverse</h1>
          </div>
          <p className="text-sm text-muted-foreground">
            Your personal hub. Paste an extension URL below to connect it.
          </p>
        </div>

        {/* add extension */}
        <section className="mb-10">
          <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Connect extension
          </p>
          <AddExtension />
        </section>

        {/* divider */}
        <div className="mb-8 border-t border-border" />

        {/* extensions grid — streams in independently */}
        <Suspense fallback={<ExtensionsGridSkeleton />}>
          <ExtensionsGrid />
        </Suspense>

      </div>
    </main>
  );
}
