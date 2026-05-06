import "server-only";

import { buildCloudflareStreamThumbnailUrl, getCloudflareStreamPublicConfig } from "@/lib/cloudflare-stream-public";
import { extractFirstStreamVideoMetaFromHtml } from "@/lib/blog";
import { extractDescriptionFromHtml } from "@/lib/blog-shared";
import { generateBlogAiMetadata } from "@/lib/blog-ai-summary";

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
    "beautiful editorial photography, cinematic composition, relevant subject matter, high quality, 16:9, clean background-friendly composition, text-free image",
  ].filter(Boolean).join(". ");
  return encodeURIComponent(parts);
}

function makePicsumUrl(slug: string): string {
  const seed = slug.replace(/[^a-z0-9]/gi, "").slice(0, 24) || "blog";
  return `https://picsum.photos/seed/${seed}/1200/630`;
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

function toUnsplashSearchTerms(keywords: string[], category?: string | null) {
  const profile = getCategoryProfile(category);
  const koreanKeywords = dedupeKeywords(keywords.filter(hasHangul));
  const latinKeywords = dedupeKeywords(keywords.filter((keyword) => !hasHangul(keyword)));

  const searchTerms = [
    ...latinKeywords,
    ...profile.englishKeywords,
    ...koreanKeywords.flatMap((keyword) => tokenizeKeywords(keyword)),
  ];

  return dedupeKeywords(searchTerms).slice(0, 8).join(" ");
}

function buildUnsplashImageUrl(rawUrl: string) {
  const url = new URL(rawUrl);
  url.searchParams.set("w", "1200");
  url.searchParams.set("h", "630");
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

async function tryUnsplashSearch(keywords: string, category?: string | null): Promise<string | null> {
  const accessKey = process.env.UNSPLASH_ACCESS_KEY?.trim();
  if (!accessKey || !keywords) return null;

  try {
    const profile = getCategoryProfile(category);
    const query = toUnsplashSearchTerms(
      [keywords, ...profile.englishKeywords],
      category,
    );
    if (!query) return null;

    const url = new URL("https://api.unsplash.com/search/photos");
    url.searchParams.set("query", query);
    url.searchParams.set("per_page", "10");
    url.searchParams.set("page", "1");
    url.searchParams.set("orientation", "landscape");
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

// Magnific API: https://api.magnific.ai — requires MAGNIFIC_API_KEY in .env.local
// Endpoint path may need adjustment based on Magnific's current API docs
async function tryMagnificAI(prompt: string): Promise<{ url: string | null; rateLimited: boolean }> {
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
        prompt: decodeURIComponent(prompt),
        width: 1200,
        height: 630,
      }),
      signal: AbortSignal.timeout(30_000),
    });

    if (res.status === 429) return { url: null, rateLimited: true };
    if (!res.ok) return { url: null, rateLimited: false };

    const data = await res.json() as Record<string, unknown>;
    const images = data?.images as { url?: string }[] | undefined;
    const url = images?.[0]?.url ?? (data?.url as string | undefined) ?? null;
    return { url: url ?? null, rateLimited: false };
  } catch {
    return { url: null, rateLimited: false };
  }
}

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
    if (buffer.length < 8_000) return null;

    return res.url;
  } catch {
    return null;
  }
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

  const snippet = options?.summary?.trim() || extractDescriptionFromHtml(contentHtml, 200);
  const metadata = options?.keywords?.length
    ? { summary: snippet, keywords: options.keywords }
    : await generateBlogAiMetadata(title, contentHtml);
  const keywords = buildThumbnailKeywords(title, metadata.summary || snippet, category, metadata.keywords);
  const prompt = buildPollinationsPrompt(title, keywords.join(", "), category);

  // 1. Magnific AI 생성 (고품질, MAGNIFIC_API_KEY 필요)
  const magnific = await tryMagnificAI(prompt);
  if (magnific.url) return magnific.url;

  // 2. Unsplash: Magnific 한도 초과 또는 미설정 시 기존 정책 적용
  const unsplashUrl = await tryUnsplashSearch(keywords.join(" "), category);
  if (unsplashUrl) return unsplashUrl;

  // 3. Pollinations AI (생성형 폴백)
  const pollinationsUrl = await tryPollinationsAI(prompt);
  if (pollinationsUrl) return pollinationsUrl;

  // 4. 마지막 폴백
  return makePicsumUrl(slug);
}
