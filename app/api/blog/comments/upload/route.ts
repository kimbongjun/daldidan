import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const file = formData.get("file") as File | null;

  if (!file) {
    return NextResponse.json({ error: "파일이 없습니다." }, { status: 400 });
  }

  if (!file.type.startsWith("image/")) {
    return NextResponse.json({ error: "이미지 파일만 업로드 가능합니다." }, { status: 400 });
  }

  const maxSize = 5 * 1024 * 1024; // 5MB
  if (file.size > maxSize) {
    return NextResponse.json({ error: "파일 크기는 5MB 이하여야 합니다." }, { status: 400 });
  }

  const admin = createAdminClient();
  const ext = file.name.split(".").pop() ?? "jpg";
  const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  const path = `comments/${fileName}`;

  const arrayBuffer = await file.arrayBuffer();
  const { error } = await admin.storage
    .from("comment-images")
    .upload(path, arrayBuffer, { contentType: file.type, upsert: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const { data: urlData } = admin.storage.from("comment-images").getPublicUrl(path);

  return NextResponse.json({ url: urlData.publicUrl }, { status: 201 });
}
