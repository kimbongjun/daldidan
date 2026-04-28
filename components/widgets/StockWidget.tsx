"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowDown,
  ArrowRight,
  ArrowUp,
  BarChart3,
  Bell,
  LineChart,
  Plus,
  RefreshCw,
  Search,
  Star,
  Trash2,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import Sparkline from "@/components/Sparkline";
import {
  STOCK_RANKING_KINDS,
  type StockOverviewResponse,
  type StockQuote,
  type StockRankingItem,
  type StockRankingKind,
  type StockTheme,
} from "@/lib/stocks/types";

const ACCENT = "#F43F5E";
const DOWN = "#10B981";
const STORAGE_KEY = "daldidan-stock-watchlist";
const DEFAULT_WATCHLIST = ["005930", "000660", "035420", "005380"];

type Tab = "watch" | "rank" | "ipo";

const RANK_META: Record<StockRankingKind, { label: string; icon: React.ReactNode }> = {
  amount: { label: "거래대금", icon: <BarChart3 size={11} /> },
  volume: { label: "거래량", icon: <LineChart size={11} /> },
  rise: { label: "급상승", icon: <TrendingUp size={11} /> },
  fall: { label: "급하락", icon: <TrendingDown size={11} /> },
  popular: { label: "인기", icon: <Star size={11} /> },
};

function sanitizeSymbol(value: string): string | null {
  const symbol = value.trim().toUpperCase();
  return /^Q?\d{6}$/.test(symbol) ? symbol : null;
}

function formatPrice(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return "-";
  return `${value.toLocaleString()}원`;
}

function formatVolume(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return "-";
  if (value >= 100_000_000) return `${(value / 100_000_000).toFixed(1)}억주`;
  if (value >= 10_000) return `${Math.round(value / 10_000).toLocaleString()}만주`;
  return `${value.toLocaleString()}주`;
}

function formatTradingValue(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return "-";
  if (value >= 1_000_000_000_000) return `${(value / 1_000_000_000_000).toFixed(1)}조`;
  if (value >= 100_000_000) return `${Math.round(value / 100_000_000).toLocaleString()}억`;
  return `${Math.round(value / 10_000).toLocaleString()}만`;
}

function formatDateTime(value?: string): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

function formatDate(value?: string): string {
  if (!value) return "일정 확인";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("ko-KR", { month: "2-digit", day: "2-digit" });
}

function changeColor(value: number): string {
  if (value > 0) return ACCENT;
  if (value < 0) return DOWN;
  return "var(--text-muted)";
}

function ChangeBadge({ change, changePct }: { change: number; changePct: number }) {
  const color = changeColor(changePct || change);
  const Icon = changePct > 0 ? ArrowUp : changePct < 0 ? ArrowDown : null;
  return (
    <span className="inline-flex items-center justify-end gap-0.5 text-[11px] font-bold tabular-nums" style={{ color }}>
      {Icon && <Icon size={10} />}
      {changePct > 0 ? "+" : ""}
      {changePct.toFixed(2)}%
      <span className="hidden sm:inline">
        {change > 0 ? " +" : " "}
        {change.toLocaleString()}
      </span>
    </span>
  );
}

function SkeletonRows() {
  return (
    <div className="flex flex-col gap-2">
      {[1, 2, 3].map((item) => (
        <div
          key={item}
          className="h-[62px] rounded-xl animate-pulse"
          style={{ background: "rgba(255,255,255,0.05)", border: "1px solid var(--border)" }}
        />
      ))}
    </div>
  );
}

function StatusPill({ data, loading }: { data: StockOverviewResponse | null; loading: boolean }) {
  const isLive = data?.status === "live";
  const label = loading ? "조회중" : isLive ? "KRX 수집" : data?.status === "not_configured" ? "KRX 설정 필요" : "점검";
  const color = isLive ? "#10B981" : loading ? "#F59E0B" : "var(--text-muted)";

  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold"
      style={{ background: isLive ? "rgba(16,185,129,0.14)" : "rgba(255,255,255,0.05)", color }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: color }} />
      {label}
    </span>
  );
}

function EmptyState({ title, detail }: { title: string; detail: string }) {
  return (
    <div className="flex h-full min-h-[160px] flex-col items-center justify-center gap-2 rounded-xl px-4 text-center"
      style={{ background: "rgba(255,255,255,0.04)", border: "1px solid var(--border)" }}>
      <p className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>{title}</p>
      <p className="text-xs leading-relaxed" style={{ color: "var(--text-muted)" }}>{detail}</p>
    </div>
  );
}

