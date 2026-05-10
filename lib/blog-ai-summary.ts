import { createAnthropicClient } from "@/lib/anthropic";
import { extractDescriptionFromHtml } from "@/lib/blog-shared";

const DEFAULT_BLOG_SUMMARY_MODEL = "claude-haiku-4-5-20251001";
const MAX_SUMMARY_LENGTH = 60;
const MAX_KEYWORDS = 5;
const HANJA_REGEX = /[\u3400-\u4DBF\u4E00-\u9FFF\uF900-\uFAFF]/g;
const KOREAN_TRAILING_PARTICLE_REGEX = /(에서|으로|에게|까지|처럼|보다|마저|조차|부터|한테|하고|과의|과를|과가|으로는|으로도|이랑|랑|은|는|이|가|을|를|과|와|도|만|의|에|로|께|랑)$/u;
const FORBIDDEN_TONE = [
  "씨발", "시발", "병신", "존나", "개같", "개판", "꺼져", "좆", "ㅅㅂ",
  "최악", "망했", "폭망", "후회", "지옥", "한숨", "짜증", "우울", "헬",
];
const KEYWORD_STOPWORDS = new Set([
  "이야기", "기록", "정리", "리뷰", "후기", "생각", "하루", "순간", "모습", "내용",
  "이번", "처음", "정도", "요즘", "천천히", "정말", "조금", "하나", "여기", "거기",
  "그리고", "하지만", "그래서", "아주", "너무", "가장", "여행기",
]);

export type BlogAiMetadata = {
  summary: string;
  keywords: string[];
};

function decodeHtmlEntities(value: string) {
  return value
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, "\"")
    .replace(/&#39;/gi, "'");
}

function normalizeText(value: string) {
  return decodeHtmlEntities(value)
    .replace(/\s+/g, " ")
    .trim();
}

function stripHtmlToPlainText(html: string) {
  return normalizeText(html.replace(/<[^>]+>/g, " "));
}

function stripHtmlToBlocks(html: string) {
  const withLineBreaks = html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|section|article|li|ul|ol|h1|h2|h3|h4|h5|h6|blockquote|pre)>/gi, "\n")
    .replace(/<(p|div|section|article|li|ul|ol|h1|h2|h3|h4|h5|h6|blockquote|pre)[^>]*>/gi, "\n")
    .replace(/<[^>]+>/g, " ");

  return withLineBreaks
    .split("\n")
    .map((block) => normalizeText(block))
    .filter(Boolean);
}

function takeFirstSentence(value: string) {
  const normalized = normalizeText(value);
  if (!normalized) return "";
  const match = normalized.match(/^.*?[.!?]|^.*?[。！？]|^[^.!?。！？]+/u);
  return match?.[0]?.trim() ?? normalized;
}

