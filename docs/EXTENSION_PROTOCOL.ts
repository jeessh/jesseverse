/**
 * JESSEVERSE  —  Extension Endpoint Interface
 *
 * ─── OVERVIEW ──────────────────────────────────────────────────────────────
 *
 * Jesseverse is a personal AI hub. It is a central MCP server that knows
 * about a set of registered "extensions" — independently deployed backends
 * you build. Any MCP-compatible AI client (Claude Desktop, Cursor, etc.)
 * that connects to this hub can immediately use every registered extension
 * without any additional configuration.
 *
 * ─── HOW THE HUB WORKS ─────────────────────────────────────────────────────
 *
 * The hub has two layers:
 *
 *   1. Extension Registry  (REST API — FastAPI backend + Supabase)
 *      Stores a table of extensions: { name, url, description }
 *      Admin endpoints (require X-API-Key header):
 *        POST   /api/extensions           → register an extension
 *        DELETE /api/extensions/:name     → remove an extension
 *      Public endpoints (no auth):
 *        GET    /api/extensions           → list all extensions
 *      GET    /api/extensions/register?url → fetch /info + /capabilities for preview
 *
 *   2. MCP Server  (POST /mcp — requires Bearer token)
 *      Exposes three tools to any connected AI agent:
 *
 *        list_extensions()
 *          Reads every registered extension, calls GET {url}/capabilities on
 *          each one, and returns a formatted summary so the agent knows what
 *          actions are available — including parameter types, descriptions,
 *          and accepted enum values.
 *
 *        use(extension, action, parameters)
 *          Calls POST {url}/execute on the named extension, forwarding the
 *          action and parameters. Returns the extension's response.
 *
 *        check_reminders()
 *          Iterates every registered extension. For each one that lists a
 *          get_reminders action in /capabilities, calls POST {url}/execute
 *          with { action: "get_reminders", parameters: {} } and collects the
 *          returned data arrays. Formats and returns all overdue items to the
 *          agent. Call this at the start of a session to surface pending tasks.
 *
 *          The output formatter reads these exact fields from each record:
 *            id       (string, required) — passed to snooze_reminder / update calls
 *            role     (string) — displayed as the item label
 *            company  (string) — displayed alongside role
 *            url      (string, optional) — displayed if present
 *          Missing fields render as '?'. If your extension's get_reminders
 *          records use different field names, update the formatting block in
 *          check_reminders() in backend/app/mcp/server.py to match.
 *
 * ─── HOW REGISTRATION WORKS ────────────────────────────────────────────────
 *
 * Registration is a one-time manual step after you deploy an extension:
 *
 *   curl -X POST https://jesseverse-backend.vercel.app/api/extensions \
 *     -H "Content-Type: application/json" \
 *     -H "X-API-Key: <API_KEY>" \
 *     -d '{ "name": "my-app", "url": "https://my-app.vercel.app" }'
 *
 * The hub calls GET <url>/info automatically during registration to populate
 * the display metadata. Registration will fail with 502 if /info is unreachable
 * or with 422 if title, description, or version are missing.
 *
 * The hub does NOT call /capabilities during registration — capabilities are
 * fetched live at query time.
 *
 * ─── WHAT EXTENSIONS MUST IMPLEMENT ───────────────────────────────────────
 *
 * An extension is any HTTP server with exactly three endpoints:
 *
 *   GET  <base_url>/info           → ExtensionInfo
 *   GET  <base_url>/capabilities   → ExtensionCapability[]
 *   POST <base_url>/execute        → ExtensionExecuteResponse
 *
 * No authentication is required on extension endpoints — the hub calls them
 * server-side from the backend, not from the browser.
 *
 * ─── AUTHENTICATION ────────────────────────────────────────────────────────
 *
 * The hub uses two separate credentials, both stored in backend/.env:
 *
 *   API_KEY    Protects the extension registry write endpoints (POST/DELETE).
 *              Sent as:  X-API-Key: <value>
 *              Also stored in frontend/.env so the Next.js UI can register
 *              extensions server-side without exposing the key to the browser.
 *
 *   MCP_TOKEN  Protects the /mcp endpoint.
 *              Sent as:  Authorization: Bearer <value>
 *              Set this in your AI client's MCP server config.
 *
 *   Example MCP client config (Claude Desktop / Cursor):
 *     {
 *       "mcpServers": {
 *         "jesseverse": {
 *           "url": "https://jesseverse-backend.vercel.app/mcp",
 *           "headers": { "Authorization": "Bearer <MCP_TOKEN>" }
 *         }
 *       }
 *     }
 *
 * ─── FULL REQUEST FLOW ─────────────────────────────────────────────────────
 *
 * Agent asks: "Add an expense of $14.50 for lunch"
 *
 *   1. Agent calls MCP tool  list_extensions()
 *        Hub fetches GET https://my-app.vercel.app/capabilities
 *        Hub returns: "[expense-tracker] ... • add_expense: ..."
 *
 *   2. Agent calls MCP tool  use("expense-tracker", "add_expense", { amount: 14.50, category: "food", note: "lunch" })
 *        Hub fetches POST https://my-app.vercel.app/execute
 *          body: { "action": "add_expense", "parameters": { "amount": 14.50, "category": "food", "note": "lunch" } }
 *        Extension responds: { "success": true, "data": { "id": "...", ... } }
 *        Hub returns the data to the agent.
 */

