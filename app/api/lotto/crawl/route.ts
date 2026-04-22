import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const DHLOTTERY_URL = "https://www.dhlottery.co.kr/common.do?method=getLottoNumber&drwNo=";
const HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  "Accept": "application/json, text/plain, */*",
  "Accept-Language": "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7",
  "Referer": "https://www.dhlottery.co.kr/gameResult.do?method=byWin",
};

interface DhlotteryResponse {
  returnValue: string;
  drwNo: number;
  drwNoDate: string;
  drwtNo1: number;
  drwtNo2: number;
  drwtNo3: number;
  drwtNo4: number;
  drwtNo5: number;
  drwtNo6: number;
  bnusNo: number;
  firstWinamnt: number;
  firstPrzwnerCo: number;
  firstAccumAmnt: number;
}

function isDhlotteryResponse(obj: unknown): obj is DhlotteryResponse {
  if (typeof obj !== "object" || obj === null) return false;
  const r = obj as Record<string, unknown>;
  return r.returnValue === "success" && typeof r.drwNo === "number" && typeof r.drwtNo1 === "number";
}

// 1회 추첨: 2002-12-07 20:45 KST
function getLatestRound(): number {
  const firstDrawMs = new Date("2002-12-07T20:45:00+09:00").getTime();
  const elapsed = Date.now() - firstDrawMs;
  if (elapsed < 0) return 1;
  return Math.floor(elapsed / (7 * 24 * 60 * 60 * 1000)) + 1;
}

async function fetchRound(drwNo: number): Promise<DhlotteryResponse | null> {
  try {
    const res = await fetch(DHLOTTERY_URL + drwNo, {
      signal: AbortSignal.timeout(10000),
      cache: "no-store",
      headers: HEADERS,
    });
    if (!res.ok) return null;
    const data: unknown = await res.json();
    return isDhlotteryResponse(data) ? data : null;
  } catch {
    return null;
  }
}

/**
 * POST /api/lotto/crawl
 * 동행복권에서 최신 당첨번호를 가져와 Supabase에 저장한다.
 * Vercel Cron이 매주 토요일 21:10 KST(12:10 UTC)에 자동 호출.
 * Authorization: Bearer {CRON_SECRET} 헤더로 보호.
 */
export async function POST(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const latestRound = getLatestRound();

  // 최신 회차 시도, 아직 발표 전이면 직전 회차로 폴백
  const data = (await fetchRound(latestRound)) ?? (await fetchRound(latestRound - 1));

  if (!data) {
    return NextResponse.json(
      { error: "동행복권 API에서 데이터를 가져오지 못했습니다." },
      { status: 502 },
    );
  }

  const supabase = createAdminClient();
  const { error } = await supabase.from("lotto_results").upsert(
    {
      drw_no: data.drwNo,
      drw_no_date: data.drwNoDate,
      drw_no1: data.drwtNo1,
      drw_no2: data.drwtNo2,
      drw_no3: data.drwtNo3,
      drw_no4: data.drwtNo4,
      drw_no5: data.drwtNo5,
      drw_no6: data.drwtNo6,
      drw_no_bonus_no: data.bnusNo,
      first_win_cnt: data.firstPrzwnerCo,
      first_win_amnt: data.firstWinamnt,
      first_accum_prize_r: data.firstAccumAmnt,
    },
    { onConflict: "drw_no" },
  );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    drwNo: data.drwNo,
    drwNoDate: data.drwNoDate,
    numbers: [data.drwtNo1, data.drwtNo2, data.drwtNo3, data.drwtNo4, data.drwtNo5, data.drwtNo6],
    bonus: data.bnusNo,
  });
}
