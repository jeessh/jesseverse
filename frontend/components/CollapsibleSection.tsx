"use client";

import * as React from "react";
import { ChevronDown } from "lucide-react";

interface Props {
  label: string;
  count?: number;
  defaultOpen?: boolean;
  children: React.ReactNode;
}

export function CollapsibleSection({ label, count, defaultOpen = true, children }: Props) {
  const [open, setOpen] = React.useState(defaultOpen);

  return (
    <section className="border-t border-border pt-6">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="mb-4 flex w-full items-center justify-between group focus:outline-none"
      >
        <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground group-hover:text-foreground transition-colors">
          {label}
          {count !== undefined && count > 0 && (
            <span className="ml-2 font-normal normal-case tracking-normal text-muted-foreground/50">
              {count}
            </span>
          )}
        </span>
        <ChevronDown
          className={`h-3.5 w-3.5 text-muted-foreground/50 group-hover:text-muted-foreground transition-all duration-200 ${
            open ? "rotate-180" : "rotate-0"
          }`}
        />
      </button>
      <div className={open ? "pb-8" : "hidden"}>{children}</div>
    </section>
  );
}
