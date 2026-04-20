import { NextRequest, NextResponse } from "next/server";
import Groq from "groq-sdk";

export type SummaryTarget = "blog" | "budget";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY ?? "" });

const PROMPTS: Record<SummaryTarget, (items: string[]) => string> = {
  blog: (titles) =>
    `다음은 최근 블로그 글 제목 목록입니다:\n${titles.map((t, i) => `${i + 1}. ${t}`).join("\n")}\n\n이 글들을 보고 블로그 전체 분위기를 유머러스하게 20자 이내로 한 줄 요약해주세요. 문장 부호 제외하고 텍스트만 반환하세요.`,
  budget: (entries) =>
    `다음은 최근 가계부 내역 목록입니다:\n${entries.map((t, i) => `${i + 1}. ${t}`).join("\n")}\n\n이 소비 패턴을 보고 가계부 전체 분위기를 유머러스하게 20자 이내로 한 줄 요약해주세요. 문장 부호 제외하고 텍스트만 반환하세요.`,
};

// 캐시: target → { summary, generatedAt }
const cache = new Map<string, { summary: string; generatedAt: number }>();
const CACHE_TTL = 10 * 60 * 1000; // 10분

export async function POST(request: NextRequest) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "GROQ_API_KEY가 설정되지 않았습니다." }, { status: 500 });
  }

  const body = await request.json() as { target: SummaryTarget; items: string[] };
  const { target, items } = body;

  if (!target || !items?.length) {
    return NextResponse.json({ error: "target과 items가 필요합니다." }, { status: 400 });
  }

  // 캐시 키: target + items 해시
  const cacheKey = `${target}:${items.join("|")}`;
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.generatedAt < CACHE_TTL) {
    return NextResponse.json({ summary: cached.summary });
  }

  try {
    const completion = await groq.chat.completions.create({
      model: "llama-3.1-8b-instant",
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
  } catch {
    return NextResponse.json({ error: "요약 생성에 실패했습니다." }, { status: 500 });
  }
}
