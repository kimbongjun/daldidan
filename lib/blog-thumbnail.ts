import "server-only";

import { buildCloudflareStreamThumbnailUrl, getCloudflareStreamPublicConfig } from "@/lib/cloudflare-stream-public";
import { extractFirstStreamVideoMetaFromHtml } from "@/lib/blog";
import { extractDescriptionFromHtml } from "@/lib/blog-shared";
import { generateBlogAiMetadata } from "@/lib/blog-ai-summary";
import { createAdminClient } from "@/lib/supabase/server";

// 썸네일 생성 결과 타입
export type ThumbnailResult = {
  url: string;
  prompt: string | null;
  source: "auto_magnific" | "auto_unsplash" | "auto_pollinations" | "auto_picsum" | "stream_video" | "content_image";
};

type ThumbnailCategoryProfile = {
  koreanLabel: string;
  visualFocus: string;
  promptStyle: string;
  englishKeywords: string[];
  avoidKeywords?: string[];
};

type UnsplashPhoto = {
  id: string;
  alt_description: string | null;
  description: string | null;
  blur_hash?: string | null;
  urls: {
    raw: string;
    regular?: string;
  };
  links: {
    download_location: string;
    html: string;
  };
  user?: {
    name?: string;
    username?: string;
  };
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

function sanitizeVisualTopic(value: string) {
  return value
    .replace(/<[^>]+>/g, " ")
    .replace(/["'`]/g, " ")
    .replace(/[^\p{L}\p{N}\s-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 72);
}

// Magnific 전용 프롬프트: 첫 번째 키워드에 집중
function buildMagnificPrompt(firstKeyword: string, category?: string | null): string {
  const profile = getCategoryProfile(category);
  const cleanKeyword = sanitizeVisualTopic(firstKeyword);

  return [
    cleanKeyword,
    `visual style: ${profile.visualFocus}`,
    profile.promptStyle,
    profile.avoidKeywords?.length ? `avoid: ${profile.avoidKeywords.join(", ")}` : "",
    "zero text, zero typography, zero letters, zero words, zero caption, zero signage, zero poster layout, zero logo, zero watermark",
    "do not render Korean, English, numbers, symbols, handwriting, subtitles, overlays, stamps, banners, UI, labels or printed characters",
    "high quality editorial photography, 1:1 square format, cinematic composition, text-free image, mobile-optimized",
  ].filter(Boolean).join(". ");
}

// Pollinations 폴백용 프롬프트 (제목+키워드 조합)
function buildPollinationsPrompt(title: string, snippet: string, category?: string | null): string {
  const profile = getCategoryProfile(category);
  const topic = sanitizeVisualTopic(title);
  const sceneHint = sanitizeVisualTopic(snippet).slice(0, 96);
  const parts = [
    "professional blog background image",
    `article category: ${profile.koreanLabel}`,
    topic ? `visual topic keywords: ${topic}` : "",
    `visual focus: ${profile.visualFocus}`,
    sceneHint ? `scene hint: ${sceneHint}` : "",
    profile.promptStyle,
    profile.avoidKeywords?.length ? `avoid: ${profile.avoidKeywords.join(", ")}` : "",
    "image only, zero text, zero typography, zero letters, zero words, zero caption, zero signage, zero poster layout, zero collage, zero logo, zero watermark",
    "do not render Korean, English, numbers, symbols, handwriting, subtitles, overlays, stamps, banners, UI, labels or printed characters",
    "beautiful editorial photography, cinematic composition, relevant subject matter, high quality, 1:1 square, clean background-friendly composition, text-free image",
  ].filter(Boolean).join(". ");
  return encodeURIComponent(parts);
}

function makePicsumUrl(slug: string): string {
  const seed = slug.replace(/[^a-z0-9]/gi, "").slice(0, 24) || "blog";
  return `https://picsum.photos/seed/${seed}/1200/1200`;
}

function hasHangul(value: string) {
  return /[가-힣]/.test(value);
}

function tokenizeKeywords(value: string) {
  return sanitizeVisualTopic(value)
    .split(/\s+/)
    .map((item) => item.trim())
    .filter((item) => item.length >= 2);
}

function dedupeKeywords(values: string[]) {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const value of values) {
    const keyword = sanitizeVisualTopic(value).slice(0, 32);
    if (!keyword) continue;
    const key = keyword.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(keyword);
  }

  return result;
}

function toUnsplashSearchTerms(firstKeyword: string, category?: string | null) {
  const profile = getCategoryProfile(category);
  const koreanTokens = hasHangul(firstKeyword) ? tokenizeKeywords(firstKeyword) : [];
  const latinTokens = !hasHangul(firstKeyword) ? [firstKeyword] : [];

  const searchTerms = [
    ...latinTokens,
    ...profile.englishKeywords.slice(0, 3),
    ...koreanTokens,
  ];

  return dedupeKeywords(searchTerms).slice(0, 6).join(" ");
}

function buildUnsplashImageUrl(rawUrl: string) {
  const url = new URL(rawUrl);
  url.searchParams.set("w", "1200");
  url.searchParams.set("h", "1200");
  url.searchParams.set("fit", "crop");
  url.searchParams.set("crop", "entropy");
  url.searchParams.set("auto", "format");
  url.searchParams.set("q", "80");
  return url.toString();
}

async function reportUnsplashDownload(downloadLocation: string, accessKey: string) {
  try {
    await fetch(downloadLocation, {
      headers: {
        Authorization: `Client-ID ${accessKey}`,
        "Accept-Version": "v1",
      },
      signal: AbortSignal.timeout(10_000),
    });
  } catch {
    // 다운로드 통계 호출 실패는 썸네일 생성 실패로 보지 않음
  }
}

// Magnific 생성 이미지를 sharp로 리사이즈 후 Supabase Storage에 저장
async function downloadAndStoreMagnificImage(magnifUrl: string, slug: string): Promise<string | null> {
  try {
    const res = await fetch(magnifUrl, { signal: AbortSignal.timeout(30_000) });
    if (!res.ok) return null;

    const buffer = Buffer.from(await res.arrayBuffer());
    if (buffer.length < 8_000) return null;

    const sharpModule = await import("sharp");
    const sharp = sharpModule.default;

    // 최대 가로 1400px, WebP Q=82
    const processed = await sharp(buffer)
      .resize({ width: 1400, withoutEnlargement: true })
      .webp({ quality: 82 })
      .toBuffer();

    const safeSlug = slug.replace(/[^a-z0-9-]/gi, "").slice(0, 24) || "post";
    const filename = `auto/${safeSlug}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}.webp`;

    const admin = createAdminClient();
    const { error } = await admin.storage
      .from("blog-images")
      .upload(filename, processed, { contentType: "image/webp", upsert: false });

    if (error) {
      console.warn("[thumbnail] Supabase 업로드 실패:", error.message);
      return null;
    }

    const { data: { publicUrl } } = admin.storage
      .from("blog-images")
      .getPublicUrl(filename);

    return publicUrl;
  } catch (err) {
    console.warn("[thumbnail] Magnific 이미지 저장 실패:", err);
    return null;
  }
}

// Magnific API: 이미지 생성 후 Supabase Storage에 저장하여 URL 반환
async function tryMagnificAI(prompt: string, slug: string): Promise<{ url: string | null; rateLimited: boolean }> {
  const apiKey = process.env.MAGNIFIC_API_KEY?.trim();
  if (!apiKey) return { url: null, rateLimited: false };

  try {
    const res = await fetch("https://api.magnific.ai/v1/generate", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        prompt,
        width: 1200,
        height: 1200, // 1:1 비율
      }),
      signal: AbortSignal.timeout(30_000),
    });

    if (res.status === 429) return { url: null, rateLimited: true };
    if (!res.ok) return { url: null, rateLimited: false };

    const data = await res.json() as Record<string, unknown>;
    const images = data?.images as { url?: string }[] | undefined;
    const magnifUrl = images?.[0]?.url ?? (data?.url as string | undefined) ?? null;

    if (!magnifUrl) return { url: null, rateLimited: false };

    // Magnific 이미지 → Supabase Storage 저장
    const storedUrl = await downloadAndStoreMagnificImage(magnifUrl, slug);
    return { url: storedUrl, rateLimited: false };
  } catch {
    return { url: null, rateLimited: false };
  }
}

