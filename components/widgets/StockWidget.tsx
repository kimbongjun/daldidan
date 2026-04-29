"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowDown,
  ArrowRight,
  ArrowUp,
  BarChart3,
  Bell,
  ChevronLeft,
  ChevronRight,
  LineChart,
  Loader2,
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
  type AssetType,
  type StockOverviewResponse,
  type StockQuote,
  type StockRankingItem,
  type StockRankingKind,
  type StockSearchResult,
  type StockTheme,
  type WatchlistItem,
} from "@/lib/stocks/types";
import {
  sanitizeSymbol,
  sanitizeIndexSymbol,
  formatPrice,
  formatVolume,
  formatTradingValue,
} from "@/lib/stocks/utils";

const ACCENT = "#F43F5E";
const DOWN = "#10B981";
const STORAGE_KEY = "daldidan-stock-watchlist";
const PAGE_SIZE = 5;
const DEFAULT_WATCHLIST: WatchlistItem[] = [
  { symbol: "005930", assetType: "stock" },
  { symbol: "000660", assetType: "stock" },
  { symbol: "035420", assetType: "stock" },
  { symbol: "005380", assetType: "stock" },
];

type Tab = "watch" | "rank" | "ipo";
type LoadPhase = "idle" | "quotes" | "charts" | "done" | "error";

const RANK_META: Record<StockRankingKind, { label: string; icon: React.ReactNode }> = {
  amount: { label: "거래대금", icon: <BarChart3 size={11} /> },
  volume: { label: "거래량", icon: <LineChart size={11} /> },
  rise: { label: "급상승", icon: <TrendingUp size={11} /> },
  fall: { label: "급하락", icon: <TrendingDown size={11} /> },
  popular: { label: "인기", icon: <Star size={11} /> },
};

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

// ──────────────────────────────────────────────
// 공통 컴포넌트
// ──────────────────────────────────────────────

function AssetTypeBadge({ assetType }: { assetType: AssetType }) {
  const config: Record<AssetType, { label: string; bg: string; color: string }> = {
    stock: { label: "주식", bg: "rgba(255,255,255,0.08)", color: "var(--text-muted)" },
    etf:   { label: "ETF",  bg: "rgba(99,102,241,0.18)",  color: "#6366F1" },
    index: { label: "지수", bg: "rgba(245,158,11,0.18)",  color: "#F59E0B" },
  };
  const { label, bg, color } = config[assetType];
  return (
    <span className="shrink-0 rounded px-1.5 py-0.5 text-[9px] font-black uppercase" style={{ background: bg, color }}>
      {label}
    </span>
  );
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

function SkeletonRows({ count = 3 }: { count?: number }) {
  return (
    <div className="flex flex-col gap-2">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="h-[62px] rounded-xl animate-pulse"
          style={{ background: "rgba(255,255,255,0.05)", border: "1px solid var(--border)" }}
        />
      ))}
    </div>
  );
}

function StatusPill({ data, phase }: { data: StockOverviewResponse | null; phase: LoadPhase }) {
  const isLive = data?.status === "live";
  const isLoading = phase === "quotes" || phase === "charts";
  const label =
    phase === "quotes" ? "시세 수신 중..." :
    phase === "charts" ? "차트 준비 중..." :
    isLive ? "KRX 실시간" :
    data?.status === "not_configured" ? "API 설정 필요" : "오류";
  const color =
    isLoading ? "#F59E0B" :
    isLive ? "#10B981" :
    phase === "error" ? ACCENT : "var(--text-muted)";

  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold"
      style={{ background: isLive && !isLoading ? "rgba(16,185,129,0.14)" : "rgba(255,255,255,0.05)", color }}
    >
      {isLoading
        ? <Loader2 size={10} className="animate-spin" />
        : <span className="h-1.5 w-1.5 rounded-full" style={{ background: color }} />
      }
      {label}
    </span>
  );
}

function LoadProgress({ phase }: { phase: LoadPhase }) {
  if (phase === "idle" || phase === "done" || phase === "error") return null;
  const pct = phase === "quotes" ? "45%" : "85%";
  return (
    <div className="h-0.5 w-full overflow-hidden rounded-full" style={{ background: "rgba(255,255,255,0.08)" }}>
      <div
        className="h-full rounded-full transition-all duration-700"
        style={{ width: pct, background: ACCENT }}
      />
    </div>
  );
}

