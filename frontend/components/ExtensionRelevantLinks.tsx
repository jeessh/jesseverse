"use client";

import * as React from "react";
import { ExternalLink, Database, Triangle, Plus } from "lucide-react";
import { useRouter, usePathname } from "next/navigation";

interface Props {
  supabaseUrl?: string | null;
  vercelUrl?: string | null;
}

interface LinkRowProps {
  href: string;
  label: string;
  icon: React.ReactNode;
}

function LinkRow({ href, label, icon }: LinkRowProps) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="flex w-full items-center gap-3 rounded-lg border border-border bg-muted/40 px-3 py-2.5 hover:bg-primary/10 hover:border-primary/40 transition-colors group/link"
    >
      <span className="flex h-6 w-6 shrink-0 items-center justify-center text-muted-foreground/50 group-hover/link:text-primary/70 transition-colors">
        {icon}
      </span>
      <span className="text-sm font-medium flex-1 min-w-0 truncate">{label}</span>
      <ExternalLink className="h-3.5 w-3.5 shrink-0 text-muted-foreground/30 group-hover/link:text-primary/60 transition-colors" />
    </a>
  );
}

export function ExtensionRelevantLinks({ supabaseUrl, vercelUrl }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const hasAny = !!supabaseUrl || !!vercelUrl;

  if (!hasAny) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-8 text-center">
        <p className="text-sm text-muted-foreground/60 mb-3">No links added yet.</p>
        <button
          type="button"
          onClick={() => router.push(`${pathname}?edit=1`)}
          className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
        >
          <Plus className="h-3.5 w-3.5" />
          Add links
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {supabaseUrl && (
        <LinkRow
          href={supabaseUrl}
          label="Supabase"
          icon={<Database className="h-4 w-4" strokeWidth={1.5} />}
        />
      )}
      {vercelUrl && (
        <LinkRow
          href={vercelUrl}
          label="Vercel"
          icon={<Triangle className="h-4 w-4" strokeWidth={1.5} />}
        />
      )}
    </div>
  );
}
