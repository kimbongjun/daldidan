import "server-only";

import {
  STOCK_RANKING_KINDS,
  type AssetType,
  type StockIpoItem,
  type StockOverviewResponse,
  type StockQuote,
  type StockRankingItem,
  type StockRankingKind,
  type StockSearchResult,
  type StockTheme,
  type WatchlistItem,
} from "@/lib/stocks/types";

const KRX_DOMAIN = "https://data-dbg.krx.co.kr";
const DEFAULT_SYMBOLS = ["005930", "000660", "035420", "005380"];

const MARKET_ENDPOINTS = [
  { market: "KOSPI", tradePath: "/svc/apis/sto/stk_bydd_trd", basePath: "/svc/apis/sto/stk_isu_base_info" },
  { market: "KOSDAQ", tradePath: "/svc/apis/sto/ksq_bydd_trd", basePath: "/svc/apis/sto/ksq_isu_base_info" },
  { market: "KONEX", tradePath: "/svc/apis/sto/knx_bydd_trd", basePath: "/svc/apis/sto/knx_isu_base_info" },
] as const;

const ETF_ENDPOINT = { market: "ETF", tradePath: "/svc/apis/etf/etf_bydd_trd" } as const;

const MAJOR_INDICES: { code: string; symbol: string; name: string }[] = [
  { code: "1", symbol: "IDX_1", name: "KOSPI 종합" },
  { code: "2", symbol: "IDX_2", name: "KOSDAQ 종합" },
  { code: "4", symbol: "IDX_4", name: "KOSPI 200" },
  { code: "5", symbol: "IDX_5", name: "KRX 300" },
];

const STATIC_INDEX_RESULTS: StockSearchResult[] = [
  { symbol: "IDX_1", name: "KOSPI 종합지수", market: "KRX", assetType: "index" },
  { symbol: "IDX_2", name: "KOSDAQ 종합지수", market: "KRX", assetType: "index" },
  { symbol: "IDX_4", name: "KOSPI 200", market: "KRX", assetType: "index" },
  { symbol: "IDX_5", name: "KRX 300", market: "KRX", assetType: "index" },
];

const INDEX_SEARCH_KEYWORDS = ["kospi", "kosdaq", "코스피", "코스닥", "지수", "krx", "200", "300"];

type KrxConfig = {
  authKey: string;
  domain: string;
};

type KrxApiResponse = {
  OutBlock_1?: Record<string, unknown>[];
  output?: Record<string, unknown>[];
};

function readConfig(): KrxConfig | null {
  const authKey =
    process.env.KRX_OPENAPI_KEY?.trim() ||
    process.env.KRX_AUTH_KEY?.trim() ||
    process.env.STOCK_KRX_AUTH_KEY?.trim() ||
    "";
  const domain = process.env.KRX_OPENAPI_BASE_URL?.trim() || KRX_DOMAIN;

  if (!authKey) return null;
  return { authKey, domain };
}

export function defaultStockWatchlist(): WatchlistItem[] {
  const raw = process.env.KRX_DEFAULT_SYMBOLS ?? "";
  const symbols = raw
    .split(",")
    .map((value) => sanitizeSymbol(value))
    .filter((value): value is string => Boolean(value));
  const list = symbols.length > 0 ? symbols.slice(0, 12) : DEFAULT_SYMBOLS;
  return list.map((symbol) => ({ symbol, assetType: "stock" as AssetType }));
}

/** @deprecated Use defaultStockWatchlist() instead */
export function defaultStockSymbols(): string[] {
  return defaultStockWatchlist().map((item) => item.symbol);
}

function sanitizeSymbol(value: string): string | null {
  const symbol = value.trim().toUpperCase();
  if (/^\d{6}$/.test(symbol)) return symbol;
  return null;
}

function sanitizeIndexSymbol(value: string): string | null {
  const sym = value.trim().toUpperCase();
  return /^IDX_\d+$/.test(sym) ? sym : null;
}

