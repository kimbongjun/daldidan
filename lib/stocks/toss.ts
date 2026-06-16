import "server-only";

import {
  type AssetType,
  type Candle,
  type CandleInterval,
  type Orderbook,
  type PriceLimit,
  type StockOverviewResponse,
  type StockQuote,
  type StockRankingItem,
  type StockRankingKind,
  type StockWarning,
  type TradeTick,
  type WatchlistItem,
} from "@/lib/stocks/types";
import { getKrxMarketWindow } from "@/lib/stocks/cache-policy";
import { sanitizeSymbol } from "@/lib/stocks/utils";

const DEFAULT_SYMBOLS: WatchlistItem[] = [
  { symbol: "005930", assetType: "stock" },
  { symbol: "000660", assetType: "stock" },
  { symbol: "035420", assetType: "stock" },
  { symbol: "005380", assetType: "stock" },
];

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
  isinCode: string;
  market: string;
  securityType: string;
  status: string;
  currency: string;
  listDate: string;
  delistDate: string | null;
  sharesOutstanding: number;
  leverageFactor: number | null;
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
  isinCode?: string;
  market?: string;
  securityType?: string;
  status?: string;
  currency?: string;
  listDate?: string;
  delistDate?: string | null;
  sharesOutstanding?: string;
  leverageFactor?: number | string | null;
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

/** 토스 securityType → 앱 AssetType. ETF/ETN은 etf, 그 외 stock. */
export function assetTypeFromMaster(securityType?: string): AssetType {
  const st = (securityType ?? "").toUpperCase();
  return st.includes("ETF") || st.includes("ETN") ? "etf" : "stock";
}

/**
 * 토스 데이터만으로 StockQuote를 구성한다 (관심종목 오버뷰 + 단일 상세 공용).
 * - 시세/등락/OHLCV/스파크라인/52주: 캔들 기반 deriveTossMetrics.
 * - 시가총액 = 상장주식수(master.sharesOutstanding) × 현재가 (토스 마스터로 파생).
 * - 거래대금 = 현재가 × 당일 거래량 (토스 시세 엔드포인트에 없어 근사).
 * master가 없으면 name/market은 best-effort(symbol/빈값).
 */
export function buildTossQuote(
  symbol: string,
  lastPrice: number,
  candlesResult: TossCandlesResult | null,
  master?: Partial<TossStockMaster>,
  assetTypeOverride?: AssetType,
): StockQuote {
  const sessionDay = getKrxMarketWindow().mostRecentTradingDay;
  const now = new Date().toISOString();
  const metrics = deriveTossMetrics(candlesResult?.candles ?? [], lastPrice, sessionDay, true);
  const assetType = assetTypeOverride ?? (master ? assetTypeFromMaster(master.securityType) : "stock");
  const shares = master?.sharesOutstanding && master.sharesOutstanding > 0 ? master.sharesOutstanding : 0;

  const masterFields = {
    englishName: master?.englishName || undefined,
    isinCode: master?.isinCode || undefined,
    securityType: master?.securityType || undefined,
    listDate: master?.listDate || undefined,
    delistDate: master?.delistDate ?? undefined,
    nxtSupported:
      master?.koreanMarketDetail && typeof master.koreanMarketDetail.nxtSupported === "boolean"
        ? (master.koreanMarketDetail.nxtSupported as boolean)
        : undefined,
    leverageFactor: master?.leverageFactor ?? undefined,
    ...(shares > 0 ? { listedShares: shares } : {}),
  };

  const price = lastPrice > 0 ? lastPrice : (metrics?.price ?? 0);

  const base: StockQuote = {
    symbol,
    name: master?.name?.trim() || symbol,
    market: master?.market?.trim() || "",
    assetType,
    price,
    change: 0,
    changePct: 0,
    volume: 0,
    tradingValue: 0,
    open: 0,
    high: 0,
    low: 0,
    previousClose: price,
    sparkline: [],
    ...(shares > 0 && price > 0 ? { marketCap: shares * price } : {}),
    ...masterFields,
    fetchedAt: now,
    baseDate: sessionDay,
    source: "TOSS",
  };

  if (!metrics) return base;

  const finalPrice = metrics.price;
  return {
    ...base,
    price: finalPrice,
    change: metrics.change,
    changePct: metrics.changePct,
    open: metrics.open,
    high: metrics.high,
    low: metrics.low,
    volume: metrics.volume,
    tradingValue: finalPrice > 0 && metrics.volume > 0 ? finalPrice * metrics.volume : 0,
    previousClose: metrics.previousClose,
    sparkline: metrics.sparkline,
    fiftyTwoWeekHigh: metrics.fiftyTwoWeekHigh,
    fiftyTwoWeekLow: metrics.fiftyTwoWeekLow,
    baseDate: metrics.baseDate,
    ...(shares > 0 && finalPrice > 0 ? { marketCap: shares * finalPrice } : {}),
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
    isinCode: s.isinCode ?? "",
    market: s.market ?? "",
    securityType: s.securityType ?? "",
    status: s.status ?? "",
    currency: s.currency ?? "KRW",
    listDate: s.listDate ?? "",
    delistDate: s.delistDate ?? null,
    sharesOutstanding: toNumber(s.sharesOutstanding),
    leverageFactor:
      s.leverageFactor === null || s.leverageFactor === undefined ? null : toNumber(s.leverageFactor),
    koreanMarketDetail: s.koreanMarketDetail ?? null,
  }));
}

