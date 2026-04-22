import { NextResponse } from "next/server";
import { getLatestLottoResult } from "@/lib/lotto";

export const dynamic = "force-dynamic";
export const revalidate = 0;

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

export async function GET() {
  try {
    const { data, error } = await getLatestLottoResult();
    if (error || !data) {
      return NextResponse.json(
        { error: error ?? "당첨 번호 데이터가 없습니다. 크롤러를 먼저 실행해 주세요." },
        {
          status: 503,
          headers: {
            "Cache-Control": "no-store, max-age=0",
          },
        },
      );
    }

    return NextResponse.json(
      {
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
      } satisfies LottoLatestResponse,
      {
        headers: {
          "Cache-Control": "no-store, max-age=0",
        },
      },
    );
  } catch {
    return NextResponse.json({ error: "서버 오류가 발생했습니다." }, { status: 500 });
  }
}
