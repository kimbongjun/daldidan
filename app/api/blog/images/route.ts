import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

// Next.js App Router: FormData는 별도 body parser를 쓰지 않으므로 크기 제한 없음
export const runtime = "nodejs";

export async function POST(request: NextRequest) {
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

  const buffer = Buffer.from(await file.arrayBuffer());

  // 실제 MIME 타입으로 확장자와 contentType 결정 (Safari 등 WebP 미지원 시 JPEG 폴백 처리)
  const mimeType = file.type || "image/webp";
  const ext = mimeType === "image/jpeg" ? "jpg" : "webp";
  const contentType = mimeType === "image/jpeg" ? "image/jpeg" : "image/webp";

  // 업로드할 파일명: 타임스탬프 + 랜덤으로 충돌 방지
  const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const storagePath = `uploads/${filename}`;

  const supabase = createAdminClient();

  const { error: uploadError } = await supabase.storage
    .from("blog-images")
    .upload(storagePath, buffer, {
      contentType,
      upsert: false,
    });

  if (uploadError) {
    return NextResponse.json(
      { error: `스토리지 업로드 실패: ${uploadError.message}` },
      { status: 500 },
    );
  }

  const { data: { publicUrl } } = supabase.storage
    .from("blog-images")
    .getPublicUrl(storagePath);

  return NextResponse.json({ url: publicUrl }, { status: 201 });
}
