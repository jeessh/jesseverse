import { NextRequest, NextResponse } from "next/server";

const API_URL = process.env.API_URL ?? "http://localhost:8000";

// fetches /info + /capabilities from the extension url so the ui can preview before confirming
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
