/**
 * Lightweight resolver — no static `import *`.
 * The heavy lucide-all chunk is only fetched on demand.
 */
import type { LucideIcon } from "lucide-react";

let mapCache: Record<string, LucideIcon> | null = null;
let loadPromise: Promise<Record<string, LucideIcon>> | null = null;

/** Lazy-load all icons once, then cache. Safe to call many times. */
export function loadLucideIcons(): Promise<Record<string, LucideIcon>> {
  if (mapCache) return Promise.resolve(mapCache);
  if (!loadPromise) {
    loadPromise = import("./lucide-all").then((m) => {
      mapCache = m.lucideIconMap;
      return mapCache!;
    });
  }
  return loadPromise;
}

/**
 * Synchronous resolve — works only after `loadLucideIcons()` has resolved.
 * Returns null if the map isn't loaded yet or the name doesn't exist.
 */
export function resolveLucideIcon(iconUrl: string): LucideIcon | null {
  if (!iconUrl.startsWith("lucide:") || !mapCache) return null;
  return mapCache[iconUrl.slice(7)] ?? null;
}
