import { KR_STOCKS } from "@/lib/stockList";
import { FALLBACK_INDICES, FALLBACK_STOCKS } from "@/lib/data/fallback";
import { MarketIndexQuote, MarketQuote, MarketResponse } from "@/lib/data/types";

const INDEX_SYMBOLS = [
  { symbol: "^KS11", name: "KOSPI", region: "KR" as const },
  { symbol: "^KQ11", name: "KOSDAQ", region: "KR" as const },
];

type YahooChartMeta = {
  currency?: string;
  regularMarketPrice?: number;
  previousClose?: number;
  chartPreviousClose?: number;
  regularMarketDayHigh?: number;
  regularMarketDayLow?: number;
  regularMarketVolume?: number;
  fiftyTwoWeekHigh?: number;
  fiftyTwoWeekLow?: number;
};

type YahooChartResult = {
  chart?: {
    result?: Array<{
      meta?: YahooChartMeta;
      timestamp?: number[];
      indicators?: {
        quote?: Array<{
          close?: Array<number | null>;
        }>;
      };
    }>;
  };
};

async function fetchYahooChart(symbol: string): Promise<YahooChartResult | null> {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=5d&interval=1d&includePrePost=false`;
  try {
    const response = await fetch(url, {
      next: { revalidate: 60 },
      headers: {
        "User-Agent": "Mozilla/5.0",
        Accept: "application/json",
      },
    });
    if (!response.ok) return null;
    return (await response.json()) as YahooChartResult;
  } catch {
    return null;
  }
}

function compactSeries(series: Array<number | null | undefined>) {
  return series.filter((v): v is number => typeof v === "number" && Number.isFinite(v));
}

function mapIndex(symbol: (typeof INDEX_SYMBOLS)[number], data: YahooChartResult): MarketIndexQuote | null {
  const result = data.chart?.result?.[0];
  const meta = result?.meta;
  const closes = compactSeries(result?.indicators?.quote?.[0]?.close ?? []);
  if (!meta) return null;

  const value = meta.regularMarketPrice ?? closes[closes.length - 1];
  if (!value) return null;
  const previousClose = meta.previousClose ?? meta.chartPreviousClose ?? closes[Math.max(0, closes.length - 2)] ?? value;
  const change = value - previousClose;
  const changePct = previousClose ? (change / previousClose) * 100 : 0;

  return { symbol: symbol.symbol, name: symbol.name, region: symbol.region, value, change, changePct };
}

function normalizeKrSymbol(symbol: string, market: "KOSPI" | "KOSDAQ" | "NYSE" | "NASDAQ") {
  if (market === "KOSPI") return `${symbol}.KS`;
  if (market === "KOSDAQ") return `${symbol}.KQ`;
  return symbol;
}

export async function getMarketSnapshot(): Promise<MarketResponse> {
  // 모든 KR 종목 심볼 생성
  const allSymbols = KR_STOCKS.map((s) => ({
    yahoo: normalizeKrSymbol(s.symbol, s.market),
    item: s,
  }));

  try {
    // 병렬로 모든 종목 + 지수 조회
    const [stockResults, indexResults] = await Promise.all([
      Promise.all(allSymbols.map((s) => fetchYahooChart(s.yahoo))),
      Promise.all(INDEX_SYMBOLS.map((s) => fetchYahooChart(s.symbol))),
    ]);

    const stocks: MarketQuote[] = [];
    for (let i = 0; i < allSymbols.length; i++) {
      const { yahoo, item } = allSymbols[i];
      const data = stockResults[i];
      const meta = data?.chart?.result?.[0]?.meta;
      const closes = compactSeries(data?.chart?.result?.[0]?.indicators?.quote?.[0]?.close ?? []);

      const price = meta?.regularMarketPrice ?? closes[closes.length - 1] ?? item.price;
      const previousClose = meta?.previousClose ?? meta?.chartPreviousClose ?? closes[Math.max(0, closes.length - 2)] ?? price;
      const change = price - previousClose;
      const changePct = previousClose ? (change / previousClose) * 100 : item.changePct;

      stocks.push({
        symbol: yahoo,
        displaySymbol: item.symbol,
        name: item.name,
        sector: item.sector,
        listingMarket: item.market,
        market: "KR",
        exchange: item.market === "KOSPI" ? "KOSPI" : "KOSDAQ",
        price,
        currency: "KRW",
        change,
        changePct,
        previousClose,
        dayHigh: meta?.regularMarketDayHigh,
        dayLow: meta?.regularMarketDayLow,
        volume: meta?.regularMarketVolume,
        range52w: meta?.fiftyTwoWeekHigh && meta?.fiftyTwoWeekLow
          ? { high: meta.fiftyTwoWeekHigh, low: meta.fiftyTwoWeekLow }
          : undefined,
        sparkline: closes.length >= 2 ? closes.slice(-7) : [price],
        updatedAt: new Date().toISOString(),
      });
    }

    const indices: MarketIndexQuote[] = [];
    for (let i = 0; i < INDEX_SYMBOLS.length; i++) {
      const data = indexResults[i];
      if (!data) continue;
      const mapped = mapIndex(INDEX_SYMBOLS[i], data);
      if (mapped) indices.push(mapped);
    }

    // 최소 1개 이상 실 데이터가 있으면 정상 응답
    const liveCount = stocks.filter((s) => s.sparkline.length >= 2).length;
    if (liveCount === 0 && !indices.length) throw new Error("Market snapshot empty");

    return {
      stocks,
      indices: indices.length ? indices : FALLBACK_INDICES,
      source: liveCount > 0 ? "yahoo-finance" : "fallback",
      fetchedAt: new Date().toISOString(),
    };
  } catch {
    return {
      stocks: FALLBACK_STOCKS,
      indices: FALLBACK_INDICES,
      source: "fallback",
      fetchedAt: new Date().toISOString(),
    };
  }
}
