// ── Extension visibility ──────────────────────────────────────────────────────
//
// Three values:
//   online            — deployed, functional, fully exposed to Claude via MCP.
//   under_construction — registered but not yet surfaced to Claude. Use this
//                        while building so you can test through the hub's MCP
//                        mode without polluting real conversations.
//   offline           — intentionally dormant. Config preserved, nothing exposed.

export type Visibility = "online" | "under_construction" | "offline";

export interface VisibilityStyle {
  label: string;
  /** Tailwind classes for the small dot indicator */
  dot: string;
  /** Tailwind classes for the badge container */
  badge: string;
}

/** Static style per visibility value — used in the edit-form status picker. */
export const VISIBILITY_CONFIG: Record<Visibility, VisibilityStyle> = {
  online: {
    label: "Online",
    dot: "bg-emerald-500 shadow-[0_0_6px_1px_rgba(16,185,129,0.5)]",
    badge: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30",
  },
  under_construction: {
    label: "Under construction",
    dot: "bg-amber-400 shadow-[0_0_5px_1px_rgba(251,191,36,0.4)]",
    badge: "bg-amber-400/10 text-amber-600 border-amber-400/30",
  },
  offline: {
    label: "Offline",
    dot: "bg-muted-foreground/30",
    badge: "text-muted-foreground border-border",
  },
};

/**
 * Resolves the display style for the current state, factoring in live health.
 *
 * - `under_construction` / `offline` → always use their fixed styles.
 * - `online` + reachable             → emerald green.
 * - `online` + unreachable           → muted gray "Offline" (same as manual offline).
 * - `online` + unknown (undefined)   → emerald (optimistic default).
 */
export function resolveVisibilityStyle(
  visibility: string | null | undefined,
  isOnline?: boolean
): VisibilityStyle {
  const vis = (visibility ?? "online") as Visibility;

  if (vis !== "online") {
    return VISIBILITY_CONFIG[vis] ?? VISIBILITY_CONFIG.online;
  }

  // vis === "online": reflect live health
  if (isOnline === false) {
    return VISIBILITY_CONFIG.offline;
  }

  return VISIBILITY_CONFIG.online;
}
