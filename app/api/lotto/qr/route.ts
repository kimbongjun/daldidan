import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { fetchLotto, parseLottoQr, upsertLottoResult } from "@/lib/lotto";

interface QrRequest {
  qr: string;
}

interface QrCheckGameResult {
  line: number;
  numbers: number[];
  matchedNumbers: number[];
  bonusMatched: boolean;
  rank: number | null;
}

export interface LottoQrResponse {
  drwNo: number;
  drawDate: string;
  winningNumbers: number[];
  bonusNumber: number;
  games: QrCheckGameResult[];
  bestRank: number | null;
  sourceUrl: string | null;
}

function isQrRequest(body: unknown): body is QrRequest {
  if (typeof body !== "object" || body === null) return false;
  return typeof (body as Record<string, unknown>).qr === "string";
}

function calcRank(matched: number, bonusMatched: boolean): number | null {
  if (matched === 6) return 1;
  if (matched === 5 && bonusMatched) return 2;
  if (matched === 5) return 3;
  if (matched === 4) return 4;
  if (matched === 3) return 5;
  return null;
}

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json() as unknown;
  } catch {
    return NextResponse.json({ error: "요청 형식이 올바르지 않습니다." }, { status: 400 });
  }

  if (!isQrRequest(body)) {
    return NextResponse.json({ error: "qr 문자열이 필요합니다." }, { status: 400 });
  }

  const parsed = parseLottoQr(body.qr);
  if (!parsed) {
    return NextResponse.json({ error: "동행복권 QR 형식을 해석하지 못했습니다." }, { status: 400 });
  }

  const supabase = createAdminClient();
  let { data: draw, error } = await supabase
    .from("lotto_results")
    .select("drw_no, drw_no_date, drw_no1, drw_no2, drw_no3, drw_no4, drw_no5, drw_no6, drw_no_bonus_no")
    .eq("drw_no", parsed.drwNo)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: "당첨 데이터 조회에 실패했습니다." }, { status: 500 });
  }

  if (!draw) {
    const fetched = await fetchLotto(parsed.drwNo);
    if (fetched.ok) {
      const { error: upsertError } = await upsertLottoResult(fetched.data);
      if (upsertError) {
        return NextResponse.json({ error: upsertError.message }, { status: 500 });
      }

      const refreshed = await supabase
        .from("lotto_results")
        .select("drw_no, drw_no_date, drw_no1, drw_no2, drw_no3, drw_no4, drw_no5, drw_no6, drw_no_bonus_no")
        .eq("drw_no", parsed.drwNo)
        .maybeSingle();

      draw = refreshed.data;
      error = refreshed.error;
    }
  }

  if (error) {
    return NextResponse.json({ error: "당첨 데이터 조회에 실패했습니다." }, { status: 500 });
  }

  if (!draw) {
    return NextResponse.json(
      { error: `제 ${parsed.drwNo}회 당첨 데이터를 가져오지 못했습니다.` },
      { status: 404 },
    );
  }

  const winningNumbers = [draw.drw_no1, draw.drw_no2, draw.drw_no3, draw.drw_no4, draw.drw_no5, draw.drw_no6];
  const games = parsed.games.map((numbers, index) => {
    const matchedNumbers = numbers.filter((n) => winningNumbers.includes(n));
    const bonusMatched = numbers.includes(draw.drw_no_bonus_no) && matchedNumbers.length === 5;
    return {
      line: index + 1,
      numbers,
      matchedNumbers,
      bonusMatched,
      rank: calcRank(matchedNumbers.length, bonusMatched),
    } satisfies QrCheckGameResult;
  });

  const bestRank = games
    .map((game) => game.rank)
    .filter((rank): rank is number => rank !== null)
    .sort((a, b) => a - b)[0] ?? null;

  return NextResponse.json({
    drwNo: draw.drw_no,
    drawDate: draw.drw_no_date,
    winningNumbers,
    bonusNumber: draw.drw_no_bonus_no,
    games,
    bestRank,
    sourceUrl: parsed.sourceUrl,
  } satisfies LottoQrResponse);
}
