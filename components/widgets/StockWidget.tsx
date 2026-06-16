"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import {
  ArrowDown,
  ArrowRight,
  ArrowUp,
  Loader2,
  RefreshCw,
} from "lucide-react";
import {
  type AssetType,
  type StockOverviewResponse,
  type StockQuote,
  type WatchlistItem,
} from "@/lib/stocks/types";
import { sanitizeSymbol, formatPrice } from "@/lib/stocks/utils";
import { getKrxMarketWindow } from "@/lib/stocks/cache-policy";
import Sparkline from "@/components/Sparkline";
import { queryKeys } from "@/lib/queryKeys";
import { createClient } from "@/lib/supabase/client";
import type { AuthUser as User } from "@supabase/supabase-js";

const ACCENT = "#F05C6E";
const RISE = "var(--stock-rise)";
const FALL = "var(--stock-fall)";
const STORAGE_KEY = "daldidan-stock-watchlist";
const DEFAULT_WATCHLIST: WatchlistItem[] = [
  { symbol: "005930", assetType: "stock" },
  { symbol: "000660", assetType: "stock" },
];
const MAX_ROWS = 5;

function changeColor(value: number): string {
  if (value > 0) return RISE;
  if (value < 0) return FALL;
  return "var(--text-muted)";
}

/**
 * 지수 요약 한 줄 (컴팩트).
 * ⚠️ marketIndices[].price 는 프록시 ETF 체결가라 지수 포인트가 아니다.
 * 미니 위젯에서는 등락률만 노출하고, 추정값임을 아주 작게 표기한다.
 */
function IndexSummary({ indices }: { indices: StockQuote[] }) {
  if (!indices || indices.length === 0) return null;
  return (
    <div
      className="flex items-center gap-3 overflow-x-auto rounded-xl px-3 py-2 scrollbar-hide"
      style={{ background: "rgba(255,255,255,0.045)", border: "1px solid var(--border)" }}
    >
      {indices.slice(0, 3).map((idx) => {
        const color = changeColor(idx.changePct);
        const Icon = idx.changePct > 0 ? ArrowUp : idx.changePct < 0 ? ArrowDown : null;
        return (
          <div key={idx.symbol} className="flex shrink-0 items-center gap-1.5">
            <span className="truncate text-[11px] font-bold" style={{ color: "var(--text-muted)" }}>{idx.name}</span>
            <span className="inline-flex items-center gap-0.5 text-[11px] font-black tabular-nums" style={{ color }}>
              {Icon && <Icon size={9} />}
              {idx.changePct > 0 ? "+" : ""}{idx.changePct.toFixed(2)}%
            </span>
          </div>
        );
      })}
      <span className="ml-auto shrink-0 text-[8px] font-bold" style={{ color: "var(--text-muted)" }}>ETF 추정</span>
    </div>
  );
}

function StatusPill({ isLoading, isError, marketStatus }: { isLoading: boolean; isError: boolean; marketStatus: { open: boolean; label: string } }) {
  const color =
    isLoading ? "#F59E0B" :
    !isError && marketStatus.open ? "#10B981" :
    isError ? ACCENT : "var(--text-muted)";
  const label =
    isLoading ? "시세 수신 중..." :
    !isError ? `토스 ${marketStatus.label}` :
    "오류";

  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold"
      style={{ background: "rgba(255,255,255,0.05)", color }}
    >
      {isLoading
        ? <Loader2 size={9} className="animate-spin" />
        : <span className="h-1.5 w-1.5 rounded-full" style={{ background: color }} />
      }
      {label}
    </span>
  );
}

