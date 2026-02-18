import { getExtensions } from "@/lib/extensions";
import { ExtensionCard } from "@/components/ExtensionCard";
import { AddExtension } from "@/components/AddExtension";
import { Blocks } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function Home() {
  const extensions = await getExtensions();

  return (
    <main className="min-h-screen">
      <div className="mx-auto max-w-4xl px-6 py-16">

        {/* Header */}
        <div className="mb-10">
          <div className="mb-4 flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
              <Blocks className="h-4 w-4 text-primary" />
            </div>
            <h1 className="text-xl font-semibold tracking-tight">Jessiverse</h1>
          </div>
          <p className="text-sm text-muted-foreground">
            Your personal hub. Paste an extension URL below to connect it.
          </p>
        </div>

        {/* Add extension */}
        <section className="mb-10">
          <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Connect extension
          </p>
          <AddExtension />
        </section>

        {/* Divider */}
        <div className="mb-8 border-t border-border" />

        {/* Extensions grid */}
        <section>
          <p className="mb-4 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Extensions{extensions.length > 0 && ` · ${extensions.length}`}
          </p>

          {extensions.length > 0 ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {extensions.map((ext) => (
                <ExtensionCard key={ext.id} extension={ext} />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-14 text-center">
              <Blocks className="mb-3 h-8 w-8 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">No extensions connected yet.</p>
              <p className="mt-1 text-xs text-muted-foreground/60">Paste a server URL above to get started.</p>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
