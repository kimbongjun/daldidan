import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";
import { createAdminClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif"]);

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const file = formData.get("file") as File | null;

  if (!file) {
    return NextResponse.json({ error: "파일이 없습니다." }, { status: 400 });
  }

  if (!ALLOWED.has(file.type)) {
    return NextResponse.json({ error: "지원하지 않는 이미지 형식입니다." }, { status: 415 });
  }

  const maxSize = 5 * 1024 * 1024; // 5MB
  if (file.size > maxSize) {
    return NextResponse.json({ error: "파일 크기는 5MB 이하여야 합니다." }, { status: 400 });
  }

  // 원본을 신뢰하지 않고 항상 sharp로 재인코딩 — 저장형 XSS·악성 페이로드 차단
  let outputBuffer: Buffer;
  try {
    outputBuffer = await sharp(Buffer.from(await file.arrayBuffer()), { animated: true })
      .rotate()
      .webp({ quality: 82 })
      .toBuffer();
  } catch {
    return NextResponse.json({ error: "지원하지 않는 이미지 형식입니다." }, { status: 415 });
  }

  const admin = createAdminClient();
  const fileName = `${crypto.randomUUID()}.webp`;
  const path = `comments/${fileName}`;

  const { error } = await admin.storage
    .from("comment-images")
    .upload(path, outputBuffer, { contentType: "image/webp", upsert: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const { data: urlData } = admin.storage.from("comment-images").getPublicUrl(path);

  return NextResponse.json({ url: urlData.publicUrl }, { status: 201 });
}
