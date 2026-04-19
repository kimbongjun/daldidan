import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";
import { createAdminClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const SVG_MIME = "image/svg+xml";
const MAX_INPUT_BYTES = 30 * 1024 * 1024; // 30 MB

export async function POST(request: NextRequest) {
  try {
    return await handleUpload(request);
  } catch (err) {
    // sharp 크래시, OOM, 예상치 못한 예외 등 → 항상 JSON 반환 보장
    console.error("[blog/images] unhandled error:", err);
    return NextResponse.json(
      { error: "이미지 업로드 중 서버 오류가 발생했습니다." },
      { status: 500 },
    );
  }
}

async function handleUpload(request: NextRequest): Promise<NextResponse> {
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
    return NextResponse.json(
      { error: "파일 크기가 너무 큽니다. 30 MB 이하 이미지를 사용해 주세요." },
      { status: 413 },
    );
  }

  const inputBuffer = Buffer.from(await file.arrayBuffer());
  const isSvg = file.type === SVG_MIME;

  let outputBuffer: Buffer;
  let contentType: string;
  let ext: string;

  if (isSvg) {
    outputBuffer = inputBuffer;
    contentType = SVG_MIME;
    ext = "svg";
  } else {
    try {
      outputBuffer = await sharp(inputBuffer, { animated: true })
        .rotate()
        .webp({ quality: 82 })
        .toBuffer();
      contentType = "image/webp";
      ext = "webp";
    } catch (err) {
      console.error("[blog/images] sharp 변환 실패:", err);
      // sharp 실패 시 원본 그대로 업로드 (폴백)
      outputBuffer = inputBuffer;
      const mimeToExt: Record<string, string> = {
        "image/jpeg": "jpg",
        "image/png": "png",
        "image/gif": "gif",
        "image/webp": "webp",
        "image/avif": "avif",
      };
      ext = mimeToExt[file.type] ?? "bin";
      contentType = file.type || "application/octet-stream";
    }
  }

  const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const storagePath = `uploads/${filename}`;

  const supabase = createAdminClient();

  const { error: uploadError } = await supabase.storage
    .from("blog-images")
    .upload(storagePath, outputBuffer, { contentType, upsert: false });

  if (uploadError) {
    console.error("[blog/images] Supabase 업로드 실패:", uploadError);
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
