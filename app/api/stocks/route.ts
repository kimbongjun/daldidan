import { NextRequest, NextResponse } from "next/server";
import { fetchStockOverview } from "@/lib/stocks/krx";
import { STOCK_RANKING_KINDS, type StockRankingKind } from "@/lib/stocks/types";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function parseSymbols(value: string | null): string[] {
  if (!value) return [];
  return value
    .split(",")
    .map((symbol) => symbol.trim())
    .filter(Boolean);
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
  const data = await fetchStockOverview(
    parseSymbols(searchParams.get("symbols")),
    parseRankingKinds(searchParams.get("rankings")),
  );

  return NextResponse.json(data, {
    headers: {
      "Cache-Control": "no-store, max-age=0",
    },
  });
}
