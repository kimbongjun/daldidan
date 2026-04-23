import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";
import { createAdminClient, createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const MAX_INPUT_BYTES = 10 * 1024 * 1024;
const AVATAR_BUCKET = "blog-images";

export async function POST(request: NextRequest) {
  try {
    return await handleUpload(request);
  } catch (error) {
    console.error("[mypage/avatar] unhandled error:", error);
    return NextResponse.json(
      { error: "아바타 업로드 중 서버 오류가 발생했습니다." },
      { status: 500 },
    );
  }
}

async function handleUpload(request: NextRequest) {
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

  if (!file.type.startsWith("image/")) {
    return NextResponse.json({ error: "이미지 파일만 업로드할 수 있습니다." }, { status: 400 });
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
  } catch (error) {
    console.error("[mypage/avatar] sharp 변환 실패:", error);
    return NextResponse.json({ error: "지원하지 않는 이미지 형식입니다." }, { status: 400 });
  }

  const storagePath = `${user.id}/avatars/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.webp`;
  const admin = createAdminClient();

  const { error: uploadError } = await admin.storage
    .from(AVATAR_BUCKET)
    .upload(storagePath, outputBuffer, {
      contentType: "image/webp",
      upsert: false,
    });

  if (uploadError) {
    console.error("[mypage/avatar] Supabase 업로드 실패:", uploadError);
    const lowerMessage = uploadError.message.toLowerCase();
    const message = lowerMessage.includes("bucket") && lowerMessage.includes("not found")
      ? `스토리지 버킷(${AVATAR_BUCKET})을 찾지 못했습니다.`
      : `스토리지 업로드 실패: ${uploadError.message}`;
    return NextResponse.json({ error: message }, { status: 500 });
  }

  const { data: { publicUrl } } = admin.storage
    .from(AVATAR_BUCKET)
    .getPublicUrl(storagePath);

  const { error: profileError } = await admin
    .from("profiles")
    .upsert(
      {
        id: user.id,
        avatar_url: publicUrl,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" },
    );

  if (profileError) {
    console.error("[mypage/avatar] 프로필 저장 실패:", profileError);
    return NextResponse.json(
      { error: `프로필 저장 실패: ${profileError.message}` },
      { status: 500 },
    );
  }

  return NextResponse.json({ url: publicUrl }, { status: 201 });
}