function QuoteRow({ quote, onRemove }: { quote: StockQuote; onRemove: (symbol: string) => void }) {
  const color = changeColor(quote.changePct);
  return (
    <div
      className="grid min-h-[64px] grid-cols-[minmax(0,1.3fr)_auto_auto_auto] items-center gap-3 rounded-xl px-3 py-2.5"
      style={{ background: "rgba(255,255,255,0.045)", border: "1px solid var(--border)" }}
    >
      <div className="min-w-0">
        <div className="flex items-center gap-1.5">
          <p className="truncate text-sm font-black" style={{ color: "var(--text-primary)" }}>{quote.name}</p>
          <span className="rounded-md px-1.5 py-0.5 text-[10px] font-bold" style={{ background: "rgba(255,255,255,0.07)", color: "var(--text-muted)" }}>
            {quote.symbol}
          </span>
        </div>
        <p className="mt-0.5 text-[11px]" style={{ color: "var(--text-muted)" }}>
          거래량 {formatVolume(quote.volume)} · 대금 {formatTradingValue(quote.tradingValue)}
        </p>
      </div>
      <div className="hidden w-[92px] justify-end sm:flex">
        <Sparkline data={quote.sparkline} color={color} width={88} height={34} />
      </div>
      <div className="text-right">
        <p className="text-sm font-black tabular-nums" style={{ color: "var(--text-primary)" }}>{formatPrice(quote.price)}</p>
        <ChangeBadge change={quote.change} changePct={quote.changePct} />
      </div>
      <button
        type="button"
        onClick={() => onRemove(quote.symbol)}
        aria-label={`${quote.name} 관심종목 제거`}
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
        style={{ background: "rgba(255,255,255,0.05)", color: "var(--text-muted)" }}
      >
        <Trash2 size={13} />
      </button>
    </div>
  );
}

function RankingRow({ item }: { item: StockRankingItem }) {
  return (
    <div
      className="grid min-h-[54px] grid-cols-[32px_minmax(0,1fr)_auto] items-center gap-3 rounded-xl px-3 py-2"
      style={{ background: "rgba(255,255,255,0.045)", border: "1px solid transparent" }}
    >
      <div className="flex h-8 w-8 items-center justify-center rounded-lg text-xs font-black tabular-nums"
        style={{ background: `${ACCENT}18`, color: ACCENT }}>
        {item.rank}
      </div>
      <div className="min-w-0">
        <div className="flex min-w-0 items-center gap-1.5">
          <p className="truncate text-xs font-bold" style={{ color: "var(--text-primary)" }}>{item.name || item.symbol}</p>
          {item.symbol && (
            <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>{item.symbol}</span>
          )}
        </div>
        <p className="mt-0.5 text-[10px]" style={{ color: "var(--text-muted)" }}>
          {item.scoreLabel} {item.kind === "volume" ? formatVolume(item.scoreValue) : item.kind === "amount" ? formatTradingValue(item.scoreValue) : item.kind === "popular" ? `${item.rank}위` : `${item.scoreValue.toFixed(2)}%`}
        </p>
      </div>
      <div className="text-right">
        <p className="text-xs font-black tabular-nums" style={{ color: "var(--text-primary)" }}>{formatPrice(item.price)}</p>
        <ChangeBadge change={item.change} changePct={item.changePct} />
      </div>
    </div>
  );
}

function ThemeStrip({ themes }: { themes: StockTheme[] }) {
  if (themes.length === 0) return null;
  return (
    <div className="flex gap-2 overflow-x-auto scrollbar-hide">
      {themes.map((theme) => {
        const color = theme.tone === "hot" ? ACCENT : theme.tone === "cool" ? DOWN : "var(--text-muted)";
        return (
          <div
            key={theme.label}
            className="min-w-[132px] rounded-xl px-3 py-2"
            style={{ background: "rgba(255,255,255,0.045)", border: "1px solid var(--border)" }}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-bold" style={{ color: "var(--text-primary)" }}>{theme.label}</span>
              <span className="text-[11px] font-black tabular-nums" style={{ color }}>
                {theme.avgChangePct > 0 ? "+" : ""}{theme.avgChangePct.toFixed(1)}%
              </span>
            </div>
            <p className="mt-1 truncate text-[10px]" style={{ color: "var(--text-muted)" }}>
              {theme.leaders.join(" · ")}
            </p>
          </div>
        );
      })}
    </div>
  );
}

