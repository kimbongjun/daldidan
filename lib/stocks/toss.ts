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

// ── 지수·랭킹 (토스 가용 데이터 우회 구현) ────────────────────────
// 토스는 지수값/랭킹을 직접 제공하지 않으므로:
//  - 지수: 지수추종 ETF의 등락률을 "방향 프록시"로 사용 (price는 ETF lastPrice, 지수포인트 아님).
//  - 랭킹: 큐레이션된 ~30종목 universe에서 등락/거래대금/거래량으로 산출.

/** 지수 프록시 ETF 정의 (코스피200 ← KODEX 200, 코스닥150 ← KODEX 코스닥150) */
const INDEX_PROXIES: { indexName: string; symbol: string; fundName: string }[] = [
  { indexName: "코스피200", symbol: "069500", fundName: "KODEX 200" },
  { indexName: "코스닥150", symbol: "229200", fundName: "KODEX 코스닥150" },
];

/**
 * 랭킹 산출용 큐레이션 universe (대형주 30종목).
 * symbol-dictionary.ts 대표 종목에서 선별. ETF/지수프록시는 제외(순수 종목 랭킹).
 * 캔들 호출이 종목당 1회라 universe 크기는 30으로 고정(BASIC tier 레이트리밋 보호).
 */
const RANKING_UNIVERSE: string[] = [
  "005930", // 삼성전자
  "000660", // SK하이닉스
  "373220", // LG에너지솔루션
  "207940", // 삼성바이오로직스
  "005380", // 현대차
  "000270", // 기아
  "012330", // 현대모비스
  "035420", // NAVER
  "035720", // 카카오
  "051910", // LG화학
  "006400", // 삼성SDI
  "005490", // POSCO홀딩스
  "068270", // 셀트리온
  "105560", // KB금융
  "055550", // 신한지주
  "086790", // 하나금융지주
  "316140", // 우리금융지주
  "015760", // 한국전력
  "017670", // SK텔레콤
  "030200", // KT
  "033780", // KT&G
  "009150", // 삼성전기
  "042700", // 한미반도체
  "247540", // 에코프로비엠
  "086520", // 에코프로
  "196170", // 알테오젠
  "259960", // 크래프톤
  "323410", // 카카오뱅크
  "267250", // HD현대
  "010130", // 고려아연
];

const INDEX_RANKING_CANDLE_CHUNK = 8;

/** 배열을 size 단위 청크로 분할 (캔들 호출 버스트 방지) */
function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

/** 청크 단위로 순차 실행하여 종목별 캔들을 동시성 제한하에 조회 */
async function fetchCandlesChunked(
  symbols: string[],
  count: number,
  chunkSize: number,
): Promise<Map<string, TossCandlesResult>> {
  const map = new Map<string, TossCandlesResult>();
  for (const group of chunk(symbols, chunkSize)) {
    const results = await Promise.allSettled(group.map((sym) => fetchTossCandles(sym, "1d", count)));
    results.forEach((r, i) => {
      if (r.status === "fulfilled") map.set(group[i], r.value);
    });
  }
  return map;
}

export type MarketSnapshot = {
  marketIndices: StockQuote[];
  rankings: Record<StockRankingKind, StockRankingItem[]>;
};

function emptyMarketSnapshot(): MarketSnapshot {
  return { marketIndices: [], rankings: emptyRankings() };
}

/** 지수·랭킹 전용 캐시 (watchlist 무관) + single-flight (캐시 키 단위) */
const _marketSnapshotCache = new Map<string, { data: MarketSnapshot; expiry: number }>();
const _marketSnapshotInflight = new Map<string, Promise<MarketSnapshot>>();

/** quote → ranking item 변환 (kind/score는 호출부에서 부여) */
function quoteToRankingItem(
  quote: StockQuote,
  kind: StockRankingKind,
  rank: number,
  scoreLabel: string,
  scoreValue: number,
): StockRankingItem {
  return {
    kind,
    rank,
    symbol: quote.symbol,
    name: quote.name,
    price: quote.price,
    change: quote.change,
    changePct: quote.changePct,
    volume: quote.volume,
    tradingValue: quote.tradingValue,
    scoreLabel,
    scoreValue,
  };
}

/** 정렬·상위 10개 추출 → StockRankingItem[] (rank 1부터) */
function buildRanking(
  quotes: StockQuote[],
  kind: StockRankingKind,
  scoreLabel: string,
  scoreOf: (q: StockQuote) => number,
  desc: boolean,
): StockRankingItem[] {
  const sorted = [...quotes].sort((a, b) => (desc ? scoreOf(b) - scoreOf(a) : scoreOf(a) - scoreOf(b)));
  return sorted.slice(0, 10).map((q, i) => quoteToRankingItem(q, kind, i + 1, scoreLabel, scoreOf(q)));
}

/**
 * 지수(프록시 ETF) + 랭킹(universe)을 토스 가용 데이터로 산출한다.
 * 공유 배치(prices/master)는 universe+지수ETF 합집합으로 1회씩만 호출하고,
 * 종목별 캔들은 청크 단위로 동시성 제한하여 호출한다(BASIC tier 보호).
 */