// ── 관심종목 오버뷰 (토스 단독) ───────────────────────────────
function compactSymbols(items: WatchlistItem[]): WatchlistItem[] {
  const seen = new Set<string>();
  const out: WatchlistItem[] = [];
  for (const item of items) {
    // 지수(IDX_*)는 토스가 제공하지 않으므로 제외. 주식/ETF 6자리 코드만 허용.
    const symbol = sanitizeSymbol(item.symbol);
    if (!symbol || seen.has(symbol)) continue;
    seen.add(symbol);
    out.push({ symbol, assetType: item.assetType === "etf" ? "etf" : "stock" });
    if (out.length >= 20) break;
  }
  return out;
}

export function defaultStockWatchlist(): WatchlistItem[] {
  const raw = process.env.KRX_DEFAULT_SYMBOLS ?? "";
  const symbols = raw
    .split(",")
    .map((value) => sanitizeSymbol(value))
    .filter((value): value is string => Boolean(value));
  if (symbols.length === 0) return DEFAULT_SYMBOLS;
  return symbols.slice(0, 12).map((symbol) => ({ symbol, assetType: "stock" as AssetType }));
}

function emptyRankings(): Record<StockRankingKind, StockRankingItem[]> {
  return { amount: [], volume: [], rise: [], fall: [], popular: [] };
}

// 마켓윈도우 단위 오버뷰 캐시
const _overviewCache = new Map<string, { data: StockOverviewResponse; expiry: number }>();

function makeOverviewCacheKey(items: WatchlistItem[], noSparkline: boolean): string {
  return `${items.map((i) => `${i.symbol}:${i.assetType}`).join(",")}_ns${noSparkline ? 1 : 0}`;
}

function notConfiguredOverview(fetchedAt: string): StockOverviewResponse {
  return {
    status: "not_configured",
    provider: "토스증권",
    fetchedAt,
    marketDivCode: "TOSS",
    quotes: [],
    marketIndices: [],
    rankings: emptyRankings(),
    themes: [],
    ipos: [],
    message: "TOSS_OPENAPI_CLIENT_ID / TOSS_OPENAPI_CLIENT_SECRET를 설정해야 토스증권 시세를 조회할 수 있습니다.",
  };
}

