import { NextRequest, NextResponse } from "next/server";
import { createAnthropicClient } from "@/lib/anthropic";

export type SummaryTarget = "blog" | "budget";

const PROMPTS: Record<SummaryTarget, (items: string[]) => string> = {
  blog: (titles) =>
    `다음은 최근 블로그 글 제목 목록입니다:\n${titles.map((t, i) => `${i + 1}. ${t}`).join("\n")}\n\n이 글들이 어떤 주제들을 다루고 있는지 따뜻하고 자연스럽게 30자 이내로 한 줄로 요약해주세요. 비속어, 한자, 냉소, 과장된 부정 표현은 사용하지 말고 한글과 숫자와 공백만 사용하세요. 문장 부호 제외하고 텍스트만 반환하세요.`,
  budget: (entries) =>
    `다음은 최근 가계부 내역 목록입니다:\n${entries.map((t, i) => `${i + 1}. ${t}`).join("\n")}\n\n이 소비 패턴을 보고 가계부 전체 분위기를 다정하고 산뜻하게 20자 이내로 한 줄 요약해주세요. 비속어, 한자, 냉소, 자조, 과장된 부정 표현은 사용하지 말고 한글과 숫자와 공백만 사용하세요. 문장 부호 제외하고 텍스트만 반환하세요.`,
};

// 캐시: target → { summary, generatedAt }
const cache = new Map<string, { summary: string; generatedAt: number }>();
const CACHE_TTL = 10 * 60 * 1000; // 10분
const HANJA_REGEX = /[\u3400-\u4DBF\u4E00-\u9FFF\uF900-\uFAFF]/g;
const BUDGET_PROFANITY = [
  "씨발", "시발", "병신", "존나", "개같", "개판", "꺼져", "미친", "염병", "좆", "ㅅㅂ",
];
const BUDGET_NEGATIVE = [
  "최악", "망했", "폭망", "거지", "빚", "파산", "한숨", "짜증", "우울", "불안", "후회",
  "막막", "지옥", "헬", "죽겠", "고통", "스트레스", "절망", "답답", "눈물", "화난", "분노",
];
const SAFE_BUDGET_FALLBACKS = [
  "차근차근 잘 챙기는 중",
  "균형 있게 기록하는 중",
  "알뜰한 흐름이 보여요",
  "차분하게 쌓이는 소비 기록",
];
const SAFE_BLOG_FALLBACKS = [
  "다양한 주제를 담은 기록들",
  "일상과 생각을 나눈 글들",
  "삶의 이야기를 담은 블로그",
  "소소하지만 따뜻한 기록들",
];

function isSummaryTarget(value: unknown): value is SummaryTarget {
  return value === "blog" || value === "budget";
}

function limitTextLength(value: string, maxLength: number) {
  return Array.from(value).slice(0, maxLength).join("").trim();
}

function containsForbiddenWord(text: string, forbiddenWords: string[]) {
  return forbiddenWords.some((word) => text.includes(word));
}

function normalizeSummaryText(summary: string): string {
  return summary
    .replace(/^"|"$/g, "")
    .replace(HANJA_REGEX, "")
    .replace(/[^0-9A-Za-z가-힣\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function sanitizeBudgetSummary(summary: string, items: string[]) {
  const normalized = normalizeSummaryText(summary);

  const hasForbiddenTone =
    !normalized ||
    containsForbiddenWord(normalized, BUDGET_PROFANITY) ||
    containsForbiddenWord(normalized, BUDGET_NEGATIVE);

  if (hasForbiddenTone) {
    const fallbackIndex = items.join("|").length % SAFE_BUDGET_FALLBACKS.length;
    return SAFE_BUDGET_FALLBACKS[fallbackIndex];
  }

  return limitTextLength(normalized, 20);
}

function sanitizeBlogSummary(summary: string, items: string[]) {
  const normalized = normalizeSummaryText(summary);

  const hasForbiddenTone =
    !normalized ||
    containsForbiddenWord(normalized, BUDGET_PROFANITY) ||
    containsForbiddenWord(normalized, BUDGET_NEGATIVE);

  if (hasForbiddenTone) {
    const fallbackIndex = items.join("|").length % SAFE_BLOG_FALLBACKS.length;
    return SAFE_BLOG_FALLBACKS[fallbackIndex];
  }

  return limitTextLength(normalized, 30);
}

function sanitizeSummary(target: SummaryTarget, summary: string, items: string[]) {
  if (target === "budget") return sanitizeBudgetSummary(summary, items);
  if (target === "blog") return sanitizeBlogSummary(summary, items);
  return limitTextLength(summary.replace(/^"|"$/g, "").trim(), 20);
}

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json() as unknown;
  } catch {
    return NextResponse.json({ error: "요청 본문이 올바른 JSON 형식이 아닙니다." }, { status: 400 });
  }

  const target = (body as { target?: unknown })?.target;
  const rawItems = (body as { items?: unknown })?.items;

  if (!isSummaryTarget(target) || !Array.isArray(rawItems) || rawItems.length === 0) {
    return NextResponse.json({ error: "target과 items가 필요합니다." }, { status: 400 });
  }

  const items = rawItems.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
  if (items.length === 0) {
    return NextResponse.json({ error: "items에는 비어 있지 않은 문자열이 필요합니다." }, { status: 400 });
  }

  let anthropic;
  let model;
  try {
    ({ client: anthropic, model } = createAnthropicClient());
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Anthropic 설정이 올바르지 않습니다." },
      { status: 500 },
    );
  }

  // 캐시 키: target + items 해시
  const cacheKey = `${target}:${items.join("|")}`;
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.generatedAt < CACHE_TTL) {
    return NextResponse.json({ summary: cached.summary });
  }

  try {
    const message = await anthropic.messages.create({
      model,
      system: "당신은 친근하고 따뜻한 한국어 요약 전문가입니다. 요청한 텍스트만 반환하고 부연 설명은 하지 마세요. 공격적이거나 불쾌한 표현은 쓰지 마세요.",
      messages: [
        { role: "user", content: PROMPTS[target](items.slice(0, 10)) },
      ],
      temperature: 0.9,
      max_tokens: 80,
    });

    const block = message.content[0];
    const raw = block?.type === "text" ? block.text : "";
    const summary = sanitizeSummary(target, raw, items);
    cache.set(cacheKey, { summary, generatedAt: Date.now() });

    return NextResponse.json({ summary });
  } catch (e) {
    console.error("[summary] Claude 호출 실패:", e);
    return NextResponse.json({ error: "요약 생성에 실패했습니다." }, { status: 500 });
  }
}
