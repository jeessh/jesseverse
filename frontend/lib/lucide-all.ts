/**
 * Heavy chunk — only ever imported dynamically via `loadLucideIcons()`.
 * Contains the full `import *` that pulls all ~1400 lucide icons.
 */
import * as LucideIcons from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type { LucideIcon };

// Deduplicate by both name convention AND component reference —
// lucide exports deprecated aliases (e.g. `Dash` → same ref as `Circle`)
// that don't end in "Icon", so filtering by name alone isn't enough.
const _seen = new Set<unknown>();
export const lucideIconMap: Record<string, LucideIcon> = Object.fromEntries(
  Object.entries(LucideIcons).filter(
    ([name, v]) => {
      if (!v || typeof v !== "object") return false;
      if (!/^[A-Z]/.test(name)) return false;
      if (name.endsWith("Icon")) return false; // remove *Icon aliases
      if (_seen.has(v)) return false;           // remove duplicate refs
      _seen.add(v);
      return true;
    }
  ),
) as Record<string, LucideIcon>;

export const allLucideIconEntries: [string, LucideIcon][] = Object.entries(
  lucideIconMap,
) as [string, LucideIcon][];