// ---------------------------------------------------------------------------
// GET <base_url>/info
// Returns core metadata about this extension so the hub can display it in the
// UI and route agents to it. Called automatically during registration.
// No authentication required.
// ---------------------------------------------------------------------------

export interface ExtensionInfo {
  /** Human-readable display name, e.g. "Expense Tracker" */
  title: string;
  /** One-line description of what this extension does */
  description: string;
  /** Semver version string, e.g. "1.0.0" */
  version: string;
  /** Author or owner name (optional) */
  author?: string;
  /** URL to an icon or logo for display in the hub UI (optional) */
  icon_url?: string;
  /** URL to the extension's homepage or docs (optional) */
  homepage_url?: string;
}

/**
 * Required fields: title, description, version.
 * Optional fields: author, icon_url, homepage_url.
 *
 * Example response:
 * {
 *   "title": "Expense Tracker",
 *   "description": "Track personal expenses by category.",
 *   "version": "1.0.0",
 *   "author": "Jesse"
 * }
 */

// ---------------------------------------------------------------------------
// GET <base_url>/capabilities
// Returns the list of actions this extension supports.
// The hub calls this endpoint live every time list_extensions() is invoked.
// No authentication required.
// ---------------------------------------------------------------------------

export interface ExtensionCapabilityParameter {
  /** Parameter name, e.g. "company" */
  name: string;
  /**
   * JSON-style type hint for the AI agent.
   * Use plain strings: "string" | "number" | "boolean" | "object" | "array"
   */
  type: string;
  /** Whether the parameter is required for this action */
  required: boolean;
  /** Optional: human-readable description of what this parameter does */
  description?: string;
  /**
   * Optional: exhaustive list of the only accepted values.
   * When present, the agent should treat this as an enum — only values in
   * this array are valid inputs for the parameter.
   * Example: ["applied", "interview", "offer", "rejected"]
   */
  enum?: string[];
  /**
   * Optional: a representative value that shows the expected format.
   * Visible to the AI agent in list_extensions() output.
   * Example: "2025-02-19" for an ISO date parameter.
   */
  example?: string;
}

export interface ExtensionCapability {
  /** Machine-readable action name — must match what /execute accepts */
  name: string;
  /** Human-readable description of what this action does */
  description: string;
  /** Parameters the action accepts. Omit or use [] if there are none. */
  parameters?: ExtensionCapabilityParameter[];
}

