import { createGroqClient } from "@/lib/groq";
import { extractDescriptionFromHtml } from "@/lib/blog-shared";

const DEFAULT_BLOG_SUMMARY_MODEL = "gemma2-9b-it";
const MAX_SUMMARY_LENGTH = 70;
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
  if (matchedTokens / summaryTokens.length >= 0.9 && normalizedSummary.length >= 40) return true;

  const commonSpan = longestCommonSubstringLength(normalizedSummary, normalizedSource);
  return commonSpan >= Math.max(18, Math.floor(normalizedSummary.length * 0.45));
}

function containsForbiddenTone(text: string) {
  return FORBIDDEN_TONE.some((word) => text.includes(word));
}

function buildHumorousSummary(title: string, keywords: string[]) {
  const topic = normalizeText(title).replace(/[.!?]+$/g, "").slice(0, 36) || "이 글";
  const picks = keywords.filter(Boolean).slice(0, 2);

  if (picks.length >= 2) {
    return sanitizeBlogAiSummary(`${picks[0]}와 ${picks[1]} 사이를 오가며 ${topic}의 맛을 유쾌하게 풀어낸 글입니다.`, "");
  }

  if (picks.length === 1) {
    return sanitizeBlogAiSummary(`${picks[0]}를 중심으로 ${topic}의 흐름을 재치 있게 엮어낸 글입니다.`, "");
  }

  return sanitizeBlogAiSummary(`${topic}의 흐름과 분위기를 한 번 더 웃음기 있게 풀어낸 글입니다.`, "");
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

  return singleSentence.slice(0, MAX_SUMMARY_LENGTH) || takeFirstSentence(fallbackSentence);
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
  digest: string,
  groq: ReturnType<typeof createGroqClient>["client"],
  model: string,
) {
  const completion = await groq.chat.completions.create({
    model,
    messages: [
      {
        role: "system",
        content: [
          "당신은 한국어 블로그 편집자이자 재치 있는 카피라이터입니다.",
          "글을 읽고 핵심 내용을 새롭게 해석해 유쾌하고 해학적인 한 줄 요약을 만드세요.",
          "본문 문장을 그대로 복사하지 말고, 의미를 다시 엮어 자연스럽게 표현하세요.",
          "비꼼, 독설, 냉소, 비속어, 과한 부정은 금지합니다.",
          "반드시 아래 형식만 반환하세요.",
          "SUMMARY: 45~70자 한 문장",
          "KEYWORDS: 썸네일 검색용 핵심 키워드 3~5개, 쉼표로 구분",
        ].join(" "),
      },
      {
        role: "user",
        content: [
          `제목: ${title}`,
          "",
          "글에서 추린 핵심 단락:",
          digest,
          "",
          "요약 조건:",
          "- 글의 주제와 흐름이 함께 드러날 것",
          "- 독자가 미소 지을 만큼 가볍고 유머러스할 것",
          "- 본문 표현을 그대로 옮기지 말 것",
          "- 키워드는 이미지 검색에 바로 쓸 수 있게 명사 중심으로 만들 것",
        ].join("\n"),
      },
    ],
    temperature: 0.8,
    max_tokens: 180,
  });

  return completion.choices[0]?.message?.content ?? "";
}

export async function generateBlogAiMetadata(title: string, contentHtml: string): Promise<BlogAiMetadata> {
  const { plainText, digest, fallback, cleanedTitle } = buildSummarySource(title, contentHtml);
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
      process.env.GROQ_BLOG_SUMMARY_MODEL?.trim()
      || process.env.GROQ_GEMMA_MODEL?.trim()
      || DEFAULT_BLOG_SUMMARY_MODEL;
    const { client: groq, model } = createGroqClient({ model: configuredModel });

    const firstPass = parseMetadataResponse(
      await requestBlogAiMetadata(cleanedTitle, digest || `- ${plainTextSlice}`, groq, model),
    );
    const firstSummary = sanitizeBlogAiSummary(firstPass.summary, fallbackSummary);

    if (!isLikelyCopiedSummary(firstSummary, plainTextSlice)) {
      return {
        summary: firstSummary,
        keywords: sanitizeKeywords(firstPass.keywords, cleanedTitle, fallback),
      };
    }

    const secondPass = parseMetadataResponse(
      await requestBlogAiMetadata(`${cleanedTitle} (요약은 반드시 재서술)`, digest || `- ${plainTextSlice}`, groq, model),
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
