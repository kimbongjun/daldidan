"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { SortableContext, arrayMove, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  ArrowDown,
  ArrowUp,
  ChevronLeft,
  ChevronRight,
  GripVertical,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  Settings2,
  Trash2,
  WalletCards,
  X,
} from "lucide-react";
import Sparkline from "@/components/Sparkline";
import CandleChart from "@/components/stock/detail/CandleChart";
import OrderbookPanel from "@/components/stock/detail/OrderbookPanel";
import TradesTape from "@/components/stock/detail/TradesTape";
import PriceLimitGauge from "@/components/stock/detail/PriceLimitGauge";
import WarningBadges from "@/components/stock/detail/WarningBadges";
import {
  type AssetType,
  type StockDetailResponse,
  type StockOverviewResponse,
  type StockQuote,
  type StockSearchResult,
  type WatchlistItem,
} from "@/lib/stocks/types";
import {
  sanitizeSymbol,
  formatPrice,
  formatVolume,
  formatTradingValue,
} from "@/lib/stocks/utils";
import { getKrxMarketWindow } from "@/lib/stocks/cache-policy";

const ACCENT = "#F05C6E";
const RISE = "var(--stock-rise)";
const FALL = "var(--stock-fall)";
const STORAGE_KEY = "daldidan-stock-watchlist";
const PORTFOLIO_STORAGE_KEY = "daldidan-stock-portfolio";
const RESPONSE_STORAGE_PREFIX = "daldidan-stock-response";
const PAGE_SIZE = 5;
const DEFAULT_WATCHLIST: WatchlistItem[] = [
  { symbol: "005930", assetType: "stock" },
  { symbol: "000660", assetType: "stock" },
];

type LoadPhase = "idle" | "quotes" | "charts" | "done" | "error";
type WatchSort = "manual" | "change" | "value" | "name";
type FlashDirection = "up" | "down";
type PortfolioMap = Record<string, { avgPrice: number }>;
type StockCacheSnapshot = {
  data: StockOverviewResponse;
  bucketKey: string | null;
  tradingDay: string | null;
  savedAt: string;
};

function formatDateTime(value?: string): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

