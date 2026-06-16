"use client";

import type { Orderbook, OrderbookLevel } from "@/lib/stocks/types";
import { formatPrice } from "@/lib/stocks/utils";

const RISE = "var(--stock-rise)";
const FALL = "var(--stock-fall)";

function pct(value: number, max: number): number {
  if (max <= 0) return 0;
  return Math.min(100, Math.max(0, (value / max) * 100));
}

function Row({
  level,
  max,
  side,
  isBest,
}: {
  level: OrderbookLevel;
  max: number;
  side: "ask" | "bid";
  isBest: boolean;
}) {
  const color = side === "ask" ? FALL : RISE;
  const rgb = side === "ask" ? "var(--stock-fall-rgb)" : "var(--stock-rise-rgb)";
  const barWidth = `${pct(level.volume, max)}%`;
  const bar = (
    <span
      className="absolute top-0 bottom-0"
      style={{
        [side === "ask" ? "right" : "left"]: 0,
        width: barWidth,
        background: `rgba(${rgb},0.16)`,
      } as React.CSSProperties}
    />
  );
  // 매도(ask)는 가격 왼쪽·잔량 오른쪽, 매수(bid)는 잔량 왼쪽·가격 오른쪽으로 대칭 배치
  return (
    <div
      className="relative grid h-7 items-center overflow-hidden rounded-md"
      style={{
        gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr)",
        background: isBest ? `rgba(${rgb},0.10)` : "transparent",
      }}
    >
      {bar}
      {side === "ask" ? (
        <>
          <span className="relative z-10 pl-2 text-left text-[11px] font-bold tabular-nums" style={{ color }}>
            {formatPrice(level.price)}
          </span>
          <span className="relative z-10 pr-2 text-right text-[10px] tabular-nums" style={{ color: "var(--text-muted)" }}>
            {level.volume.toLocaleString()}
          </span>
        </>
      ) : (
        <>
          <span className="relative z-10 pl-2 text-left text-[10px] tabular-nums" style={{ color: "var(--text-muted)" }}>
            {level.volume.toLocaleString()}
          </span>
          <span className="relative z-10 pr-2 text-right text-[11px] font-bold tabular-nums" style={{ color }}>
            {formatPrice(level.price)}
          </span>
        </>
      )}
    </div>
  );
}

/** 10호가 호가창 — 매도(위·파랑)·매수(아래·빨강), 잔량 비율 배경바 */
export default function OrderbookPanel({ orderbook, price }: { orderbook: Orderbook; price: number }) {
  const asks = orderbook.asks ?? [];
  const bids = orderbook.bids ?? [];
  if (asks.length === 0 && bids.length === 0) return null;

  const maxVolume = Math.max(
    1,
    ...asks.map((level) => level.volume),
    ...bids.map((level) => level.volume),
  );

  // asks는 가격 오름차순으로 옴 → 화면에는 높은 매도가가 위로 오도록 역순
  const askRows = [...asks].reverse();
  const bestAskPrice = asks[0]?.price;
  const bestBidPrice = bids[0]?.price;
  const hasPrice = Number.isFinite(price) && price > 0;

  // 총잔량(매도·매수)과 매수 우위 비율 — 호가창 매수/매도 압력 시각화
  const totalAsk = asks.reduce((sum, level) => sum + (level.volume || 0), 0);
  const totalBid = bids.reduce((sum, level) => sum + (level.volume || 0), 0);
  const totalAll = totalAsk + totalBid;
  const bidPct = totalAll > 0 ? (totalBid / totalAll) * 100 : 50;
  const askPct = 100 - bidPct;

  return (
    <div className="rounded-xl px-2 py-2" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid var(--border)" }}>
      {totalAll > 0 && (
        <div className="mb-1.5 flex flex-col gap-1">
          <div className="flex items-center justify-between text-[10px] font-bold tabular-nums">
            <span style={{ color: FALL }}>매도 {totalAsk.toLocaleString()}</span>
            <span style={{ color: RISE }}>매수 {totalBid.toLocaleString()}</span>
          </div>
          <div className="flex h-1.5 overflow-hidden rounded-full" style={{ background: "rgba(255,255,255,0.08)" }}>
            <span style={{ width: `${askPct}%`, background: `rgba(var(--stock-fall-rgb),0.55)` }} />
            <span style={{ width: `${bidPct}%`, background: `rgba(var(--stock-rise-rgb),0.55)` }} />
          </div>
        </div>
      )}
      <div className="flex flex-col gap-0.5">
        {askRows.map((level, index) => (
          <Row key={`ask-${level.price}-${index}`} level={level} max={maxVolume} side="ask" isBest={level.price === bestAskPrice} />
        ))}
      </div>
      <div className="my-1 flex items-center justify-center gap-2 rounded-md py-1" style={{ background: "rgba(255,255,255,0.05)" }}>
        <span className="text-[10px] font-bold" style={{ color: "var(--text-muted)" }}>현재가</span>
        <span className="text-xs font-black tabular-nums" style={{ color: "var(--text-primary)" }}>
          {hasPrice ? formatPrice(price) : "-"}
        </span>
      </div>
      <div className="flex flex-col gap-0.5">
        {bids.map((level, index) => (
          <Row key={`bid-${level.price}-${index}`} level={level} max={maxVolume} side="bid" isBest={level.price === bestBidPrice} />
        ))}
      </div>
    </div>
  );
}
