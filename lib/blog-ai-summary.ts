import { createGroqClient } from "@/lib/groq";
import { extractDescriptionFromHtml } from "@/lib/blog-shared";

const DEFAULT_BLOG_SUMMARY_MODEL = "gemma2-9b-it";
const MAX_SUMMARY_LENGTH = 70;

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

  const picks = new Set<number>();
  const lastIndex = blocks.length - 1;
  const anchors = [0, 1, Math.floor(lastIndex * 0.33), Math.floor(lastIndex * 0.66), lastIndex - 1, lastIndex];

  for (const index of anchors) {
    if (index >= 0 && index < blocks.length) {
      picks.add(index);
    }
  }

  return [...picks]
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
    blocks,
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

function buildHeuristicSummary(title: string) {
  const topic = normalizeText(title).replace(/[.!?]+$/g, "").slice(0, 40) || "이 글";
  return `${topic}의 핵심 내용과 흐름을 간단히 정리한 글입니다.`;
}

export function sanitizeBlogAiSummary(summary: string, fallback: string) {
  const normalized = normalizeText(summary)
    .replace(/^["'\s]+|["'\s]+$/g, "")
    .trim();

  const singleSentence = takeFirstSentence(normalized);
  const fallbackSentence = takeFirstSentence(fallback);

  if (!singleSentence) {
    return fallbackSentence;
  }

  return singleSentence.slice(0, MAX_SUMMARY_LENGTH) || fallbackSentence;
}

async function requestSummary(
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
          "당신은 한국어 블로그 편집자입니다.",
          "글의 의도와 핵심 내용을 이해한 뒤 독자가 빠르게 파악할 수 있게 한 문장으로 요약하세요.",
          "본문 문장을 그대로 복사하지 말고, 의미를 재구성해서 자연스러운 한국어로 다시 써주세요.",
          "출력은 45~70자 사이의 요약문 한 문장만 반환하세요.",
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
          "- 글의 주제, 흐름, 핵심 포인트를 함께 반영할 것",
          "- 본문 표현을 그대로 옮기지 말 것",
          "- 군더더기 설명이나 머리말 없이 요약문만 반환할 것",
        ].join("\n"),
      },
    ],
    temperature: 0.2,
    max_tokens: 140,
  });

  return completion.choices[0]?.message?.content ?? "";
}

export async function generateBlogAiSummary(title: string, contentHtml: string) {
  const { plainText, digest, fallback, cleanedTitle } = buildSummarySource(title, contentHtml);
  const plainTextSlice = plainText.slice(0, 5000);

  if (!plainTextSlice) {
    return sanitizeBlogAiSummary(buildHeuristicSummary(cleanedTitle), fallback);
  }

  try {
    const configuredModel =
      process.env.GROQ_BLOG_SUMMARY_MODEL?.trim()
      || process.env.GROQ_GEMMA_MODEL?.trim()
      || DEFAULT_BLOG_SUMMARY_MODEL;
    const { client: groq, model } = createGroqClient({ model: configuredModel });
    const firstPass = sanitizeBlogAiSummary(
      await requestSummary(cleanedTitle, digest || `- ${plainTextSlice}`, groq, model),
      fallback,
    );

    if (!isLikelyCopiedSummary(firstPass, plainTextSlice)) {
      return firstPass;
    }

    const recoveryDigest = digest || `- ${plainTextSlice}`;
    const secondPass = sanitizeBlogAiSummary(
      await requestSummary(`${cleanedTitle} (문장 재서술 필수)`, recoveryDigest, groq, model),
      fallback,
    );

    if (!isLikelyCopiedSummary(secondPass, plainTextSlice)) {
      return secondPass;
    }

    return sanitizeBlogAiSummary(buildHeuristicSummary(cleanedTitle), fallback);
  } catch {
    return sanitizeBlogAiSummary(buildHeuristicSummary(cleanedTitle), fallback);
  }
}
