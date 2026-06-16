import { NextRequest, NextResponse } from "next/server";
import {
  isTossConfigured,
  fetchTossPrices,
  fetchTossCandles,
  fetchTossOrderbook,
  fetchTossTrades,
  fetchTossPriceLimit,
  fetchTossWarnings,
  buildTossQuote,
} from "@/lib/stocks/toss";
import type {
  CandleInterval,
  Orderbook,
  PriceLimit,
  StockDetailResponse,
  StockWarning,
  TradeTick,
} from "@/lib/stocks/types";

const INTERVALS: CandleInterval[] = ["1d", "1m"];

/** 영문 대문자/숫자/.- 만 허용 (국내 6자리 코드 + 해외 티커 모두 커버) */
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

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ symbol: string }> },
) {
  const { symbol: rawSymbol } = await params;
  const symbol = normalizeSymbol(rawSymbol);
  if (!symbol) {
    return NextResponse.json({ error: "유효하지 않은 종목 코드입니다." }, { status: 400 });
  }

  const fetchedAt = new Date().toISOString();

  if (!isTossConfigured()) {
    const body: StockDetailResponse = {
      status: "not_configured",
      symbol,
      quote: null,
      candles: [],
      interval: "1d",
      orderbook: null,
      trades: [],
      priceLimit: null,
      warnings: [],
      provider: "토스증권",
      fetchedAt,
      message: "TOSS_OPENAPI_CLIENT_ID / TOSS_OPENAPI_CLIENT_SECRET를 설정해야 합니다.",
    };
    return NextResponse.json(body, { status: 200 });
  }

  const { searchParams } = new URL(request.url);
  const interval = parseInterval(searchParams.get("interval"));
  const count = parseCount(searchParams.get("count"));

  const [pricesR, candlesR, orderbookR, tradesR, priceLimitR, warningsR] = await Promise.allSettled([
    fetchTossPrices([symbol]),
    fetchTossCandles(symbol, interval, count),
    fetchTossOrderbook(symbol),
    fetchTossTrades(symbol, 30),
    fetchTossPriceLimit(symbol),
    fetchTossWarnings(symbol),
  ]);

  const errors: string[] = [];
  const note = (label: string, r: PromiseSettledResult<unknown>) => {
    if (r.status === "rejected") {
      errors.push(`${label}: ${r.reason instanceof Error ? r.reason.message : "조회 실패"}`);
    }
  };
  note("prices", pricesR);
  note("candles", candlesR);
  note("orderbook", orderbookR);
  note("trades", tradesR);
  note("priceLimit", priceLimitR);
  note("warnings", warningsR);

  const lastPrice = pricesR.status === "fulfilled" ? (pricesR.value[0]?.lastPrice ?? 0) : 0;
  const candlesResult = candlesR.status === "fulfilled" ? candlesR.value : null;
  const candles = candlesResult?.candles ?? [];
  const orderbook: Orderbook | null = orderbookR.status === "fulfilled" ? orderbookR.value : null;
  const trades: TradeTick[] = tradesR.status === "fulfilled" ? tradesR.value : [];
  const priceLimit: PriceLimit | null = priceLimitR.status === "fulfilled" ? priceLimitR.value : null;
  const warnings: StockWarning[] = warningsR.status === "fulfilled" ? warningsR.value : [];

  const quote = lastPrice > 0 || candles.length > 0 ? buildTossQuote(symbol, lastPrice, candlesResult) : null;

  const body: StockDetailResponse = {
    status: "live",
    symbol,
    quote,
    candles,
    interval,
    orderbook,
    trades,
    priceLimit,
    warnings,
    provider: "토스증권",
    fetchedAt,
    ...(errors.length > 0 ? { message: errors[0] } : {}),
  };

  // 호가·체결 등 실시간 조각이 섞여 있어 detail은 짧은 캐시(5초)로 통일
  return NextResponse.json(body, {
    headers: { "Cache-Control": "public, max-age=5, s-maxage=5, stale-while-revalidate=10" },
  });
}
