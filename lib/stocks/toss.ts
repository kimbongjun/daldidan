import "server-only";

import type {
  Candle,
  CandleInterval,
  Orderbook,
  PriceLimit,
  StockQuote,
  StockWarning,
  TradeTick,
} from "@/lib/stocks/types";
import { getKrxMarketWindow } from "@/lib/stocks/cache-policy";

const DEFAULT_TOSS_BASE_URL = "https://openapi.tossinvest.com";

type TossConfig = {
  clientId: string;
  clientSecret: string;
  baseUrl: string;
};

/** 토스 OAuth client_credentials 토큰 응답 */
type TossTokenResponse = {
  access_token: string;
  token_type: string;
  expires_in: number;
};

/** 토스 단건 시세 (등락/거래량 없음) */
export type TossPrice = {
  symbol: string;
  timestamp: string;
  lastPrice: number;
  currency: string;
};

/** 토스 종목 기본정보 마스터 */
export type TossStockMaster = {
  symbol: string;
  name: string;
  englishName: string;
  market: string;
  securityType: string;
  status: string;
  currency: string;
  listDate: string;
  sharesOutstanding: number;
  koreanMarketDetail: Record<string, unknown> | null;
};

export function readTossConfig(): TossConfig | null {
  const clientId = process.env.TOSS_OPENAPI_CLIENT_ID?.trim() || "";
  const clientSecret = process.env.TOSS_OPENAPI_CLIENT_SECRET?.trim() || "";
  const baseUrl = process.env.TOSS_OPENAPI_BASE_URL?.trim() || DEFAULT_TOSS_BASE_URL;
  if (!clientId || !clientSecret) return null;
  return { clientId, clientSecret, baseUrl };
}

export function isTossConfigured(): boolean {
  return readTossConfig() !== null;
}

/** 숫자 문자열("343500") → number. 토스 응답 숫자 필드는 모두 문자열로 옴 */
function toNumber(value: unknown): number {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (typeof value !== "string") return 0;
  const normalized = value.replace(/,/g, "").replace(/−/g, "-").trim();
  if (!normalized || normalized === "-") return 0;
  const num = Number(normalized);
  return Number.isFinite(num) ? num : 0;
}

// ── 토큰 캐시 (모듈 스코프) + single-flight ───────────────────
let _token: { value: string; expiry: number } | null = null;
let _tokenInflight: Promise<string> | null = null;

async function requestAccessToken(config: TossConfig): Promise<{ value: string; expiry: number }> {
  const body = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: config.clientId,
    client_secret: config.clientSecret,
  });

  const res = await fetch(new URL("/oauth2/token", config.baseUrl), {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      accept: "application/json",
    },
    body: body.toString(),
    cache: "no-store",
    signal: AbortSignal.timeout(10_000),
  });

  if (!res.ok) throw new Error(`Toss /oauth2/token HTTP ${res.status}`);
  const data = (await res.json()) as TossTokenResponse;
  if (!data.access_token) throw new Error("Toss /oauth2/token: access_token 누락");

  // 만료 60초 전에 갱신하도록 expiry를 당겨 둔다
  const expiry = Date.now() + Math.max(data.expires_in - 60, 30) * 1_000;
  return { value: data.access_token, expiry };
}

async function getAccessToken(): Promise<string> {
  const config = readTossConfig();
  if (!config) throw new Error("TOSS_OPENAPI_CLIENT_ID / TOSS_OPENAPI_CLIENT_SECRET 미설정");

  if (_token && _token.expiry > Date.now()) return _token.value;
  if (_tokenInflight) return _tokenInflight;

  _tokenInflight = requestAccessToken(config)
    .then((token) => {
      _token = token;
      _tokenInflight = null;
      return token.value;
    })
    .catch((err: unknown) => {
      _tokenInflight = null;
      throw err;
    });

  return _tokenInflight;
}

async function tossGet<T>(path: string, params: Record<string, string | number | undefined>): Promise<T> {
  const config = readTossConfig();
  if (!config) throw new Error("Toss 설정 미존재");
  const token = await getAccessToken();

  const url = new URL(path, config.baseUrl);
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== "") url.searchParams.set(key, String(value));
  });

  const res = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      accept: "application/json",
    },
    cache: "no-store",
    signal: AbortSignal.timeout(10_000),
  });

  if (!res.ok) throw new Error(`Toss ${path} HTTP ${res.status}`);
  const data = (await res.json()) as { result: T };
  return data.result;
}

// ── 시세 (배치) ──────────────────────────────────────────────
type RawTossPrice = { symbol: string; timestamp: string; lastPrice: string; currency: string };

