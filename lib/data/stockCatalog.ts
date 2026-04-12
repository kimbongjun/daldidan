import { FALLBACK_STOCKS } from "@/lib/data/fallback";
import { MarketQuote } from "@/lib/data/types";

/**
 * API에서 받은 MarketQuote 배열을 그대로 반환.
 * market.ts 가 KR_STOCKS 전 종목을 매핑하므로 별도 catalog 빌드 불필요.
 */
export function buildStockCatalog(liveStocks: MarketQuote[] = FALLBACK_STOCKS): MarketQuote[] {
  return liveStocks;
}
