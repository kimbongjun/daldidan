import { NextRequest, NextResponse } from "next/server";
import { fetchStockOverview } from "@/lib/stocks/krx";
import { STOCK_RANKING_KINDS, type AssetType, type StockRankingKind, type WatchlistItem } from "@/lib/stocks/types";

export const revalidate = 300; // 5분 — 모듈 캐시와 동일한 TTL

function parseItems(value: string | null): WatchlistItem[] | null {
  if (!value) return null;
  const items: WatchlistItem[] = [];
  for (const part of value.split(",")) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    const colonIdx = trimmed.lastIndexOf(":");
    if (colonIdx < 0) {
      // assetType 없으면 stock으로 fallback
      items.push({ symbol: trimmed.toUpperCase(), assetType: "stock" });
    } else {
      const symbol = trimmed.slice(0, colonIdx).trim().toUpperCase();
      const rawType = trimmed.slice(colonIdx + 1).trim().toLowerCase();
      const assetType: AssetType = rawType === "etf" || rawType === "index" ? rawType : "stock";
      if (symbol) items.push({ symbol, assetType });
    }
  }
  return items.length > 0 ? items : null;
}

function parseSymbolsAsItems(value: string | null): WatchlistItem[] {
  if (!value) return [];
  return value
    .split(",")
    .map((s) => s.trim().toUpperCase())
    .filter(Boolean)
    .map((symbol) => ({ symbol, assetType: "stock" as const }));
}

function parseRankingKinds(value: string | null): StockRankingKind[] {
  if (!value) return [...STOCK_RANKING_KINDS];
  const allowed = new Set<string>(STOCK_RANKING_KINDS);
  const kinds = value
    .split(",")
    .map((kind) => kind.trim())
    .filter((kind): kind is StockRankingKind => allowed.has(kind));
  return kinds.length > 0 ? kinds : [...STOCK_RANKING_KINDS];
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  // 신규 items 파라미터 우선, 구형 symbols fallback
  const watchlistItems =
    parseItems(searchParams.get("items")) ??
    parseSymbolsAsItems(searchParams.get("symbols"));

  const data = await fetchStockOverview(
    watchlistItems,
    parseRankingKinds(searchParams.get("rankings")),
  );

  return NextResponse.json(data, {
    headers: {
      "Cache-Control": "public, s-maxage=300, stale-while-revalidate=60",
    },
  });
}