function WatchRow({ quote }: { quote: StockQuote }) {
  const color = changeColor(quote.changePct);
  const Icon = quote.changePct > 0 ? ArrowUp : quote.changePct < 0 ? ArrowDown : null;
  return (
    <div
      className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-2.5 rounded-xl px-3 py-2"
      style={{ background: "rgba(255,255,255,0.045)", border: "1px solid var(--border)" }}
    >
      <div className="min-w-0">
        <p className="truncate text-xs font-black" style={{ color: "var(--text-primary)" }}>{quote.name}</p>
        <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>{quote.symbol}</p>
      </div>
      <div className="flex h-7 w-[52px] shrink-0 items-center justify-center">
        {quote.sparkline.length >= 2
          ? <Sparkline data={quote.sparkline} color={color} width={52} height={28} />
          : <span className="h-px w-6 rounded-full" style={{ background: "var(--border)" }} />}
      </div>
      <div className="text-right">
        <p className="text-xs font-black tabular-nums" style={{ color: "var(--text-primary)" }}>{formatPrice(quote.price)}</p>
        <span className="inline-flex items-center justify-end gap-0.5 text-[10px] font-bold tabular-nums" style={{ color }}>
          {Icon && <Icon size={9} />}
          {quote.changePct > 0 ? "+" : ""}{quote.changePct.toFixed(2)}%
        </span>
      </div>
    </div>
  );
}

function parseAndSetWatchlist(raw: string): WatchlistItem[] | null {
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return null;
    const next = parsed.map((item): WatchlistItem | null => {
      if (typeof item === "string") {
        const sym = sanitizeSymbol(item);
        return sym ? { symbol: sym, assetType: "stock" } : null;
      }
      if (typeof item === "object" && item !== null && "symbol" in item) {
        const raw2 = item as Record<string, unknown>;
        const sym = sanitizeSymbol(String(raw2.symbol ?? ""));
        if (!sym) return null;
        const validAt: AssetType = raw2.assetType === "etf" ? "etf" : "stock";
        return { symbol: sym, assetType: validAt };
      }
      return null;
    }).filter((x): x is WatchlistItem => x !== null);
    return next.length > 0 ? next.slice(0, 10) : null;
  } catch {
    return null;
  }
}

