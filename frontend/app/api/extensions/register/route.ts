import { NextRequest, NextResponse } from "next/server";

const API_URL = process.env.API_URL ?? "http://localhost:8000";

/**
 * GET /api/extensions/register?url=...
 * Calls the backend GET /api/extensions/register which fetches /info + /capabilities
 * from the extension and returns { info, capabilities } for the UI confirmation step.
 */
export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get("url");
  if (!url) {
    return NextResponse.json({ detail: "Missing url parameter" }, { status: 400 });
  }
  const res = await fetch(
    `${API_URL}/api/extensions/register?url=${encodeURIComponent(url)}`,
    { cache: "no-store" }
  );
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
