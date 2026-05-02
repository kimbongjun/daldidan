import "server-only";

import { buildCloudflareStreamThumbnailUrl, getCloudflareStreamPublicConfig } from "@/lib/cloudflare-stream-public";
import { createAdminClient } from "@/lib/supabase/server";
import { extractFirstStreamVideoMetaFromHtml } from "@/lib/blog";
import { extractDescriptionFromHtml } from "@/lib/blog-shared";

type ThumbnailCategoryProfile = {
  koreanLabel: string;
  visualFocus: string;
  promptStyle: string;
  englishKeywords: string[];
  avoidKeywords?: string[];
};

const CATEGORY_THUMBNAIL_PROFILES: Record<string, ThumbnailCategoryProfile> = {
  "여행": {
    koreanLabel: "여행",
    visualFocus: "destination-focused travel scene, local atmosphere, landscape or city exploration",
    promptStyle: "editorial travel photography, authentic place-based storytelling, natural light",
    englishKeywords: ["travel", "destination", "landscape", "city", "journey", "local culture"],
    avoidKeywords: ["studio", "product", "abstract"],
  },
  "스윙": {
    koreanLabel: "스윙",
    visualFocus: "swing dance social, jazz-era mood, partner movement, dance floor energy",
    promptStyle: "lively dance photography, rhythmic motion, warm stage lighting, candid social atmosphere",
    englishKeywords: ["swing dance", "jazz dance", "lindy hop", "social dance", "ballroom", "live music"],
    avoidKeywords: ["golf swing", "baseball", "fitness gym"],
  },
  "일상": {
    koreanLabel: "일상",
    visualFocus: "everyday life moment, cozy routine, home or neighborhood scene",
    promptStyle: "lifestyle editorial photography, candid slice-of-life composition, warm and relatable mood",
    englishKeywords: ["lifestyle", "daily life", "home", "routine", "cafe", "neighborhood"],
    avoidKeywords: ["corporate", "luxury showroom", "product mockup"],
  },
  "육아": {
    koreanLabel: "육아",
    visualFocus: "family life, parenting moment, child-friendly environment, warm connection",
    promptStyle: "family lifestyle photography, gentle natural light, tender candid interaction",
    englishKeywords: ["parenting", "family", "kids", "childcare", "home life", "playtime"],
    avoidKeywords: ["hospital", "medical", "classroom lecture"],
  },
  "재테크": {
    koreanLabel: "재테크",
    visualFocus: "personal finance planning, budgeting desk, investing habit, money management scene",
    promptStyle: "clean editorial finance photography, modern workspace, practical and trustworthy tone",
    englishKeywords: ["personal finance", "budgeting", "investing", "money management", "financial planning", "workspace"],
    avoidKeywords: ["casino", "luxury car", "gold bars"],
  },
  "기타": {
    koreanLabel: "기타",
    visualFocus: "blog editorial visual aligned with the article topic",
    promptStyle: "editorial photography, contextual subject matter, clean and attractive composition",
    englishKeywords: ["editorial", "feature story", "magazine photography"],
    avoidKeywords: ["random unrelated object"],
  },
};

function getCategoryProfile(category?: string | null): ThumbnailCategoryProfile {
  if (!category) return CATEGORY_THUMBNAIL_PROFILES["기타"];
  return CATEGORY_THUMBNAIL_PROFILES[category] ?? CATEGORY_THUMBNAIL_PROFILES["기타"];
}

function buildPollinationsPrompt(title: string, snippet: string, category?: string | null): string {
  const profile = getCategoryProfile(category);
  const parts = [
    `professional blog background image for blog article: "${title}"`,
    `article category: ${profile.koreanLabel}`,
    `visual focus: ${profile.visualFocus}`,
    snippet ? snippet.slice(0, 80) : "",
    profile.promptStyle,
    profile.avoidKeywords?.length ? `avoid: ${profile.avoidKeywords.join(", ")}` : "",
    "background image only, no text, no typography, no letters, no poster layout, no collage, no logo, no watermark",
    "beautiful editorial photography, cinematic composition, relevant subject matter, high quality, 16:9, clean background-friendly composition",
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
  category?: string | null,
): Promise<string> {
  const firstVideo = extractFirstStreamVideoMetaFromHtml(contentHtml);
  if (firstVideo) {
    const { customerCode } = getCloudflareStreamPublicConfig();
    if (customerCode) {
      return buildCloudflareStreamThumbnailUrl(customerCode, firstVideo.uid, {
        time: "0s",
        width: 1200,
        height: 630,
        fit: "crop",
      });
    }
  }

  const snippet = extractDescriptionFromHtml(contentHtml, 200);
  const prompt = buildPollinationsPrompt(title, snippet, category);
  const profile = getCategoryProfile(category);

  // 1. Pollinations AI
  const pollinationsUrl = await tryPollinationsAI(prompt);
  if (pollinationsUrl) return pollinationsUrl;

  // 2. Unsplash Source (카테고리 중심 영어 키워드 우선)
  const normalizedTitle = title.replace(/[ㄱ-ㅎㅏ-ㅣ가-힣]+/g, " ").replace(/\s+/g, " ").trim();
  const keywords = [
    ...profile.englishKeywords,
    normalizedTitle,
  ].filter(Boolean).join(" ");
  const unsplashUrl = await tryUnsplashSource(keywords);
  if (unsplashUrl) return unsplashUrl;

  // 3. Picsum 폴백 (슬러그 seed → 항상 같은 이미지)
  return makePicsumUrl(slug);
}