export default function StockWidget() {
  const [activeTab, setActiveTab] = useState<Tab>("watch");
  const [activeRank, setActiveRank] = useState<StockRankingKind>("amount");
  const [watchlist, setWatchlist] = useState<string[]>(DEFAULT_WATCHLIST);
  const [input, setInput] = useState("");
  const [data, setData] = useState<StockOverviewResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshNonce, setRefreshNonce] = useState(0);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (!saved) return;
      const parsed = JSON.parse(saved) as unknown;
      if (!Array.isArray(parsed)) return;
      const next = [...new Set(parsed.map((value) => sanitizeSymbol(String(value))).filter((value): value is string => Boolean(value)))];
      if (next.length > 0) setWatchlist(next.slice(0, 10));
    } catch {
      // 저장된 관심종목 형식이 깨졌으면 기본값을 사용한다.
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(watchlist));
  }, [watchlist]);

  const fetchStocks = useCallback((signal?: AbortSignal) => {
    setLoading(true);
    const params = new URLSearchParams({
      symbols: watchlist.join(","),
      rankings: STOCK_RANKING_KINDS.join(","),
    });
    fetch(`/api/stocks?${params.toString()}`, { cache: "no-store", signal })
      .then((res) => res.json() as Promise<StockOverviewResponse>)
      .then((next) => setData(next))
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setData({
          status: "error",
          provider: "KRX Open API",
          fetchedAt: new Date().toISOString(),
          marketDivCode: "KRX",
          quotes: [],
          rankings: { amount: [], volume: [], rise: [], fall: [], popular: [] },
          themes: [],
          ipos: [],
          message: "KRX 데이터를 불러오지 못했습니다.",
        });
      })
      .finally(() => setLoading(false));
  }, [watchlist]);

  useEffect(() => {
    const controller = new AbortController();
    fetchStocks(controller.signal);
    const timer = window.setInterval(() => fetchStocks(), 600_000);
    return () => {
      controller.abort();
      window.clearInterval(timer);
    };
  }, [fetchStocks, refreshNonce]);

  const quotes = useMemo(() => {
    const map = new Map((data?.quotes ?? []).map((quote) => [quote.symbol, quote]));
    return watchlist.map((symbol) => map.get(symbol)).filter((quote): quote is StockQuote => Boolean(quote));
  }, [data?.quotes, watchlist]);

  const addSymbol = useCallback(() => {
    const symbol = sanitizeSymbol(input);
    if (!symbol) return;
    setWatchlist((prev) => prev.includes(symbol) ? prev : [...prev, symbol].slice(0, 10));
    setInput("");
    setActiveTab("watch");
  }, [input]);

  const removeSymbol = useCallback((symbol: string) => {
    setWatchlist((prev) => prev.filter((item) => item !== symbol));
  }, []);

  const currentRankings = data?.rankings[activeRank] ?? [];
  const isConfigured = data?.status !== "not_configured";

  return (
    <div className="bento-card gradient-rose h-full flex flex-col p-5 gap-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: ACCENT }}>
            증권
          </p>
          <h2 className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>
            국내 증시 포털
          </h2>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <StatusPill data={data} loading={loading} />
            <span className="text-[11px]" style={{ color: "var(--text-muted)" }}>
              {data?.provider ?? "KRX Open API"}
              {data?.baseDate ? ` · 기준 ${data.baseDate}` : ""}
              {data?.fetchedAt ? ` · ${formatDateTime(data.fetchedAt)}` : ""}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setRefreshNonce((value) => value + 1)}
            aria-label="증권 데이터 새로고침"
            className="flex h-8 w-8 items-center justify-center rounded-lg"
            style={{ background: `${ACCENT}18`, color: ACCENT }}
          >
            <RefreshCw size={13} />
          </button>
          <a
            href="https://data.krx.co.kr/contents/MDC/MAIN/main/index.cmd"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg shrink-0 transition-opacity hover:opacity-70"
            style={{ background: `${ACCENT}22`, color: ACCENT }}
          >
            KRX <ArrowRight size={11} />
          </a>
        </div>
      </div>

      <div className="flex gap-1.5">
        {[
          { key: "watch" as const, label: "관심", icon: <Star size={11} /> },
          { key: "rank" as const, label: "랭킹", icon: <BarChart3 size={11} /> },
          { key: "ipo" as const, label: "상장", icon: <Bell size={11} /> },
        ].map(({ key, label, icon }) => {
          const active = activeTab === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => setActiveTab(key)}
              className="flex items-center justify-center gap-1 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all flex-1"
              style={{ background: active ? ACCENT : `${ACCENT}15`, color: active ? "#fff" : "var(--text-muted)" }}
            >
              {icon}
              {label}
            </button>
          );
        })}
      </div>

      {!isConfigured ? (
        <EmptyState
          title="KRX Open API 설정이 필요합니다"
          detail="KRX_OPENAPI_KEY 또는 KRX_AUTH_KEY를 .env.local에 설정하면 한국거래소 기준일 매매정보를 표시합니다. 임의 샘플 시세는 사용하지 않습니다."
        />
      ) : (
        <div className="flex-1 min-h-0 overflow-hidden">
          {activeTab === "watch" && (
            <div className="flex h-full flex-col gap-3">
              <div className="flex gap-2">
                <div className="relative min-w-0 flex-1">
                  <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--text-muted)" }} />
                  <input
                    value={input}
                    onChange={(event) => setInput(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") addSymbol();
                    }}
                    placeholder="종목코드 6자리"
                    className="h-9 w-full rounded-lg border bg-transparent pl-8 pr-3 text-xs outline-none"
                    style={{ borderColor: "var(--border)", color: "var(--text-primary)" }}
                  />
                </div>
                <button
                  type="button"
                  onClick={addSymbol}
                  aria-label="관심종목 추가"
                  className="flex h-9 w-9 items-center justify-center rounded-lg"
                  style={{ background: ACCENT, color: "#fff" }}
                >
                  <Plus size={15} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto scrollbar-hide pr-0.5">
                {loading && !data ? (
                  <SkeletonRows />
                ) : quotes.length === 0 ? (
                  <EmptyState title="관심종목 매매정보가 없습니다" detail="종목코드를 추가하거나 KRX API 이용 승인 상태를 확인하세요." />
                ) : (
                  <div className="flex flex-col gap-2">
                    {quotes.map((quote) => <QuoteRow key={quote.symbol} quote={quote} onRemove={removeSymbol} />)}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === "rank" && (
            <div className="flex h-full flex-col gap-3">
              <div className="flex gap-1.5 overflow-x-auto scrollbar-hide">
                {STOCK_RANKING_KINDS.map((kind) => {
                  const active = activeRank === kind;
                  return (
                    <button
                      key={kind}
                      type="button"
                      onClick={() => setActiveRank(kind)}
                      className="tag shrink-0 gap-1"
                      style={{ background: active ? ACCENT : `${ACCENT}15`, color: active ? "#fff" : "var(--text-muted)" }}
                    >
                      {RANK_META[kind].icon}
                      {RANK_META[kind].label}
                    </button>
                  );
                })}
              </div>
              <ThemeStrip themes={data?.themes ?? []} />
              <div className="flex-1 overflow-y-auto scrollbar-hide pr-0.5">
                {loading && !data ? (
                  <SkeletonRows />
                ) : currentRankings.length === 0 ? (
                  <EmptyState title="랭킹 데이터가 없습니다" detail="기준일 데이터, KRX API 권한, 호출 제한 상태를 확인하세요." />
                ) : (
                  <div className="grid gap-2 md:grid-cols-2">
                    {currentRankings.slice(0, 10).map((item) => (
                      <RankingRow key={`${activeRank}-${item.symbol}-${item.rank}`} item={item} />
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === "ipo" && (
            <div className="h-full overflow-y-auto scrollbar-hide pr-0.5">
              {data?.ipos.length ? (
                <div className="grid gap-2 md:grid-cols-2">
                  {data.ipos.map((item) => (
                    <a
                      key={item.id}
                      href={item.detailUrl ?? "https://kind.krx.co.kr"}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex min-h-[74px] items-center gap-3 rounded-xl px-3 py-2.5 transition-opacity hover:opacity-80"
                      style={{ background: "rgba(255,255,255,0.045)", border: "1px solid var(--border)" }}
                    >
                      <div className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-xl"
                        style={{ background: `${ACCENT}18`, color: ACCENT }}>
                        <span className="text-[9px] font-bold">상장</span>
                        <span className="text-xs font-black">{formatDate(item.listingDate)}</span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-bold" style={{ color: "var(--text-primary)" }}>{item.name}</p>
                        <p className="mt-0.5 truncate text-[10px]" style={{ color: "var(--text-muted)" }}>
                          {item.market} · {item.category}
                        </p>
                        <p className="mt-0.5 truncate text-[10px]" style={{ color: "var(--text-muted)" }}>
                          {item.symbol || "종목코드 미정"}{item.leadManager ? ` · ${item.leadManager}` : ""}
                        </p>
                      </div>
                      <ArrowRight size={12} style={{ color: "var(--text-muted)" }} />
                    </a>
                  ))}
                </div>
              ) : (
                <EmptyState title="최근 신규 상장 정보가 없습니다" detail="KRX 종목기본정보 기준으로 최근 상장 항목이 조회되지 않았습니다." />
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