function compactSymbols(symbols: string[]): string[] {
  return [...new Set(symbols.map((value) => sanitizeSymbol(value)).filter((value): value is string => Boolean(value)))].slice(0, 12);
}

function toNumber(value: unknown): number {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (typeof value !== "string") return 0;
  const normalized = value.replace(/,/g, "").replace(/−/g, "-").trim();
  if (!normalized || normalized === "-") return 0;
  const num = Number(normalized);
  return Number.isFinite(num) ? num : 0;
}

function firstText(record: Record<string, unknown>, keys: string[]): string {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number" && Number.isFinite(value)) return String(value);
  }
  return "";
}

function formatKrxDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}${month}${day}`;
}

function normalizeDate(value: string): string {
  const digits = value.replace(/\D/g, "");
  if (digits.length !== 8) return value;
  return `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6, 8)}`;
}

function endOfDayTimestamp(baseDate: string): number {
  const year = parseInt(baseDate.slice(0, 4), 10);
  const month = parseInt(baseDate.slice(4, 6), 10) - 1;
  const day = parseInt(baseDate.slice(6, 8), 10);
  return new Date(year, month, day, 23, 59, 59, 999).getTime();
}

function toRows(data: KrxApiResponse): Record<string, unknown>[] {
  const rows = data.OutBlock_1 ?? data.output ?? [];
  return Array.isArray(rows) ? rows.filter((item): item is Record<string, unknown> => typeof item === "object" && item !== null) : [];
}

async function krxGet(config: KrxConfig, path: string, params: Record<string, string>): Promise<Record<string, unknown>[]> {
  const url = new URL(path, config.domain);
  Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value));

  const res = await fetch(url, {
    method: "GET",
    headers: {
      AUTH_KEY: config.authKey,
      accept: "application/json",
    },
    cache: "no-store",
    signal: AbortSignal.timeout(10_000),
  });

  if (!res.ok) throw new Error(`KRX Open API HTTP ${res.status}`);
  const data = (await res.json()) as KrxApiResponse;
  return toRows(data);
}

async function fetchMarketRows(config: KrxConfig, baseDate: string): Promise<Record<string, unknown>[]> {
  const results = await Promise.allSettled(
    MARKET_ENDPOINTS.map(async ({ market, tradePath }) => {
      const rows = await krxGet(config, tradePath, { basDd: baseDate });
      return rows.map((row) => ({ ...row, _market: market, _assetType: "stock" }));
    }),
  );

  const rows: Record<string, unknown>[] = [];
  const errors: string[] = [];
  results.forEach((result, index) => {
    if (result.status === "fulfilled") {
      rows.push(...result.value);
    } else {
      errors.push(`${MARKET_ENDPOINTS[index].market}: ${result.reason instanceof Error ? result.reason.message : "조회 실패"}`);
    }
  });

  if (rows.length === 0 && errors.length > 0) throw new Error(errors.join(" / "));
  return rows;
}

async function fetchEtfRows(config: KrxConfig, baseDate: string): Promise<Record<string, unknown>[]> {
  try {
    const rows = await krxGet(config, ETF_ENDPOINT.tradePath, { basDd: baseDate });
    return rows.map((row) => ({ ...row, _market: ETF_ENDPOINT.market, _assetType: "etf" }));
  } catch {
    return [];
  }
}

async function fetchIndexQuotes(config: KrxConfig, baseDate: string, indexCodes: string[]): Promise<StockQuote[]> {
  if (indexCodes.length === 0) return [];
  const results = await Promise.allSettled(
    indexCodes.map(async (code) => {
      const rows = await krxGet(config, "/svc/apis/idx/idx_ind_dd_trd", { basDd: baseDate, idxIndCd: code });
      return rows.flatMap((row) => {
        const quote = mapIndexQuote(row, baseDate, code);
        return quote.price > 0 ? [quote] : [];
      });
    }),
  );
  return results.flatMap((result) => (result.status === "fulfilled" ? result.value : []));
}

// 날짜별 마켓 rows 캐시 — 과거 날짜 데이터는 불변이므로 당일 자정까지 보존
const _dateRowCache = new Map<string, { rows: Record<string, unknown>[]; expiry: number }>();
const _dateRowFetching = new Map<string, Promise<Record<string, unknown>[]>>();

async function getCachedMarketRows(config: KrxConfig, baseDate: string): Promise<Record<string, unknown>[]> {
  const cached = _dateRowCache.get(baseDate);
  if (cached && cached.expiry > Date.now()) return cached.rows;

  const inflight = _dateRowFetching.get(baseDate);
  if (inflight) return inflight;

  const promise = fetchMarketRows(config, baseDate)
    .then((rows) => {
      if (rows.length > 0) {
        _dateRowCache.set(baseDate, { rows, expiry: endOfDayTimestamp(baseDate) });
      }
      _dateRowFetching.delete(baseDate);
      return rows;
    })
    .catch((err: unknown) => {
      _dateRowFetching.delete(baseDate);
      throw err;
    });

  _dateRowFetching.set(baseDate, promise);
  return promise;
}

async function fetchLatestMarketRows(config: KrxConfig): Promise<{ baseDate: string; rows: Record<string, unknown>[] }> {
  const today = new Date();
  for (let offset = 0; offset < 14; offset += 1) {
    const target = new Date(today.getTime() - offset * 86_400_000);
    const day = target.getDay();
    if (day === 0 || day === 6) continue;

    const baseDate = formatKrxDate(target);
    try {
      const rows = await getCachedMarketRows(config, baseDate);
      if (rows.length > 0) return { baseDate, rows };
    } catch {
      // 해당 날짜 데이터 없음, 다음 날짜 시도
    }
  }

  throw new Error("최근 14일 안에 조회 가능한 KRX 일별 매매정보가 없습니다.");
}

async function fetchHistory(config: KrxConfig, symbol: string, maxPoints = 18): Promise<number[]> {
  const today = new Date();

  // 후보 거래일 수집 (주말 제외, 버퍼 포함)
  const candidateDates: string[] = [];
  for (let offset = 0; offset < 45 && candidateDates.length < maxPoints + 10; offset += 1) {
    const target = new Date(today.getTime() - offset * 86_400_000);
    const day = target.getDay();
    if (day === 0 || day === 6) continue;
    candidateDates.push(formatKrxDate(target));
  }

  // 캐시를 공유하는 병렬 fetch — 여러 심볼이 같은 날짜를 재사용
  const results = await Promise.allSettled(
    candidateDates.map((baseDate) => getCachedMarketRows(config, baseDate)),
  );

  const values: number[] = [];
  for (let i = 0; i < results.length && values.length < maxPoints; i += 1) {
    const result = results[i];
    if (result.status !== "fulfilled" || result.value.length === 0) continue;
    const row = result.value.find((item) => firstText(item, ["ISU_CD", "isuCd"]) === symbol);
    const close = row ? toNumber(row.TDD_CLSPRC ?? row.tddClsprc) : 0;
    if (close > 0) values.push(close);
  }

  return values.reverse();
}

function mapQuote(record: Record<string, unknown>, baseDate: string, assetType: AssetType = "stock"): StockQuote {
  const symbol = firstText(record, ["ISU_CD", "isuCd"]);
  const change = toNumber(record.CMPPREVDD_PRC ?? record.cmpprevddPrc);
  const price = toNumber(record.TDD_CLSPRC ?? record.tddClsprc);

  return {
    symbol,
    name: firstText(record, ["ISU_ABBRV", "ISU_NM", "isuAbrv", "isuNm"]) || symbol,
    market: firstText(record, ["MKT_NM", "_market", "mktNm"]) || "KRX",
    assetType,
    price,
    change,
    changePct: toNumber(record.FLUC_RT ?? record.flucRt),
    volume: toNumber(record.ACC_TRDVOL ?? record.accTrdvol),
    tradingValue: toNumber(record.ACC_TRDVAL ?? record.accTrdval),
    open: toNumber(record.TDD_OPNPRC ?? record.tddOpnprc),
    high: toNumber(record.TDD_HGPRC ?? record.tddHgprc),
    low: toNumber(record.TDD_LWPRC ?? record.tddLwprc),
    previousClose: price - change,
    sparkline: [],
    fetchedAt: new Date().toISOString(),
    baseDate: normalizeDate(baseDate),
    source: "KRX",
  };
}

function mapIndexQuote(record: Record<string, unknown>, baseDate: string, indexCode: string): StockQuote {
  const change = toNumber(record.CMPPREVDD_IDX ?? record.cmpprevddIdx);
  const price = toNumber(record.CLSPRC_IDX ?? record.clsprcIdx);
  const idx = MAJOR_INDICES.find((i) => i.code === indexCode);

  return {
    symbol: `IDX_${indexCode}`,
    name: firstText(record, ["IDX_IND_NM", "idxIndNm"]) || idx?.name || `IDX_${indexCode}`,
    market: "KRX",
    assetType: "index",
    price,
    change,
    changePct: toNumber(record.FLUC_RT ?? record.flucRt),
    volume: toNumber(record.ACC_TRDVOL ?? record.accTrdvol),
    tradingValue: toNumber(record.ACC_TRDVAL ?? record.accTrdval),
    open: toNumber(record.OPNPRC_IDX ?? record.opnprcIdx),
    high: toNumber(record.HGPRC_IDX ?? record.hgprcIdx),
    low: toNumber(record.LWPRC_IDX ?? record.lwprcIdx),
    previousClose: price - change,
    sparkline: [],
    fetchedAt: new Date().toISOString(),
    baseDate: normalizeDate(baseDate),
    source: "KRX",
  };
}

function mapRanking(row: StockQuote, kind: StockRankingKind, index: number): StockRankingItem {
  const scoreValue =
    kind === "amount" ? row.tradingValue :
    kind === "volume" ? row.volume :
    kind === "popular" ? row.tradingValue + row.volume * Math.max(row.price, 1) :
    row.changePct;

  const scoreLabel =
    kind === "amount" ? "거래대금" :
    kind === "volume" ? "거래량" :
    kind === "popular" ? "시장관심" :
    "등락률";

  return {
    kind,
    rank: index + 1,
    symbol: row.symbol,
    name: row.name,
    price: row.price,
    change: row.change,
    changePct: row.changePct,
    volume: row.volume,
    tradingValue: row.tradingValue,
    scoreLabel,
    scoreValue,
  };
}

function buildRankings(quotes: StockQuote[], requestedKinds: StockRankingKind[]): Record<StockRankingKind, StockRankingItem[]> {
  const rankings = emptyRankings();
  // 랭킹은 주식 종목만 포함 (ETF·지수 제외)
  const common = quotes.filter((quote) => quote.symbol && quote.price > 0 && quote.assetType === "stock");

  requestedKinds.forEach((kind) => {
    const sorted = [...common].sort((a, b) => {
      if (kind === "amount") return b.tradingValue - a.tradingValue;
      if (kind === "volume") return b.volume - a.volume;
      if (kind === "rise") return b.changePct - a.changePct;
      if (kind === "fall") return a.changePct - b.changePct;
      return (b.tradingValue + b.volume * Math.max(b.price, 1)) - (a.tradingValue + a.volume * Math.max(a.price, 1));
    });
    rankings[kind] = sorted.slice(0, 20).map((quote, index) => mapRanking(quote, kind, index));
  });

  return rankings;
}

async function fetchIpos(config: KrxConfig, baseDate: string): Promise<StockIpoItem[]> {
  const rows = (
    await Promise.allSettled(
      MARKET_ENDPOINTS.map(async ({ market, basePath }) => {
        const data = await krxGet(config, basePath, { basDd: baseDate });
        return data.map((row) => ({ ...row, _market: market }));
      }),
    )
  ).flatMap((result) => result.status === "fulfilled" ? result.value : []);

  const cutoff = Date.now() - 180 * 86_400_000;
  return rows
    .map((row, index) => {
      const symbol = firstText(row, ["ISU_CD", "isuCd"]);
      const listingDate = normalizeDate(firstText(row, ["LIST_DD", "listDd", "LIST_DT", "lstgDt"]));
      const listingTime = Date.parse(listingDate);
      return {
        id: `${symbol || "listing"}-${listingDate || index}`,
        symbol,
        name: firstText(row, ["ISU_ABBRV", "ISU_NM", "isuAbrv", "isuNm"]) || symbol || "신규 상장",
        market: firstText(row, ["MKT_NM", "_market", "mktNm"]) || "KRX",
        category: firstText(row, ["SECUGRP_NM", "SECT_TP_NM", "secugrpNm", "sectTpNm"]) || "신규상장",
        listingDate,
        detailUrl: symbol ? `https://kind.krx.co.kr/corpgeneral/corpList.do?method=loadInitPage&searchText=${encodeURIComponent(symbol)}` : "https://kind.krx.co.kr",
        _listingTime: Number.isFinite(listingTime) ? listingTime : 0,
      };
    })
    .filter((item) => item._listingTime >= cutoff)
    .sort((a, b) => b._listingTime - a._listingTime)
    .slice(0, 12)
    .map((item) => ({
      id: item.id,
      symbol: item.symbol,
      name: item.name,
      market: item.market,
      category: item.category,
      listingDate: item.listingDate,
      detailUrl: item.detailUrl,
    }));
}