function dedupeBlocks(blocks: string[]) {
  const seen = new Set<string>();
  return blocks.filter((block) => {
    const key = block.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function buildDigestBlocks(blocks: string[]) {
  if (blocks.length <= 6) return blocks;

  const lastIndex = blocks.length - 1;
  const picks = new Set([
    0,
    1,
    Math.floor(lastIndex * 0.33),
    Math.floor(lastIndex * 0.66),
    lastIndex - 1,
    lastIndex,
  ]);

  return [...picks]
    .filter((index) => index >= 0 && index < blocks.length)
    .sort((a, b) => a - b)
    .map((index) => blocks[index]);
}

function buildSummarySource(title: string, contentHtml: string) {
  const plainText = stripHtmlToPlainText(contentHtml);
  const blocks = dedupeBlocks(stripHtmlToBlocks(contentHtml))
    .filter((block) => block.length >= 12)
    .slice(0, 40);
  const digestBlocks = buildDigestBlocks(blocks);
  const digest = digestBlocks.join("\n- ");

  return {
    plainText,
    digest: digest ? `- ${digest}` : "",
    fallback: extractDescriptionFromHtml(contentHtml),
    cleanedTitle: normalizeText(title),
  };
}

function longestCommonSubstringLength(a: string, b: string) {
  if (!a || !b) return 0;

  const prev = new Array<number>(b.length + 1).fill(0);
  const next = new Array<number>(b.length + 1).fill(0);
  let max = 0;

  for (let i = 1; i <= a.length; i += 1) {
    for (let j = 1; j <= b.length; j += 1) {
      if (a[i - 1] === b[j - 1]) {
        next[j] = prev[j - 1] + 1;
        max = Math.max(max, next[j]);
      } else {
        next[j] = 0;
      }
    }

    prev.splice(0, prev.length, ...next);
    next.fill(0);
  }

  return max;
}

export function isLikelyCopiedSummary(summary: string, sourceText: string) {
  const normalizedSummary = normalizeText(summary);
  const normalizedSource = normalizeText(sourceText);

  if (!normalizedSummary) return true;
  if (normalizedSummary.length >= 18 && normalizedSource.includes(normalizedSummary)) return true;

  const summaryTokens = normalizedSummary.split(" ").filter((token) => token.length >= 2);
  if (summaryTokens.length === 0) return false;

  const matchedTokens = summaryTokens.filter((token) => normalizedSource.includes(token)).length;
  if (matchedTokens / summaryTokens.length >= 1.0 && normalizedSummary.length >= 40) return true;

  const commonSpan = longestCommonSubstringLength(normalizedSummary, normalizedSource);
  return commonSpan >= Math.max(24, Math.floor(normalizedSummary.length * 0.6));
}

function containsForbiddenTone(text: string) {
  return FORBIDDEN_TONE.some((word) => text.includes(word));
}

function buildHumorousSummary(title: string, keywords: string[]) {
  const topic = normalizeText(title).replace(/[.!?]+$/g, "").slice(0, 24) || "이 글";
  const picks = keywords.filter(Boolean).slice(0, 2);

  if (picks.length >= 2) {
    return sanitizeBlogAiSummary(`${picks[0]}와 ${picks[1]}을 담아낸 ${topic}의 기록.`, "");
  }

  if (picks.length === 1) {
    return sanitizeBlogAiSummary(`${picks[0]}에 관한 ${topic}의 소소한 한 페이지.`, "");
  }

  return sanitizeBlogAiSummary(`오늘도 담담하게 기록해 둔 ${topic}의 이야기.`, "");
}

function extractKoreanNouns(value: string) {
  const matches = normalizeText(value).match(/[가-힣]{2,}/g) ?? [];
  return [...new Set(matches)];
}

function extractEnglishKeywords(value: string) {
  const matches = normalizeText(value.toLowerCase()).match(/[a-z][a-z\s-]{2,}/g) ?? [];
  return [...new Set(matches.map((item) => item.trim()).filter(Boolean))];
}

function normalizeKeyword(value: string) {
  const normalized = normalizeText(value)
    .replace(/^[-,•\d.\s]+/, "")
    .replace(HANJA_REGEX, "")
    .replace(/[^\p{L}\p{N}\s-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 32);

  if (/^[가-힣]{2,}$/u.test(normalized)) {
    return normalized.replace(KOREAN_TRAILING_PARTICLE_REGEX, "").trim();
  }

  return normalized;
}

function uniqueKeywords(values: string[]) {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const value of values) {
    const normalized = normalizeKeyword(value);
    if (!normalized) continue;
    if (KEYWORD_STOPWORDS.has(normalized)) continue;
    if (/^(하다|했다|입니다|있다|없다|됐다|같다)$/u.test(normalized)) continue;
    if (/^[가-힣]$/u.test(normalized)) continue;

    const key = normalized.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(normalized);

    if (result.length >= MAX_KEYWORDS) break;
  }

  return result;
}

export function sanitizeBlogAiSummary(summary: string, fallback: string) {
  const normalized = normalizeText(summary)
    .replace(/^["'\s]+|["'\s]+$/g, "")
    .replace(HANJA_REGEX, "")
    .trim();

  const singleSentence = takeFirstSentence(normalized);
  const fallbackSentence = takeFirstSentence(fallback);

  if (!singleSentence || containsForbiddenTone(singleSentence)) {
    return takeFirstSentence(fallbackSentence);
  }

  // 문장이 MAX_SUMMARY_LENGTH 이하면 그대로, 초과하면 문장 경계에서 자름
  if (Array.from(singleSentence).length <= MAX_SUMMARY_LENGTH) {
    return singleSentence || takeFirstSentence(fallbackSentence);
  }
  const chars = Array.from(singleSentence).slice(0, MAX_SUMMARY_LENGTH).join("");
  const boundaryMatch = chars.match(/^.*[.!?]/u);
  return (boundaryMatch ? boundaryMatch[0] : chars).trim() || takeFirstSentence(fallbackSentence);
}

function parseMetadataResponse(content: string) {
  const normalized = normalizeText(content);
  const summaryMatch = normalized.match(/SUMMARY\s*:\s*(.+?)(?=\s+KEYWORDS\s*:|$)/i);
  const keywordsMatch = normalized.match(/KEYWORDS\s*:\s*(.+)$/i);

  return {
    summary: summaryMatch?.[1]?.trim() ?? "",
    keywords: keywordsMatch?.[1]
      ?.split(/[,|/]/)
      .map((item) => item.trim())
      .filter(Boolean) ?? [],
  };
}

function buildFallbackKeywords(title: string, fallback: string) {
  return uniqueKeywords([
    ...extractKoreanNouns(title),
    ...extractEnglishKeywords(title),
    ...extractKoreanNouns(fallback),
    ...extractEnglishKeywords(fallback),
  ]);
}

function sanitizeKeywords(keywords: string[], title: string, fallback: string) {
  const normalized = uniqueKeywords(keywords);
  if (normalized.length > 0) return normalized;
  return buildFallbackKeywords(title, fallback);
}

async function requestBlogAiMetadata(
  title: string,
  bodyText: string,
  anthropic: ReturnType<typeof createAnthropicClient>["client"],
  model: string,
  category?: string | null,
) {
  const categoryLine = category ? `카테고리: ${category}` : "";

  const message = await anthropic.messages.create({
    model,
    system: [
      "당신은 블로그 글을 깊이 읽고 핵심 가치를 한 문장으로 표현하는 전문 에디터입니다.",
      "",
      "요약 원칙:",
      "- 글 전체의 흐름과 필자의 의도를 파악해 자신의 언어로 재구성하세요.",
      "- 본문의 문장을 그대로 복사하거나 단어만 나열하는 방식은 절대 금지입니다.",
      "- 마침표로 끝나는 완성된 한 문장만 작성하세요.",
      "- 자연스러운 한국어 문어체로, 번역투(~에 대한, ~을 하는 것)는 쓰지 마세요.",
      "- 공백 포함 40~60자 내외로 작성하세요.",
      "",
      "좋은 예: '직접 발로 뛰며 찾아낸 제주 숨은 카페 세 곳의 솔직한 방문 소감을 담았습니다.'",
      "나쁜 예: '제주 카페 여행 숨은 카페 추천 방문 후기.' (키워드 나열)",
      "",
      "아래 형식으로만 응답하세요:",
      "SUMMARY: (한 문장)",
      "KEYWORDS: (명사 키워드 3~5개, 쉼표 구분)",
    ].join("\n"),
    messages: [
      {
        role: "user",
        content: [
          `제목: ${title}`,
          categoryLine,
          "",
          "본문:",
          bodyText,
          "",
          "이 글의 핵심 주제와 필자의 의도를 파악해 자연스러운 한 문장으로 요약해주세요.",
        ].filter(Boolean).join("\n"),
      },
    ],
    temperature: 1.0,
    max_tokens: 200,
  });

  const block = message.content[0];
  return block?.type === "text" ? block.text : "";
}

export async function generateBlogAiMetadata(
  title: string,
  contentHtml: string,
  category?: string | null,
): Promise<BlogAiMetadata> {
  const { plainText, fallback, cleanedTitle } = buildSummarySource(title, contentHtml);
  const plainTextSlice = plainText.slice(0, 5000);
  const fallbackKeywords = buildFallbackKeywords(cleanedTitle, fallback);
  const fallbackSummary = buildHumorousSummary(cleanedTitle, fallbackKeywords);

  if (!plainTextSlice) {
    return {
      summary: fallbackSummary,
      keywords: fallbackKeywords,
    };
  }

  try {
    const configuredModel =
      process.env.ANTHROPIC_BLOG_SUMMARY_MODEL?.trim()
      || DEFAULT_BLOG_SUMMARY_MODEL;
    const { client: anthropic, model } = createAnthropicClient({ model: configuredModel });

    const firstPass = parseMetadataResponse(
      await requestBlogAiMetadata(cleanedTitle, plainTextSlice, anthropic, model, category),
    );
    const firstSummary = sanitizeBlogAiSummary(firstPass.summary, fallbackSummary);

    if (!isLikelyCopiedSummary(firstSummary, plainTextSlice)) {
      return {
        summary: firstSummary,
        keywords: sanitizeKeywords(firstPass.keywords, cleanedTitle, fallback),
      };
    }

    const secondPass = parseMetadataResponse(
      await requestBlogAiMetadata(`${cleanedTitle} (다른 각도로 재해석해서 요약)`, plainTextSlice, anthropic, model, category),
    );
    const secondSummary = sanitizeBlogAiSummary(secondPass.summary, fallbackSummary);

    if (!isLikelyCopiedSummary(secondSummary, plainTextSlice)) {
      return {
        summary: secondSummary,
        keywords: sanitizeKeywords(secondPass.keywords, cleanedTitle, fallback),
      };
    }

    const repairedKeywords = sanitizeKeywords(secondPass.keywords, cleanedTitle, fallback);
    return {
      summary: buildHumorousSummary(cleanedTitle, repairedKeywords),
      keywords: repairedKeywords,
    };
  } catch {
    return {
      summary: buildHumorousSummary(cleanedTitle, fallbackKeywords),
      keywords: fallbackKeywords,
    };
  }
}

export async function generateBlogAiSummary(title: string, contentHtml: string) {
  const metadata = await generateBlogAiMetadata(title, contentHtml);
  return metadata.summary;
}