async function computeMarketSnapshot(noSparkline: boolean): Promise<MarketSnapshot> {
  const indexSymbols = INDEX_PROXIES.map((p) => p.symbol);
  // 공유 배치 대상: 지수ETF + universe (중복 제거)
  const batchSymbols = [...new Set([...indexSymbols, ...RANKING_UNIVERSE])];

  const [pricesR, masterR] = await Promise.allSettled([
    fetchTossPrices(batchSymbols),
    fetchTossStockMaster(batchSymbols),
  ]);

  const priceMap = new Map<string, number>(
    pricesR.status === "fulfilled" ? pricesR.value.map((p) => [p.symbol, p.lastPrice]) : [],
  );
  const masterMap = new Map<string, TossStockMaster>(
    masterR.status === "fulfilled" ? masterR.value.map((m) => [m.symbol, m]) : [],
  );

  // 지수 프록시: 캔들 count 적게 (스파크라인 생략 시 2)
  const indexCandleCount = noSparkline ? 2 : 30;
  const indexCandleMap = await fetchCandlesChunked(indexSymbols, indexCandleCount, INDEX_RANKING_CANDLE_CHUNK);

  const marketIndices: StockQuote[] = INDEX_PROXIES.map((proxy) => {
    const quote = buildTossQuote(
      proxy.symbol,
      priceMap.get(proxy.symbol) ?? 0,
      indexCandleMap.get(proxy.symbol) ?? null,
      masterMap.get(proxy.symbol),
      "index",
    );
    // 후처리: 지수명/프록시 ETF명으로 표시 필드 덮어쓰기
    return { ...quote, name: proxy.indexName, englishName: proxy.fundName };
  });

  // 랭킹: universe 캔들 (등락률 필요 → count 2면 충분하나 거래량/거래대금도 c0에서 산출)
  const universeCandleMap = await fetchCandlesChunked(RANKING_UNIVERSE, 2, INDEX_RANKING_CANDLE_CHUNK);
  const universeQuotes: StockQuote[] = RANKING_UNIVERSE.map((sym) =>
    buildTossQuote(sym, priceMap.get(sym) ?? 0, universeCandleMap.get(sym) ?? null, masterMap.get(sym), "stock"),
  ).filter((q) => q.price > 0);

  const rankings: Record<StockRankingKind, StockRankingItem[]> = {
    rise: buildRanking(universeQuotes, "rise", "등락률", (q) => q.changePct, true),
    fall: buildRanking(universeQuotes, "fall", "등락률", (q) => q.changePct, false),
    amount: buildRanking(universeQuotes, "amount", "거래대금", (q) => q.tradingValue, true),
    volume: buildRanking(universeQuotes, "volume", "거래량", (q) => q.volume, true),
    popular: [], // 토스 인기 신호 없음 — 빈 배열 유지(조작 금지)
  };

  return { marketIndices, rankings };
}

/**
 * 지수·랭킹 스냅샷을 전용 캐시로 가져온다.
 * - 캐시 키: 시장 윈도우(거래일 + 장중/마감) — watchlist·30초 버킷과 무관한 coarse 키.
 * - TTL: 장중 max(cacheTtlMs, 3분), 장마감 다음 세션까지(cacheTtlMs).
 * - single-flight로 cold 동시 요청의 캔들 버스트를 방지한다.
 */
async function getMarketSnapshot(noSparkline: boolean, force: boolean): Promise<MarketSnapshot> {
  const windowInfo = getKrxMarketWindow();
  // coarse 키: 거래일 + 장중여부 + 스파크라인 여부 (30초 bucketKey 사용 금지)
  const cacheKey = `${windowInfo.mostRecentTradingDay}_${windowInfo.open ? "open" : "closed"}_ns${noSparkline ? 1 : 0}`;
  const cached = _marketSnapshotCache.get(cacheKey);
  if (!force && cached && cached.expiry > Date.now()) return cached.data;

  const inflight = _marketSnapshotInflight.get(cacheKey);
  if (inflight) return inflight;

  const promise = computeMarketSnapshot(noSparkline)
    .then((data) => {
      const ttl = windowInfo.open ? Math.max(windowInfo.cacheTtlMs, 180_000) : windowInfo.cacheTtlMs;
      _marketSnapshotCache.set(cacheKey, { data, expiry: Date.now() + ttl });
      _marketSnapshotInflight.delete(cacheKey);
      return data;
    })
    .catch((err: unknown) => {
      _marketSnapshotInflight.delete(cacheKey);
      throw err;
    });

  _marketSnapshotInflight.set(cacheKey, promise);
  return promise;
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

  // 지수·랭킹은 watchlist 무관 → 실패해도 quotes에 영향 없게 격리
  const snapshot = await getMarketSnapshot(noSparkline, options.force ?? false).catch(() => emptyMarketSnapshot());

  if (resolvedItems.length === 0) {
    return {
      status: "live",
      provider: "토스증권",
      fetchedAt,
      marketDivCode: "TOSS",
      quotes: [],
      marketIndices: snapshot.marketIndices,
      rankings: snapshot.rankings,
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
    marketIndices: snapshot.marketIndices,
    rankings: snapshot.rankings,
    themes: [],
    ipos: [],
    ...(errors.length > 0 ? { errors, message: errors[0] } : {}),
  };

  _overviewCache.set(cacheKey, { data: overview, expiry: Date.now() + windowInfo.cacheTtlMs });
  return overview;
}