const THEME_RULES = [
  { label: "반도체", keywords: ["삼성", "하이닉스", "반도체", "한미반도체", "DB하이텍", "리노공업"] },
  { label: "2차전지", keywords: ["에코프로", "포스코", "LG에너지", "삼성SDI", "엘앤에프", "천보"] },
  { label: "바이오", keywords: ["바이오", "셀트리온", "제약", "신약", "헬스", "메디"] },
  { label: "AI/소프트웨어", keywords: ["NAVER", "카카오", "AI", "소프트", "데이터", "더존"] },
  { label: "자동차", keywords: ["현대차", "기아", "모비스", "만도", "타이어"] },
  { label: "금융", keywords: ["금융", "은행", "증권", "보험", "KB", "신한", "하나"] },
  { label: "방산/조선", keywords: ["한화", "현대로템", "조선", "중공업", "방산", "LIG"] },
];

function buildThemes(rankings: Record<StockRankingKind, StockRankingItem[]>): StockTheme[] {
  const source = [...rankings.rise, ...rankings.amount].filter((item) => item.name);
  return THEME_RULES.map((rule) => {
    const matches = source.filter((item) => rule.keywords.some((keyword) => item.name.toUpperCase().includes(keyword.toUpperCase())));
    const avgChangePct = matches.length > 0
      ? matches.reduce((sum, item) => sum + item.changePct, 0) / matches.length
      : 0;
    return {
      label: rule.label,
      count: matches.length,
      avgChangePct,
      leaders: matches.slice(0, 3).map((item) => item.name),
      tone: avgChangePct > 0.5 ? "hot" : avgChangePct < -0.5 ? "cool" : "neutral",
    } satisfies StockTheme;
  })
    .filter((theme) => theme.count > 0)
    .sort((a, b) => b.count - a.count || b.avgChangePct - a.avgChangePct)
    .slice(0, 5);
}

