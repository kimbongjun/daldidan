import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

export const revalidate = 300;

export interface LottoLatestResponse {
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
  return (
    r.returnValue === "success" &&
    typeof r.drwNo === "number" &&
    typeof r.drwtNo1 === "number"
  );
}

// 1회 추첨: 2002-12-07 20:45 KST — 추첨 시각 기준으로 회차 계산
function getLatestRound(): number {
  const firstDrawMs = new Date("2002-12-07T20:45:00+09:00").getTime();
  const elapsed = Date.now() - firstDrawMs;
  if (elapsed < 0) return 1;
  return Math.floor(elapsed / (7 * 24 * 60 * 60 * 1000)) + 1;
}

async function fetchFromDhlottery(drwNo: number): Promise<LottoLatestResponse | null> {
  try {
    const res = await fetch(
      `https://www.dhlottery.co.kr/common.do?method=getLottoNumber&drwNo=${drwNo}`,
      {
        signal: AbortSignal.timeout(10000),
        cache: "no-store",
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
          "Accept": "application/json, text/plain, */*",
          "Accept-Language": "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7",
          "Referer": "https://www.dhlottery.co.kr/gameResult.do?method=byWin",
        },
      },
    );
    if (!res.ok) return null;
    const data: unknown = await res.json();
    if (!isDhlotteryResponse(data)) return null;
    return {
      drwNo: data.drwNo,
      drwNoDate: data.drwNoDate,
      drwtNo1: data.drwtNo1,
      drwtNo2: data.drwtNo2,
      drwtNo3: data.drwtNo3,
      drwtNo4: data.drwtNo4,
      drwtNo5: data.drwtNo5,
      drwtNo6: data.drwtNo6,
      bnusNo: data.bnusNo,
      firstWinamnt: data.firstWinamnt,
      firstPrzwnerCo: data.firstPrzwnerCo,
      firstAccumAmnt: data.firstAccumAmnt,
    };
  } catch {
    return null;
  }
}

export async function GET() {
  const latestRound = getLatestRound();

  // Supabase 캐시 확인 — 실패해도 직접 API 호출로 계속 진행
  try {
    const supabase = createAdminClient();
    const { data: cached } = await supabase
      .from("lotto_results")
      .select("drw_no, drw_no_date, drw_no1, drw_no2, drw_no3, drw_no4, drw_no5, drw_no6, drw_no_bonus_no, first_win_cnt, first_win_amnt, first_accum_prize_r")
      .order("drw_no", { ascending: false })
      .limit(1)
      .single();

    if (cached && cached.drw_no >= latestRound - 1) {
      return NextResponse.json({
        drwNo: cached.drw_no,
        drwNoDate: cached.drw_no_date,
        drwtNo1: cached.drw_no1,
        drwtNo2: cached.drw_no2,
        drwtNo3: cached.drw_no3,
        drwtNo4: cached.drw_no4,
        drwtNo5: cached.drw_no5,
        drwtNo6: cached.drw_no6,
        bnusNo: cached.drw_no_bonus_no,
        firstWinamnt: cached.first_win_amnt ?? 0,
        firstPrzwnerCo: cached.first_win_cnt,
        firstAccumAmnt: cached.first_accum_prize_r,
      } satisfies LottoLatestResponse);
    }
  } catch {
    // Supabase 오류 시 직접 API 호출로 폴백
  }

  let result = await fetchFromDhlottery(latestRound);
  if (!result) result = await fetchFromDhlottery(latestRound - 1);
  if (!result) {
    return NextResponse.json({ error: "당첨 번호를 불러오지 못했습니다." }, { status: 500 });
  }

  // 결과 캐시 저장 — 실패해도 응답은 정상 반환
  try {
    const supabase = createAdminClient();
    await supabase.from("lotto_results").upsert(
      {
        drw_no: result.drwNo,
        drw_no_date: result.drwNoDate,
        drw_no1: result.drwtNo1,
        drw_no2: result.drwtNo2,
        drw_no3: result.drwtNo3,
        drw_no4: result.drwtNo4,
        drw_no5: result.drwtNo5,
        drw_no6: result.drwtNo6,
        drw_no_bonus_no: result.bnusNo,
        first_win_cnt: result.firstPrzwnerCo,
        first_win_amnt: result.firstWinamnt,
        first_accum_prize_r: result.firstAccumAmnt,
      },
      { onConflict: "drw_no" },
    );
  } catch {
    // 캐시 저장 실패는 무시
  }

  return NextResponse.json(result);
}
