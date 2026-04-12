import { ALL_STOCKS, StockItem } from "@/lib/stockList";
import { FALLBACK_STOCKS } from "@/lib/data/fallback";
import { MarketQuote } from "@/lib/data/types";

function normalizeSymbol(item: StockItem) {
  if (item.market === "KOSPI") return `${item.symbol}.KS`;
  if (item.market === "KOSDAQ") return `${item.symbol}.KQ`;
  return item.symbol;
}

function toExchange(item: StockItem) {
  if (item.market === "KOSPI") return "KOSPI";
  if (item.market === "KOSDAQ") return "KOSDAQ";
  return item.market;
}

function toMarket(item: StockItem): "KR" | "US" {
  return item.market === "KOSPI" || item.market === "KOSDAQ" ? "KR" : "US";
}

function buildMockSparkline(price: number, changePct: number) {
  return Array.from({ length: 7 }, (_, index) => {
    const ratio = (index - 6) / 18;
    const direction = changePct >= 0 ? 1 : -1;
    return Number((price * (1 + ratio * direction * 0.4)).toFixed(price > 1000 ? 0 : 2));
  });
}

export function buildStockCatalog(liveStocks: MarketQuote[] = FALLBACK_STOCKS) {
  const liveMap = new Map(liveStocks.map((item) => [item.symbol, item]));

  return ALL_STOCKS.map((item) => {
    const symbol = normalizeSymbol(item);
    const live = liveMap.get(symbol) ?? liveMap.get(item.symbol);
    const price = live?.price ?? item.price;
    const changePct = live?.changePct ?? item.changePct;
    const previousClose = live?.previousClose ?? (price / (1 + changePct / 100 || 1));
    const change = live?.change ?? (price - previousClose);

    return {
      symbol,
      displaySymbol: item.symbol,
      name: item.name,
      sector: item.sector,
      listingMarket: item.market,
      market: toMarket(item),
      exchange: toExchange(item),
      price,
      currency: item.market === "KOSPI" || item.market === "KOSDAQ" ? "KRW" : "USD",
      change,
      changePct,
      previousClose,
      dayHigh: live?.dayHigh,
      dayLow: live?.dayLow,
      volume: live?.volume,
      marketCap: live?.marketCap,
      range52w: live?.range52w,
      sparkline: live?.sparkline?.length ? live.sparkline : buildMockSparkline(price, changePct),
      updatedAt: live?.updatedAt ?? new Date().toISOString(),
    } satisfies MarketQuote;
  });
}
