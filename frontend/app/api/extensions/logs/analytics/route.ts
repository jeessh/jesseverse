import { NextRequest, NextResponse } from "next/server";

const API_URL = process.env.API_URL ?? "http://localhost:8000";

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const upstream = new URLSearchParams();
  for (const key of ["days", "extension_name", "source"]) {
    const val = sp.get(key);
    if (val !== null) upstream.set(key, val);
  }
  const res = await fetch(
    `${API_URL}/api/extensions/logs/analytics?${upstream.toString()}`,
    { cache: "no-store" }
  );
  const data = await res.json().catch(() => ({}));
  return NextResponse.json(data, { status: res.status });
}
