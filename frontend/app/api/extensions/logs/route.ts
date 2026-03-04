import { NextRequest, NextResponse } from "next/server";

const API_URL = process.env.API_URL ?? "http://localhost:8000";

export async function GET(req: NextRequest) {
  const limit = req.nextUrl.searchParams.get("limit") ?? "100";
  const res = await fetch(
    `${API_URL}/api/extensions/logs?limit=${encodeURIComponent(limit)}`,
    { cache: "no-store" }
  );
  const data = await res.json().catch(() => []);
  return NextResponse.json(data, { status: res.status });
}