/** 쉼표구분 최대 200개 심볼을 1회 호출로 배치 조회 */
export async function fetchTossPrices(symbols: string[]): Promise<TossPrice[]> {
  const unique = [...new Set(symbols.filter(Boolean))].slice(0, 200);
  if (unique.length === 0) return [];
  const result = await tossGet<RawTossPrice[]>("/api/v1/prices", { symbols: unique.join(",") });
  return (Array.isArray(result) ? result : []).map((row) => ({
    symbol: row.symbol,
    timestamp: row.timestamp,
    lastPrice: toNumber(row.lastPrice),
    currency: row.currency,
  }));
}

// ── 캔들 ─────────────────────────────────────────────────────
type RawTossCandle = {
  timestamp: string;
  openPrice: string;
  highPrice: string;
  lowPrice: string;
  closePrice: string;
  volume: string;
  currency: string;
};

export type TossCandlesResult = { candles: Candle[]; nextBefore: string | null };

/** 캔들 조회. 응답은 최신순(내림차순). count<=200 */
export async function fetchTossCandles(
  symbol: string,
  interval: CandleInterval,
  count: number,
  before?: string,
): Promise<TossCandlesResult> {
  const result = await tossGet<{ candles: RawTossCandle[]; nextBefore?: string }>("/api/v1/candles", {
    symbol,
    interval,
    count: Math.min(Math.max(count, 1), 200),
    adjusted: "true",
    before,
  });
  const candles: Candle[] = (Array.isArray(result?.candles) ? result.candles : []).map((c) => ({
    timestamp: c.timestamp,
    open: toNumber(c.openPrice),
    high: toNumber(c.highPrice),
    low: toNumber(c.lowPrice),
    close: toNumber(c.closePrice),
    volume: toNumber(c.volume),
  }));
  return { candles, nextBefore: result?.nextBefore ?? null };
}

// ── 호가 ─────────────────────────────────────────────────────
type RawOrderbookLevel = { price: string; volume: string };
type RawOrderbook = {
  timestamp: string;
  currency: string;
  asks: RawOrderbookLevel[];
  bids: RawOrderbookLevel[];
};

export async function fetchTossOrderbook(symbol: string): Promise<Orderbook> {
  const result = await tossGet<RawOrderbook>("/api/v1/orderbook", { symbol });
  const mapLevels = (levels: RawOrderbookLevel[] | undefined) =>
    (Array.isArray(levels) ? levels : []).map((l) => ({ price: toNumber(l.price), volume: toNumber(l.volume) }));
  return {
    timestamp: result?.timestamp ?? "",
    currency: result?.currency ?? "KRW",
    asks: mapLevels(result?.asks),
    bids: mapLevels(result?.bids),
  };
}

// ── 체결 ─────────────────────────────────────────────────────
type RawTrade = { price: string; volume: string; timestamp: string; currency: string };

export async function fetchTossTrades(symbol: string, count: number): Promise<TradeTick[]> {
  const result = await tossGet<RawTrade[]>("/api/v1/trades", { symbol, count: Math.min(Math.max(count, 1), 200) });
  return (Array.isArray(result) ? result : []).map((t) => ({
    price: toNumber(t.price),
    volume: toNumber(t.volume),
    timestamp: t.timestamp,
    currency: t.currency,
  }));
}

// ── 상·하한가 ────────────────────────────────────────────────
type RawPriceLimit = {
  timestamp: string;
  upperLimitPrice: string;
  lowerLimitPrice: string;
  currency: string;
};

export async function fetchTossPriceLimit(symbol: string): Promise<PriceLimit> {
  const result = await tossGet<RawPriceLimit>("/api/v1/price-limits", { symbol });
  return {
    upperLimitPrice: toNumber(result?.upperLimitPrice),
    lowerLimitPrice: toNumber(result?.lowerLimitPrice),
    currency: result?.currency ?? "KRW",
    timestamp: result?.timestamp ?? "",
  };
}

// ── 종목 경고/관리 ───────────────────────────────────────────
type RawWarning = {
  warningType?: string;
  exchange?: string;
  startDate?: string;
  endDate?: string | null;
};

export async function fetchTossWarnings(symbol: string): Promise<StockWarning[]> {
  const result = await tossGet<RawWarning[]>(`/api/v1/stocks/${encodeURIComponent(symbol)}/warnings`, {});
  return (Array.isArray(result) ? result : []).map((w) => ({
    warningType: w.warningType ?? "",
    exchange: w.exchange ?? "",
    startDate: w.startDate ?? "",
    endDate: w.endDate ?? null,
  }));
}

// ── 종목 마스터 ──────────────────────────────────────────────
type RawStockMaster = {
  symbol: string;
  name: string;
  englishName?: string;
  market?: string;
  securityType?: string;
  status?: string;
  currency?: string;
  listDate?: string;
  sharesOutstanding?: string;
  koreanMarketDetail?: Record<string, unknown> | null;
};

