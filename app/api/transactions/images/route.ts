import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";
import { createAdminClient } from "@/lib/supabase/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const MAX_INPUT_BYTES = 20 * 1024 * 1024; // 20 MB

export async function POST(request: NextRequest) {
  // 인증 확인
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "이미지 데이터를 읽지 못했습니다." }, { status: 400 });
  }

  const file = formData.get("image");
  if (!(file instanceof Blob)) {
    return NextResponse.json({ error: "이미지 파일이 없습니다." }, { status: 400 });
  }

  if (file.size > MAX_INPUT_BYTES) {
    return NextResponse.json({ error: "파일 크기가 너무 큽니다. 20 MB 이하 이미지를 사용해 주세요." }, { status: 413 });
  }

  const inputBuffer = Buffer.from(await file.arrayBuffer());

  let outputBuffer: Buffer;
  try {
    outputBuffer = await sharp(inputBuffer, { animated: false })
      .rotate()                                             // EXIF 방향 보정
      .resize({
        width: 1920,
        height: 1920,
        fit: "inside",               // 종횡비 유지, 1920px 박스 안에 맞춤
        withoutEnlargement: true,    // 원본보다 크게 업스케일 안 함
      })
      .webp({ quality: 85 })
      .toBuffer();
  } catch {
    return NextResponse.json(
      { error: "이미지 변환에 실패했습니다. 지원하지 않는 파일 형식입니다." },
      { status: 400 },
    );
  }

  const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.webp`;
  // 유저별 폴더로 분리하여 RLS 없이도 경로로 소유자 구분
  const storagePath = `${user.id}/${filename}`;

  const adminSupabase = createAdminClient();

  const { error: uploadError } = await adminSupabase.storage
    .from("receipt-images")
    .upload(storagePath, outputBuffer, {
      contentType: "image/webp",
      upsert: false,
    });

  if (uploadError) {
    return NextResponse.json(
      { error: `스토리지 업로드 실패: ${uploadError.message}` },
      { status: 500 },
    );
  }

  const { data: { publicUrl } } = adminSupabase.storage
    .from("receipt-images")
    .getPublicUrl(storagePath);

  return NextResponse.json({ url: publicUrl }, { status: 201 });
}
