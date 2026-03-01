"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { type Extension } from "@/lib/extensions";
import Link from "next/link";

interface Props {
  extension: Extension;
  isOnline?: boolean;
}

export function ExtensionCard({ extension, isOnline }: Props) {
  return (
    <Link href={`/extensions/${encodeURIComponent(extension.name)}`} className="group block focus:outline-none">
      <Card className="card-glow h-full rounded-none border-border/70 bg-card">
        <CardHeader className="pb-2 pt-4 px-4">
          <div className="flex items-center gap-2 min-w-0">
              {isOnline !== undefined && (
                <span
                  className={`mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full transition-colors ${
                    isOnline ? "bg-emerald-500 shadow-[0_0_6px_1px_rgba(16,185,129,0.5)]" : "bg-muted-foreground/25"
                  }`}
                  title={isOnline ? "Online" : "Unreachable"}
                />
              )}
              <CardTitle className="text-sm font-semibold truncate group-hover:text-primary transition-colors duration-150">
                {extension.name}
              </CardTitle>
            </div>
        </CardHeader>
        <CardContent className="px-4 pb-4 pt-1.5">
          {extension.description && (
            <p className="mb-3 text-xs text-muted-foreground/80 line-clamp-2 leading-relaxed">
              {extension.description}
            </p>
          )}
          <div className="flex items-center gap-1.5 rounded-md bg-muted/60 px-2 py-1 ring-1 ring-border/50">
            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-muted-foreground/30" />
            <span className="truncate font-mono text-[10px] text-muted-foreground/70">{extension.url}</span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
