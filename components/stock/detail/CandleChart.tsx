"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import type { Candle, CandleInterval } from "@/lib/stocks/types";
import { formatPrice } from "@/lib/stocks/utils";

const RISE = "var(--stock-rise)";
const FALL = "var(--stock-fall)";

/** 이동평균선 정의 (기간·색·라벨) */
const MA_LINES = [
  { period: 5, color: "#F59E0B", label: "MA5" },
  { period: 20, color: "#6366F1", label: "MA20" },
  { period: 60, color: "#10B981", label: "MA60" },
] as const;

/** 오름차순 종가에서 단순이동평균 산출 — 윈도우가 찬 인덱스만 값, 그 외 null */
function movingAverage(closes: number[], period: number): (number | null)[] {
  const out: (number | null)[] = new Array(closes.length).fill(null);
  let sum = 0;
  for (let i = 0; i < closes.length; i++) {
    sum += closes[i];
    if (i >= period) sum -= closes[i - period];
    if (i >= period - 1) out[i] = sum / period;
  }
  return out;
}

const PRESETS: Record<CandleInterval, { label: string; count: number }[]> = {
  "1d": [
    { label: "1개월", count: 20 },
    { label: "3개월", count: 60 },
    { label: "6개월", count: 120 },
    { label: "1년", count: 200 },
  ],
  "1m": [
    { label: "1시간", count: 60 },
    { label: "2시간", count: 120 },
    { label: "전체", count: 200 },
  ],
};

/** 모달이 detail 로 받아오는 초기 1d 캔들 개수와 맞춘 기본 선택 인덱스 */
const DEFAULT_INDEX: Record<CandleInterval, number> = { "1d": 2, "1m": 1 };

const W = 320;
const PRICE_TOP = 8;
const PRICE_H = 150;
const GAP = 8;
const VOL_TOP = PRICE_TOP + PRICE_H + GAP;
const VOL_H = 34;
const H = VOL_TOP + VOL_H;

function formatCandleTime(value: string, interval: CandleInterval): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  if (interval === "1m") {
    return date.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit", hour12: false });
  }
  return date.toLocaleDateString("ko-KR", { year: "2-digit", month: "2-digit", day: "2-digit" });
}

