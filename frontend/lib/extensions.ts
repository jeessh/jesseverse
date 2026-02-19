export interface Extension {
  id: string;
  name: string;
  url: string;
  description: string;
  registered_at: string;
}

export interface Capability {
  name: string;
  description: string;
  parameters?: { name: string; type: string; required?: boolean }[];
}

// ── Server-side helpers ───────────────────────────────────────────────────────
// These run only in Next.js server components / server actions.
// They read private env vars (no NEXT_PUBLIC_ prefix) and call FastAPI directly.

const SERVER_API = process.env.API_URL ?? "http://localhost:8000";
const SERVER_KEY = process.env.API_KEY ?? "";

function serverAuthHeaders(): HeadersInit {
  return { "Content-Type": "application/json", "X-API-Key": SERVER_KEY };
}

export async function getExtensions(): Promise<Extension[]> {
  try {
    const res = await fetch(`${SERVER_API}/api/extensions`, { cache: "no-store" });
    if (!res.ok) return [];
    return res.json();
  } catch {
    return [];
  }
}

/**
 * Fetch live capabilities for a registered extension.
 * Returns null if the extension is unreachable.
 */
export async function getExtensionCapabilities(url: string): Promise<Capability[] | null> {
  try {
    const res = await fetch(
      `${SERVER_API}/api/extensions/probe?url=${encodeURIComponent(url.replace(/\/$/, ""))}`,
      { cache: "no-store" }
    );
    if (!res.ok) return null;
    const { capabilities } = await res.json();
    return Array.isArray(capabilities) ? capabilities : null;
  } catch {
    return null;
  }
}

/**
 * Check whether an extension is currently reachable.
 * Used server-side to compute the isOnline flag for each card.
 */
export async function checkExtensionHealth(url: string): Promise<boolean> {
  try {
    const res = await fetch(
      `${SERVER_API}/api/extensions/probe?url=${encodeURIComponent(url.replace(/\/$/, ""))}`,
      { cache: "no-store" }
    );
    return res.ok;
  } catch {
    return false;
  }
}

// ── Client-side helpers ───────────────────────────────────────────────────────
// These are called from client components (browser).
// They talk to Next.js API routes at /api/extensions/*, never to FastAPI directly.
// The API key never leaves the server.

/**
 * Probe a URL by routing through the Next.js backend proxy.
 * Works for private/localhost extensions that the browser can't reach directly.
 */
export async function probeExtension(
  url: string
): Promise<{ capabilities: Capability[]; name: string; description: string }> {
  const res = await fetch(
    `/api/extensions/probe?url=${encodeURIComponent(url.replace(/\/$/, ""))}`,
    { cache: "no-store" }
  );
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.detail ?? `Probe returned ${res.status}`);
  }
  const { capabilities }: { capabilities: Capability[] } = await res.json();
  if (!Array.isArray(capabilities) || capabilities.length === 0) {
    throw new Error("Extension returned an empty capabilities list");
  }
  const name = new URL(url.replace(/\/$/, "")).hostname.replace(/^www\./, "").split(".")[0];
  const description = capabilities.map((c) => c.name).join(", ");
  return { capabilities, name, description };
}

/**
 * Register an extension with the hub.
 */
export async function registerExtension(
  name: string,
  url: string,
  description: string
): Promise<Extension> {
  const res = await fetch("/api/extensions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, url, description }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.detail ?? `Server returned ${res.status}`);
  }
  return res.json();
}

/**
 * Remove an extension from the hub.
 */
export async function removeExtension(name: string): Promise<void> {
  const res = await fetch(`/api/extensions/${encodeURIComponent(name)}`, {
    method: "DELETE",
  });
  if (!res.ok && res.status !== 404) throw new Error(`Server returned ${res.status}`);
}

// ── Action execution ──────────────────────────────────────────────────────────

export interface ExecuteResult {
  success: boolean;
  data?: unknown;
  error?: string;
}

/**
 * Run an action on a registered extension through the hub backend.
 */
export async function executeAction(
  extensionName: string,
  action: string,
  parameters: Record<string, unknown>
): Promise<ExecuteResult> {
  const res = await fetch(`/api/extensions/${encodeURIComponent(extensionName)}/execute`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, parameters }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.detail ?? `Server returned ${res.status}`);
  }
  return res.json();
}
