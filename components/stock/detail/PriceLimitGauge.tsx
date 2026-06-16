"use client";

import type { PriceLimit } from "@/lib/stocks/types";
import { formatPrice } from "@/lib/stocks/utils";

const RISE = "var(--stock-rise)";
const FALL = "var(--stock-fall)";

/** 상한가(빨강)·하한가(파랑)와 현재가 위치 게이지 */
export default function PriceLimitGauge({ priceLimit, price }: { priceLimit: PriceLimit; price: number }) {
  const { upperLimitPrice: upper, lowerLimitPrice: lower } = priceLimit;
  if (!Number.isFinite(upper) || !Number.isFinite(lower) || upper <= lower) return null;

  const hasPrice = Number.isFinite(price) && price > 0;
  const rawPct = hasPrice ? ((price - lower) / (upper - lower)) * 100 : 50;
  const pct = Math.min(100, Math.max(0, rawPct));

  return (
    <div className="rounded-xl px-3 py-2.5" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid var(--border)" }}>
      <div className="mb-1.5 flex items-center justify-between text-[10px] font-bold">
        <span style={{ color: FALL }}>하한 {formatPrice(lower)}</span>
        <span style={{ color: RISE }}>상한 {formatPrice(upper)}</span>
      </div>
      <div className="relative h-2 overflow-hidden rounded-full" style={{ background: `linear-gradient(90deg, rgba(var(--stock-fall-rgb),0.35), rgba(255,255,255,0.08), rgba(var(--stock-rise-rgb),0.35))` }}>
        {hasPrice && (
          <span
            className="absolute top-1/2 h-3 w-1 -translate-y-1/2 rounded-full"
            style={{ left: `calc(${pct}% - 2px)`, background: "var(--text-primary)", boxShadow: "0 0 0 2px var(--bg-card)" }}
          />
        )}
      </div>
    </div>
  );
}
