import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

export const revalidate = 60;

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

// 당첨번호는 scripts/lotto_crawler.py 가 Supabase에 저장 — 여기서는 조회만 한다
export async function GET() {
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("lotto_results")
      .select("drw_no, drw_no_date, drw_no1, drw_no2, drw_no3, drw_no4, drw_no5, drw_no6, drw_no_bonus_no, first_win_cnt, first_win_amnt, first_accum_prize_r")
      .order("drw_no", { ascending: false })
      .limit(1)
      .single();

    if (error || !data) {
      return NextResponse.json(
        { error: "당첨 번호 데이터가 없습니다. 크롤러를 먼저 실행해 주세요." },
        { status: 503 },
      );
    }

    return NextResponse.json({
      drwNo: data.drw_no,
      drwNoDate: data.drw_no_date,
      drwtNo1: data.drw_no1,
      drwtNo2: data.drw_no2,
      drwtNo3: data.drw_no3,
      drwtNo4: data.drw_no4,
      drwtNo5: data.drw_no5,
      drwtNo6: data.drw_no6,
      bnusNo: data.drw_no_bonus_no,
      firstWinamnt: data.first_win_amnt ?? 0,
      firstPrzwnerCo: data.first_win_cnt,
      firstAccumAmnt: data.first_accum_prize_r,
    } satisfies LottoLatestResponse);
  } catch {
    return NextResponse.json({ error: "서버 오류가 발생했습니다." }, { status: 500 });
  }
}