/**
 * 토스증권 Open API만으로 관심종목 오버뷰를 구성한다 (KRX 미사용).
 * - 시세(배치) + 종목별 일봉 + 마스터(배치)로 StockQuote 구성.
 * - 랭킹/테마/지수/IPO는 토스가 제공하지 않아 빈 값으로 반환한다.
 */
export async function fetchStockOverview(
  watchlistItems: WatchlistItem[],
  options: { noSparkline?: boolean; force?: boolean } = {},
): Promise<StockOverviewResponse> {
  const fetchedAt = new Date().toISOString();
  if (!isTossConfigured()) return notConfiguredOverview(fetchedAt);

  const resolvedItems = compactSymbols(watchlistItems.length > 0 ? watchlistItems : defaultStockWatchlist());
  const noSparkline = options.noSparkline ?? false;

  if (resolvedItems.length === 0) {
    return {
      status: "live",
      provider: "토스증권",
      fetchedAt,
      marketDivCode: "TOSS",
      quotes: [],
      marketIndices: [],
      rankings: emptyRankings(),
      themes: [],
      ipos: [],
    };
  }

  const windowInfo = getKrxMarketWindow();
  const cacheKey = makeOverviewCacheKey(resolvedItems, noSparkline);
  const cached = _overviewCache.get(cacheKey);
  if (!options.force && cached && cached.expiry > Date.now()) return cached.data;

  const symbols = resolvedItems.map((item) => item.symbol);
  const assetTypeBySymbol = new Map(resolvedItems.map((item) => [item.symbol, item.assetType]));
  const candleCount = noSparkline ? 2 : 60;
  const errors: string[] = [];

  // 시세(배치) + 마스터(배치) 병렬
  const [pricesR, masterR] = await Promise.allSettled([
    fetchTossPrices(symbols),
    fetchTossStockMaster(symbols),
  ]);

  const priceMap = new Map<string, number>(
    pricesR.status === "fulfilled" ? pricesR.value.map((p) => [p.symbol, p.lastPrice]) : [],
  );
  if (pricesR.status === "rejected") {
    errors.push(`prices: ${pricesR.reason instanceof Error ? pricesR.reason.message : "토스 시세 조회 실패"}`);
  }
  const masterMap = new Map<string, TossStockMaster>(
    masterR.status === "fulfilled" ? masterR.value.map((m) => [m.symbol, m]) : [],
  );

  // 종목별 일봉 (등락/OHLCV/스파크라인 산출)
  const candleResults = await Promise.allSettled(
    symbols.map((symbol) => fetchTossCandles(symbol, "1d", candleCount)),
  );

  const quotes: StockQuote[] = symbols.map((symbol, index) => {
    const candleResult = candleResults[index];
    const candles = candleResult?.status === "fulfilled" ? candleResult.value : null;
    if (candleResult?.status === "rejected") {
      errors.push(`${symbol}: ${candleResult.reason instanceof Error ? candleResult.reason.message : "토스 캔들 조회 실패"}`);
    }
    return buildTossQuote(
      symbol,
      priceMap.get(symbol) ?? 0,
      candles,
      masterMap.get(symbol),
      assetTypeBySymbol.get(symbol),
    );
  });

  // 관심종목 순서 유지
  const order = new Map(resolvedItems.map((item, i) => [item.symbol, i]));
  quotes.sort((a, b) => (order.get(a.symbol) ?? 999) - (order.get(b.symbol) ?? 999));

  const overview: StockOverviewResponse = {
    status: "live",
    provider: "토스증권",
    fetchedAt: new Date().toISOString(),
    baseDate: windowInfo.mostRecentTradingDay,
    marketDivCode: "TOSS",
    quotes,
    marketIndices: [],
    rankings: emptyRankings(),
    themes: [],
    ipos: [],
    ...(errors.length > 0 ? { errors, message: errors[0] } : {}),
  };

  _overviewCache.set(cacheKey, { data: overview, expiry: Date.now() + windowInfo.cacheTtlMs });
  return overview;
}
