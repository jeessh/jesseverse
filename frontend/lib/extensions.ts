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

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export async function getExtensions(): Promise<Extension[]> {
  try {
    const res = await fetch(`${API}/api/extensions`, { cache: "no-store" });
    if (!res.ok) return [];
    return res.json();
  } catch {
    return [];
  }
}

/**
 * Probe a URL to see if it follows the Jessiverse extension protocol.
 * Returns its capabilities if valid, or throws with a human-readable message.
 */
export async function probeExtension(
  url: string
): Promise<{ capabilities: Capability[]; name: string; description: string }> {
  const base = url.replace(/\/$/, "");
  const res = await fetch(`${base}/capabilities`, { cache: "no-store" });
  if (!res.ok) throw new Error(`GET ${base}/capabilities returned ${res.status}`);
  const capabilities: Capability[] = await res.json();
  if (!Array.isArray(capabilities)) throw new Error("Response is not an array of capabilities");
  const name = capabilities[0]?.name
    ? new URL(base).hostname.split(".")[0]
    : new URL(base).hostname.split(".")[0];
  const description = capabilities.map((c) => c.name).join(", ");
  return { capabilities, name, description };
}

/**
 * Register an extension with the hub backend.
 */
export async function registerExtension(
  name: string,
  url: string,
  description: string
): Promise<Extension> {
  const res = await fetch(`${API}/api/extensions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, url, description }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `Server returned ${res.status}`);
  }
  return res.json();
}

/**
 * Remove an extension from the hub.
 */
export async function removeExtension(name: string): Promise<void> {
  const res = await fetch(`${API}/api/extensions/${encodeURIComponent(name)}`, {
    method: "DELETE",
  });
  if (!res.ok && res.status !== 404) throw new Error(`Server returned ${res.status}`);
}
