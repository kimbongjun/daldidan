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
  fetchedAt: string;
  baseDate: string;
  source: "KRX";
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
  rankings: Record<StockRankingKind, StockRankingItem[]>;
  themes: StockTheme[];
  ipos: StockIpoItem[];
  message?: string;
  errors?: string[];
}
