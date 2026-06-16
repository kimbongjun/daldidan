import { NextRequest, NextResponse } from "next/server";
import { searchStocks } from "@/lib/stocks/krx";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q") ?? "";
  const limit = Math.min(Math.max(1, Number(searchParams.get("limit") ?? "8")), 20);

  if (!q.trim()) return NextResponse.json({ results: [] });

  try {
    const results = await searchStocks(q, limit);
    return NextResponse.json({ results }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return NextResponse.json(
      { results: [], error: error instanceof Error ? error.message : "검색 실패" },
      { status: 500 },
    );
  }
}
