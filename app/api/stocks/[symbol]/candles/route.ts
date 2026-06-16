import { NextRequest, NextResponse } from "next/server";
import { isTossConfigured, fetchTossCandles } from "@/lib/stocks/toss";
import { getKrxMarketWindow } from "@/lib/stocks/cache-policy";
import type { Candle, CandleInterval } from "@/lib/stocks/types";

const INTERVALS: CandleInterval[] = ["1d", "1m"];

/** 영문 대문자/숫자/.- 만 허용 */
function normalizeSymbol(value: string): string | null {
  const symbol = decodeURIComponent(value).trim().toUpperCase();
  return /^[A-Z0-9.\-]{1,20}$/.test(symbol) ? symbol : null;
}

function parseInterval(value: string | null): CandleInterval {
  return INTERVALS.includes(value as CandleInterval) ? (value as CandleInterval) : "1d";
}

function parseCount(value: string | null): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return 100;
  return Math.min(Math.max(Math.trunc(n), 1), 200);
}

type CandlesRouteResponse = {
  symbol: string;
  candles: Candle[];
  interval: CandleInterval;
  nextBefore: string | null;
  message?: string;
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ symbol: string }> },
) {
  const { symbol: rawSymbol } = await params;
  const symbol = normalizeSymbol(rawSymbol);
  if (!symbol) {
    return NextResponse.json({ error: "유효하지 않은 종목 코드입니다." }, { status: 400 });
  }

  if (!isTossConfigured()) {
    const body: CandlesRouteResponse = {
      symbol,
      candles: [],
      interval: "1d",
      nextBefore: null,
      message: "TOSS_OPENAPI_CLIENT_ID / TOSS_OPENAPI_CLIENT_SECRET를 설정해야 합니다.",
    };
    return NextResponse.json(body, { status: 200 });
  }

  const { searchParams } = new URL(request.url);
  const interval = parseInterval(searchParams.get("interval"));
  const count = parseCount(searchParams.get("count"));
  const before = searchParams.get("before")?.trim() || undefined;

  try {
    const { candles, nextBefore } = await fetchTossCandles(symbol, interval, count, before);
    const body: CandlesRouteResponse = { symbol, candles, interval, nextBefore };
    const ttl = getKrxMarketWindow().cacheTtlSeconds;
    return NextResponse.json(body, {
      headers: {
        "Cache-Control": `public, max-age=${ttl}, s-maxage=${ttl}, stale-while-revalidate=300`,
      },
    });
  } catch (error) {
    const body: CandlesRouteResponse = {
      symbol,
      candles: [],
      interval,
      nextBefore: null,
      message: error instanceof Error ? error.message : "토스 캔들 조회에 실패했습니다.",
    };
    return NextResponse.json(body, { status: 502 });
  }
}
