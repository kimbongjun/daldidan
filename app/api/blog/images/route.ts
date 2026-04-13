import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";
import { createAdminClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

// SVG는 벡터 보존을 위해 변환 없이 그대로 업로드
const SVG_MIME = "image/svg+xml";
const MAX_INPUT_BYTES = 30 * 1024 * 1024; // 30 MB

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

  if (file.size > MAX_INPUT_BYTES) {
    return NextResponse.json({ error: "파일 크기가 너무 큽니다. 30 MB 이하 이미지를 사용해 주세요." }, { status: 413 });
  }

  const inputBuffer = Buffer.from(await file.arrayBuffer());
  const isSvg = file.type === SVG_MIME;

  let outputBuffer: Buffer;
  let contentType: string;
  let ext: string;

  if (isSvg) {
    // SVG는 변환 없이 그대로 사용
    outputBuffer = inputBuffer;
    contentType = SVG_MIME;
    ext = "svg";
  } else {
    // 모든 래스터 이미지 (JPEG, PNG, GIF, HEIC, HEIF, AVIF, TIFF, BMP, WebP 등)를 WebP로 변환
    try {
      outputBuffer = await sharp(inputBuffer, { animated: true })
        .rotate()
        .webp({ quality: 82 })
        .toBuffer();
      contentType = "image/webp";
      ext = "webp";
    } catch {
      return NextResponse.json(
        { error: "이미지 변환에 실패했습니다. 지원하지 않는 파일 형식입니다." },
        { status: 400 },
      );
    }
  }

  const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const storagePath = `uploads/${filename}`;

  const supabase = createAdminClient();

  const { error: uploadError } = await supabase.storage
    .from("blog-images")
    .upload(storagePath, outputBuffer, {
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
