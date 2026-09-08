import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";
import { createAdminClient, createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
// Vercel 기본 4.5 MB body 제한을 30 MB로 상향
export const maxDuration = 60;

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
  // service role 업로드 전 반드시 로그인 검증 — 익명 대량 업로드·악성 파일 호스팅 차단
  const authClient = await createClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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

  // 항상 sharp 재인코딩을 거친다 — SVG(스크립트 실행 가능)·클라이언트 선언 MIME을
  // 신뢰한 원본 저장은 공개 버킷 저장형 XSS 벡터가 되므로 허용하지 않는다.
  let outputBuffer: Buffer;
  try {
    outputBuffer = await sharp(inputBuffer, { animated: true })
      .rotate()
      .webp({ quality: 82 })
      .toBuffer();
  } catch (err) {
    console.error("[blog/images] sharp 변환 실패:", err);
    return NextResponse.json(
      { error: "지원하지 않는 이미지 형식입니다. JPEG·PNG·WebP·GIF·AVIF 파일을 사용해 주세요." },
      { status: 415 },
    );
  }
  const contentType = "image/webp";
  const ext = "webp";

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
