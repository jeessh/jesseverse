import { NextRequest, NextResponse } from "next/server";

const API_URL = process.env.API_URL ?? "http://localhost:8000";

/** GET /api/extensions/probe?url=... — probe a URL for its capabilities */
export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get("url");
  if (!url) {
    return NextResponse.json({ detail: "Missing url parameter" }, { status: 400 });
  }
  const res = await fetch(
    `${API_URL}/api/extensions/probe?url=${encodeURIComponent(url)}`,
    { cache: "no-store" }
  );
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
