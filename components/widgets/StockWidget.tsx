"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  Activity,
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
import { sanitizeSymbol, sanitizeIndexSymbol, formatPrice } from "@/lib/stocks/utils";
import { getKrxMarketWindow } from "@/lib/stocks/cache-policy";

const ACCENT = "#F05C6E";
const RISE = "var(--stock-rise)";
const FALL = "var(--stock-fall)";
const STORAGE_KEY = "daldidan-stock-watchlist";
const FIXED_INDEX_SYMBOLS = ["IDX_1", "IDX_2"];
const DEFAULT_WATCHLIST: WatchlistItem[] = [
  { symbol: "005930", assetType: "stock" },
  { symbol: "000660", assetType: "stock" },
];
const MAX_ROWS = 5;

type LoadPhase = "idle" | "loading" | "done" | "error";

function changeColor(value: number): string {
  if (value > 0) return RISE;
  if (value < 0) return FALL;
  return "var(--text-muted)";
}

function StatusPill({ phase, marketStatus }: { phase: LoadPhase; marketStatus: { open: boolean; label: string } }) {
  const isLoading = phase === "loading";
  const color =
    isLoading ? "#F59E0B" :
    phase === "done" && marketStatus.open ? "#10B981" :
    phase === "error" ? ACCENT : "var(--text-muted)";
  const label =
    isLoading ? "시세 수신 중..." :
    phase === "done" ? `KRX ${marketStatus.label}` :
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

function IndexCard({ quote }: { quote: StockQuote | null; symbol: string }) {
  const name = quote?.name?.replace(" 종합", "") ?? (quote?.symbol === "IDX_1" ? "KOSPI" : "KOSDAQ");
  const price = quote?.price ?? 0;
  const changePct = quote?.changePct ?? 0;
  const change = quote?.change ?? 0;
  const color = changeColor(changePct);
  const Icon = changePct > 0 ? ArrowUp : changePct < 0 ? ArrowDown : null;

  return (
    <div
      className="flex-1 rounded-xl px-3 py-2"
      style={{ background: "rgba(245,158,11,0.10)", border: "1px solid rgba(245,158,11,0.22)" }}
    >
      <div className="flex items-center justify-between gap-1">
        <span className="truncate text-[11px] font-black" style={{ color: "var(--text-primary)" }}>{name}</span>
        <Activity size={11} style={{ color: "#F59E0B" }} />
      </div>
      <p className="text-sm font-black tabular-nums" style={{ color: "var(--text-primary)" }}>
        {price > 0 ? formatPrice(price) : "—"}
      </p>
      <span className="inline-flex items-center gap-0.5 text-[10px] font-bold tabular-nums" style={{ color }}>
        {Icon && <Icon size={9} />}
        {changePct > 0 ? "+" : ""}{changePct.toFixed(2)}%
        {change !== 0 && <span className="hidden sm:inline"> {change > 0 ? "+" : ""}{change.toLocaleString()}</span>}
      </span>
    </div>
  );
}

function WatchRow({ quote }: { quote: StockQuote }) {
  const color = changeColor(quote.changePct);
  const Icon = quote.changePct > 0 ? ArrowUp : quote.changePct < 0 ? ArrowDown : null;
  return (
    <div
      className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-xl px-3 py-2"
      style={{ background: "rgba(255,255,255,0.045)", border: "1px solid var(--border)" }}
    >
      <div className="min-w-0">
        <p className="truncate text-xs font-black" style={{ color: "var(--text-primary)" }}>{quote.name}</p>
        <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>{quote.symbol}</p>
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

export default function StockWidget() {
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>(DEFAULT_WATCHLIST);
  const [data, setData] = useState<StockOverviewResponse | null>(null);
  const [loadPhase, setLoadPhase] = useState<LoadPhase>("idle");
  const [marketStatus, setMarketStatus] = useState(() => {
    const { open, label } = getKrxMarketWindow();
    return { open, label };
  });
  const [refreshNonce, setRefreshNonce] = useState(0);
  const refreshTimerRef = useRef<number | null>(null);

  // 관심종목 로드 (Supabase 우선, localStorage fallback)
  useEffect(() => {
    async function loadWatchlist() {
      try {
        const res = await fetch("/api/me");
        if (res.ok) {
          const { id: uid } = await res.json() as { id: string };
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
                      const sym = sanitizeSymbol(String(raw.symbol ?? "")) ?? sanitizeIndexSymbol(String(raw.symbol ?? "")) ?? null;
                      if (!sym) return null;
                      const at = raw.assetType;
                      const validAt: AssetType = at === "etf" || at === "index" ? at : "stock";
                      return { symbol: sym, assetType: validAt };
                    })
                    .filter((x): x is WatchlistItem => x !== null);
                  if (next.length > 0) { setWatchlist(next.slice(0, 10)); return; }
                }
              }
            } catch {}
            // localStorage fallback with user-scoped key
            const saved = localStorage.getItem(`${STORAGE_KEY}-${uid}`) ?? localStorage.getItem(STORAGE_KEY);
            if (saved) parseAndSetWatchlist(saved);
            return;
          }
        }
      } catch {}
      // 비로그인
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) parseAndSetWatchlist(saved);
    }

    function parseAndSetWatchlist(raw: string) {
      try {
        const parsed = JSON.parse(raw) as unknown;
        if (!Array.isArray(parsed)) return;
        const next = parsed.map((item): WatchlistItem | null => {
          if (typeof item === "string") {
            const sym = sanitizeSymbol(item);
            return sym ? { symbol: sym, assetType: "stock" } : null;
          }
          if (typeof item === "object" && item !== null && "symbol" in item) {
            const raw2 = item as Record<string, unknown>;
            const sym = sanitizeSymbol(String(raw2.symbol ?? "")) ?? sanitizeIndexSymbol(String(raw2.symbol ?? "")) ?? null;
            if (!sym) return null;
            const at = raw2.assetType;
            const validAt: AssetType = at === "etf" || at === "index" ? at : "stock";
            return { symbol: sym, assetType: validAt };
          }
          return null;
        }).filter((x): x is WatchlistItem => x !== null);
        if (next.length > 0) setWatchlist(next.slice(0, 10));
      } catch {}
    }

    void loadWatchlist();
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => {
      const { open, label } = getKrxMarketWindow();
      setMarketStatus({ open, label });
    }, 30_000);
    return () => window.clearInterval(timer);
  }, []);

  const fetchQuotes = useCallback(async (signal?: AbortSignal, force = false) => {
    const windowInfo = getKrxMarketWindow();
    setMarketStatus({ open: windowInfo.open, label: windowInfo.label });
    setLoadPhase("loading");

    const params = new URLSearchParams({
      items: watchlist.map(({ symbol, assetType }) => `${symbol}:${assetType}`).join(","),
      noSparkline: "true",
    });
    if (force) {
      params.set("force", "true");
      params.set("ts", String(Date.now()));
    }
    const cacheMode: RequestCache = force || windowInfo.open ? "no-store" : "force-cache";

    try {
      const res = await fetch(`/api/stocks?${params.toString()}`, {
        cache: cacheMode,
        signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(20_000)]) : AbortSignal.timeout(20_000),
      });
      if (signal?.aborted) return;
      const d = await res.json() as StockOverviewResponse;
      if (!signal?.aborted) {
        setData(d);
        setLoadPhase("done");
      }
    } catch {
      if (!signal?.aborted) setLoadPhase("error");
    }
  }, [watchlist]);

  useEffect(() => {
    const controller = new AbortController();

    const run = async (force = false) => {
      await fetchQuotes(controller.signal, force);
      if (controller.signal.aborted) return;
      const { nextRefreshInMs } = getKrxMarketWindow();
      if (refreshTimerRef.current) window.clearTimeout(refreshTimerRef.current);
      refreshTimerRef.current = window.setTimeout(() => void run(false), nextRefreshInMs);
    };

    void run(refreshNonce > 0);

    return () => {
      controller.abort();
      if (refreshTimerRef.current) window.clearTimeout(refreshTimerRef.current);
    };
  }, [fetchQuotes, refreshNonce]);

  const quotes = useMemo(() => {
    const map = new Map((data?.quotes ?? []).map((q) => [q.symbol, q]));
    return watchlist.map(({ symbol }) => map.get(symbol)).filter((q): q is StockQuote => Boolean(q));
  }, [data?.quotes, watchlist]);

  const indexBySymbol = useMemo(() => {
    const map = new Map((data?.marketIndices ?? []).map((q) => [q.symbol, q]));
    return map;
  }, [data?.marketIndices]);

  const visibleQuotes = quotes.slice(0, MAX_ROWS);
  const remaining = Math.max(0, quotes.length - MAX_ROWS);
  const isLoading = loadPhase === "loading";

  return (
    <div className="bento-card gradient-violet h-full flex flex-col p-5 gap-3">
      {/* 헤더 */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: ACCENT }}>증권</p>
          <h2 className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>국내 증시</h2>
          <div className="mt-0.5">
            <StatusPill phase={loadPhase} marketStatus={marketStatus} />
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={() => { setLoadPhase("idle"); setRefreshNonce((v) => v + 1); }}
            aria-label="새로고침"
            className="flex h-8 w-8 items-center justify-center rounded-lg"
            style={{ background: `${ACCENT}18`, color: ACCENT }}
          >
            <RefreshCw size={13} className={isLoading ? "animate-spin" : ""} />
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

      {/* 지수 카드 */}
      <div className="flex gap-2">
        {FIXED_INDEX_SYMBOLS.map((sym) => (
          <IndexCard key={sym} symbol={sym} quote={indexBySymbol.get(sym) ?? null} />
        ))}
      </div>

      {/* 관심종목 목록 */}
      <div className="flex flex-col gap-2 flex-1">
        {isLoading && quotes.length === 0 ? (
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