// ── 캔들 기반 파생 지표 (시세/등락/OHLCV/스파크라인/52주) ──────
export type TossDerivedMetrics = {
  price: number;
  change: number;
  changePct: number;
  open: number;
  high: number;
  low: number;
  volume: number;
  previousClose: number;
  sparkline: number[];
  fiftyTwoWeekHigh: number;
  fiftyTwoWeekLow: number;
  /** 현재 표시 세션 캔들의 KST 날짜 (YYYY-MM-DD) */
  baseDate: string;
};

/**
 * 토스 일봉(내림차순) + lastPrice로 시세 지표를 산출한다.
 * 전일종가(previousClose) 산출 규칙 — 장 시작 직후 레이스 컨디션 대응:
 *  - candles[0]이 현재 표시 세션(sessionDay)이면 → prevClose = candles[1].close
 *  - 아니면(당일 봉 미형성, candles[0]이 직전 완성일) → prevClose = candles[0].close
 * candles가 비면 null 반환. 52주 고/저는 받은 캔들 범위(보통 ~60일) 내 근사값(한계).
 */
export function deriveTossMetrics(
  candles: Candle[],
  lastPrice: number,
  sessionDay: string,
  withSparkline: boolean,
): TossDerivedMetrics | null {
  const c0 = candles[0];
  if (!c0) return null;

  const c0Date = c0.timestamp.slice(0, 10); // ISO에 +09:00 포함 → 앞 10자리가 KST 날짜
  const isCurrentSession = c0Date === sessionDay;
  const prevClose = isCurrentSession ? (candles[1]?.close ?? c0.close) : c0.close;
  const price = lastPrice > 0 ? lastPrice : c0.close;
  const change = price - prevClose;
  const changePct = prevClose > 0 ? (change / prevClose) * 100 : 0;

  const closesAsc = withSparkline ? [...candles].reverse().map((c) => c.close).filter((v) => v > 0) : [];
  const highs = candles.map((c) => c.high).filter((v) => v > 0);
  const lows = candles.map((c) => c.low).filter((v) => v > 0);

  return {
    price,
    change,
    changePct,
    open: c0.open,
    high: c0.high,
    low: c0.low,
    volume: c0.volume,
    previousClose: prevClose,
    sparkline: closesAsc,
    fiftyTwoWeekHigh: Math.max(price, ...highs),
    fiftyTwoWeekLow: Math.min(price, ...lows),
    baseDate: c0Date,
  };
}

/**
 * KRX base quote 없이 토스 데이터만으로 StockQuote를 구성한다 (단일 종목 상세용).
 * 마스터(name/market/assetType)는 토스 시세/캔들에 없으므로 best-effort(symbol/기본값).
 * tradingValue·시총 등은 토스 시세 엔드포인트에 없어 0.
 */
export function buildTossQuote(
  symbol: string,
  lastPrice: number,
  candlesResult: TossCandlesResult | null,
  master?: { name?: string; market?: string },
): StockQuote {
  const sessionDay = getKrxMarketWindow().mostRecentTradingDay;
  const now = new Date().toISOString();
  const metrics = deriveTossMetrics(candlesResult?.candles ?? [], lastPrice, sessionDay, true);

  const base: StockQuote = {
    symbol,
    name: master?.name?.trim() || symbol,
    market: master?.market?.trim() || "",
    assetType: "stock",
    price: lastPrice > 0 ? lastPrice : 0,
    change: 0,
    changePct: 0,
    volume: 0,
    tradingValue: 0,
    open: 0,
    high: 0,
    low: 0,
    previousClose: lastPrice > 0 ? lastPrice : 0,
    sparkline: [],
    fetchedAt: now,
    baseDate: sessionDay,
    source: "TOSS",
  };

  if (!metrics) return base;

  return {
    ...base,
    price: metrics.price,
    change: metrics.change,
    changePct: metrics.changePct,
    open: metrics.open,
    high: metrics.high,
    low: metrics.low,
    volume: metrics.volume,
    previousClose: metrics.previousClose,
    sparkline: metrics.sparkline,
    fiftyTwoWeekHigh: metrics.fiftyTwoWeekHigh,
    fiftyTwoWeekLow: metrics.fiftyTwoWeekLow,
    baseDate: metrics.baseDate,
  };
}

export async function fetchTossStockMaster(symbols: string[]): Promise<TossStockMaster[]> {
  const unique = [...new Set(symbols.filter(Boolean))].slice(0, 200);
  if (unique.length === 0) return [];
  const result = await tossGet<RawStockMaster[]>("/api/v1/stocks", { symbols: unique.join(",") });
  return (Array.isArray(result) ? result : []).map((s) => ({
    symbol: s.symbol,
    name: s.name,
    englishName: s.englishName ?? "",
    market: s.market ?? "",
    securityType: s.securityType ?? "",
    status: s.status ?? "",
    currency: s.currency ?? "KRW",
    listDate: s.listDate ?? "",
    sharesOutstanding: toNumber(s.sharesOutstanding),
    koreanMarketDetail: s.koreanMarketDetail ?? null,
  }));
}
