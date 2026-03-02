/**
 * Heavy chunk — only ever imported dynamically via `loadLucideIcons()`.
 * Contains the full `import *` that pulls all ~1400 lucide icons.
 */
import * as LucideIcons from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type { LucideIcon };

export const lucideIconMap: Record<string, LucideIcon> = Object.fromEntries(
  Object.entries(LucideIcons).filter(
    ([name, v]) =>
      v !== null &&
      typeof v === "object" &&
      /^[A-Z]/.test(name) &&
      !name.endsWith("Icon"),   // dedupe — every icon has a *Icon alias
  ),
) as Record<string, LucideIcon>;

export const allLucideIconEntries: [string, LucideIcon][] = Object.entries(
  lucideIconMap,
) as [string, LucideIcon][];
