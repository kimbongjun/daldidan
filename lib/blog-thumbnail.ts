import "server-only";

import { createAdminClient } from "@/lib/supabase/server";
import { extractDescriptionFromHtml } from "@/lib/blog-shared";

function buildPollinationsPrompt(title: string, snippet: string): string {
  const parts = [
    `professional blog thumbnail: "${title}"`,
    snippet ? snippet.slice(0, 80) : "",
    "beautiful editorial photography, cinematic composition, vibrant colors, high quality, 16:9",
  ].filter(Boolean).join(". ");
  return encodeURIComponent(parts);
}

function makePicsumUrl(slug: string): string {
  const seed = slug.replace(/[^a-z0-9]/gi, "").slice(0, 24) || "blog";
  return `https://picsum.photos/seed/${seed}/1200/630`;
}

async function uploadToStorage(buffer: Buffer, ext: string): Promise<string | null> {
  try {
    const supabase = createAdminClient();
    const filename = `auto-thumb-${Date.now()}-${Math.random().toString(36).slice(2, 6)}.${ext}`;
    const path = `thumbnails/${filename}`;
    const contentType = ext === "webp" ? "image/webp" : "image/jpeg";

    const { error } = await supabase.storage
      .from("blog-images")
      .upload(path, buffer, { contentType, upsert: false });

    if (error) return null;

    const { data: { publicUrl } } = supabase.storage
      .from("blog-images")
      .getPublicUrl(path);

    return publicUrl;
  } catch {
    return null;
  }
}

// Pollinations.ai — 무료 AI 이미지 생성 (API 키 불필요)
async function tryPollinationsAI(prompt: string): Promise<string | null> {
  try {
    const seed = Math.floor(Math.random() * 99_999);
    const url =
      `https://image.pollinations.ai/prompt/${prompt}` +
      `?model=flux&width=1200&height=630&nologo=true&seed=${seed}`;

    const res = await fetch(url, {
      signal: AbortSignal.timeout(28_000),
      headers: { "User-Agent": "daldidan-blog-thumbnail/1.0" },
    });

    if (!res.ok) return null;

    const contentType = res.headers.get("content-type") ?? "";
    if (!contentType.startsWith("image/")) return null;

    const buffer = Buffer.from(await res.arrayBuffer());
    if (buffer.length < 8_000) return null; // 너무 작으면 오류 응답일 가능성

    return uploadToStorage(buffer, "jpg");
  } catch {
    return null;
  }
}

// Unsplash Source — 무료 stock 사진 (키워드 기반)
async function tryUnsplashSource(keywords: string): Promise<string | null> {
  try {
    const query = encodeURIComponent(keywords.replace(/[^a-z0-9\s]/gi, " ").trim().slice(0, 60));
    if (!query) return null;

    const url = `https://source.unsplash.com/1200x630/?${query}`;
    const res = await fetch(url, {
      redirect: "follow",
      signal: AbortSignal.timeout(12_000),
    });

    if (!res.ok) return null;

    const contentType = res.headers.get("content-type") ?? "";
    if (!contentType.startsWith("image/")) return null;

    const buffer = Buffer.from(await res.arrayBuffer());
    if (buffer.length < 5_000) return null;

    return uploadToStorage(buffer, "jpg");
  } catch {
    return null;
  }
}

/**
 * 제목·본문을 분석해 자동 썸네일 URL을 반환합니다.
 *
 * 우선순위:
 *  1. Pollinations.ai — 무료 AI 이미지 생성
 *  2. Unsplash Source — 무료 stock 사진
 *  3. Picsum Photos  — 슬러그 기반 안정적 폴백 (항상 성공)
 *
 * 1·2 성공 시 Supabase storage에 업로드한 영구 URL을 반환합니다.
 * 3은 Picsum CDN URL을 그대로 반환합니다.
 */
export async function generateAutoThumbnail(
  title: string,
  contentHtml: string,
  slug: string,
): Promise<string> {
  const snippet = extractDescriptionFromHtml(contentHtml, 200);
  const prompt = buildPollinationsPrompt(title, snippet);

  // 1. Pollinations AI
  const pollinationsUrl = await tryPollinationsAI(prompt);
  if (pollinationsUrl) return pollinationsUrl;

  // 2. Unsplash Source (영어 키워드 추출)
  const keywords = title.replace(/[ㄱ-ㅎㅏ-ㅣ가-힣]+/g, "").trim() || title;
  const unsplashUrl = await tryUnsplashSource(keywords);
  if (unsplashUrl) return unsplashUrl;

  // 3. Picsum 폴백 (슬러그 seed → 항상 같은 이미지)
  return makePicsumUrl(slug);
}
