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

const ETF_ENDPOINT = { market: "ETF", tradePath: "/svc/apis/etp/etf_bydd_trd" } as const;

const INDEX_ENDPOINTS = [
  { market: "KRX", tradePath: "/svc/apis/idx/krx_dd_trd" },
  { market: "KOSPI", tradePath: "/svc/apis/idx/kospi_dd_trd" },
  { market: "KOSDAQ", tradePath: "/svc/apis/idx/kosdaq_dd_trd" },
] as const;

const MAJOR_INDICES: { code: string; symbol: string; name: string; aliases: string[] }[] = [
  { code: "1", symbol: "IDX_1", name: "KOSPI 종합", aliases: ["KOSPI", "코스피", "코스피지수"] },
  { code: "2", symbol: "IDX_2", name: "KOSDAQ 종합", aliases: ["KOSDAQ", "코스닥", "코스닥지수"] },
  { code: "4", symbol: "IDX_4", name: "KOSPI 200", aliases: ["KOSPI 200", "코스피 200"] },
  { code: "5", symbol: "IDX_5", name: "KRX 300", aliases: ["KRX 300"] },
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

type NaverIntegrationResponse = {
  totalInfos?: { code?: string; value?: string }[];
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
  if (/^Q?\d{6}$/.test(symbol) || /^[A-Z0-9]{6}$/.test(symbol)) return symbol;
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

function infoValue(items: { code?: string; value?: string }[], code: string): string {
  return items.find((item) => item.code === code)?.value?.trim() ?? "";
}

async function fetchNaverIntegration(symbol: string): Promise<Partial<StockQuote>> {
  const res = await fetch(`https://m.stock.naver.com/api/stock/${encodeURIComponent(symbol)}/integration`, {
    method: "GET",
    headers: { accept: "application/json" },
    cache: "no-store",
    signal: AbortSignal.timeout(5_000),
  });
  if (!res.ok) throw new Error(`Naver integration HTTP ${res.status}`);
  const data = (await res.json()) as NaverIntegrationResponse;
  const infos = Array.isArray(data.totalInfos) ? data.totalInfos : [];
  const high52 = toNumber(infoValue(infos, "highPriceOf52Weeks"));
  const low52 = toNumber(infoValue(infos, "lowPriceOf52Weeks"));
  return {
    ...(high52 > 0 ? { fiftyTwoWeekHigh: high52 } : {}),
    ...(low52 > 0 ? { fiftyTwoWeekLow: low52 } : {}),
    per: infoValue(infos, "per") || infoValue(infos, "cnsPer"),
    pbr: infoValue(infos, "pbr"),
    eps: infoValue(infos, "eps") || infoValue(infos, "cnsEps"),
    dividendYield: infoValue(infos, "dividendYieldRatio"),
    foreignRate: infoValue(infos, "foreignRate"),
  };
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
  const wanted = new Set(indexCodes);
  const results = await Promise.allSettled(
    INDEX_ENDPOINTS.map(async ({ tradePath }) => {
      const rows = await krxGet(config, tradePath, { basDd: baseDate });
      return rows.flatMap((row) => {
        const quote = mapIndexQuote(row, baseDate);
        if (!quote.symbol || quote.price <= 0) return [];
        const code = quote.symbol.replace("IDX_", "");
        return wanted.has(code) ? [quote] : [];
      });
    }),
  );
  const seen = new Set<string>();
  return results
    .flatMap((result) => (result.status === "fulfilled" ? result.value : []))
    .filter((quote) => {
      if (seen.has(quote.symbol)) return false;
      seen.add(quote.symbol);
      return true;
    });
}

function stripHtml(value: string): string {
  return value.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

async function fetchMainPageIndexQuotes(baseDate: string, indexCodes: string[]): Promise<StockQuote[]> {
  if (indexCodes.length === 0) return [];
  const wanted = new Set(indexCodes);
  const response = await fetch("https://indices.krx.co.kr/main/main.jsp", {
    method: "GET",
    headers: { accept: "text/html" },
    cache: "no-store",
    signal: AbortSignal.timeout(8_000),
  });
  if (!response.ok) throw new Error(`KRX index fallback HTTP ${response.status}`);
  const html = await response.text();
  const results: StockQuote[] = [];
  const blockRe = /<div class="index-info_wap">([\s\S]*?)<\/div>\s*<\/div>\s*<\/div>/g;
  let match: RegExpExecArray | null;
  while ((match = blockRe.exec(html)) !== null) {
    const block = match[1];
    const name = stripHtml(block.match(/<span class="index-name">([\s\S]*?)<\/span>/)?.[1] ?? "");
    if (!name) continue;
    const meta = MAJOR_INDICES.find((idx) => idx.aliases.some((alias) => alias.toUpperCase() === name.toUpperCase()));
    if (!meta || !wanted.has(meta.code)) continue;

    const price = toNumber(stripHtml(block.match(/<span class="index-price">([\s\S]*?)<\/span>/)?.[1] ?? ""));
    const changeText = stripHtml(block.match(/<span class="index-(?:up|down|same)">([\s\S]*?)<\/span>/)?.[1] ?? "");
    const sign = changeText.includes("▼") ? -1 : 1;
    const numbers = changeText.match(/[\d,.]+/g) ?? [];
    const change = sign * toNumber(numbers[0] ?? "0");
    const changePct = sign * toNumber(numbers[1] ?? "0");
    if (price <= 0) continue;

    results.push({
      symbol: meta.symbol,
      name: meta.name,
      market: "KRX",
      assetType: "index",
      price,
      change,
      changePct,
      volume: 0,
      tradingValue: 0,
      open: 0,
      high: Math.max(price, price - change),
      low: Math.min(price, price - change),
      previousClose: price - change,
      sparkline: [],
      fetchedAt: new Date().toISOString(),
      baseDate: normalizeDate(baseDate),
      source: "KRX",
    });
  }
  return results;
}

async function fetchIndexQuotesWithFallback(config: KrxConfig, baseDate: string, indexCodes: string[]): Promise<StockQuote[]> {
  const requested = [...new Set(indexCodes)].filter((code) => /^\d+$/.test(code));
  if (requested.length === 0) return [];
  const openApiQuotes = await fetchIndexQuotes(config, baseDate, requested);
  const missing = requested.filter((code) => !openApiQuotes.some((quote) => quote.symbol === `IDX_${code}`));
  if (missing.length === 0) return openApiQuotes;
  try {
    const fallbackQuotes = await fetchMainPageIndexQuotes(baseDate, missing);
    return [...openApiQuotes, ...fallbackQuotes];
  } catch {
    return openApiQuotes;
  }
}

// 날짜별 마켓 rows 캐시 — 과거 날짜 데이터는 불변이므로 당일 자정까지 보존
const _dateRowCache = new Map<string, { rows: Record<string, unknown>[]; expiry: number }>();
const _dateRowFetching = new Map<string, Promise<Record<string, unknown>[]>>();
const _dateEtfRowCache = new Map<string, { rows: Record<string, unknown>[]; expiry: number }>();
const _dateEtfRowFetching = new Map<string, Promise<Record<string, unknown>[]>>();

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

async function getCachedEtfRows(config: KrxConfig, baseDate: string): Promise<Record<string, unknown>[]> {
  const cached = _dateEtfRowCache.get(baseDate);
  if (cached && cached.expiry > Date.now()) return cached.rows;

  const inflight = _dateEtfRowFetching.get(baseDate);
  if (inflight) return inflight;

  const promise = fetchEtfRows(config, baseDate)
    .then((rows) => {
      if (rows.length > 0) {
        _dateEtfRowCache.set(baseDate, { rows, expiry: endOfDayTimestamp(baseDate) });
      }
      _dateEtfRowFetching.delete(baseDate);
      return rows;
    })
    .catch((err: unknown) => {
      _dateEtfRowFetching.delete(baseDate);
      throw err;
    });

  _dateEtfRowFetching.set(baseDate, promise);
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

async function fetchHistory(config: KrxConfig, symbol: string, assetType: AssetType = "stock", maxPoints = 10): Promise<number[]> {
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
    candidateDates.map((baseDate) => assetType === "etf" ? getCachedEtfRows(config, baseDate) : getCachedMarketRows(config, baseDate)),
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
  const high = toNumber(record.TDD_HGPRC ?? record.tddHgprc);
  const low = toNumber(record.TDD_LWPRC ?? record.tddLwprc);

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
    high,
    low,
    previousClose: price - change,
    sparkline: [],
    fiftyTwoWeekHigh: Math.max(price, high),
    fiftyTwoWeekLow: Math.min(price, low || price),
    marketCap: toNumber(record.MKTCAP ?? record.mktcap),
    listedShares: toNumber(record.LIST_SHRS ?? record.listShrs),
    nav: toNumber(record.NAV ?? record.nav),
    aum: toNumber(record.INVSTASST_NETASST_TOTAMT ?? record.invstasstNetasstTotamt),
    underlyingIndex: firstText(record, ["IDX_IND_NM", "idxIndNm"]),
    fetchedAt: new Date().toISOString(),
    baseDate: normalizeDate(baseDate),
    source: "KRX",
  };
}

function mapIndexQuote(record: Record<string, unknown>, baseDate: string): StockQuote {
  const rawName = firstText(record, ["IDX_NM", "IDX_IND_NM", "idxNm", "idxIndNm"]);
  const idx = MAJOR_INDICES.find((i) => {
    const upperName = rawName.toUpperCase();
    return i.aliases.some((alias) => alias.toUpperCase() === upperName);
  });
  const change = toNumber(record.CMPPREVDD_IDX ?? record.cmpprevddIdx ?? record.CMPPREVDD_PRC ?? record.cmpprevddPrc);
  const price = toNumber(record.CLSPRC_IDX ?? record.clsprcIdx ?? record.TDD_CLSPRC ?? record.tddClsprc);
  const high = toNumber(record.HGPRC_IDX ?? record.hgprcIdx ?? record.TDD_HGPRC ?? record.tddHgprc);
  const low = toNumber(record.LWPRC_IDX ?? record.lwprcIdx ?? record.TDD_LWPRC ?? record.tddLwprc);

  return {
    symbol: idx?.symbol ?? "",
    name: idx?.name ?? rawName,
    market: "KRX",
    assetType: "index",
    price,
    change,
    changePct: toNumber(record.FLUC_RT ?? record.flucRt),
    volume: toNumber(record.ACC_TRDVOL ?? record.accTrdvol),
    tradingValue: toNumber(record.ACC_TRDVAL ?? record.accTrdval),
    open: toNumber(record.OPNPRC_IDX ?? record.opnprcIdx),
    high,
    low,
    previousClose: price - change,
    sparkline: [],
    fiftyTwoWeekHigh: Math.max(price, high),
    fiftyTwoWeekLow: Math.min(price, low || price),
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
      members: matches.slice(0, 8),
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

function makeOverviewCacheKey(items: WatchlistItem[], kinds: StockRankingKind[], noSparkline = false): string {
  const itemKey = items.map((i) => `${i.symbol}:${i.assetType}`).join(",");
  return `${itemKey}_${[...kinds].sort().join(",")}_ns${noSparkline ? 1 : 0}`;
}

export async function fetchStockOverview(
  watchlistItems: WatchlistItem[],
  requestedRankingKinds: StockRankingKind[] = [...STOCK_RANKING_KINDS],
  options: { noSparkline?: boolean } = {},
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
      marketIndices: [],
      rankings: emptyRankings(),
      themes: [],
      ipos: [],
      message: "KRX_OPENAPI_KEY 또는 KRX_AUTH_KEY를 설정해야 한국거래소 일별 매매정보를 조회할 수 있습니다.",
    };
  }

  // 5분 캐시 확인 (noSparkline 버전과 full 버전 분리)
  const cacheKey = makeOverviewCacheKey(resolvedItems, requestedRankingKinds, options.noSparkline ?? false);
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

    // 지수 watchlist + 관심 탭 상단 고정 지수
    const requestedIndexCodes = resolvedItems
      .filter((item) => item.assetType === "index")
      .map((item) => item.symbol.replace("IDX_", ""))
      .filter((code) => /^\d+$/.test(code));
    const fixedIndexCodes = ["1", "2"];
    const indexCodes = [...new Set([...fixedIndexCodes, ...requestedIndexCodes])];

    // 스파크라인 — noSparkline 모드면 스킵해서 빠르게 반환
    let quotesWithHistory: StockQuote[];
    const errors: string[] = [];
    if (options.noSparkline) {
      quotesWithHistory = stockEtfQuotes.map((quote) => ({ ...quote, sparkline: [] }));
    } else {
      const historyResults = await Promise.allSettled(stockEtfQuotes.map((quote) => fetchHistory(config, quote.symbol, quote.assetType)));
      quotesWithHistory = stockEtfQuotes.map((quote, index) => ({
        ...quote,
        sparkline: historyResults[index]?.status === "fulfilled" ? historyResults[index].value : [],
        fiftyTwoWeekHigh: Math.max(quote.fiftyTwoWeekHigh ?? quote.price, ...(historyResults[index]?.status === "fulfilled" ? historyResults[index].value : [])),
        fiftyTwoWeekLow: Math.min(quote.fiftyTwoWeekLow ?? quote.price, ...(historyResults[index]?.status === "fulfilled" ? historyResults[index].value : [])),
      }));
      historyResults.forEach((result, index) => {
        if (result.status === "rejected") {
          errors.push(`${stockEtfQuotes[index].symbol}: ${result.reason instanceof Error ? result.reason.message : "차트 조회 실패"}`);
        }
      });
      const integrationResults = await Promise.allSettled(stockEtfQuotes.map((quote) => fetchNaverIntegration(quote.symbol)));
      quotesWithHistory = quotesWithHistory.map((quote, index) => ({
        ...quote,
        ...(integrationResults[index]?.status === "fulfilled" ? integrationResults[index].value : {}),
      }));
    }

    // 지수 quotes
    const indexQuotes = await fetchIndexQuotesWithFallback(config, baseDate, indexCodes);
    const marketIndices = indexQuotes
      .filter((quote) => fixedIndexCodes.includes(quote.symbol.replace("IDX_", "")))
      .sort((a, b) => fixedIndexCodes.indexOf(a.symbol.replace("IDX_", "")) - fixedIndexCodes.indexOf(b.symbol.replace("IDX_", "")));

    // watchlist 순서 유지 (주식/ETF → 지수)
    const symbolOrder = new Map(resolvedItems.map((item, i) => [item.symbol, i]));
    const requestedIndexSymbols = new Set(resolvedItems.filter((item) => item.assetType === "index").map((item) => item.symbol));
    const watchlistIndexQuotes = indexQuotes.filter((quote) => requestedIndexSymbols.has(quote.symbol));
    const allWatchlistQuotes = [...quotesWithHistory, ...watchlistIndexQuotes].sort((a, b) => {
      const ia = symbolOrder.get(a.symbol) ?? 999;
      const ib = symbolOrder.get(b.symbol) ?? 999;
      return ia - ib;
    });

    const rankings = buildRankings(allQuotes, requestedRankingKinds);

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
      marketIndices,
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
      marketIndices: [],
      rankings: emptyRankings(),
      themes: [],
      ipos: [],
      message: error instanceof Error ? error.message : "한국거래소 데이터를 불러오지 못했습니다.",
    };
  }
}

// 1시간 TTL 모듈 캐시 — 검색 전용 (주식·ETF 분리 캐시)
let _searchStockCache: { rows: Record<string, unknown>[]; baseDate: string; expiry: number } | null = null;
let _searchEtfCache: { rows: Record<string, unknown>[]; baseDate: string; expiry: number } | null = null;

async function getCachedRows(config: KrxConfig): Promise<Record<string, unknown>[]> {
  const now = Date.now();

  // 주식 rows
  let stockRows: Record<string, unknown>[];
  let baseDate: string;
  if (_searchStockCache && _searchStockCache.expiry > now) {
    stockRows = _searchStockCache.rows;
    baseDate = _searchStockCache.baseDate;
  } else {
    const result = await fetchLatestMarketRows(config);
    baseDate = result.baseDate;
    stockRows = result.rows;
    _searchStockCache = { rows: stockRows, baseDate, expiry: now + 3_600_000 };
  }

  // ETF rows — 별도 캐시: fetch 실패 시 다음 요청에서 재시도 허용
  let etfRows: Record<string, unknown>[];
  if (_searchEtfCache && _searchEtfCache.expiry > now && _searchEtfCache.baseDate === baseDate) {
    etfRows = _searchEtfCache.rows;
  } else {
    etfRows = await fetchEtfRows(config, baseDate);
    if (etfRows.length > 0) {
      _searchEtfCache = { rows: etfRows, baseDate, expiry: now + 3_600_000 };
    }
  }

  return [...stockRows, ...etfRows];
}

export async function searchStocks(query: string, limit = 10): Promise<StockSearchResult[]> {
  const q = query.trim();
  if (!q) return [];

  const lowerQ = q.toLowerCase();
  const upper = q.toUpperCase();

  // 지수는 config 없어도 정적 목록에서 항상 검색
  const matchedIndices = STATIC_INDEX_RESULTS.filter((idx) => {
    const nameLower = idx.name.toLowerCase();
    return (
      nameLower.includes(lowerQ) ||
      idx.symbol.toLowerCase().includes(lowerQ) ||
      INDEX_SEARCH_KEYWORDS.some((kw) => lowerQ.includes(kw) && nameLower.includes(kw))
    );
  });

  const config = readConfig();
  if (!config) return matchedIndices.slice(0, limit);

  const rows = await getCachedRows(config);
  const scored: (StockSearchResult & { score: number })[] = [];

  for (const row of rows) {
    const symbol = firstText(row, ["ISU_CD", "isuCd"]);
    const name = firstText(row, ["ISU_ABBRV", "ISU_NM", "isuAbrv", "isuNm"]);
    const market = firstText(row, ["MKT_NM", "_market", "mktNm"]) || "KRX";
    if (!symbol || !name) continue;

    const rowAssetType: AssetType = row._assetType === "etf" ? "etf" : "stock";
    const nameUpper = name.toUpperCase();
    const symbolExact = symbol === upper;
    const symbolContains = symbol.includes(upper);
    const nameStarts = nameUpper.startsWith(upper);
    const nameContains = nameUpper.includes(upper);

    if (!symbolExact && !symbolContains && !nameContains) continue;

    const score = symbolExact ? 100 : nameStarts ? 60 : symbolContains ? 40 : 10;
    scored.push({ symbol, name, market, assetType: rowAssetType, score });
  }

  const stockEtfResults = scored
    .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name, "ko"))
    .slice(0, limit)
    .map(({ symbol, name, market, assetType }) => ({ symbol, name, market, assetType }));

  // 지수 결과 병합 (중복 제거)
  const seen = new Set(stockEtfResults.map((r) => r.symbol));
  const combined = [
    ...stockEtfResults,
    ...matchedIndices.filter((r) => !seen.has(r.symbol)),
  ];

  return combined.slice(0, limit);
}

export { sanitizeIndexSymbol };
