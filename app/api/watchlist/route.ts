import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sanitizeSymbol, sanitizeIndexSymbol } from "@/lib/stocks/utils";
import type { AssetType, WatchlistItem } from "@/lib/stocks/types";

function parseItems(raw: unknown): WatchlistItem[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item): WatchlistItem | null => {
      if (typeof item !== "object" || item === null || !("symbol" in item)) return null;
      const r = item as Record<string, unknown>;
      const rawSym = typeof r.symbol === "string" ? r.symbol : "";
      const validSym = sanitizeSymbol(rawSym) ?? sanitizeIndexSymbol(rawSym) ?? null;
      const rawAt = r.assetType;
      const validAt: AssetType = rawAt === "etf" || rawAt === "index" ? rawAt : "stock";
      return validSym ? { symbol: validSym, assetType: validAt } : null;
    })
    .filter((item): item is WatchlistItem => item !== null);
}

// GET /api/watchlist — 로그인 유저의 관심종목 목록 반환
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("stock_watchlist")
    .select("items")
    .eq("user_id", user.id)
    .single();

  // PGRST116: 행 없음 (처음 접속) — 빈 배열로 정상 처리
  if (error && error.code !== "PGRST116") {
    return NextResponse.json({ items: [] });
  }

  return NextResponse.json({ items: parseItems(data?.items) });
}

// PUT /api/watchlist — 관심종목 목록 저장 (upsert)
export async function PUT(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json() as { items?: unknown };
  const items = parseItems(body.items);

  const { error } = await supabase
    .from("stock_watchlist")
    .upsert(
      { user_id: user.id, items, updated_at: new Date().toISOString() },
      { onConflict: "user_id" },
    );

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