function EmptyState({ title, detail }: { title: string; detail: string }) {
  return (
    <div
      className="flex min-h-[120px] flex-col items-center justify-center gap-2 rounded-xl px-4 py-4 text-center"
      style={{ background: "rgba(255,255,255,0.04)", border: "1px solid var(--border)" }}
    >
      <p className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>{title}</p>
      <p className="text-xs leading-relaxed" style={{ color: "var(--text-muted)" }}>{detail}</p>
    </div>
  );
}

function Pagination({ page, total, onChange }: { page: number; total: number; onChange: (p: number) => void }) {
  const pages = Math.ceil(total / PAGE_SIZE);
  if (pages <= 1) return null;
  return (
    <div className="flex items-center justify-between gap-2 pt-1">
      <button
        type="button"
        disabled={page === 0}
        onClick={() => onChange(page - 1)}
        className="flex h-7 items-center gap-0.5 rounded-lg px-2.5 text-xs font-semibold transition-opacity disabled:opacity-30"
        style={{ background: `${ACCENT}15`, color: ACCENT }}
      >
        <ChevronLeft size={12} /> 이전
      </button>
      <span className="text-[11px] tabular-nums" style={{ color: "var(--text-muted)" }}>
        {page + 1} / {pages}
      </span>
      <button
        type="button"
        disabled={page >= pages - 1}
        onClick={() => onChange(page + 1)}
        className="flex h-7 items-center gap-0.5 rounded-lg px-2.5 text-xs font-semibold transition-opacity disabled:opacity-30"
        style={{ background: `${ACCENT}15`, color: ACCENT }}
      >
        다음 <ChevronRight size={12} />
      </button>
    </div>
  );
}

// ──────────────────────────────────────────────
// 행 컴포넌트
// ──────────────────────────────────────────────

