import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

const BUCKET = "extension-icons";

function getSupabase() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) throw new Error("Supabase env vars not configured");
  return createClient(url, key);
}

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const file = form.get("file") as File | null;
    const slug = (form.get("slug") as string | null) ?? "unknown";

    if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });
    if (file.size > 524_288) return NextResponse.json({ error: "File too large (max 512 KB)" }, { status: 413 });

    const ext = file.name.split(".").pop()?.toLowerCase() ?? "png";
    const path = `${slug}-${Date.now()}.${ext}`;

    const supabase = getSupabase();
    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(path, file, { upsert: true, contentType: file.type });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const { data: { publicUrl } } = supabase.storage.from(BUCKET).getPublicUrl(path);

    return NextResponse.json({ url: publicUrl });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Upload failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
