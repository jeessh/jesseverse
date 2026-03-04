"use client";

import * as React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { type Extension } from "@/lib/extensions";
import { resolveVisibilityStyle } from "@/lib/visibility";
import { Blocks, ExternalLink } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

interface Props {
  extension: Extension;
  isOnline?: boolean;
}

export function ExtensionCard({ extension, isOnline }: Props) {
  const isLucide = extension.icon_url?.startsWith("lucide:") ?? false;
  const [IconComponent, setIconComponent] = React.useState<LucideIcon | null>(null);

  React.useEffect(() => {
    if (!isLucide) return;
    import("@/lib/lucide-all").then((m) => {
      const name = extension.icon_url!.slice(7);
      setIconComponent((m.lucideIconMap[name] as LucideIcon) ?? null);
    });
  }, [isLucide, extension.icon_url]);

  return (
    <Link href={`/extensions/${encodeURIComponent(extension.name)}`} className="group block focus:outline-none">
      <Card className="card-glow flex h-full flex-col border-border/70 bg-card">
        <CardContent className="flex flex-1 flex-col gap-3 p-4">

          {/* logo row */}
          <div className="flex items-start justify-between">
            <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-xl bg-primary/10 ring-1 ring-border/60">
              {IconComponent ? (
                <div className="flex h-full w-full items-center justify-center">
                  <IconComponent className="h-5 w-5 text-primary/70" strokeWidth={1.5} />
                </div>
              ) : extension.icon_url && !isLucide ? (
                <Image
                  src={extension.icon_url}
                  alt={`${extension.name} logo`}
                  fill
                  className="object-cover"
                  unoptimized
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center">
                  <Blocks className="h-5 w-5 text-primary/60" strokeWidth={1.5} />
                </div>
              )}
            </div>

            {(() => {
              const { dot, label } = resolveVisibilityStyle(extension.visibility, isOnline);
              return (
                <span
                  className={`mt-1 h-1.5 w-1.5 shrink-0 rounded-full transition-colors ${dot}`}
                  title={label}
                />
              );
            })()}
          </div>

          {/* name + description */}
          <div className="flex flex-1 flex-col gap-1">
            <p className="card-prompt text-sm font-semibold leading-snug group-hover:text-primary transition-colors duration-150">
              {extension.name}
            </p>
            <p className="line-clamp-2 text-xs text-muted-foreground/75 leading-relaxed">
              {extension.description || ""}
            </p>
          </div>

          {/* url pill — opens extension directly */}
          <button
            type="button"
            onClick={(e) => { e.preventDefault(); window.open(extension.url, "_blank", "noopener,noreferrer"); }}
            className="group/url flex w-full items-center gap-1.5 rounded-md bg-muted/60 px-2 py-1 ring-1 ring-border/50 transition-all duration-150 hover:bg-primary/10 hover:ring-primary/40"
          >
            <ExternalLink className="h-2.5 w-2.5 shrink-0 text-muted-foreground/40 transition-all duration-150 group-hover/url:text-primary/70 group-hover/url:translate-x-px group-hover/url:-translate-y-px" />
            <span className="truncate font-mono text-[10px] text-muted-foreground/70 transition-colors duration-150 group-hover/url:text-primary/80">{extension.url}</span>
          </button>

        </CardContent>
      </Card>
    </Link>
  );
}
