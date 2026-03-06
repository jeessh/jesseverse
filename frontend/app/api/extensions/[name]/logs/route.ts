import { NextRequest, NextResponse } from "next/server";

const API_URL = process.env.API_URL ?? "http://localhost:8000";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  const { name } = await params;
  const sp = req.nextUrl.searchParams;
  const upstream = new URLSearchParams();
  for (const key of ["limit", "offset"]) {
    const val = sp.get(key);
    if (val !== null) upstream.set(key, val);
  }
  const res = await fetch(
    `${API_URL}/api/extensions/${encodeURIComponent(name)}/logs?${upstream.toString()}`,
    { cache: "no-store" }
  );
  const data = await res.json().catch(() => ({ data: [], total: 0 }));
  return NextResponse.json(data, { status: res.status });
}
