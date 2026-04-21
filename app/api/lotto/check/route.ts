import { NextRequest, NextResponse } from "next/server";
import { createAdminClient, createClient } from "@/lib/supabase/server";

export interface LottoCheckResponse {
  rank: number | null;
  matchedNumbers: number[];
  bonusMatched: boolean;
  drwNo: number;
  prize?: number;
}

interface CheckRequest {
  numbers: number[];
  drw_no?: number;
}

function isCheckRequest(body: unknown): body is CheckRequest {
  if (typeof body !== "object" || body === null) return false;
  const b = body as Record<string, unknown>;
  return Array.isArray(b.numbers) && b.numbers.every((n) => typeof n === "number");
}

function calcRank(matched: number, bonusMatched: boolean): number | null {
  if (matched === 6) return 1;
  if (matched === 5 && bonusMatched) return 2;
  if (matched === 5) return 3;
  if (matched === 4) return 4;
  if (matched === 3) return 5;
  return null;
}

const PRIZE_TABLE: Record<number, number> = {
  3: 5000,
  4: 50000,
};

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json() as unknown;
  } catch {
    return NextResponse.json({ error: "요청 형식이 올바르지 않습니다." }, { status: 400 });
  }

  if (!isCheckRequest(body)) {
    return NextResponse.json({ error: "numbers 배열이 필요합니다." }, { status: 400 });
  }

  const { numbers, drw_no } = body;

  if (numbers.length !== 6) {
    return NextResponse.json({ error: "번호는 6개여야 합니다." }, { status: 400 });
  }

  const supabase = createAdminClient();

  let winRow: {
    drw_no: number;
    drw_no1: number;
    drw_no2: number;
    drw_no3: number;
    drw_no4: number;
    drw_no5: number;
    drw_no6: number;
    drw_no_bonus_no: number;
    first_win_amnt: number | null;
    first_accum_prize_r: number;
  } | null = null;

  if (drw_no) {
    const { data } = await supabase
      .from("lotto_results")
      .select("drw_no, drw_no1, drw_no2, drw_no3, drw_no4, drw_no5, drw_no6, drw_no_bonus_no, first_win_amnt, first_accum_prize_r")
      .eq("drw_no", drw_no)
      .single();
    winRow = data;
  }

  if (!winRow) {
    const { data } = await supabase
      .from("lotto_results")
      .select("drw_no, drw_no1, drw_no2, drw_no3, drw_no4, drw_no5, drw_no6, drw_no_bonus_no, first_win_amnt, first_accum_prize_r")
      .order("drw_no", { ascending: false })
      .limit(1)
      .single();
    winRow = data;
  }

  if (!winRow) {
    return NextResponse.json({ error: "당첨 번호를 조회할 수 없습니다." }, { status: 500 });
  }

  const winNums = [winRow.drw_no1, winRow.drw_no2, winRow.drw_no3, winRow.drw_no4, winRow.drw_no5, winRow.drw_no6];
  const bonusNum = winRow.drw_no_bonus_no;

  const matchedNumbers = numbers.filter((n) => winNums.includes(n));
  const bonusMatched = numbers.includes(bonusNum) && matchedNumbers.length === 5;
  const rank = calcRank(matchedNumbers.length, bonusMatched);

  let prize: number | undefined;
  if (rank === 1) prize = winRow.first_win_amnt ?? undefined;
  else if (rank === 2) prize = Math.floor((winRow.first_accum_prize_r * 0.12) / 5);
  else if (rank !== null && PRIZE_TABLE[rank]) prize = PRIZE_TABLE[rank];

  // 로그인 상태면 티켓 저장
  try {
    const userClient = await createClient();
    const { data: { user } } = await userClient.auth.getUser();
    if (user) {
      await supabase.from("lotto_my_tickets").insert({
        user_id: user.id,
        drw_no: winRow.drw_no,
        numbers: numbers,
        matched_count: matchedNumbers.length,
        rank: rank,
        checked_at: new Date().toISOString(),
      });
    }
  } catch {
    // 저장 실패는 무시 — 당첨 확인 결과에는 영향 없음
  }

  return NextResponse.json({
    rank,
    matchedNumbers,
    bonusMatched,
    drwNo: winRow.drw_no,
    prize,
  } satisfies LottoCheckResponse);
}
