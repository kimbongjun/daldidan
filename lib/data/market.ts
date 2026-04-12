import { FALLBACK_INDICES, FALLBACK_STOCKS } from "@/lib/data/fallback";
import { MarketIndexQuote, MarketQuote, MarketResponse } from "@/lib/data/types";

const INDEX_SYMBOLS = [
  { symbol: "^KS11", name: "KOSPI", region: "KR" as const },
  { symbol: "^KQ11", name: "KOSDAQ", region: "KR" as const },
];

const STOCK_SYMBOLS = [
  { symbol: "005930.KS", name: "삼성전자", market: "KR" as const, exchange: "KOSPI", displaySymbol: "005930", sector: "반도체", listingMarket: "KOSPI" },
  { symbol: "000660.KS", name: "SK하이닉스", market: "KR" as const, exchange: "KOSPI", displaySymbol: "000660", sector: "반도체", listingMarket: "KOSPI" },
  { symbol: "005380.KS", name: "현대차", market: "KR" as const, exchange: "KOSPI", displaySymbol: "005380", sector: "자동차", listingMarket: "KOSPI" },
  { symbol: "035420.KS", name: "NAVER", market: "KR" as const, exchange: "KOSPI", displaySymbol: "035420", sector: "IT/인터넷", listingMarket: "KOSPI" },
  { symbol: "051910.KS", name: "LG화학", market: "KR" as const, exchange: "KOSPI", displaySymbol: "051910", sector: "화학", listingMarket: "KOSPI" },
  { symbol: "373220.KS", name: "LG에너지솔루션", market: "KR" as const, exchange: "KOSPI", displaySymbol: "373220", sector: "2차전지", listingMarket: "KOSPI" },
  { symbol: "293490.KQ", name: "카카오게임즈", market: "KR" as const, exchange: "KOSDAQ", displaySymbol: "293490", sector: "게임", listingMarket: "KOSDAQ" },
  { symbol: "196170.KQ", name: "알테오젠", market: "KR" as const, exchange: "KOSDAQ", displaySymbol: "196170", sector: "바이오", listingMarket: "KOSDAQ" },
];

type YahooChartResult = {
  chart?: {
    result?: Array<{
      meta?: {
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
      timestamp?: number[];
      indicators?: {
        quote?: Array<{
          close?: Array<number | null>;
          volume?: Array<number | null>;
        }>;
      };
    }>;
  };
};

async function fetchYahooChart(symbol: string, range = "1d", interval = "2m") {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=${range}&interval=${interval}&includePrePost=false`;
  const response = await fetch(url, {
    next: { revalidate: 60 },
    headers: {
      "User-Agent": "Mozilla/5.0",
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`Yahoo chart failed for ${symbol}`);
  }

  return (await response.json()) as YahooChartResult;
}

function compactSeries(series: Array<number | null | undefined>) {
  return series.filter((value): value is number => typeof value === "number" && Number.isFinite(value));
}

function mapStock(symbol: (typeof STOCK_SYMBOLS)[number], data: YahooChartResult): MarketQuote | null {
  const result = data.chart?.result?.[0];
  const meta = result?.meta;
  const closes = compactSeries(result?.indicators?.quote?.[0]?.close ?? []);
  if (!meta || !closes.length) return null;

  const price = meta.regularMarketPrice ?? closes[closes.length - 1];
  const previousClose = meta.previousClose ?? meta.chartPreviousClose ?? closes[Math.max(0, closes.length - 2)] ?? price;
  const change = price - previousClose;
  const changePct = previousClose ? (change / previousClose) * 100 : 0;

  return {
    symbol: symbol.symbol,
    name: symbol.name,
    displaySymbol: symbol.displaySymbol,
    sector: symbol.sector,
    listingMarket: symbol.listingMarket,
    market: symbol.market,
    exchange: symbol.exchange,
    price,
    currency: meta.currency ?? "KRW",
    change,
    changePct,
    previousClose,
    dayHigh: meta.regularMarketDayHigh,
    dayLow: meta.regularMarketDayLow,
    volume: meta.regularMarketVolume,
    range52w: meta.fiftyTwoWeekHigh && meta.fiftyTwoWeekLow ? { high: meta.fiftyTwoWeekHigh, low: meta.fiftyTwoWeekLow } : undefined,
    sparkline: closes.slice(-7),
    updatedAt: new Date().toISOString(),
  };
}

function mapIndex(symbol: (typeof INDEX_SYMBOLS)[number], data: YahooChartResult): MarketIndexQuote | null {
  const result = data.chart?.result?.[0];
  const meta = result?.meta;
  const closes = compactSeries(result?.indicators?.quote?.[0]?.close ?? []);
  if (!meta || !closes.length) return null;

  const value = meta.regularMarketPrice ?? closes[closes.length - 1];
  const previousClose = meta.previousClose ?? meta.chartPreviousClose ?? closes[Math.max(0, closes.length - 2)] ?? value;
  const change = value - previousClose;
  const changePct = previousClose ? (change / previousClose) * 100 : 0;

  return {
    symbol: symbol.symbol,
    name: symbol.name,
    region: symbol.region,
    value,
    change,
    changePct,
  };
}

export async function getMarketSnapshot(): Promise<MarketResponse> {
  try {
    const [stockCharts, indexCharts] = await Promise.all([
      Promise.all(STOCK_SYMBOLS.map((item) => fetchYahooChart(item.symbol))),
      Promise.all(INDEX_SYMBOLS.map((item) => fetchYahooChart(item.symbol))),
    ]);

    const stocks = stockCharts
      .map((chart, index) => mapStock(STOCK_SYMBOLS[index], chart))
      .filter((item): item is MarketQuote => item !== null);
    const indices = indexCharts
      .map((chart, index) => mapIndex(INDEX_SYMBOLS[index], chart))
      .filter((item): item is MarketIndexQuote => item !== null);

    if (!stocks.length || !indices.length) {
      throw new Error("Market snapshot empty");
    }

    return {
      stocks,
      indices,
      source: "yahoo-finance",
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