function QuoteRow({ quote, onRemove }: { quote: StockQuote; onRemove: (symbol: string) => void }) {
  const color = changeColor(quote.changePct);
  const isIndex = quote.assetType === "index";
  return (
    <div
      className="grid min-h-[64px] grid-cols-[minmax(0,1.3fr)_auto_auto_auto] items-center gap-3 rounded-xl px-3 py-2.5"
      style={{ background: "rgba(255,255,255,0.045)", border: "1px solid var(--border)" }}
    >
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-1.5">
          <p className="truncate text-sm font-black" style={{ color: "var(--text-primary)" }}>{quote.name}</p>
          <AssetTypeBadge assetType={quote.assetType} />
          {!isIndex && (
            <span className="rounded-md px-1.5 py-0.5 text-[10px] font-bold" style={{ background: "rgba(255,255,255,0.07)", color: "var(--text-muted)" }}>
              {quote.symbol}
            </span>
          )}
        </div>
        {!isIndex && (
          <p className="mt-0.5 text-[11px]" style={{ color: "var(--text-muted)" }}>
            거래량 {formatVolume(quote.volume)} · 대금 {formatTradingValue(quote.tradingValue)}
          </p>
        )}
      </div>
      {!isIndex && (
        <div className="hidden w-[88px] justify-end sm:flex">
          <Sparkline data={quote.sparkline} color={color} width={84} height={32} />
        </div>
      )}
      <div className="text-right">
        <p className="text-sm font-black tabular-nums" style={{ color: "var(--text-primary)" }}>{formatPrice(quote.price)}</p>
        <ChangeBadge change={quote.change} changePct={quote.changePct} />
      </div>
      <button
        type="button"
        onClick={() => onRemove(quote.symbol)}
        aria-label={`${quote.name} 관심종목 제거`}
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-opacity hover:opacity-70"
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
      <div className="flex h-8 w-8 items-center justify-center rounded-lg text-xs font-black tabular-nums" style={{ background: `${ACCENT}18`, color: ACCENT }}>
        {item.rank}
      </div>
      <div className="min-w-0">
        <div className="flex min-w-0 items-center gap-1.5">
          <p className="truncate text-xs font-bold" style={{ color: "var(--text-primary)" }}>{item.name || item.symbol}</p>
          {item.symbol && <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>{item.symbol}</span>}
        </div>
        <p className="mt-0.5 text-[10px]" style={{ color: "var(--text-muted)" }}>
          {item.scoreLabel}{" "}
          {item.kind === "volume"
            ? formatVolume(item.scoreValue)
            : item.kind === "amount"
            ? formatTradingValue(item.scoreValue)
            : item.kind === "popular"
            ? `${item.rank}위`
            : `${item.scoreValue.toFixed(2)}%`}
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
    <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-0.5">
      {themes.map((theme) => {
        const color = theme.tone === "hot" ? ACCENT : theme.tone === "cool" ? DOWN : "var(--text-muted)";
        return (
          <div
            key={theme.label}
            className="min-w-[124px] rounded-xl px-3 py-2"
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

// 검색 결과 그룹 표시
function SearchResultGroup({
  results,
  focusedIndex,
  globalOffset,
  onSelect,
  onHover,
}: {
  results: StockSearchResult[];
  focusedIndex: number;
  globalOffset: number;
  onSelect: (r: StockSearchResult) => void;
  onHover: (idx: number) => void;
}) {
  return (
    <>
      {results.map((result, i) => {
        const gIdx = globalOffset + i;
        const isFocused = focusedIndex === gIdx;
        return (
          <button
            key={result.symbol}
            type="button"
            onMouseDown={(e) => { e.preventDefault(); onSelect(result); }}
            onMouseEnter={() => onHover(gIdx)}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left transition-colors"
            style={{
              background: isFocused ? `${ACCENT}18` : "rgba(255,255,255,0.04)",
              border: `1px solid ${isFocused ? `${ACCENT}40` : "var(--border)"}`,
            }}
          >
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <p className="truncate text-xs font-bold" style={{ color: "var(--text-primary)" }}>{result.name}</p>
                <AssetTypeBadge assetType={result.assetType} />
              </div>
              <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>
                {result.symbol} · {result.market}
              </p>
            </div>
            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg" style={{ background: `${ACCENT}18`, color: ACCENT }}>
              <Plus size={11} />
            </div>
          </button>
        );
      })}
    </>
  );
}

// ──────────────────────────────────────────────
// 메인 위젯
// ──────────────────────────────────────────────

export default function StockWidget() {
  const [activeTab, setActiveTab] = useState<Tab>("watch");
  const [activeRank, setActiveRank] = useState<StockRankingKind>("amount");
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>(DEFAULT_WATCHLIST);
  // localStorage 로드가 완료되기 전까지 save를 막기 위한 플래그
  const [hydrated, setHydrated] = useState(false);
  const [data, setData] = useState<StockOverviewResponse | null>(null);
  const [loadPhase, setLoadPhase] = useState<LoadPhase>("idle");
  const [refreshNonce, setRefreshNonce] = useState(0);

  // 검색 상태
  const [input, setInput] = useState("");
  const [searchResults, setSearchResults] = useState<StockSearchResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const [feedback, setFeedback] = useState<{ msg: string; type: "success" | "warn" | "error" } | null>(null);

  // 페이지네이션
  const [watchPage, setWatchPage] = useState(0);
  const [rankPage, setRankPage] = useState(0);
  const [ipoPage, setIpoPage] = useState(0);

  const searchRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const feedbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // localStorage 로드 (구형 string[] 포맷 마이그레이션 포함)
  // setHydrated(true)는 로드 성공 여부와 무관하게 항상 실행 — save effect 허용
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as unknown;
        if (Array.isArray(parsed)) {
          const next: WatchlistItem[] = parsed
            .map((item): WatchlistItem | null => {
              if (typeof item === "string") {
                const sym = sanitizeSymbol(item);
                return sym ? { symbol: sym, assetType: "stock" } : null;
              }
              if (typeof item === "object" && item !== null && "symbol" in item) {
                const raw = item as Record<string, unknown>;
                const rawSym = typeof raw.symbol === "string" ? raw.symbol : "";
                const validSym = sanitizeSymbol(rawSym) ?? sanitizeIndexSymbol(rawSym) ?? null;
                const rawAt = raw.assetType;
                const validAt: AssetType = rawAt === "etf" || rawAt === "index" ? rawAt : "stock";
                return validSym ? { symbol: validSym, assetType: validAt } : null;
              }
              return null;
            })
            .filter((item): item is WatchlistItem => item !== null);

          if (next.length > 0) setWatchlist(next.slice(0, 10));
        }
      }
    } catch {
      // 깨진 저장값은 기본값 사용
    }
    // React 18 batching: setWatchlist + setHydrated가 단일 re-render로 처리됨
    setHydrated(true);
  }, []);

  // hydrated 전에는 저장하지 않음 — 초기 렌더의 DEFAULT_WATCHLIST가 덮어쓰는 것을 방지
  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(watchlist));
  }, [hydrated, watchlist]);

  // 탭 전환 시 해당 페이지 리셋
  const changeTab = useCallback((tab: Tab) => {
    setActiveTab(tab);
    if (tab === "watch") setWatchPage(0);
    if (tab === "rank") setRankPage(0);
    if (tab === "ipo") setIpoPage(0);
  }, []);

  const showFeedback = useCallback((msg: string, type: "success" | "warn" | "error") => {
    if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current);
    setFeedback({ msg, type });
    feedbackTimerRef.current = setTimeout(() => setFeedback(null), 2500);
  }, []);

  // 2단계 fetch: Phase1 = 빠른 quotes, Phase2 = sparklines 포함 full
  const fetchStocks = useCallback(async (signal?: AbortSignal) => {
    setLoadPhase("quotes");
    const baseParams = new URLSearchParams({
      items: watchlist.map(({ symbol, assetType }) => `${symbol}:${assetType}`).join(","),
      rankings: STOCK_RANKING_KINDS.join(","),
    });

    // Phase 1: noSparkline — 시세만 빠르게
    try {
      const res = await fetch(`/api/stocks?${baseParams}&noSparkline=true`, { cache: "no-store", signal });
      const d = await res.json() as StockOverviewResponse;
      if (signal?.aborted) return;
      setData(d);
      setLoadPhase("charts");
    } catch (e: unknown) {
      if (e instanceof DOMException && e.name === "AbortError") return;
      setData({
        status: "error",
        provider: "KRX Open API",
        fetchedAt: new Date().toISOString(),
        marketDivCode: "KRX",
        quotes: [],
        rankings: { amount: [], volume: [], rise: [], fall: [], popular: [] },
        themes: [],
        ipos: [],
        message: "데이터를 불러오지 못했습니다.",
      });
      setLoadPhase("error");
      return;
    }

    // Phase 2: sparklines 포함 full — Phase 1 실패해도 Phase 1 데이터 유지
    try {
      const res = await fetch(`/api/stocks?${baseParams}`, { cache: "no-store", signal });
      const d = await res.json() as StockOverviewResponse;
      if (!signal?.aborted) { setData(d); setLoadPhase("done"); }
    } catch (e: unknown) {
      if (e instanceof DOMException && e.name === "AbortError") return;
      if (!signal?.aborted) setLoadPhase("done");
    }
  }, [watchlist]);

  useEffect(() => {
    const controller = new AbortController();
    void fetchStocks(controller.signal);
    const timer = window.setInterval(() => { void fetchStocks(); }, 600_000);
    return () => {
      controller.abort();
      window.clearInterval(timer);
    };
  }, [fetchStocks, refreshNonce]);

  const quotes = useMemo(() => {
    const map = new Map((data?.quotes ?? []).map((q) => [q.symbol, q]));
    return watchlist.map(({ symbol }) => map.get(symbol)).filter((q): q is StockQuote => Boolean(q));
  }, [data?.quotes, watchlist]);

  // 드롭다운 외부 클릭 닫기
  useEffect(() => {
    function onPointerDown(event: PointerEvent) {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
        setFocusedIndex(-1);
      }
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, []);

  // 검색 (300ms 디바운스)
  const handleInputChange = useCallback((value: string) => {
    setInput(value);
    setFocusedIndex(-1);
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (!value.trim()) {
      setSearchResults([]);
      setDropdownOpen(false);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const res = await fetch(`/api/stocks/search?q=${encodeURIComponent(value.trim())}&limit=10`);
        const json = (await res.json()) as { results: StockSearchResult[] };
        setSearchResults(json.results ?? []);
        setDropdownOpen((json.results ?? []).length > 0);
      } catch {
        setSearchResults([]);
        setDropdownOpen(false);
      } finally {
        setSearchLoading(false);
      }
    }, 300);
  }, []);

  const selectResult = useCallback((result: StockSearchResult) => {
    if (watchlist.some((item) => item.symbol === result.symbol)) {
      showFeedback("이미 관심종목에 있습니다", "warn");
    } else if (watchlist.length >= 10) {
      showFeedback("최대 10개까지 추가할 수 있습니다", "error");
    } else {
      setWatchlist((prev) => [...prev, { symbol: result.symbol, assetType: result.assetType }]);
      showFeedback(`${result.name} 추가됨`, "success");
      setWatchPage(0);
    }
    setInput("");
    setSearchResults([]);
    setDropdownOpen(false);
    setFocusedIndex(-1);
    setActiveTab("watch");
  }, [watchlist, showFeedback]);

  const addSymbol = useCallback(() => {
    // 드롭다운이 열려있으면 → focused 항목 또는 첫 번째 결과를 selectResult로 처리
    // (ETF·지수 등 assetType을 정확하게 반영하기 위해 raw input 파싱 대신 result 사용)
    if (dropdownOpen && searchResults.length > 0) {
      const target = focusedIndex >= 0 ? searchResults[focusedIndex] : searchResults[0];
      selectResult(target);
      return;
    }
    // 드롭다운 닫힌 상태에서 직접 코드 입력 폴백
    const stockSym = sanitizeSymbol(input);
    const indexSym = sanitizeIndexSymbol(input);
    const symbol = stockSym ?? indexSym;
    if (!symbol) return;
    const assetType: AssetType = indexSym ? "index" : "stock";
    if (watchlist.some((item) => item.symbol === symbol)) {
      showFeedback("이미 관심종목에 있습니다", "warn");
    } else if (watchlist.length >= 10) {
      showFeedback("최대 10개까지 추가할 수 있습니다", "error");
    } else {
      setWatchlist((prev) => [...prev, { symbol, assetType }]);
      showFeedback(`${symbol} 추가됨`, "success");
      setWatchPage(0);
    }
    setInput("");
    setSearchResults([]);
    setDropdownOpen(false);
    setActiveTab("watch");
  }, [input, dropdownOpen, focusedIndex, searchResults, selectResult, watchlist, showFeedback]);

  const handleKeyDown = useCallback((event: React.KeyboardEvent<HTMLInputElement>) => {
    const total = searchResults.length;
    if (!dropdownOpen || total === 0) {
      if (event.key === "Enter") addSymbol();
      return;
    }
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setFocusedIndex((prev) => Math.min(prev + 1, total - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setFocusedIndex((prev) => Math.max(prev - 1, -1));
    } else if (event.key === "Enter") {
      event.preventDefault();
      if (focusedIndex >= 0 && searchResults[focusedIndex]) {
        selectResult(searchResults[focusedIndex]);
      } else {
        addSymbol();
      }
    } else if (event.key === "Escape") {
      setDropdownOpen(false);
      setFocusedIndex(-1);
    }
  }, [dropdownOpen, searchResults, focusedIndex, addSymbol, selectResult]);

  const removeSymbol = useCallback((symbol: string) => {
    setWatchlist((prev) => prev.filter((item) => item.symbol !== symbol));
    setWatchPage(0);
  }, []);

  // 검색 결과 assetType별 그룹핑
  const groupedSearch = useMemo(() => {
    const stocks = searchResults.filter((r) => r.assetType === "stock");
    const etfs   = searchResults.filter((r) => r.assetType === "etf");
    const indices = searchResults.filter((r) => r.assetType === "index");
    return { stocks, etfs, indices };
  }, [searchResults]);

  const currentRankings = data?.rankings[activeRank] ?? [];
  const ipos = data?.ipos ?? [];
  const isConfigured = data?.status !== "not_configured";
  const isLoading = loadPhase === "quotes" || loadPhase === "charts";

  // 페이지 슬라이스
  const pagedQuotes = quotes.slice(watchPage * PAGE_SIZE, (watchPage + 1) * PAGE_SIZE);
  const pagedRankings = currentRankings.slice(rankPage * PAGE_SIZE, (rankPage + 1) * PAGE_SIZE);
  const pagedIpos = ipos.slice(ipoPage * PAGE_SIZE, (ipoPage + 1) * PAGE_SIZE);

  return (
    <div className="bento-card gradient-rose flex flex-col p-5 gap-3">
      {/* 헤더 */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: ACCENT }}>증권</p>
          <h2 className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>국내 증시 포털</h2>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <StatusPill data={data} phase={loadPhase} />
            <span className="text-[11px]" style={{ color: "var(--text-muted)" }}>
              {data?.provider ?? "KRX Open API"}
              {data?.baseDate ? ` · 기준 ${data.baseDate}` : ""}
              {data?.fetchedAt ? ` · ${formatDateTime(data.fetchedAt)}` : ""}
            </span>
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
          <a
            href="https://data.krx.co.kr/contents/MDC/MAIN/main/index.cmd"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-semibold transition-opacity hover:opacity-70"
            style={{ background: `${ACCENT}22`, color: ACCENT }}
          >
            KRX <ArrowRight size={11} />
          </a>
        </div>
      </div>

      {/* 로딩 프로그레스 바 */}
      <LoadProgress phase={loadPhase} />

      {/* 탭 */}
      <div className="flex gap-1.5">
        {(["watch", "rank", "ipo"] as const).map((key) => {
          const meta = { watch: { label: "관심", icon: <Star size={11} /> }, rank: { label: "랭킹", icon: <BarChart3 size={11} /> }, ipo: { label: "상장", icon: <Bell size={11} /> } }[key];
          const active = activeTab === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => changeTab(key)}
              className="flex flex-1 items-center justify-center gap-1 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all"
              style={{ background: active ? ACCENT : `${ACCENT}15`, color: active ? "#fff" : "var(--text-muted)" }}
            >
              {meta.icon}{meta.label}
            </button>
          );
        })}
      </div>

      {!isConfigured ? (
        <EmptyState
          title="KRX Open API 설정이 필요합니다"
          detail="KRX_OPENAPI_KEY를 .env.local에 설정하면 한국거래소 실시간 데이터를 표시합니다."
        />
      ) : (
        <div className="flex flex-col gap-3">

          {/* ── 관심 탭 ── */}
          {activeTab === "watch" && (
            <div className="flex flex-col gap-3">
              {/* 검색 인풋 */}
              <div ref={searchRef} className="relative">
                <div className="flex gap-2">
                  <div className="relative min-w-0 flex-1">
                    <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--text-muted)" }} />
                    <input
                      value={input}
                      onChange={(e) => handleInputChange(e.target.value)}
                      onKeyDown={handleKeyDown}
                      onFocus={() => { if (searchResults.length > 0) setDropdownOpen(true); }}
                      placeholder="주식·ETF·지수·코드 검색"
                      autoComplete="off"
                      className="h-9 w-full rounded-lg border bg-transparent pl-8 pr-8 text-xs outline-none"
                      style={{ borderColor: "var(--border)", color: "var(--text-primary)" }}
                    />
                    {searchLoading && (
                      <Loader2 size={12} className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin" style={{ color: "var(--text-muted)" }} />
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={addSymbol}
                    aria-label="관심종목 추가"
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
                    style={{ background: ACCENT, color: "#fff" }}
                  >
                    <Plus size={15} />
                  </button>
                </div>

                {/* 자동완성 드롭다운 — 그룹별 섹션 */}
                {dropdownOpen && searchResults.length > 0 && (
                  <div
                    className="absolute left-0 right-10 top-full z-50 mt-1 max-h-[280px] overflow-y-auto rounded-xl scrollbar-hide"
                    style={{ background: "var(--bg-card)", border: "1px solid var(--border)", boxShadow: "0 8px 32px rgba(0,0,0,0.5)" }}
                  >
                    <div className="flex flex-col gap-1 p-2">
                      {groupedSearch.stocks.length > 0 && (
                        <>
                          <p className="px-2 pt-1 pb-0.5 text-[9px] font-black uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>주식</p>
                          <SearchResultGroup results={groupedSearch.stocks} focusedIndex={focusedIndex} globalOffset={0} onSelect={selectResult} onHover={setFocusedIndex} />
                        </>
                      )}
                      {groupedSearch.etfs.length > 0 && (
                        <>
                          <p className="px-2 pt-2 pb-0.5 text-[9px] font-black uppercase tracking-wider" style={{ color: "#6366F1" }}>ETF</p>
                          <SearchResultGroup results={groupedSearch.etfs} focusedIndex={focusedIndex} globalOffset={groupedSearch.stocks.length} onSelect={selectResult} onHover={setFocusedIndex} />
                        </>
                      )}
                      {groupedSearch.indices.length > 0 && (
                        <>
                          <p className="px-2 pt-2 pb-0.5 text-[9px] font-black uppercase tracking-wider" style={{ color: "#F59E0B" }}>지수</p>
                          <SearchResultGroup results={groupedSearch.indices} focusedIndex={focusedIndex} globalOffset={groupedSearch.stocks.length + groupedSearch.etfs.length} onSelect={selectResult} onHover={setFocusedIndex} />
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* 피드백 */}
              {feedback && (
                <div
                  className="rounded-lg px-3 py-1.5 text-xs font-semibold"
                  style={{
                    background: feedback.type === "success" ? "rgba(16,185,129,0.12)" : feedback.type === "warn" ? "rgba(245,158,11,0.12)" : "rgba(244,63,94,0.12)",
                    color: feedback.type === "success" ? "#10B981" : feedback.type === "warn" ? "#F59E0B" : ACCENT,
                  }}
                >
                  {feedback.msg}
                </div>
              )}

              {/* 관심종목 목록 */}
              {isLoading && !data ? (
                <SkeletonRows count={PAGE_SIZE} />
              ) : quotes.length === 0 ? (
                <EmptyState title="관심종목 매매정보가 없습니다" detail="종목명·ETF·지수명을 검색해서 추가하세요." />
              ) : (
                <>
                  <div className="flex flex-col gap-2">
                    {pagedQuotes.map((q) => <QuoteRow key={q.symbol} quote={q} onRemove={removeSymbol} />)}
                  </div>
                  <Pagination page={watchPage} total={quotes.length} onChange={setWatchPage} />
                </>
              )}
            </div>
          )}

          {/* ── 랭킹 탭 ── */}
          {activeTab === "rank" && (
            <div className="flex flex-col gap-3">
              <div className="flex gap-1.5 overflow-x-auto scrollbar-hide">
                {STOCK_RANKING_KINDS.map((kind) => {
                  const active = activeRank === kind;
                  return (
                    <button
                      key={kind}
                      type="button"
                      onClick={() => { setActiveRank(kind); setRankPage(0); }}
                      className="tag shrink-0 gap-1"
                      style={{ background: active ? ACCENT : `${ACCENT}15`, color: active ? "#fff" : "var(--text-muted)" }}
                    >
                      {RANK_META[kind].icon}{RANK_META[kind].label}
                    </button>
                  );
                })}
              </div>
              <ThemeStrip themes={data?.themes ?? []} />
              {isLoading && !data ? (
                <SkeletonRows count={PAGE_SIZE} />
              ) : currentRankings.length === 0 ? (
                <EmptyState title="랭킹 데이터가 없습니다" detail="KRX API 권한 및 호출 제한 상태를 확인하세요." />
              ) : (
                <>
                  <div className="flex flex-col gap-2">
                    {pagedRankings.map((item) => (
                      <RankingRow key={`${activeRank}-${item.symbol}-${item.rank}`} item={item} />
                    ))}
                  </div>
                  <Pagination page={rankPage} total={currentRankings.length} onChange={setRankPage} />
                </>
              )}
            </div>
          )}

          {/* ── 상장 탭 ── */}
          {activeTab === "ipo" && (
            <div className="flex flex-col gap-3">
              {ipos.length === 0 ? (
                <EmptyState title="최근 신규 상장 정보가 없습니다" detail="KRX 종목기본정보 기준으로 최근 상장 항목이 조회되지 않았습니다." />
              ) : (
                <>
                  <div className="flex flex-col gap-2">
                    {pagedIpos.map((item) => (
                      <a
                        key={item.id}
                        href={item.detailUrl ?? "https://kind.krx.co.kr"}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex min-h-[68px] items-center gap-3 rounded-xl px-3 py-2.5 transition-opacity hover:opacity-80"
                        style={{ background: "rgba(255,255,255,0.045)", border: "1px solid var(--border)" }}
                      >
                        <div
                          className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-xl"
                          style={{ background: `${ACCENT}18`, color: ACCENT }}
                        >
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
                  <Pagination page={ipoPage} total={ipos.length} onChange={setIpoPage} />
                </>
              )}
            </div>
          )}

        </div>
      )}
    </div>
  );
}
