import { NextRequest, NextResponse } from "next/server";
import { createAdminClient, createClient } from "@/lib/supabase/server";

const ALLOWED_FIELDS = [
  "logo_url",
  "meta_og_image",
  "favicon_url",
  "pwa_icon_url",
  "pwa_splash_url",
] as const;

type AllowedField = (typeof ALLOWED_FIELDS)[number];

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const formData = await req.formData();
  const file = formData.get("file");
  const field = formData.get("field");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "파일이 없습니다." }, { status: 400 });
  }
  if (
    typeof field !== "string" ||
    !ALLOWED_FIELDS.includes(field as AllowedField)
  ) {
    return NextResponse.json(
      { error: "유효하지 않은 필드입니다." },
      { status: 400 },
    );
  }

  const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
  const path = `site/${field}_${Date.now()}.${ext}`;
  const contentType =
    file.type || (ext === "ico" ? "image/x-icon" : "application/octet-stream");

  const buffer = await file.arrayBuffer();
  const admin = createAdminClient();
  const { data, error } = await admin.storage
    .from("blog-images")
    .upload(path, buffer, { contentType, upsert: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const {
    data: { publicUrl },
  } = admin.storage.from("blog-images").getPublicUrl(data.path);

  return NextResponse.json({ publicUrl });
}
