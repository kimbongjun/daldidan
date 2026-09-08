import { NextRequest, NextResponse } from "next/server";
import { fetchLotto, getLatestRound, upsertLottoResult, type LottoData } from "@/lib/lotto";

export const runtime = "nodejs";
export const maxDuration = 60;

function checkAuth(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true;
  return request.headers.get("authorization") === `Bearer ${secret}`;
}

async function crawlAndPersist(rounds: number[]) {
  const errors: Record<number, string> = {};
  const saved: LottoData[] = [];

  for (const drwNo of rounds) {
    if (drwNo < 1) continue;
    const result = await fetchLotto(drwNo);
    if (!result.ok) { errors[drwNo] = result.reason; continue; }

    const { error: dbError } = await upsertLottoResult(result.data);
    if (dbError) { errors[drwNo] = `DB 저장 실패: ${dbError.message}`; continue; }
    saved.push(result.data);
  }

  return { saved, errors };
}

// ── 핸들러 ────────────────────────────────────────────────────────────────────

/**
 * GET /api/lotto/crawl?drwNo=1219
 * Vercel Cron이 매주 토요일 21:10 KST(12:10 UTC)에 GET으로 자동 호출한다
 * (Vercel Cron은 항상 GET — POST만 두면 크론이 무동작하므로 GET에서도 저장한다).
 * drwNo 지정 시 해당 회차만, 미지정 시 최신·직전 회차를 크롤링 후 upsert.
 */
export async function GET(request: NextRequest) {
  if (!checkAuth(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const latestRound = getLatestRound();
  const drwNoParam = request.nextUrl.searchParams.get("drwNo");
  const rounds = drwNoParam ? [Number(drwNoParam)] : [latestRound, latestRound - 1];

  const { saved, errors } = await crawlAndPersist(rounds);

  return NextResponse.json(
    {
      ok: saved.length > 0,
      latestRound,
      saved: saved.map((d) => d.drwNo),
      errors,
    },
    { status: saved.length > 0 ? 200 : 502 },
  );
}

/**
 * POST /api/lotto/crawl
 * 수동 실행용 — GET과 동일하게 최신·직전 회차를 크롤링 후 저장한다.
 * Authorization: Bearer {CRON_SECRET} 헤더로 보호.
 */
export async function POST(request: NextRequest) {
  if (!checkAuth(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const latestRound = getLatestRound();
  const { saved, errors } = await crawlAndPersist([latestRound, latestRound - 1]);

  if (saved.length === 0) {
    return NextResponse.json(
      { error: "데이터를 가져오지 못했습니다.", latestRound, errors },
      { status: 502 },
    );
  }

  const first = saved[0];
  return NextResponse.json({
    ok: true,
    drwNo: first.drwNo,
    drwNoDate: first.drwNoDate,
    numbers: [first.drwtNo1, first.drwtNo2, first.drwtNo3, first.drwtNo4, first.drwtNo5, first.drwtNo6],
    bonus: first.bnusNo,
    saved: saved.map((d) => d.drwNo),
    errors,
  });
}