function emptyRankings(): Record<StockRankingKind, StockRankingItem[]> {
  return {
    amount: [],
    volume: [],
    rise: [],
    fall: [],
    popular: [],
  };
}

// 5분 TTL 모듈 캐시 — fetchStockOverview 결과 캐싱
const _overviewCache = new Map<string, { data: StockOverviewResponse; expiry: number }>();

function makeOverviewCacheKey(items: WatchlistItem[], kinds: StockRankingKind[]): string {
  const itemKey = [...items].sort((a, b) => a.symbol.localeCompare(b.symbol)).map((i) => `${i.symbol}:${i.assetType}`).join(",");
  return `${itemKey}_${[...kinds].sort().join(",")}`;
}

export async function fetchStockOverview(
  watchlistItems: WatchlistItem[],
  requestedRankingKinds: StockRankingKind[] = [...STOCK_RANKING_KINDS],
): Promise<StockOverviewResponse> {
  const fetchedAt = new Date().toISOString();
  const config = readConfig();

  const resolvedItems = watchlistItems.length > 0 ? watchlistItems : defaultStockWatchlist();

  if (!config) {
    return {
      status: "not_configured",
      provider: "KRX Open API",
      fetchedAt,
      marketDivCode: "KRX",
      quotes: [],
      rankings: emptyRankings(),
      themes: [],
      ipos: [],
      message: "KRX_OPENAPI_KEY 또는 KRX_AUTH_KEY를 설정해야 한국거래소 일별 매매정보를 조회할 수 있습니다.",
    };
  }

  // 5분 캐시 확인
  const cacheKey = makeOverviewCacheKey(resolvedItems, requestedRankingKinds);
  const cachedOverview = _overviewCache.get(cacheKey);
  if (cachedOverview && cachedOverview.expiry > Date.now()) return cachedOverview.data;

  try {
    const { baseDate, rows } = await fetchLatestMarketRows(config);

    // ETF rows 병렬 취득
    const etfRows = await fetchEtfRows(config, baseDate);
    const allRows = [...rows, ...etfRows];

    // 전체 quote map (주식 + ETF)
    const allQuotes = allRows.map((row) => {
      const at: AssetType = row._assetType === "etf" ? "etf" : "stock";
      return mapQuote(row, baseDate, at);
    });
    const quoteMap = new Map(allQuotes.map((quote) => [quote.symbol, quote]));

    // 주식/ETF watchlist 심볼 quotes
    const stockEtfItems = resolvedItems.filter((item) => item.assetType !== "index");
    const stockEtfSymbols = compactSymbols(stockEtfItems.map((item) => item.symbol));
    const stockEtfQuotes = stockEtfSymbols
      .map((symbol) => quoteMap.get(symbol))
      .filter((quote): quote is StockQuote => Boolean(quote));

    // 지수 watchlist
    const indexCodes = resolvedItems
      .filter((item) => item.assetType === "index")
      .map((item) => item.symbol.replace("IDX_", ""))
      .filter((code) => /^\d+$/.test(code));

    // 스파크라인 — 주식/ETF만 (지수는 별도 처리 필요)
    const historyResults = await Promise.allSettled(stockEtfQuotes.map((quote) => fetchHistory(config, quote.symbol)));
    const quotesWithHistory = stockEtfQuotes.map((quote, index) => ({
      ...quote,
      sparkline: historyResults[index]?.status === "fulfilled" ? historyResults[index].value : [],
    }));

    // 지수 quotes
    const indexQuotes = await fetchIndexQuotes(config, baseDate, indexCodes);

    // watchlist 순서 유지 (주식/ETF → 지수)
    const symbolOrder = new Map(resolvedItems.map((item, i) => [item.symbol, i]));
    const allWatchlistQuotes = [...quotesWithHistory, ...indexQuotes].sort((a, b) => {
      const ia = symbolOrder.get(a.symbol) ?? 999;
      const ib = symbolOrder.get(b.symbol) ?? 999;
      return ia - ib;
    });

    const rankings = buildRankings(allQuotes, requestedRankingKinds);
    const errors = historyResults.flatMap((result, index) =>
      result.status === "rejected"
        ? [`${stockEtfQuotes[index].symbol}: ${result.reason instanceof Error ? result.reason.message : "차트 조회 실패"}`]
        : [],
    );

    let ipos: StockIpoItem[] = [];
    try {
      ipos = await fetchIpos(config, baseDate);
    } catch (error) {
      errors.push(`listing: ${error instanceof Error ? error.message : "상장정보 조회 실패"}`);
    }

    const overviewResult: StockOverviewResponse = {
      status: "live",
      provider: "KRX Open API",
      fetchedAt: new Date().toISOString(),
      baseDate: normalizeDate(baseDate),
      marketDivCode: "KRX",
      quotes: allWatchlistQuotes,
      rankings,
      themes: buildThemes(rankings),
      ipos,
      ...(errors.length > 0 ? { errors, message: errors[0] } : {}),
    };

    // 성공 결과만 캐시 저장 (5분)
    _overviewCache.set(cacheKey, { data: overviewResult, expiry: Date.now() + 300_000 });
    return overviewResult;
  } catch (error) {
    return {
      status: "error",
      provider: "KRX Open API",
      fetchedAt: new Date().toISOString(),
      marketDivCode: "KRX",
      quotes: [],
      rankings: emptyRankings(),
      themes: [],
      ipos: [],
      message: error instanceof Error ? error.message : "한국거래소 데이터를 불러오지 못했습니다.",
    };
  }
}