/**
 * /capabilities must return a JSON array of ExtensionCapability.
 * Even if the extension has no actions, return an empty array — never 404.
 *
 * Example response:
 * [
 *   {
 *     "name": "add_expense",
 *     "description": "Record a new expense",
 *     "parameters": [
 *       { "name": "amount",   "type": "number", "required": true,  "description": "Amount spent in USD.", "example": "14.50" },
 *       { "name": "category", "type": "string", "required": false, "description": "Spending category.",
 *         "enum": ["food","transport","health","entertainment","other"] },
 *       { "name": "note",     "type": "string", "required": false, "description": "Optional free-form note." }
 *     ]
 *   },
 *   {
 *     "name": "list_expenses",
 *     "description": "List recent expenses, optionally filtered by category",
 *     "parameters": [
 *       { "name": "category", "type": "string", "required": false, "description": "Filter to this category.",
 *         "enum": ["food","transport","health","entertainment","other"] },
 *       { "name": "limit",    "type": "number", "required": false, "description": "Max records to return. Defaults to 50." }
 *     ]
 *   }
 * ]
 */
export type CapabilitiesResponse = ExtensionCapability[];

// ---------------------------------------------------------------------------
// POST <base_url>/execute
// Executes one action on behalf of the hub.
// The hub forwards the agent's action + parameters verbatim.
// No authentication required.
// ---------------------------------------------------------------------------

export interface ExtensionExecuteRequest {
  /** The action name to run — must match a name from /capabilities */
  action: string;
  /** Key-value parameters for the action. Always present; may be {} */
  parameters: Record<string, unknown>;
}

export interface ExtensionExecuteResponse {
  /** true if the action completed successfully, false otherwise */
  success: boolean;
  /**
   * The result payload on success.
   * Can be any JSON-serialisable value: object, array, string, number, null.
   * The hub passes this back to the AI agent as-is.
   */
  data?: unknown;
  /**
   * Human-readable error message when success is false.
   * The hub surfaces this directly to the agent.
   */
  error?: string;
}

/**
 * /execute rules:
 *
 *   - Always return HTTP 200, even for expected logical errors.
 *     Use { success: false, error: "..." } for bad inputs, not found, etc.
 *     Reserve 4xx/5xx for unexpected server crashes only.
 *
 *   - If the action name is not recognised, return:
 *       { "success": false, "error": "Unknown action: <name>" }
 *
 *   - If a required parameter is missing, return:
 *       { "success": false, "error": "Missing required parameter: <name>" }
 *
 *   - On success, put the result in data:
 *       { "success": true, "data": { ... } }
 *
 *   - If the action succeeds but has nothing meaningful to return:
 *       { "success": true }
 */

// ---------------------------------------------------------------------------
// CORS
// ---------------------------------------------------------------------------

/**
 * Extensions must allow cross-origin requests from the hub backend and the
 * hub frontend (served on different domains).
 *
 * Required headers on /capabilities and /execute responses:
 *
 *   Access-Control-Allow-Origin:  *
 *   Access-Control-Allow-Methods: GET, POST, OPTIONS
 *   Access-Control-Allow-Headers: Content-Type, Authorization
 *
 * Also handle OPTIONS preflight on both endpoints — return 204 with the
 * same headers.
 *
 * In Next.js, set these both in next.config.ts headers() AND in the
 * route handler's OPTIONS export, because Next.js does not apply config-level
 * headers to programmatic OPTIONS responses.
 */

// ---------------------------------------------------------------------------
// Checklist for a new extension
// ---------------------------------------------------------------------------

/**
 * □  GET  /info           returns ExtensionInfo (title, description, version required)
 * □  GET  /capabilities   returns ExtensionCapability[]
 * □  POST /execute        accepts ExtensionExecuteRequest, returns ExtensionExecuteResponse
 * □  OPTIONS on all three endpoints returns 204 + full CORS headers
 * □  next.config.ts (or equivalent) adds CORS headers to GET and POST routes
 * □  Deployed and publicly reachable
 * □  Registered with the hub (hub calls /info automatically):
 *      curl -X POST https://jesseverse-backend.vercel.app/api/extensions \
 *        -H "X-API-Key: <API_KEY>" \
 *        -H "Content-Type: application/json" \
 *        -d '{ "name": "<slug>", "url": "<base_url>" }'
 */
