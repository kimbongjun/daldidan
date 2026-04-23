import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";
import { createAdminClient, createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const MAX_INPUT_BYTES = 10 * 1024 * 1024;

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "업로드 데이터를 읽지 못했습니다." }, { status: 400 });
  }

  const file = formData.get("file");
  if (!(file instanceof Blob)) {
    return NextResponse.json({ error: "이미지 파일이 없습니다." }, { status: 400 });
  }

  if (file.size > MAX_INPUT_BYTES) {
    return NextResponse.json({ error: "파일 크기는 10MB 이하여야 합니다." }, { status: 413 });
  }

  const inputBuffer = Buffer.from(await file.arrayBuffer());

  let outputBuffer: Buffer;
  try {
    outputBuffer = await sharp(inputBuffer, { animated: false })
      .rotate()
      .resize({
        width: 512,
        height: 512,
        fit: "cover",
        position: "centre",
      })
      .webp({ quality: 86 })
      .toBuffer();
  } catch {
    return NextResponse.json({ error: "지원하지 않는 이미지 형식입니다." }, { status: 400 });
  }

  const storagePath = `${user.id}/avatars/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.webp`;
  const admin = createAdminClient();

  const { error: uploadError } = await admin.storage
    .from("blog-images")
    .upload(storagePath, outputBuffer, {
      contentType: "image/webp",
      upsert: false,
    });

  if (uploadError) {
    return NextResponse.json({ error: `스토리지 업로드 실패: ${uploadError.message}` }, { status: 500 });
  }

  const { data: { publicUrl } } = admin.storage
    .from("blog-images")
    .getPublicUrl(storagePath);

  return NextResponse.json({ url: publicUrl }, { status: 201 });
}
