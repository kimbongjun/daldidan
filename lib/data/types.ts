export type StockMarket = "KR" | "US";
export type EventType = "movie" | "concert" | "exhibition";

export interface MarketQuote {
  symbol: string;
  name: string;
  displaySymbol?: string;
  sector?: string;
  listingMarket?: string;
  market: StockMarket;
  exchange: string;
  price: number;
  currency: string;
  change: number;
  changePct: number;
  previousClose: number;
  dayHigh?: number;
  dayLow?: number;
  volume?: number;
  marketCap?: number;
  range52w?: {
    high: number;
    low: number;
  };
  sparkline: number[];
  updatedAt: string;
}

export interface MarketIndexQuote {
  symbol: string;
  name: string;
  region: "KR" | "US" | "JP" | "CN";
  value: number;
  change: number;
  changePct: number;
}

export interface ShoppingDeal {
  id: string;
  title: string;
  store: string;
  category: string;
  originalPrice: number;
  salePrice: number;
  discountPct: number;
  purchaseUrl: string;
  image?: string;
  mallName?: string;
  brand?: string;
  reviewCount?: number;
  description?: string;
  source: "naver" | "fallback";
  fetchedAt: string;
}

export interface CultureItem {
  id: string;
  slug: string;
  type: EventType;
  title: string;
  venue: string;
  dateLabel: string;
  summary: string;
  image?: string;
  rating?: number;
  tags: string[];
  bookingUrl?: string;
  detailUrl?: string;
  source: "tmdb" | "ticketmaster" | "seoul" | "fallback";
}

export interface CultureDetail extends CultureItem {
  description: string;
  address?: string;
  runtime?: string;
  period?: string;
  cast?: string[];
  priceInfo?: string;
  status?: string;
}

export interface MarketResponse {
  indices: MarketIndexQuote[];
  stocks: MarketQuote[];
  source: string;
  fetchedAt: string;
}

export interface UsedItem {
  id: string;
  title: string;
  price: number;
  link: string;
  mallName: string;
  image?: string;
  source: "naver-used";
  fetchedAt: string;
}

export interface ShoppingSearchResult {
  keyword: string;
  newItems: ShoppingDeal[];
  usedItems: UsedItem[];
  source: string;
  fetchedAt: string;
  error?: string;
}

export interface ShoppingResponse {
  deals: ShoppingDeal[];
  source: string;
  fetchedAt: string;
  error?: string;
}

export interface CultureResponse {
  items: CultureItem[];
  source: string;
  fetchedAt: string;
}