function formatAbsoluteDateTime(value?: string): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("ko-KR", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

/** 상장일 등 ISO/날짜 문자열을 YYYY.MM.DD 로 포맷 */
function formatListDate(value?: string): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}.${m}.${d}`;
}

function formatMoney(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return "-";
  if (value >= 1_000_000_000_000) return `${(value / 1_000_000_000_000).toFixed(1)}조`;
  if (value >= 100_000_000) return `${Math.round(value / 100_000_000).toLocaleString()}억`;
  return `${Math.round(value / 10_000).toLocaleString()}만`;
}

function formatSignedPrice(value: number): string {
  if (!Number.isFinite(value)) return "-";
  const sign = value > 0 ? "+" : value < 0 ? "-" : "";
  return `${sign}${Math.abs(Math.round(value)).toLocaleString()}`;
}

function getRangePosition(quote: StockQuote): { low: number; high: number; pct: number } {
  const values = [
    quote.price,
    quote.low,
    quote.high,
    quote.fiftyTwoWeekLow,
    quote.fiftyTwoWeekHigh,
    ...quote.sparkline,
  ].filter((value): value is number => typeof value === "number" && Number.isFinite(value) && value > 0);
  if (values.length === 0) return { low: 0, high: 0, pct: 50 };
  const low = Math.min(...values);
  const high = Math.max(...values);
  const pct = high > low ? ((quote.price - low) / (high - low)) * 100 : 50;
  return { low, high, pct: Math.min(100, Math.max(0, pct)) };
}

function changeColor(value: number): string {
  if (value > 0) return RISE;
  if (value < 0) return FALL;
  return "var(--text-muted)";
}

function makeStockRequestKey(items: WatchlistItem[]): string {
  return items.map(({ symbol, assetType }) => `${symbol}:${assetType}`).join(",");
}

function getResponseStorageKey(requestKey: string): string {
  return `${RESPONSE_STORAGE_PREFIX}:${requestKey || "default"}`;
}

function readStockSnapshot(requestKey: string): StockCacheSnapshot | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(getResponseStorageKey(requestKey));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<StockCacheSnapshot> | null;
    if (!parsed || typeof parsed !== "object" || !parsed.data) return null;
    return {
      data: parsed.data as StockOverviewResponse,
      bucketKey: typeof parsed.bucketKey === "string" ? parsed.bucketKey : null,
      tradingDay: typeof parsed.tradingDay === "string" ? parsed.tradingDay : null,
      savedAt: typeof parsed.savedAt === "string" ? parsed.savedAt : "",
    };
  } catch {
    return null;
  }
}

function writeStockSnapshot(requestKey: string, snapshot: StockCacheSnapshot) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(getResponseStorageKey(requestKey), JSON.stringify(snapshot));
  } catch {}
}

function snapshotMatchesWindow(snapshot: StockCacheSnapshot | null, requestKey: string, windowInfo = getKrxMarketWindow()): boolean {
  if (!snapshot) return false;
  if (!requestKey) return false;
  if (windowInfo.open) return snapshot.bucketKey === windowInfo.bucketKey;
  return snapshot.tradingDay === windowInfo.mostRecentTradingDay;
}

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
          className="h-[62px] rounded-xl skeleton-shimmer"
          style={{ border: "1px solid var(--border)" }}
        />
      ))}
    </div>
  );
}

function StatusPill({ data, phase, marketStatus }: { data: StockOverviewResponse | null; phase: LoadPhase; marketStatus: { open: boolean; label: string } }) {
  const isLive = data?.status === "live";
  const isLoading = phase === "quotes" || phase === "charts";
  const label =
    phase === "quotes" ? "시세 수신 중..." :
    phase === "charts" ? "차트 준비 중..." :
    isLive ? `토스 ${marketStatus.label}` :
    data?.status === "not_configured" ? "API 설정 필요" : "오류";
  const color =
    isLoading ? "#F59E0B" :
    isLive && marketStatus.open ? "#10B981" :
    isLive ? "var(--text-muted)" :
    phase === "error" ? ACCENT : "var(--text-muted)";

  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold"
      style={{ background: isLive && marketStatus.open && !isLoading ? "rgba(16,185,129,0.14)" : "rgba(255,255,255,0.05)", color }}
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

function QuoteRow({
  quote,
  onRemove,
  onOpen,
  flash,
  dragHandle,
  portfolioMode,
  portfolio,
  onPortfolioChange,
}: {
  quote: StockQuote;
  onRemove: (symbol: string) => void;
  onOpen: (quote: StockQuote) => void;
  flash?: FlashDirection;
  dragHandle?: React.ReactNode;
  portfolioMode: boolean;
  portfolio?: { avgPrice: number };
  onPortfolioChange: (symbol: string, avgPrice: number) => void;
}) {
  const color = changeColor(quote.changePct);
  const isIndex = quote.assetType === "index";
  const range = getRangePosition(quote);
  const avgPrice = portfolio?.avgPrice ?? 0;
  const profit = avgPrice > 0 ? quote.price - avgPrice : 0;
  const profitPct = avgPrice > 0 ? (profit / avgPrice) * 100 : 0;
  const profitColor = changeColor(profitPct);
  const rowColumns = dragHandle
    ? "grid-cols-[auto_minmax(0,1.3fr)_auto_auto_auto]"
    : "grid-cols-[minmax(0,1.3fr)_auto_auto_auto]";
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onOpen(quote)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onOpen(quote);
        }
      }}
      className={[
        `grid w-full min-h-[74px] cursor-pointer ${rowColumns} items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors`,
        flash === "up" ? "animate-stock-flash-up" : flash === "down" ? "animate-stock-flash-down" : "",
      ].filter(Boolean).join(" ")}
      style={{ background: "rgba(255,255,255,0.045)", border: "1px solid var(--border)" }}
    >
      {dragHandle && (
        <div onClick={(event) => event.stopPropagation()} onKeyDown={(event) => event.stopPropagation()} className="flex h-full items-center">
          {dragHandle}
        </div>
      )}
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
        {range.high > range.low && (
          <div className="hidden sm:grid mt-1.5 grid-cols-[34px_minmax(0,1fr)_34px] items-center gap-1.5">
            <span className="text-[9px] tabular-nums" style={{ color: "var(--text-muted)" }}>{formatPrice(range.low)}</span>
            <div className="h-1.5 overflow-hidden rounded-full" style={{ background: "rgba(255,255,255,0.08)" }}>
              <div className="h-full rounded-full" style={{ width: `${range.pct}%`, background: color }} />
            </div>
            <span className="text-right text-[9px] tabular-nums" style={{ color: "var(--text-muted)" }}>{formatPrice(range.high)}</span>
          </div>
        )}
        {portfolioMode && !isIndex && (
          <div className="mt-2 grid grid-cols-[86px_minmax(0,1fr)] items-center gap-2">
            <input
              value={avgPrice > 0 ? String(avgPrice) : ""}
              onClick={(event) => event.stopPropagation()}
              onKeyDown={(event) => event.stopPropagation()}
              onChange={(event) => onPortfolioChange(quote.symbol, Number(event.target.value.replace(/[^\d.]/g, "")))}
              inputMode="decimal"
              placeholder="매입가"
              className="h-7 rounded-md border bg-transparent px-2 text-[11px] outline-none"
              style={{ borderColor: "var(--border)", color: "var(--text-primary)" }}
            />
            <div className="flex min-w-0 flex-wrap items-center gap-1.5 text-[10px] font-bold">
              <span style={{ color: "var(--text-muted)" }}>평단 {avgPrice > 0 ? formatPrice(avgPrice) : "-"}</span>
              <span className="tabular-nums" style={{ color: profitColor }}>{avgPrice > 0 ? `${profitPct > 0 ? "+" : ""}${profitPct.toFixed(2)}%` : "-%"}</span>
              <span className="tabular-nums" style={{ color: profitColor }}>{avgPrice > 0 ? formatSignedPrice(profit) : "-"}</span>
            </div>
          </div>
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
        onClick={(event) => { event.stopPropagation(); onRemove(quote.symbol); }}
        onKeyDown={(event) => event.stopPropagation()}
        aria-label={`${quote.name} 관심종목 제거`}
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-opacity hover:opacity-70"
        style={{ background: "rgba(255,255,255,0.05)", color: "var(--text-muted)" }}
      >
        <Trash2 size={13} />
      </button>
    </div>
  );
}

function SortableQuoteRow({
  quote,
  children,
}: {
  quote: StockQuote;
  children: (dragHandle: React.ReactNode) => React.ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: quote.symbol });
  const dragHandle = (
    <button
      type="button"
      {...attributes}
      {...listeners}
      aria-label={`${quote.name} 순서 변경`}
      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-opacity hover:opacity-70"
      style={{ background: "rgba(255,255,255,0.05)", color: "var(--text-muted)", cursor: isDragging ? "grabbing" : "grab" }}
    >
      <GripVertical size={13} />
    </button>
  );

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.45 : 1,
      }}
    >
      {children(dragHandle)}
    </div>
  );
}

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

const DETAIL_COUNT = 120;
type DetailPhase = "loading" | "ready" | "error" | "not_configured";

function QuoteDetailModal({ quote, onClose }: { quote: StockQuote; onClose: () => void }) {
  const [detail, setDetail] = useState<StockDetailResponse | null>(null);
  const [phase, setPhase] = useState<DetailPhase>("loading");
  const pollAbortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  const fetchDetail = useCallback(async (signal: AbortSignal, silent: boolean) => {
    if (!silent) setPhase("loading");
    try {
      const res = await fetch(`/api/stocks/${quote.symbol}/detail?interval=1d&count=${DETAIL_COUNT}`, { signal });
      const json = (await res.json()) as StockDetailResponse;
      if (signal.aborted) return;
      setDetail(json);
      setPhase(json.status === "not_configured" ? "not_configured" : json.status === "error" ? "error" : "ready");
    } catch {
      if (signal.aborted) return;
      if (!silent) setPhase("error");
    }
  }, [quote.symbol]);

  // 오픈 시 1회 호출 + 장중·탭 활성일 때만 7초 폴링 (호가/체결 실시간성)
  useEffect(() => {
    const initialController = new AbortController();
    void fetchDetail(initialController.signal, false);

    const timer = window.setInterval(() => {
      if (!getKrxMarketWindow().open) return;
      if (typeof document !== "undefined" && document.visibilityState !== "visible") return;
      pollAbortRef.current?.abort();
      const controller = new AbortController();
      pollAbortRef.current = controller;
      void fetchDetail(controller.signal, true);
    }, 7_000);

    return () => {
      initialController.abort();
      pollAbortRef.current?.abort();
      window.clearInterval(timer);
    };
  }, [fetchDetail]);

  // 시세는 detail(토스)가 더 신선하면 우선, 없으면 모달을 연 쪽의 quote 사용.
  // 단, 종목명/시장/심볼은 토스 시세에 없으므로 항상 quote 값을 표시.
  const live = detail?.quote && detail.quote.price > 0 ? detail.quote : null;
  const displayPrice = live?.price ?? quote.price;
  const displayChange = live?.change ?? quote.change;
  const displayChangePct = live?.changePct ?? quote.changePct;

  const range = getRangePosition(quote);
  const stats = [
    { label: "시가", value: formatPrice(quote.open) },
    { label: "고가", value: formatPrice(quote.high) },
    { label: "저가", value: formatPrice(quote.low) },
    { label: "전일", value: formatPrice(quote.previousClose) },
    { label: "거래량", value: formatVolume(quote.volume) },
    { label: "거래대금", value: formatTradingValue(quote.tradingValue) },
    { label: "시가총액", value: formatMoney(quote.marketCap ?? 0) },
    { label: quote.assetType === "etf" ? "상장좌수" : "상장주식", value: formatVolume(quote.listedShares ?? 0).replace("주", "") },
    ...(quote.listDate ? [{ label: "상장일", value: formatListDate(quote.listDate) }] : []),
  ];

  const rangeColor = changeColor(displayChangePct);

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/55 px-4 py-6" onMouseDown={onClose}>
      <div
        className="flex max-h-[88vh] w-full max-w-lg flex-col rounded-2xl shadow-2xl"
        onMouseDown={(event) => event.stopPropagation()}
        style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
      >
        {/* 헤더 (고정) */}
        <div className="flex items-start justify-between gap-3 p-4 pb-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-1.5">
              <h3 className="truncate text-base font-black" style={{ color: "var(--text-primary)" }}>{quote.name}</h3>
              <AssetTypeBadge assetType={quote.assetType} />
              {quote.nxtSupported && (
                <span className="shrink-0 rounded px-1.5 py-0.5 text-[9px] font-black uppercase" style={{ background: "rgba(16,185,129,0.18)", color: "#10B981" }}>
                  NXT
                </span>
              )}
            </div>
            <p className="mt-0.5 text-[11px]" style={{ color: "var(--text-muted)" }}>
              {quote.symbol} · {quote.market}{quote.englishName ? ` · ${quote.englishName}` : ""}
            </p>
            {detail && detail.warnings.length > 0 && (
              <div className="mt-1.5">
                <WarningBadges warnings={detail.warnings} />
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="종목 상세 닫기"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
            style={{ background: "rgba(255,255,255,0.06)", color: "var(--text-muted)" }}
          >
            <X size={14} />
          </button>
        </div>

        {/* 본문 (스크롤) */}
        <div className="flex flex-col gap-4 overflow-y-auto px-4 pb-4 scrollbar-hide">
          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-3">
            <div>
              <p className="text-2xl font-black tabular-nums" style={{ color: "var(--text-primary)" }}>{formatPrice(displayPrice)}</p>
              <ChangeBadge change={displayChange} changePct={displayChangePct} />
            </div>
            <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>{quote.baseDate}</p>
          </div>

          {phase === "loading" ? (
            <div className="flex h-[200px] items-center justify-center rounded-xl" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid var(--border)" }}>
              <Loader2 size={20} className="animate-spin" style={{ color: ACCENT }} />
            </div>
          ) : phase === "not_configured" ? (
            <div className="rounded-xl px-4 py-6 text-center text-xs" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid var(--border)", color: "var(--text-muted)" }}>
              토스 OpenAPI 키가 설정되지 않았습니다.
            </div>
          ) : phase === "error" ? (
            <div className="rounded-xl px-4 py-6 text-center text-xs" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid var(--border)", color: "var(--text-muted)" }}>
              토스 데이터를 불러오지 못했습니다.
            </div>
          ) : detail ? (
            <>
              <CandleChart symbol={quote.symbol} initialCandles={detail.candles} initialInterval={detail.interval} />

              {detail.priceLimit && (
                <PriceLimitGauge priceLimit={detail.priceLimit} price={displayPrice} />
              )}

              <div className="grid gap-3 sm:grid-cols-2">
                {detail.orderbook && (detail.orderbook.asks.length > 0 || detail.orderbook.bids.length > 0) && (
                  <div className="flex flex-col gap-1.5">
                    <p className="text-[10px] font-black uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>호가</p>
                    <OrderbookPanel orderbook={detail.orderbook} price={displayPrice} />
                  </div>
                )}
                <div className="flex flex-col gap-1.5">
                  <p className="text-[10px] font-black uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>체결</p>
                  <TradesTape trades={detail.trades} />
                </div>
              </div>
            </>
          ) : null}

          {range.high > range.low && (
            <div>
              <div className="mb-1 flex items-center justify-between text-[10px] font-bold" style={{ color: "var(--text-muted)" }}>
                <span>52W {formatPrice(range.low)}</span>
                <span>{formatPrice(range.high)}</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full" style={{ background: "rgba(255,255,255,0.08)" }}>
                <div className="h-full rounded-full" style={{ width: `${range.pct}%`, background: rangeColor }} />
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {stats.map((stat) => (
              <div key={stat.label} className="rounded-lg px-2.5 py-2" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid var(--border)" }}>
                <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>{stat.label}</p>
                <p className="mt-0.5 truncate text-xs font-black tabular-nums" style={{ color: "var(--text-primary)" }}>{stat.value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}

export default function StockFullView() {
  const [watchSort, setWatchSort] = useState<WatchSort>("manual");
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>(DEFAULT_WATCHLIST);
  const [portfolioMode, setPortfolioMode] = useState(false);
  const [portfolio, setPortfolio] = useState<PortfolioMap>({});
  const [userId, setUserId] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  const watchlistKey = userId ? `${STORAGE_KEY}-${userId}` : STORAGE_KEY;
  const portfolioKey = userId ? `${PORTFOLIO_STORAGE_KEY}-${userId}` : PORTFOLIO_STORAGE_KEY;

  const [data, setData] = useState<StockOverviewResponse | null>(null);
  const [loadPhase, setLoadPhase] = useState<LoadPhase>("idle");
  const [refreshNonce, setRefreshNonce] = useState(0);
  const [flashMap, setFlashMap] = useState<Record<string, FlashDirection>>({});
  const [marketStatus, setMarketStatus] = useState(() => {
    const { open, label } = getKrxMarketWindow();
    return { open, label };
  });
  const [selectedQuote, setSelectedQuote] = useState<StockQuote | null>(null);

  const [input, setInput] = useState("");
  const [searchResults, setSearchResults] = useState<StockSearchResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const [feedback, setFeedback] = useState<{ msg: string; type: "success" | "warn" | "error" } | null>(null);

  const [watchPage, setWatchPage] = useState(0);

  const searchRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const feedbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const previousPricesRef = useRef<Map<string, number>>(new Map());
  const flashTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const refreshTimerRef = useRef<number | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

  const watchlistApiSaveRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const requestKey = useMemo(() => makeStockRequestKey(watchlist), [watchlist]);

  useEffect(() => {
    async function init() {
      let uid: string | null = null;
      try {
        const res = await fetch("/api/me");
        if (res.ok) {
          const d = await res.json() as { id: string };
          uid = d.id ?? null;
        }
      } catch {}
      setUserId(uid);

      const wKey = uid ? `${STORAGE_KEY}-${uid}` : STORAGE_KEY;
      const pKey = uid ? `${PORTFOLIO_STORAGE_KEY}-${uid}` : PORTFOLIO_STORAGE_KEY;

      try {
        let watchlistLoaded = false;

        if (uid) {
          try {
            const wRes = await fetch("/api/watchlist");
            if (wRes.ok) {
              const wData = await wRes.json() as { items: unknown[] };
              if (Array.isArray(wData.items) && wData.items.length > 0) {
                const next: WatchlistItem[] = wData.items
                  .map((item): WatchlistItem | null => {
                    if (typeof item === "object" && item !== null && "symbol" in item) {
                      const raw = item as Record<string, unknown>;
                      const rawSym = typeof raw.symbol === "string" ? raw.symbol : "";
                      const validSym = sanitizeSymbol(rawSym);
                      const validAt: AssetType = raw.assetType === "etf" ? "etf" : "stock";
                      return validSym ? { symbol: validSym, assetType: validAt } : null;
                    }
                    return null;
                  })
                  .filter((item): item is WatchlistItem => item !== null);
                if (next.length > 0) {
                  setWatchlist(next.slice(0, 10));
                  watchlistLoaded = true;
                }
              }
            }
          } catch {}
        }

        if (!watchlistLoaded) {
          let saved = localStorage.getItem(wKey);
          if (!saved && uid) {
            const legacy = localStorage.getItem(STORAGE_KEY);
            if (legacy) {
              saved = legacy;
              localStorage.setItem(wKey, legacy);
            }
          }
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
                    const validSym = sanitizeSymbol(rawSym);
                    const validAt: AssetType = raw.assetType === "etf" ? "etf" : "stock";
                    return validSym ? { symbol: validSym, assetType: validAt } : null;
                  }
                  return null;
                })
                .filter((item): item is WatchlistItem => item !== null);
              if (next.length > 0) setWatchlist(next.slice(0, 10));
            }
          }
        }

        let savedPortfolio = localStorage.getItem(pKey);
        if (!savedPortfolio && uid) {
          const legacyPortfolio = localStorage.getItem(PORTFOLIO_STORAGE_KEY);
          if (legacyPortfolio) {
            savedPortfolio = legacyPortfolio;
            localStorage.setItem(pKey, legacyPortfolio);
          }
        }
        if (savedPortfolio) {
          const parsedPortfolio = JSON.parse(savedPortfolio) as unknown;
          if (parsedPortfolio && typeof parsedPortfolio === "object") {
            const nextPortfolio = Object.entries(parsedPortfolio as Record<string, unknown>).reduce<PortfolioMap>((acc, [symbol, value]) => {
              const avgPrice =
                typeof value === "object" && value !== null && "avgPrice" in value
                  ? Number((value as { avgPrice?: unknown }).avgPrice)
                  : Number(value);
              if (sanitizeSymbol(symbol) && Number.isFinite(avgPrice) && avgPrice > 0) {
                acc[symbol] = { avgPrice };
              }
              return acc;
            }, {});
            setPortfolio(nextPortfolio);
          }
        }
      } catch {}
      setHydrated(true);
    }
    void init();
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(watchlistKey, JSON.stringify(watchlist));
    if (userId) {
      if (watchlistApiSaveRef.current) clearTimeout(watchlistApiSaveRef.current);
      watchlistApiSaveRef.current = setTimeout(() => {
        void fetch("/api/watchlist", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ items: watchlist }),
        });
      }, 800);
    }
  }, [hydrated, watchlist, watchlistKey, userId]);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(portfolioKey, JSON.stringify(portfolio));
  }, [hydrated, portfolio, portfolioKey]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      const { open, label } = getKrxMarketWindow();
      setMarketStatus({ open, label });
    }, 30_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const snapshot = readStockSnapshot(requestKey);
    if (!snapshot) return;
    setData(snapshot.data);
    setLoadPhase("done");
  }, [requestKey]);

  const showFeedback = useCallback((msg: string, type: "success" | "warn" | "error") => {
    if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current);
    setFeedback({ msg, type });
    feedbackTimerRef.current = setTimeout(() => setFeedback(null), 2500);
  }, []);

  const fetchStocks = useCallback(async (signal?: AbortSignal, options?: { force?: boolean }) => {
    const force = options?.force === true;
    const windowInfo = getKrxMarketWindow();
    setMarketStatus({ open: windowInfo.open, label: windowInfo.label });

    const snapshot = readStockSnapshot(requestKey);
    if (!force && snapshot && snapshotMatchesWindow(snapshot, requestKey, windowInfo)) {
      setData(snapshot.data);
      setLoadPhase("done");
      return;
    }

    setLoadPhase("quotes");
    const baseParams = new URLSearchParams({
      items: watchlist.map(({ symbol, assetType }) => `${symbol}:${assetType}`).join(","),
    });
    if (force) {
      baseParams.set("force", "true");
      baseParams.set("ts", String(Date.now()));
    }
    const fetchCacheMode: RequestCache = force || windowInfo.open ? "no-store" : "force-cache";

    const persistSnapshot = (payload: StockOverviewResponse) => {
      if (payload.status !== "live") return;
      writeStockSnapshot(requestKey, {
        data: payload,
        bucketKey: windowInfo.bucketKey,
        tradingDay: payload.baseDate ?? windowInfo.mostRecentTradingDay,
        savedAt: new Date().toISOString(),
      });
    };

    try {
      const p1Signal = signal
        ? AbortSignal.any([signal, AbortSignal.timeout(25_000)])
        : AbortSignal.timeout(25_000);
      const phase1Params = new URLSearchParams(baseParams);
      phase1Params.set("noSparkline", "true");
      const res = await fetch(`/api/stocks?${phase1Params.toString()}`, { cache: fetchCacheMode, signal: p1Signal });
      const d = await res.json() as StockOverviewResponse;
      if (signal?.aborted) return;
      setData(d);
      persistSnapshot(d);
      setLoadPhase("charts");
    } catch (e: unknown) {
      if (signal?.aborted) return;
      setData({
        status: "error",
        provider: "토스증권",
        fetchedAt: new Date().toISOString(),
        marketDivCode: "TOSS",
        quotes: [],
        marketIndices: [],
        rankings: { amount: [], volume: [], rise: [], fall: [], popular: [] },
        themes: [],
        ipos: [],
        message: e instanceof DOMException && e.name === "TimeoutError"
          ? "데이터 로딩 시간이 초과되었습니다."
          : "데이터를 불러오지 못했습니다.",
      });
      if (snapshot) {
        setData(snapshot.data);
        setLoadPhase("done");
        return;
      }
      setLoadPhase("error");
      return;
    }

    try {
      const p2Signal = signal
        ? AbortSignal.any([signal, AbortSignal.timeout(30_000)])
        : AbortSignal.timeout(30_000);
      const res = await fetch(`/api/stocks?${baseParams.toString()}`, { cache: fetchCacheMode, signal: p2Signal });
      const d = await res.json() as StockOverviewResponse;
      if (!signal?.aborted) {
        setData(d);
        persistSnapshot(d);
        setLoadPhase("done");
      }
    } catch {
      if (!signal?.aborted) setLoadPhase("done");
    }
  }, [requestKey, watchlist]);

  useEffect(() => {
    const controller = new AbortController();

    const run = async (force = false) => {
      await fetchStocks(controller.signal, { force });
      if (controller.signal.aborted) return;
      const nextWindow = getKrxMarketWindow();
      if (refreshTimerRef.current) window.clearTimeout(refreshTimerRef.current);
      refreshTimerRef.current = window.setTimeout(() => {
        void run(false);
      }, nextWindow.nextRefreshInMs);
    };

    void run(refreshNonce > 0);

    return () => {
      controller.abort();
      if (refreshTimerRef.current) window.clearTimeout(refreshTimerRef.current);
    };
  }, [fetchStocks, refreshNonce]);

  useEffect(() => {
    const current = data?.quotes ?? [];
    if (current.length === 0) return;
    const flashes: Record<string, FlashDirection> = {};
    current.forEach((quote) => {
      const prev = previousPricesRef.current.get(quote.symbol);
      if (prev !== undefined && quote.price > 0 && prev > 0 && quote.price !== prev) {
        flashes[quote.symbol] = quote.price > prev ? "up" : "down";
      }
      if (quote.price > 0) previousPricesRef.current.set(quote.symbol, quote.price);
    });
    if (Object.keys(flashes).length === 0) return;
    setFlashMap(flashes);
    if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
    flashTimerRef.current = setTimeout(() => setFlashMap({}), 900);
  }, [data?.quotes]);

  const quotes = useMemo(() => {
    const map = new Map((data?.quotes ?? []).map((q) => [q.symbol, q]));
    return watchlist.map(({ symbol }) => map.get(symbol)).filter((q): q is StockQuote => Boolean(q));
  }, [data?.quotes, watchlist]);

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

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
      if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current);
      if (watchlistApiSaveRef.current) clearTimeout(watchlistApiSaveRef.current);
      if (refreshTimerRef.current) window.clearTimeout(refreshTimerRef.current);
    };
  }, []);

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

  const groupedSearch = useMemo(() => {
    const stocks = searchResults.filter((r) => r.assetType === "stock");
    const etfs   = searchResults.filter((r) => r.assetType === "etf");
    return { stocks, etfs };
  }, [searchResults]);

  const visibleSearchResults = useMemo(
    () => [...groupedSearch.stocks, ...groupedSearch.etfs],
    [groupedSearch],
  );

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
  }, [watchlist, showFeedback]);

  const addSymbol = useCallback(() => {
    if (dropdownOpen && visibleSearchResults.length > 0) {
      const target = focusedIndex >= 0 ? visibleSearchResults[focusedIndex] : visibleSearchResults[0];
      selectResult(target);
      return;
    }
    const symbol = sanitizeSymbol(input);
    if (!symbol) return;
    if (watchlist.some((item) => item.symbol === symbol)) {
      showFeedback("이미 관심종목에 있습니다", "warn");
    } else if (watchlist.length >= 10) {
      showFeedback("최대 10개까지 추가할 수 있습니다", "error");
    } else {
      setWatchlist((prev) => [...prev, { symbol, assetType: "stock" }]);
      showFeedback(`${symbol} 추가됨`, "success");
      setWatchPage(0);
    }
    setInput("");
    setSearchResults([]);
    setDropdownOpen(false);
  }, [input, dropdownOpen, focusedIndex, visibleSearchResults, selectResult, watchlist, showFeedback]);

  const handleKeyDown = useCallback((event: React.KeyboardEvent<HTMLInputElement>) => {
    const total = visibleSearchResults.length;
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
      if (focusedIndex >= 0 && visibleSearchResults[focusedIndex]) {
        selectResult(visibleSearchResults[focusedIndex]);
      } else {
        addSymbol();
      }
    } else if (event.key === "Escape") {
      setDropdownOpen(false);
      setFocusedIndex(-1);
    }
  }, [dropdownOpen, visibleSearchResults, focusedIndex, addSymbol, selectResult]);

  const removeSymbol = useCallback((symbol: string) => {
    setWatchlist((prev) => prev.filter((item) => item.symbol !== symbol));
    setWatchPage(0);
  }, []);

  const isConfigured = data?.status !== "not_configured";
  const isLoading = loadPhase === "quotes" || loadPhase === "charts";
  const canManualDrag = watchSort === "manual";
  const latestMarketTimestamp = useMemo(() => {
    const candidates = [
      data?.fetchedAt,
      ...(data?.quotes ?? []).map((quote) => quote.fetchedAt),
    ].filter((value): value is string => Boolean(value));
    if (candidates.length === 0) return "";
    return candidates.reduce((latest, current) => {
      if (!latest) return current;
      return new Date(current).getTime() > new Date(latest).getTime() ? current : latest;
    }, "");
  }, [data]);

  const sortedQuotes = useMemo(() => {
    const next = [...quotes];
    if (watchSort === "change") return next.sort((a, b) => b.changePct - a.changePct);
    if (watchSort === "value") return next.sort((a, b) => b.tradingValue - a.tradingValue);
    if (watchSort === "name") return next.sort((a, b) => a.name.localeCompare(b.name, "ko"));
    return next;
  }, [quotes, watchSort]);

  const pagedQuotes = sortedQuotes.slice(watchPage * PAGE_SIZE, (watchPage + 1) * PAGE_SIZE);

  const handleWatchDragEnd = useCallback(({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id || watchSort !== "manual") return;
    setWatchlist((prev) => {
      const from = prev.findIndex((item) => item.symbol === active.id);
      const to = prev.findIndex((item) => item.symbol === over.id);
      if (from < 0 || to < 0) return prev;
      return arrayMove(prev, from, to);
    });
  }, [watchSort]);

  const updatePortfolioPrice = useCallback((symbol: string, avgPrice: number) => {
    setPortfolio((prev) => {
      const next = { ...prev };
      if (!Number.isFinite(avgPrice) || avgPrice <= 0) {
        delete next[symbol];
      } else {
        next[symbol] = { avgPrice };
      }
      return next;
    });
  }, []);

  return (
    <div className="flex flex-col gap-3">
      <style>{`
        @keyframes stock-tab-in {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .stock-tab-content { animation: stock-tab-in 0.15s ease both; }
      `}</style>

      {/* 헤더 */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <StatusPill data={data} phase={loadPhase} marketStatus={marketStatus} />
            <span className="text-[11px]" style={{ color: "var(--text-muted)" }}>
              {data?.provider ?? "토스증권"}
              {latestMarketTimestamp
                ? ` · 갱신 ${formatAbsoluteDateTime(latestMarketTimestamp)}`
                : data?.fetchedAt
                ? ` · 갱신 ${formatDateTime(data.fetchedAt)}`
                : ""}
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
        </div>
      </div>

      <LoadProgress phase={loadPhase} />

      {!isConfigured ? (
        <EmptyState
          title="토스증권 API 설정이 필요합니다"
          detail="TOSS_OPENAPI_CLIENT_ID · TOSS_OPENAPI_CLIENT_SECRET를 .env.local에 설정하면 토스증권 실시간 시세를 표시합니다."
        />
      ) : (
        <>
          <div className="stock-tab-content flex flex-col gap-3">

          {/* ── 관심종목 ── */}
          {(
            <div className="flex flex-col gap-3">
              <div ref={searchRef} className="relative">
                <div className="flex gap-2">
                  <div className="relative min-w-0 flex-1">
                    <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--text-muted)" }} />
                    <input
                      value={input}
                      onChange={(e) => handleInputChange(e.target.value)}
                      onKeyDown={handleKeyDown}
                      onFocus={() => { if (searchResults.length > 0) setDropdownOpen(true); }}
                      placeholder="주식·ETF·코드 검색"
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
                    </div>
                  </div>
                )}
              </div>

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

              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex gap-1.5 overflow-x-auto scrollbar-hide">
                  {([
                    ["manual", "수동"],
                    ["change", "등락률"],
                    ["value", "대금"],
                    ["name", "이름"],
                  ] as const).map(([key, label]) => {
                    const active = watchSort === key;
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => { setWatchSort(key); setWatchPage(0); }}
                        className="tag shrink-0 gap-1"
                        style={{ background: active ? ACCENT : `${ACCENT}15`, color: active ? "#fff" : "var(--text-muted)" }}
                      >
                        <Settings2 size={10} />{label}
                      </button>
                    );
                  })}
                </div>
                <button
                  type="button"
                  onClick={() => setPortfolioMode((value) => !value)}
                  className="tag shrink-0 gap-1"
                  style={{ background: portfolioMode ? "#10B981" : "rgba(16,185,129,0.14)", color: portfolioMode ? "#fff" : "#10B981" }}
                >
                  <WalletCards size={10} />포트폴리오
                </button>
              </div>

              {isLoading && !data ? (
                <SkeletonRows count={watchlist.length || 2} />
              ) : sortedQuotes.length === 0 ? (
                <EmptyState title="관심종목 시세가 없습니다" detail="종목명·ETF·6자리 코드를 검색해서 추가하세요." />
              ) : (
                <>
                  {canManualDrag ? (
                    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleWatchDragEnd}>
                      <SortableContext items={pagedQuotes.map((q) => q.symbol)} strategy={verticalListSortingStrategy}>
                        <div className="flex flex-col gap-2">
                          {pagedQuotes.map((q) => (
                            <SortableQuoteRow key={q.symbol} quote={q}>
                              {(dragHandle) => (
                                <QuoteRow
                                  quote={q}
                                  onRemove={removeSymbol}
                                  onOpen={setSelectedQuote}
                                  flash={flashMap[q.symbol]}
                                  dragHandle={dragHandle}
                                  portfolioMode={portfolioMode}
                                  portfolio={portfolio[q.symbol]}
                                  onPortfolioChange={updatePortfolioPrice}
                                />
                              )}
                            </SortableQuoteRow>
                          ))}
                        </div>
                      </SortableContext>
                    </DndContext>
                  ) : (
                    <div className="flex flex-col gap-2">
                      {pagedQuotes.map((q) => (
                        <QuoteRow
                          key={q.symbol}
                          quote={q}
                          onRemove={removeSymbol}
                          onOpen={setSelectedQuote}
                          flash={flashMap[q.symbol]}
                          portfolioMode={portfolioMode}
                          portfolio={portfolio[q.symbol]}
                          onPortfolioChange={updatePortfolioPrice}
                        />
                      ))}
                    </div>
                  )}
                  <Pagination page={watchPage} total={sortedQuotes.length} onChange={setWatchPage} />
                </>
              )}
            </div>
          )}

          </div>
        </>
      )}
      {selectedQuote && <QuoteDetailModal quote={selectedQuote} onClose={() => setSelectedQuote(null)} />}
    </div>
  );
}