export default function CandleChart({
  symbol,
  initialCandles,
  initialInterval,
}: {
  symbol: string;
  initialCandles: Candle[];
  initialInterval: CandleInterval;
}) {
  const [interval, setInterval] = useState<CandleInterval>(initialInterval);
  const [periodIndex, setPeriodIndex] = useState<number>(DEFAULT_INDEX[initialInterval] ?? 0);
  // 응답은 최신순 → 차트용으로 오름차순 변환해 보관
  const [candles, setCandles] = useState<Candle[]>(() => [...initialCandles].reverse());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [showMA, setShowMA] = useState(true);

  const firstRunRef = useRef(true);
  const abortRef = useRef<AbortController | null>(null);

  const fetchCandles = useCallback(async (nextInterval: CandleInterval, count: number) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/stocks/${symbol}/candles?interval=${nextInterval}&count=${count}`, {
        signal: controller.signal,
      });
      const json = (await res.json()) as { candles?: Candle[]; message?: string };
      if (controller.signal.aborted) return;
      if (!res.ok || !json.candles) {
        setError(json.message ?? "차트를 불러오지 못했습니다.");
        return;
      }
      setCandles([...json.candles].reverse());
    } catch (e) {
      if ((e as Error)?.name === "AbortError") return;
      setError("차트를 불러오지 못했습니다.");
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, [symbol]);

  // interval/period 변경 시에만 재요청 (초기 마운트는 detail 캔들 재사용)
  useEffect(() => {
    if (firstRunRef.current) {
      firstRunRef.current = false;
      return;
    }
    const count = PRESETS[interval][periodIndex]?.count ?? 100;
    void fetchCandles(interval, count);
  }, [interval, periodIndex, fetchCandles]);

  useEffect(() => () => abortRef.current?.abort(), []);

  const handleIntervalChange = (next: CandleInterval) => {
    if (next === interval) return;
    setHoverIndex(null);
    setInterval(next);
    setPeriodIndex(DEFAULT_INDEX[next] ?? 0);
  };

  const n = candles.length;
  const lows = candles.map((c) => c.low).filter((v) => Number.isFinite(v) && v > 0);
  const highs = candles.map((c) => c.high).filter((v) => Number.isFinite(v) && v > 0);
  const priceMin = lows.length ? Math.min(...lows) : 0;
  const priceMax = highs.length ? Math.max(...highs) : 1;
  const priceRange = priceMax - priceMin || 1;
  const volMax = Math.max(1, ...candles.map((c) => c.volume || 0));

  const slot = n > 0 ? W / n : W;
  const bodyW = Math.max(1, Math.min(slot * 0.66, 9));

  const priceY = (price: number) => PRICE_TOP + ((priceMax - price) / priceRange) * PRICE_H;

  // 이동평균선 — 오름차순 종가 기준, 윈도우가 찬 구간만 polyline 좌표로 변환
  const closes = candles.map((c) => c.close);
  const maPolylines = showMA
    ? MA_LINES.map(({ period, color, label }) => {
        const series = movingAverage(closes, period);
        const points = series
          .map((value, i) => (value != null ? `${slot * i + slot / 2},${priceY(value)}` : null))
          .filter((point): point is string => point !== null)
          .join(" ");
        return { color, label, points };
      }).filter((line) => line.points.length > 0)
    : [];

  const onMove = (clientX: number, target: SVGSVGElement) => {
    if (n === 0) return;
    const rect = target.getBoundingClientRect();
    const ratio = (clientX - rect.left) / rect.width;
    const idx = Math.min(n - 1, Math.max(0, Math.round(ratio * (n - 1))));
    setHoverIndex(idx);
  };

  const active = hoverIndex != null ? candles[hoverIndex] : candles[n - 1];
  const activeUp = active ? active.close >= active.open : true;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex gap-1">
          {(["1d", "1m"] as const).map((key) => {
            const isActive = interval === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => handleIntervalChange(key)}
                className="rounded-md px-2.5 py-1 text-[11px] font-bold transition-colors"
                style={{ background: isActive ? "var(--accent-violet)" : "rgba(255,255,255,0.06)", color: isActive ? "#fff" : "var(--text-muted)" }}
              >
                {key === "1d" ? "일봉" : "분봉"}
              </button>
            );
          })}
        </div>
        <div className="flex gap-1">
          {PRESETS[interval].map((preset, index) => {
            const isActive = periodIndex === index;
            return (
              <button
                key={preset.label}
                type="button"
                onClick={() => { setHoverIndex(null); setPeriodIndex(index); }}
                className="rounded-md px-2 py-1 text-[10px] font-bold transition-colors"
                style={{ background: isActive ? "rgba(124,58,237,0.18)" : "rgba(255,255,255,0.06)", color: isActive ? "var(--accent-violet)" : "var(--text-muted)" }}
              >
                {preset.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* OHLC 정보 줄 (호버 또는 최신 캔들) */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[10px] tabular-nums" style={{ color: "var(--text-muted)", minHeight: 16 }}>
        {active ? (
          <>
            <span style={{ color: "var(--text-primary)", fontWeight: 700 }}>{formatCandleTime(active.timestamp, interval)}</span>
            <span>시 <b style={{ color: "var(--text-primary)" }}>{formatPrice(active.open)}</b></span>
            <span>고 <b style={{ color: RISE }}>{formatPrice(active.high)}</b></span>
            <span>저 <b style={{ color: FALL }}>{formatPrice(active.low)}</b></span>
            <span>종 <b style={{ color: activeUp ? RISE : FALL }}>{formatPrice(active.close)}</b></span>
          </>
        ) : (
          <span>데이터 없음</span>
        )}
      </div>

      {/* 이동평균선 범례 + 표시 토글 */}
      <button
        type="button"
        onClick={() => setShowMA((value) => !value)}
        className="flex items-center gap-2 self-start rounded-md px-1.5 py-0.5 transition-opacity"
        style={{ opacity: showMA ? 1 : 0.45 }}
        aria-pressed={showMA}
        aria-label="이동평균선 표시 전환"
      >
        {MA_LINES.map(({ color, label }) => (
          <span key={label} className="flex items-center gap-1 text-[9px] font-bold tabular-nums" style={{ color: "var(--text-muted)" }}>
            <span className="inline-block h-0.5 w-3 rounded-full" style={{ background: color }} />
            {label}
          </span>
        ))}
      </button>

      <div className="relative overflow-hidden rounded-xl p-2" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid var(--border)" }}>
        {loading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.25)" }}>
            <Loader2 size={18} className="animate-spin" style={{ color: "var(--accent-violet)" }} />
          </div>
        )}
        {error ? (
          <div className="flex h-[160px] items-center justify-center text-[11px]" style={{ color: "var(--text-muted)" }}>{error}</div>
        ) : n === 0 ? (
          <div className="flex h-[160px] items-center justify-center text-[11px]" style={{ color: "var(--text-muted)" }}>차트 데이터가 없습니다</div>
        ) : (
          <svg
            width="100%"
            viewBox={`0 0 ${W} ${H}`}
            preserveAspectRatio="none"
            style={{ display: "block", height: 200, touchAction: "none" }}
            onMouseMove={(e) => onMove(e.clientX, e.currentTarget)}
            onMouseLeave={() => setHoverIndex(null)}
            onTouchStart={(e) => onMove(e.touches[0].clientX, e.currentTarget)}
            onTouchMove={(e) => onMove(e.touches[0].clientX, e.currentTarget)}
          >
            {candles.map((c, i) => {
              const cx = slot * i + slot / 2;
              const up = c.close >= c.open;
              const color = up ? RISE : FALL;
              const yHigh = priceY(c.high);
              const yLow = priceY(c.low);
              const yOpen = priceY(c.open);
              const yClose = priceY(c.close);
              const bodyTop = Math.min(yOpen, yClose);
              const bodyH = Math.max(1, Math.abs(yClose - yOpen));
              const volH = ((c.volume || 0) / volMax) * VOL_H;
              return (
                <g key={`${c.timestamp}-${i}`}>
                  <line x1={cx} x2={cx} y1={yHigh} y2={yLow} stroke={color} strokeWidth={1} />
                  <rect x={cx - bodyW / 2} y={bodyTop} width={bodyW} height={bodyH} fill={color} />
                  <rect x={cx - bodyW / 2} y={VOL_TOP + (VOL_H - volH)} width={bodyW} height={volH} fill={color} fillOpacity={0.4} />
                </g>
              );
            })}
            {maPolylines.map((line) => (
              <polyline
                key={line.label}
                points={line.points}
                fill="none"
                stroke={line.color}
                strokeWidth={1}
                strokeLinejoin="round"
                strokeLinecap="round"
                vectorEffect="non-scaling-stroke"
              />
            ))}
            {hoverIndex != null && (
              <line
                x1={slot * hoverIndex + slot / 2}
                x2={slot * hoverIndex + slot / 2}
                y1={PRICE_TOP}
                y2={H}
                stroke="var(--text-muted)"
                strokeWidth={0.6}
                strokeDasharray="3 3"
              />
            )}
          </svg>
        )}
      </div>
    </div>
  );
}
