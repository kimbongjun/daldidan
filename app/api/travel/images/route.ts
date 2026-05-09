import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";
import { createClient, createAdminClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_INPUT_BYTES = 20 * 1024 * 1024; // 20 MB

export async function POST(request: NextRequest) {
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
    return NextResponse.json({ error: "파일이 너무 큽니다. 20MB 이하로 올려주세요." }, { status: 413 });
  }

  const inputBuffer = Buffer.from(await file.arrayBuffer());

  let outputBuffer: Buffer;
  let contentType: string;
  let ext: string;

  try {
    outputBuffer = await sharp(inputBuffer).rotate().resize(1200, 1200, { fit: "inside", withoutEnlargement: true }).webp({ quality: 80 }).toBuffer();
    contentType = "image/webp";
    ext = "webp";
  } catch {
    outputBuffer = inputBuffer;
    const mimeToExt: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/gif": "gif", "image/webp": "webp" };
    ext = mimeToExt[file.type] ?? "bin";
    contentType = file.type || "application/octet-stream";
  }

  const filename = `travel/${user.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const admin = createAdminClient();

  const { error: uploadError } = await admin.storage
    .from("blog-images")
    .upload(filename, outputBuffer, { contentType, upsert: false });

  if (uploadError) {
    return NextResponse.json({ error: `업로드 실패: ${uploadError.message}` }, { status: 500 });
  }

  const { data: { publicUrl } } = admin.storage.from("blog-images").getPublicUrl(filename);
  return NextResponse.json({ url: publicUrl }, { status: 201 });
}