// Unsplash: 1:1(squarish) 방향으로 외부 링크 반환
async function tryUnsplashSearch(firstKeyword: string, category?: string | null): Promise<string | null> {
  const accessKey = process.env.UNSPLASH_ACCESS_KEY?.trim();
  if (!accessKey || !firstKeyword) return null;

  try {
    const query = toUnsplashSearchTerms(firstKeyword, category);
    if (!query) return null;

    const url = new URL("https://api.unsplash.com/search/photos");
    url.searchParams.set("query", query);
    url.searchParams.set("per_page", "10");
    url.searchParams.set("page", "1");
    url.searchParams.set("orientation", "squarish"); // 1:1 비율
    url.searchParams.set("content_filter", "high");
    url.searchParams.set("order_by", "relevant");

    const res = await fetch(url, {
      headers: {
        Authorization: `Client-ID ${accessKey}`,
        "Accept-Version": "v1",
      },
      signal: AbortSignal.timeout(15_000),
    });

    if (!res.ok) return null;

    const data = await res.json() as { results?: UnsplashPhoto[] };
    const photo = data.results?.find((item) => item.urls?.raw && item.links?.download_location);
    if (!photo?.urls?.raw) return null;

    await reportUnsplashDownload(photo.links.download_location, accessKey);
    return buildUnsplashImageUrl(photo.urls.raw);
  } catch {
    return null;
  }
}

