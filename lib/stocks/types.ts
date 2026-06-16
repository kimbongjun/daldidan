export const STOCK_RANKING_KINDS = ["amount", "volume", "rise", "fall", "popular"] as const;

export type StockRankingKind = (typeof STOCK_RANKING_KINDS)[number];

export type StockApiStatus = "live" | "not_configured" | "error";

export type AssetType = "stock" | "etf" | "index";

export interface WatchlistItem {
  symbol: string;
  assetType: AssetType;
}

export interface StockQuote {
  symbol: string;
  name: string;
  market: string;
  assetType: AssetType;
  price: number;
  change: number;
  changePct: number;
  volume: number;
  tradingValue: number;
  open: number;
  high: number;
  low: number;
  previousClose: number;
  sparkline: number[];
  fiftyTwoWeekHigh?: number;
  fiftyTwoWeekLow?: number;
  marketCap?: number;
  listedShares?: number;
  nav?: number;
  aum?: number;
  underlyingIndex?: string;
  // ── 토스 마스터(/api/v1/stocks) 파생 필드 ──
  englishName?: string;
  isinCode?: string;
  securityType?: string;
  listDate?: string;
  delistDate?: string | null;
  /** NXT(대체거래소) 거래 지원 여부 */
  nxtSupported?: boolean;
  /** 레버리지/인버스 배수 (해당 시) */
  leverageFactor?: number | null;
  fetchedAt: string;
  baseDate: string;
  source: "KRX" | "TOSS";
}

export type CandleInterval = "1d" | "1m";

export interface Candle {
  timestamp: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface OrderbookLevel {
  price: number;
  volume: number;
}

export interface Orderbook {
  timestamp: string;
  currency: string;
  asks: OrderbookLevel[];
  bids: OrderbookLevel[];
}

export interface TradeTick {
  price: number;
  volume: number;
  timestamp: string;
  currency: string;
}

export interface PriceLimit {
  upperLimitPrice: number;
  lowerLimitPrice: number;
  currency: string;
  timestamp: string;
}

/** 토스증권 StockWarning — openapi.json StockWarning 스키마 기준 */
export type StockWarningType =
  | "LIQUIDATION_TRADING"
  | "OVERHEATED"
  | "INVESTMENT_WARNING"
  | "INVESTMENT_RISK"
  | "VI_STATIC"
  | "VI_DYNAMIC"
  | "VI_STATIC_AND_DYNAMIC"
  | "STOCK_WARRANTS";

export interface StockWarning {
  warningType: StockWarningType | string;
  exchange: string;
  startDate: string;
  endDate: string | null;
}

export interface StockDetailResponse {
  status: StockApiStatus;
  symbol: string;
  quote: StockQuote | null;
  candles: Candle[];
  interval: CandleInterval;
  orderbook: Orderbook | null;
  trades: TradeTick[];
  priceLimit: PriceLimit | null;
  warnings: StockWarning[];
  provider: string;
  fetchedAt: string;
  message?: string;
}

export interface StockRankingItem {
  kind: StockRankingKind;
  rank: number;
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePct: number;
  volume: number;
  tradingValue: number;
  scoreLabel: string;
  scoreValue: number;
}

export interface StockTheme {
  label: string;
  count: number;
  avgChangePct: number;
  leaders: string[];
  members: StockRankingItem[];
  tone: "hot" | "cool" | "neutral";
}

export interface StockIpoItem {
  id: string;
  name: string;
  symbol: string;
  market: string;
  category: string;
  listingDate: string;
  subscriptionStart?: string;
  subscriptionEnd?: string;
  leadManager?: string;
  detailUrl?: string;
}

export interface StockSearchResult {
  symbol: string;
  name: string;
  market: string;
  assetType: AssetType;
}

export interface StockOverviewResponse {
  status: StockApiStatus;
  provider: string;
  fetchedAt: string;
  baseDate?: string;
  marketDivCode: string;
  quotes: StockQuote[];
  marketIndices: StockQuote[];
  rankings: Record<StockRankingKind, StockRankingItem[]>;
  themes: StockTheme[];
  ipos: StockIpoItem[];
  message?: string;
  errors?: string[];
}
