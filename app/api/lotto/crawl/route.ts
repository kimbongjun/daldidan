import { NextRequest, NextResponse } from "next/server";
import { fetchLotto, getLatestRound, upsertLottoResult } from "@/lib/lotto";

export const runtime = "nodejs";

function checkAuth(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true;
  return request.headers.get("authorization") === `Bearer ${secret}`;
}

// ── 핸들러 ────────────────────────────────────────────────────────────────────

/**
 * GET /api/lotto/crawl?drwNo=1219
 * 진단용 — 특정 회차를 테스트하고 상세 결과를 반환한다.
 */
export async function GET(request: NextRequest) {
  if (!checkAuth(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const latestRound = getLatestRound();
  const drwNo = Number(request.nextUrl.searchParams.get("drwNo") ?? latestRound);
  const result = await fetchLotto(drwNo);

  return NextResponse.json(
    { drwNo, latestRound, ...result },
    { status: result.ok ? 200 : 502 },
  );
}

/**
 * POST /api/lotto/crawl
 * Vercel Cron이 매주 토요일 21:10 KST(12:10 UTC)에 자동 호출.
 * Authorization: Bearer {CRON_SECRET} 헤더로 보호.
 */
export async function POST(request: NextRequest) {
  if (!checkAuth(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const latestRound = getLatestRound();
  const errors: Record<number, string> = {};

  for (const drwNo of [latestRound, latestRound - 1]) {
    const result = await fetchLotto(drwNo);
    if (!result.ok) { errors[drwNo] = result.reason; continue; }

    const { error: dbError } = await upsertLottoResult(result.data);
    if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 });

    return NextResponse.json({
      ok: true,
      drwNo: result.data.drwNo,
      drwNoDate: result.data.drwNoDate,
      numbers: [result.data.drwtNo1, result.data.drwtNo2, result.data.drwtNo3, result.data.drwtNo4, result.data.drwtNo5, result.data.drwtNo6],
      bonus: result.data.bnusNo,
    });
  }

  return NextResponse.json(
    { error: "데이터를 가져오지 못했습니다.", latestRound, errors },
    { status: 502 },
  );
}
