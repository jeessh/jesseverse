import { NextRequest, NextResponse } from "next/server";

const API_URL = process.env.API_URL ?? "http://localhost:8000";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  const { name } = await params;
  const res = await fetch(
    `${API_URL}/api/extensions/${encodeURIComponent(name)}/logs`,
    { cache: "no-store" }
  );
  const data = await res.json().catch(() => []);
  return NextResponse.json(data, { status: res.status });
}