// 1시간 TTL 모듈 캐시 — 검색 전용 (주식 + ETF 통합)
let _rowCache: { rows: Record<string, unknown>[]; expiry: number } | null = null;

async function getCachedRows(config: KrxConfig): Promise<Record<string, unknown>[]> {
  if (_rowCache && _rowCache.expiry > Date.now()) return _rowCache.rows;
  const { baseDate, rows: stockRows } = await fetchLatestMarketRows(config);
  const etfRows = await fetchEtfRows(config, baseDate);
  const allRows = [...stockRows, ...etfRows];
  _rowCache = { rows: allRows, expiry: Date.now() + 3_600_000 };
  return allRows;
}

export async function searchStocks(query: string, limit = 8): Promise<StockSearchResult[]> {
  const config = readConfig();
  const q = query.trim();
  if (!config || !q) return [];

  const rows = await getCachedRows(config);
  const upper = q.toUpperCase();

  const scored: (StockSearchResult & { score: number })[] = [];

  for (const row of rows) {
    const symbol = firstText(row, ["ISU_CD", "isuCd"]);
    const name = firstText(row, ["ISU_ABBRV", "ISU_NM", "isuAbrv", "isuNm"]);
    const market = firstText(row, ["MKT_NM", "_market", "mktNm"]) || "KRX";
    if (!symbol || !name) continue;

    const rowAssetType: AssetType = row._assetType === "etf" ? "etf" : "stock";
    const nameUpper = name.toUpperCase();
    const symbolMatch = symbol === upper;
    const symbolContains = symbol.includes(upper);
    const nameStarts = nameUpper.startsWith(upper);
    const nameContains = nameUpper.includes(upper);

    if (!symbolMatch && !symbolContains && !nameContains) continue;

    const score = symbolMatch ? 100 : nameStarts ? 60 : symbolContains ? 40 : 10;
    scored.push({ symbol, name, market, assetType: rowAssetType, score });
  }

  const stockEtfResults = scored
    .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name, "ko"))
    .slice(0, limit)
    .map(({ symbol, name, market, assetType }) => ({ symbol, name, market, assetType }));

  // 지수 관련 검색어면 정적 지수 목록 추가
  const lowerQ = q.toLowerCase();
  const includesIndexKeyword = INDEX_SEARCH_KEYWORDS.some((kw) => lowerQ.includes(kw));
  if (includesIndexKeyword) {
    const matchedIndices = STATIC_INDEX_RESULTS.filter(
      (idx) => idx.name.toLowerCase().includes(lowerQ) || idx.symbol.toLowerCase().includes(lowerQ) || lowerQ.includes(idx.name.toLowerCase().split(" ")[0]),
    );
    const combined = [...stockEtfResults, ...matchedIndices];
    const seen = new Set<string>();
    return combined
      .filter((r) => { if (seen.has(r.symbol)) return false; seen.add(r.symbol); return true; })
      .slice(0, limit);
  }

  return stockEtfResults;
}

export { sanitizeIndexSymbol };