async function tryPollinationsAI(prompt: string): Promise<string | null> {
  try {
    const seed = Math.floor(Math.random() * 99_999);
    const url =
      `https://image.pollinations.ai/prompt/${prompt}` +
      `?model=flux&width=1200&height=1200&nologo=true&seed=${seed}`;

    const res = await fetch(url, {
      signal: AbortSignal.timeout(28_000),
      headers: { "User-Agent": "daldidan-blog-thumbnail/1.0" },
    });

    if (!res.ok) return null;

    const contentType = res.headers.get("content-type") ?? "";
    if (!contentType.startsWith("image/")) return null;

    const buffer = Buffer.from(await res.arrayBuffer());
    if (buffer.length < 8_000) return null;

    return res.url;
  } catch {
    return null;
  }
}

// DB에서 기존에 사용된 thumbnail_prompt 목록 조회 (중복 방지)
async function getUsedThumbnailPrompts(): Promise<string[]> {
  try {
    const admin = createAdminClient();
    const { data } = await admin
      .from("blog_posts")
      .select("thumbnail_prompt")
      .not("thumbnail_prompt", "is", null);
    return data?.map((r) => r.thumbnail_prompt as string).filter(Boolean) ?? [];
  } catch {
    return [];
  }
}

// 중복 키워드 방지: 동일 키워드가 이미 사용됐으면 변형 적용
function resolveUniquePrompt(firstKeyword: string, usedPrompts: string[]): string {
  const lower = firstKeyword.toLowerCase().trim();
  const isDuplicate = usedPrompts.some((p) => p.toLowerCase().trim() === lower);
  if (!isDuplicate) return firstKeyword;
  // 중복 시 타임스탬프 suffix로 변형
  return `${firstKeyword} ${Date.now().toString(36).slice(-4)}`;
}

function buildThumbnailKeywords(
  title: string,
  snippet: string,
  category?: string | null,
  aiKeywords?: string[] | null,
) {
  const profile = getCategoryProfile(category);
  return dedupeKeywords([
    ...(aiKeywords ?? []),
    title,
    snippet,
    ...profile.englishKeywords,
  ]);
}

export async function generateAutoThumbnail(
  title: string,
  contentHtml: string,
  slug: string,
  category?: string | null,
  options?: { summary?: string | null; keywords?: string[] | null },
): Promise<ThumbnailResult> {
  // 본문에 Cloudflare Stream 비디오가 있으면 썸네일 추출
  const firstVideo = extractFirstStreamVideoMetaFromHtml(contentHtml);
  if (firstVideo) {
    const { customerCode } = getCloudflareStreamPublicConfig();
    if (customerCode) {
      return {
        url: buildCloudflareStreamThumbnailUrl(customerCode, firstVideo.uid, {
          time: "0s",
          width: 1200,
          height: 1200,
          fit: "crop",
        }),
        prompt: null,
        source: "stream_video",
      };
    }
  }

  const snippet = options?.summary?.trim() || extractDescriptionFromHtml(contentHtml, 200);

  // AI 메타데이터 생성 (이미 제공된 경우 재사용)
  const metadata = options?.keywords?.length
    ? { summary: snippet, keywords: options.keywords }
    : await generateBlogAiMetadata(title, contentHtml);

  // 첫 번째 AI 키워드가 이미지 생성의 핵심 드라이버
  const firstKeyword = metadata.keywords?.[0]?.trim() || sanitizeVisualTopic(title);

  // 기존 사용 프롬프트 조회 후 중복 방지 처리
  const usedPrompts = await getUsedThumbnailPrompts();
  const uniqueKeyword = resolveUniquePrompt(firstKeyword, usedPrompts);

  // 1. Magnific AI — 첫 번째 키워드 기반 프롬프트, 1:1, Supabase Storage 저장
  try {
    const magnifPrompt = buildMagnificPrompt(uniqueKeyword, category);
    const magnific = await tryMagnificAI(magnifPrompt, slug);
    if (magnific.url) {
      return { url: magnific.url, prompt: uniqueKeyword, source: "auto_magnific" };
    }
  } catch (err) {
    console.warn("[thumbnail] Magnific AI failed:", err);
  }

  // 2. Unsplash 폴백 — 첫 번째 키워드 검색, 1:1 비율, 외부 링크
  try {
    const unsplashUrl = await tryUnsplashSearch(uniqueKeyword, category);
    if (unsplashUrl) {
      return { url: unsplashUrl, prompt: uniqueKeyword, source: "auto_unsplash" };
    }
  } catch (err) {
    console.warn("[thumbnail] Unsplash search failed:", err);
  }

  // 3. Pollinations AI 폴백 (제목+키워드 조합 프롬프트)
  try {
    const allKeywords = buildThumbnailKeywords(title, metadata.summary || snippet, category, metadata.keywords);
    const pollinationsPrompt = buildPollinationsPrompt(title, allKeywords.join(", "), category);
    const pollinationsUrl = await tryPollinationsAI(pollinationsPrompt);
    if (pollinationsUrl) {
      return { url: pollinationsUrl, prompt: uniqueKeyword, source: "auto_pollinations" };
    }
  } catch (err) {
    console.warn("[thumbnail] Pollinations AI failed:", err);
  }

  // 4. 마지막 폴백 (항상 유효한 URL 반환 보장)
  return { url: makePicsumUrl(slug), prompt: uniqueKeyword, source: "auto_picsum" };
}
