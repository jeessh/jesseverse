export interface Extension {
  id: string;
  name: string;
  url: string;
  description: string;
  title: string;
  version: string;
  author: string;
  icon_url: string;
  homepage_url: string;
  registered_at: string;
}

export interface Capability {
  name: string;
  description: string;
  parameters?: { name: string; type: string; required?: boolean }[];
}

// server-side only — uses private env vars, calls fastapi directly
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

// fetch live capabilities — returns null if the extension is down
export async function getExtensionCapabilities(url: string): Promise<Capability[] | null> {
  try {
    const res = await fetch(
      `${SERVER_API}/api/extensions/register?url=${encodeURIComponent(url.replace(/\/$/, ""))}`,
      { cache: "no-store" }
    );
    if (!res.ok) return null;
    const { capabilities } = await res.json();
    return Array.isArray(capabilities) ? capabilities : null;
  } catch {
    return null;
  }
}

// ping the extension — used to compute the online dot on each card
export async function checkExtensionHealth(url: string): Promise<boolean> {
  try {
    const res = await fetch(
      `${SERVER_API}/api/extensions/register?url=${encodeURIComponent(url.replace(/\/$/, ""))}`,
      { cache: "no-store" }
    );
    return res.ok;
  } catch {
    return false;
  }
}

// client-side helpers — talk to /api/extensions/* routes, never fastapi directly
// (the api key never leaves the server)

// previews an extension url before the user confirms registration
export async function fetchRegistrationPreview(url: string): Promise<{
  capabilities: Capability[];
  title: string;
  description: string;
  version: string;
  author: string;
  icon_url: string;
  homepage_url: string;
}> {
  const res = await fetch(
    `/api/extensions/register?url=${encodeURIComponent(url.replace(/\/$/, ""))}`,
    { cache: "no-store" }
  );
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.detail ?? `Register preview returned ${res.status}`);
  }
  const { info, capabilities }: { info: Record<string, string>; capabilities: Capability[] } =
    await res.json();
  if (!Array.isArray(capabilities) || capabilities.length === 0) {
    throw new Error("Extension returned an empty capabilities list");
  }
  return {
    capabilities,
    title: info.title ?? "",
    description: info.description ?? "",
    version: info.version ?? "",
    author: info.author ?? "",
    icon_url: info.icon_url ?? "",
    homepage_url: info.homepage_url ?? "",
  };
}

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

export async function removeExtension(name: string): Promise<void> {
  const res = await fetch(`/api/extensions/${encodeURIComponent(name)}`, {
    method: "DELETE",
  });
  if (!res.ok && res.status !== 404) throw new Error(`Server returned ${res.status}`);
}

// ── action execution ────────────────────────────────────────────────────────

export interface ExecuteResult {
  success: boolean;
  data?: unknown;
  error?: string;
}

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
