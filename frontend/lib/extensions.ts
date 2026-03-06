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
  updated_at?: string;
  supabase_url?: string | null;
  vercel_url?: string | null;
  last_used_at?: string | null;
  visibility?: string | null;
}

export interface CapabilityParameter {
  name: string;
  type: string;
  required?: boolean;
  description?: string;
  enum?: string[];
  example?: string;
}

export interface Capability {
  name: string;
  description: string;
  parameters?: CapabilityParameter[];
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

// server-side logs fetch — called from page.tsx so data is ready before render
export async function getExtensionLogs(
  extensionName: string,
  limit = 20,
  offset = 0,
): Promise<{ data: ActionLog[]; total: number }> {
  try {
    const res = await fetch(
      `${SERVER_API}/api/extensions/${encodeURIComponent(extensionName)}/logs?limit=${limit}&offset=${offset}`,
      { cache: "no-store" }
    );
    if (!res.ok) return { data: [], total: 0 };
    return res.json();
  } catch {
    return { data: [], total: 0 };
  }
}

// server-side: fetch logs across all extensions
export async function getGlobalLogs(
  params: { limit?: number; offset?: number; extensionName?: string; source?: string; success?: boolean } = {}
): Promise<{ data: ActionLog[]; total: number }> {
  try {
    const sp = new URLSearchParams();
    if (params.limit !== undefined) sp.set("limit", String(params.limit));
    if (params.offset !== undefined) sp.set("offset", String(params.offset));
    if (params.extensionName) sp.set("extension_name", params.extensionName);
    if (params.source) sp.set("source", params.source);
    if (params.success !== undefined) sp.set("success", String(params.success));
    const res = await fetch(
      `${SERVER_API}/api/extensions/logs?${sp.toString()}`,
      { cache: "no-store" }
    );
    if (!res.ok) return { data: [], total: 0 };
    return res.json();
  } catch {
    return { data: [], total: 0 };
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

export async function updateExtension(
  name: string,
  updates: { name?: string; url?: string; description?: string; icon_url?: string; supabase_url?: string; vercel_url?: string; visibility?: string }
): Promise<Extension> {
  const res = await fetch(`/api/extensions/${encodeURIComponent(name)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(updates),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.detail ?? `Server returned ${res.status}`);
  }
  return res.json();
}

// ── action execution ────────────────────────────────────────────────────────

export interface ExecuteResult {
  success: boolean;
  data?: unknown;
  error?: string;
}

export interface ActionLog {
  id: string;
  extension_name: string;
  action: string;
  prompt: string | null;
  params: Record<string, unknown>;
  success: boolean;
  error: string | null;
  result_summary: string | null;
  source: string;
  created_at: string;
}

export async function getActionLogs(
  extensionName: string,
  limit = 20,
  offset = 0,
): Promise<{ data: ActionLog[]; total: number }> {
  const sp = new URLSearchParams({ limit: String(limit), offset: String(offset) });
  const res = await fetch(
    `/api/extensions/${encodeURIComponent(extensionName)}/logs?${sp.toString()}`,
    { cache: "no-store" },
  );
  if (!res.ok) return { data: [], total: 0 };
  return res.json();
}

export async function getAllActionLogs(
  params: { limit?: number; offset?: number; extensionName?: string; source?: string; success?: boolean } = {}
): Promise<{ data: ActionLog[]; total: number }> {
  const sp = new URLSearchParams();
  if (params.limit !== undefined) sp.set("limit", String(params.limit));
  if (params.offset !== undefined) sp.set("offset", String(params.offset));
  if (params.extensionName) sp.set("extension_name", params.extensionName);
  if (params.source) sp.set("source", params.source);
  if (params.success !== undefined) sp.set("success", String(params.success));
  const res = await fetch(`/api/extensions/logs?${sp.toString()}`, { cache: "no-store" });
  if (!res.ok) return { data: [], total: 0 };
  return res.json();
}

export async function executeAction(
  extensionName: string,
  action: string,
  parameters: Record<string, unknown>
): Promise<ExecuteResult> {
  const res = await fetch(`/api/extensions/${encodeURIComponent(extensionName)}/execute`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, parameters, source: "hub" }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.detail ?? `Server returned ${res.status}`);
  }
  return res.json();
}
