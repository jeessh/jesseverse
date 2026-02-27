import { getExtensions, checkExtensionHealth } from "@/lib/extensions";
import { ExtensionCard } from "@/components/ExtensionCard";
import { Blocks } from "lucide-react";

export async function ExtensionsGrid() {
  const extensions = await getExtensions();

  const healthResults = await Promise.allSettled(
    extensions.map((ext) => checkExtensionHealth(ext.url))
  );
  const healthMap = Object.fromEntries(
    extensions.map((ext, i) => [
      ext.id,
      healthResults[i].status === "fulfilled" ? healthResults[i].value : false,
    ])
  );

  return (
    <section>
      <p className="mb-4 text-xs font-medium uppercase tracking-wider text-muted-foreground">
        Extensions{extensions.length > 0 && ` · ${extensions.length}`}
      </p>

      {extensions.length > 0 ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {extensions.map((ext) => (
            <ExtensionCard key={ext.id} extension={ext} isOnline={healthMap[ext.id]} />
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
  );
}

function SkeletonCard() {
  return (
    <div className="rounded-[calc(var(--radius)+2px)] border border-border bg-card p-5 animate-pulse">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="h-2 w-2 shrink-0 rounded-full bg-muted-foreground/20" />
          <div className="h-4 w-28 rounded-md bg-muted-foreground/15" />
        </div>
        <div className="h-7 w-7 shrink-0 rounded-md bg-muted-foreground/10" />
      </div>
      <div className="mb-3 space-y-1.5">
        <div className="h-3 w-full rounded bg-muted-foreground/10" />
        <div className="h-3 w-3/4 rounded bg-muted-foreground/10" />
      </div>
      <div className="h-5 w-40 rounded-full bg-muted-foreground/10" />
    </div>
  );
}

export function ExtensionsGridSkeleton() {
  return (
    <section>
      <p className="mb-4 text-xs font-medium uppercase tracking-wider text-muted-foreground">
        Extensions
      </p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    </section>
  );
}