export default function StockWidget() {
  const queryClient = useQueryClient();
  const [marketStatus, setMarketStatus] = useState(() => getKrxMarketWindow());
  // undefined = 인증 상태 미확인, null = 비로그인
  const [user, setUser] = useState<User | null | undefined>(undefined);

  useEffect(() => {
    const timer = window.setInterval(() => setMarketStatus(getKrxMarketWindow()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  // 인증 상태 감지 — 비로그인 시 인증 API(/api/me·/api/watchlist) 호출을 막아
  // 콘솔 401 노이즈를 방지한다.
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => setUser(data.user ?? null));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  // 관심종목 로드 (로그인 시 Supabase 우선, 그 외 localStorage fallback)
  const { data: watchlist = DEFAULT_WATCHLIST } = useQuery({
    queryKey: [...queryKeys.watchlist.all, user?.id ?? "anon"],
    queryFn: async (): Promise<WatchlistItem[]> => {
      const uid = user?.id;
      if (uid) {
        try {
          const wRes = await fetch("/api/watchlist");
          if (wRes.ok) {
            const { items } = await wRes.json() as { items: unknown[] };
            if (Array.isArray(items) && items.length > 0) {
              const next = items
                .map((item): WatchlistItem | null => {
                  if (typeof item !== "object" || item === null || !("symbol" in item)) return null;
                  const raw = item as Record<string, unknown>;
                  const sym = sanitizeSymbol(String(raw.symbol ?? ""));
                  if (!sym) return null;
                  const validAt: AssetType = raw.assetType === "etf" ? "etf" : "stock";
                  return { symbol: sym, assetType: validAt };
                })
                .filter((x): x is WatchlistItem => x !== null);
              if (next.length > 0) return next.slice(0, 10);
            }
          }
        } catch { /* fallthrough to localStorage */ }
        const saved = localStorage.getItem(`${STORAGE_KEY}-${uid}`) ?? localStorage.getItem(STORAGE_KEY);
        if (saved) {
          const parsed = parseAndSetWatchlist(saved);
          if (parsed) return parsed;
        }
        return DEFAULT_WATCHLIST;
      }
      // 비로그인: 인증 API 호출 없이 localStorage 만 사용
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = parseAndSetWatchlist(saved);
        if (parsed) return parsed;
      }
      return DEFAULT_WATCHLIST;
    },
    enabled: user !== undefined,
    staleTime: 5 * 60 * 1000,
  });

  const watchlistKey = watchlist.map(({ symbol, assetType }) => `${symbol}:${assetType}`).join(",");

  const { data, isFetching, isError } = useQuery({
    queryKey: queryKeys.stocks.quotes(watchlistKey),
    queryFn: async ({ signal }): Promise<StockOverviewResponse> => {
      const params = new URLSearchParams({
        items: watchlistKey,
        ts: String(Date.now()),
      });
      const res = await fetch(`/api/stocks?${params.toString()}`, {
        cache: "no-store",
        signal: AbortSignal.any([signal, AbortSignal.timeout(20_000)]),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json() as Promise<StockOverviewResponse>;
    },
    staleTime: 30_000,
    refetchInterval: () => getKrxMarketWindow().nextRefreshInMs,
    enabled: watchlistKey.length > 0,
  });

  const quotes = useMemo(() => {
    const map = new Map((data?.quotes ?? []).map((q) => [q.symbol, q]));
    return watchlist.map(({ symbol }) => map.get(symbol)).filter((q): q is StockQuote => Boolean(q));
  }, [data?.quotes, watchlist]);

  const visibleQuotes = quotes.slice(0, MAX_ROWS);
  const remaining = Math.max(0, quotes.length - MAX_ROWS);

  return (
    <div className="bento-card gradient-violet h-full flex flex-col p-5 gap-3">
      {/* 헤더 */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: ACCENT }}>증권</p>
          <h2 className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>국내 증시</h2>
          <div className="mt-0.5">
            <StatusPill isLoading={isFetching} isError={isError} marketStatus={marketStatus} />
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={() => void queryClient.invalidateQueries({ queryKey: queryKeys.stocks.quotes(watchlistKey) })}
            aria-label="새로고침"
            className="flex h-8 w-8 items-center justify-center rounded-lg"
            style={{ background: `${ACCENT}18`, color: ACCENT }}
          >
            <RefreshCw size={13} className={isFetching ? "animate-spin" : ""} />
          </button>
          <Link
            href="/stock"
            className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-semibold transition-opacity hover:opacity-70"
            style={{ background: `${ACCENT}22`, color: ACCENT }}
          >
            전체보기 <ArrowRight size={11} />
          </Link>
        </div>
      </div>

      {/* 지수 요약 한 줄 */}
      {(data?.marketIndices?.length ?? 0) > 0 && (
        <IndexSummary indices={data?.marketIndices ?? []} />
      )}

      {/* 관심종목 목록 */}
      <div className="flex flex-col gap-2 flex-1">
        {isFetching && quotes.length === 0 ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-[54px] rounded-xl skeleton-shimmer" style={{ border: "1px solid var(--border)" }} />
          ))
        ) : visibleQuotes.length === 0 ? (
          <div
            className="flex flex-1 items-center justify-center rounded-xl text-xs"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid var(--border)", color: "var(--text-muted)", minHeight: 80 }}
          >
            관심종목을 추가하려면 전체보기를 클릭하세요.
          </div>
        ) : (
          <>
            {visibleQuotes.map((q) => (
              <WatchRow key={q.symbol} quote={q} />
            ))}
            {remaining > 0 && (
              <Link
                href="/stock"
                className="rounded-xl px-3 py-2 text-center text-xs font-semibold transition-opacity hover:opacity-70"
                style={{ background: `${ACCENT}12`, color: ACCENT }}
              >
                +{remaining}개 더보기
              </Link>
            )}
          </>
        )}
      </div>
    </div>
  );
}
