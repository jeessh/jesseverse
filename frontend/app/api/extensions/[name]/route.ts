import { NextRequest, NextResponse } from "next/server";

const API_URL = process.env.API_URL ?? "http://localhost:8000";
const API_KEY = process.env.API_KEY ?? "";

/** DELETE /api/extensions/[name] — remove an extension */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  const { name } = await params;
  const res = await fetch(
    `${API_URL}/api/extensions/${encodeURIComponent(name)}`,
    { method: "DELETE", headers: { "X-API-Key": API_KEY } }
  );
  if (res.status === 204) return new NextResponse(null, { status: 204 });
  const data = await res.json().catch(() => ({}));
  return NextResponse.json(data, { status: res.status });
}
