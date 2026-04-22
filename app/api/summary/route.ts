import { NextRequest, NextResponse } from "next/server";
import { createGroqClient } from "@/lib/groq";

export type SummaryTarget = "blog" | "budget";

const PROMPTS: Record<SummaryTarget, (items: string[]) => string> = {
  blog: (titles) =>
    `다음은 최근 블로그 글 제목 목록입니다:\n${titles.map((t, i) => `${i + 1}. ${t}`).join("\n")}\n\n이 글들을 보고 블로그 전체 분위기를 유머러스하게 20자 이내로 한 줄 요약해주세요. 문장 부호 제외하고 텍스트만 반환하세요.`,
  budget: (entries) =>
    `다음은 최근 가계부 내역 목록입니다:\n${entries.map((t, i) => `${i + 1}. ${t}`).join("\n")}\n\n이 소비 패턴을 보고 가계부 전체 분위기를 유머러스하게 20자 이내로 한 줄 요약해주세요. 문장 부호 제외하고 텍스트만 반환하세요.`,
};

// 캐시: target → { summary, generatedAt }
const cache = new Map<string, { summary: string; generatedAt: number }>();
const CACHE_TTL = 10 * 60 * 1000; // 10분

function isSummaryTarget(value: unknown): value is SummaryTarget {
  return value === "blog" || value === "budget";
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

  let groq;
  let model;
  try {
    ({ client: groq, model } = createGroqClient());
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Groq 설정이 올바르지 않습니다." },
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
    const completion = await groq.chat.completions.create({
      model,
      messages: [
        { role: "system", content: "당신은 재치 있는 한국어 카피라이터입니다. 요청한 텍스트만 반환하고 부연 설명은 하지 마세요." },
        { role: "user", content: PROMPTS[target](items.slice(0, 10)) },
      ],
      temperature: 0.9,
      max_tokens: 60,
    });

    const summary = (completion.choices[0]?.message?.content ?? "").trim().replace(/^"|"$/g, "");
    cache.set(cacheKey, { summary, generatedAt: Date.now() });

    return NextResponse.json({ summary });
  } catch (e) {
    console.error("[summary] Groq 호출 실패:", e);
    return NextResponse.json({ error: "요약 생성에 실패했습니다." }, { status: 500 });
  }
}
