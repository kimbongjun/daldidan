import "server-only";

import type { StockSearchResult } from "@/lib/stocks/types";
import { SYMBOL_DICTIONARY } from "@/lib/stocks/symbol-dictionary";
import { sanitizeSymbol } from "@/lib/stocks/utils";
import { assetTypeFromMaster, fetchTossStockMaster, isTossConfigured } from "@/lib/stocks/toss";

/**
 * 토스증권 단독 종목 검색.
 * - 6자리 코드 입력: 사전에 있으면 사전 결과, 없으면 토스 마스터(/api/v1/stocks)로 실시간 해석.
 * - 이름/키워드 입력: 번들 인기종목 사전에서 로컬 매칭.
 * (토스 Open API에는 이름 검색 엔드포인트가 없어 전체 유니버스 검색은 불가하다.)
 */
export async function searchStocks(query: string, limit = 10): Promise<StockSearchResult[]> {
  const q = query.trim();
  if (!q) return [];

  const upper = q.toUpperCase();
  const code = sanitizeSymbol(q);

  // 1) 코드 직접 입력 → 사전 우선, 없으면 토스 마스터 실시간 해석
  if (code) {
    const dictHit = SYMBOL_DICTIONARY.find((item) => item.symbol === code);
    if (dictHit) return [dictHit];
    if (isTossConfigured()) {
      try {
        const [master] = await fetchTossStockMaster([code]);
        if (master && master.status === "ACTIVE") {
          return [{
            symbol: master.symbol,
            name: master.name || master.symbol,
            market: master.market || "",
            assetType: assetTypeFromMaster(master.securityType),
          }];
        }
      } catch {
        // 마스터 조회 실패 시 사전 매칭으로 폴백
      }
    }
  }

  // 2) 이름/키워드 → 사전 로컬 매칭 (코드 부분일치 포함)
  const scored: (StockSearchResult & { score: number })[] = [];
  for (const item of SYMBOL_DICTIONARY) {
    const nameUpper = item.name.toUpperCase();
    const symbolExact = item.symbol === upper;
    const symbolContains = item.symbol.includes(upper);
    const nameStarts = nameUpper.startsWith(upper);
    const nameContains = nameUpper.includes(upper);
    if (!symbolExact && !symbolContains && !nameContains) continue;
    const score = symbolExact ? 100 : nameStarts ? 60 : symbolContains ? 40 : 10;
    scored.push({ ...item, score });
  }

  return scored
    .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name, "ko"))
    .slice(0, limit)
    .map(({ symbol, name, market, assetType }) => ({ symbol, name, market, assetType }));
}
