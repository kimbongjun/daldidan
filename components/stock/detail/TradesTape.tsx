"use client";

import type { TradeTick } from "@/lib/stocks/types";
import { formatPrice } from "@/lib/stocks/utils";

const RISE = "var(--stock-rise)";
const FALL = "var(--stock-fall)";

function formatTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });
}

/** 실시간 체결내역 테이프 — 직전 체결가 대비 상승/하락 색 */
export default function TradesTape({ trades }: { trades: TradeTick[] }) {
  if (!trades || trades.length === 0) {
    return (
      <div className="rounded-xl px-3 py-4 text-center text-[11px]" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid var(--border)", color: "var(--text-muted)" }}>
        체결 내역이 없습니다
      </div>
    );
  }

  // 체결 추세 — 토스는 매수/매도 주체를 제공하지 않으므로 틱룰(직전 체결가 대비 등락)로 근사.
  // 응답은 최신순 → 직전(더 과거) 체결가는 다음 인덱스.
  let upVolume = 0;
  let downVolume = 0;
  trades.forEach((trade, index) => {
    const prev = trades[index + 1]?.price;
    if (prev === undefined || trade.price === prev) return;
    if (trade.price > prev) upVolume += trade.volume;
    else downVolume += trade.volume;
  });
  const trendTotal = upVolume + downVolume;
  const upPct = trendTotal > 0 ? (upVolume / trendTotal) * 100 : 50;
  const downPct = 100 - upPct;

  return (
    <div className="rounded-xl px-2 py-1.5" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid var(--border)" }}>
      {trendTotal > 0 && (
        <div className="mb-1.5 flex flex-col gap-1 px-1">
          <div className="flex items-center justify-between text-[9px] font-bold tabular-nums" style={{ color: "var(--text-muted)" }}>
            <span style={{ color: RISE }}>상승체결 {upPct.toFixed(0)}%</span>
            <span className="font-black uppercase tracking-wider">체결 추세 · 최근 {trades.length}틱</span>
            <span style={{ color: FALL }}>하락체결 {downPct.toFixed(0)}%</span>
          </div>
          <div className="flex h-1.5 overflow-hidden rounded-full" style={{ background: "rgba(255,255,255,0.08)" }}>
            <span style={{ width: `${upPct}%`, background: `rgba(var(--stock-rise-rgb),0.55)` }} />
            <span style={{ width: `${downPct}%`, background: `rgba(var(--stock-fall-rgb),0.55)` }} />
          </div>
        </div>
      )}
      <div className="grid grid-cols-[1fr_1fr_auto] px-1 pb-1 text-[9px] font-black uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
        <span>체결가</span>
        <span className="text-right">체결량</span>
        <span className="pl-2 text-right">시각</span>
      </div>
      <div className="flex max-h-[180px] flex-col gap-0.5 overflow-y-auto scrollbar-hide">
        {trades.map((trade, index) => {
          // 직전(더 과거) 체결가 = 배열상 다음 항목 (응답은 최신순)
          const prev = trades[index + 1]?.price;
          const color =
            prev === undefined || trade.price === prev
              ? "var(--text-primary)"
              : trade.price > prev
              ? RISE
              : FALL;
          return (
            <div key={`${trade.timestamp}-${index}`} className="grid grid-cols-[1fr_1fr_auto] items-center px-1 py-0.5">
              <span className="text-[11px] font-bold tabular-nums" style={{ color }}>{formatPrice(trade.price)}</span>
              <span className="text-right text-[10px] tabular-nums" style={{ color: "var(--text-muted)" }}>{trade.volume.toLocaleString()}</span>
              <span className="pl-2 text-right text-[10px] tabular-nums" style={{ color: "var(--text-muted)" }}>{formatTime(trade.timestamp)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
