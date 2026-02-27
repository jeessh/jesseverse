import { ArrowLeft, Blocks } from "lucide-react";

function SkeletonActionRow() {
  return (
    <div className="rounded-lg border border-border bg-card animate-pulse">
      <div className="flex w-full items-center justify-between px-4 py-3">
        <div className="flex items-center gap-3 min-w-0">
          {/* capability name */}
          <div className="h-4 w-32 rounded bg-muted-foreground/15" />
          {/* params hint */}
          <div className="h-3 w-14 rounded bg-muted-foreground/10" />
        </div>
        {/* chevron placeholder */}
        <div className="h-4 w-4 shrink-0 rounded bg-muted-foreground/10" />
      </div>
      {/* description line */}
      <div className="px-4 pb-3 -mt-1">
        <div className="h-3 w-3/5 rounded bg-muted-foreground/10" />
      </div>
    </div>
  );
}

export default function Loading() {
  return (
    <main className="min-h-screen">
      <div className="mx-auto max-w-3xl px-6 py-16">

        {/* back link skeleton */}
        <div className="mb-8 inline-flex items-center gap-1.5">
          <ArrowLeft className="h-3.5 w-3.5 text-muted-foreground/30" />
          <div className="h-3 w-20 rounded bg-muted-foreground/15 animate-pulse" />
        </div>

        {/* header skeleton */}
        <div className="mb-8">
          <div className="flex items-start justify-between gap-4 mb-2">
            <div className="flex items-center gap-3">
              {/* icon box */}
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                <Blocks className="h-4 w-4 text-primary/30" />
              </div>
              {/* title */}
              <div className="h-7 w-40 rounded-md bg-muted-foreground/15 animate-pulse" />
            </div>
            {/* status badge */}
            <div className="mt-1 h-5 w-16 shrink-0 rounded-full bg-muted-foreground/10 animate-pulse" />
          </div>

          {/* description */}
          <div className="mt-3 space-y-1.5">
            <div className="h-3.5 w-full rounded bg-muted-foreground/10 animate-pulse" />
            <div className="h-3.5 w-2/3 rounded bg-muted-foreground/10 animate-pulse" />
          </div>

          {/* url */}
          <div className="mt-3 h-3 w-52 rounded bg-muted-foreground/10 animate-pulse" />
        </div>

        {/* divider */}
        <div className="mb-8 border-t border-border" />

        {/* actions section */}
        <section>
          <div className="mb-4 h-3 w-16 rounded bg-muted-foreground/15 animate-pulse" />
          <div className="space-y-2">
            <SkeletonActionRow />
            <SkeletonActionRow />
            <SkeletonActionRow />
          </div>
        </section>

        {/* footer */}
        <div className="mt-12 border-t border-border pt-6">
          <div className="h-3 w-36 rounded bg-muted-foreground/10 animate-pulse" />
        </div>

      </div>
    </main>
  );
}
