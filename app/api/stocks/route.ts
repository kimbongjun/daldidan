import { NextRequest, NextResponse } from "next/server";
import { fetchStockOverview } from "@/lib/stocks/toss";
import { getKrxMarketWindow } from "@/lib/stocks/cache-policy";
import { type AssetType, type WatchlistItem } from "@/lib/stocks/types";

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

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  // 신규 items 파라미터 우선, 구형 symbols fallback
  const watchlistItems =
    parseItems(searchParams.get("items")) ??
    parseSymbolsAsItems(searchParams.get("symbols"));

  const noSparkline = searchParams.get("noSparkline") === "true";
  const force = searchParams.get("force") === "true";

  const data = await fetchStockOverview(watchlistItems, { noSparkline, force });

  const windowInfo = getKrxMarketWindow();

  return NextResponse.json(data, {
    headers: {
      "Cache-Control": force
        ? "no-store, max-age=0"
        : `public, max-age=${windowInfo.cacheTtlSeconds}, s-maxage=${windowInfo.cacheTtlSeconds}, stale-while-revalidate=300`,
    },
  });
}
