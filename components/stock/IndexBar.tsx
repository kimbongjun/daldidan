"use client";

import { ArrowDown, ArrowUp } from "lucide-react";
import { type StockQuote } from "@/lib/stocks/types";
import { formatPrice } from "@/lib/stocks/utils";

const RISE = "var(--stock-rise)";
const FALL = "var(--stock-fall)";

function changeColor(value: number): string {
  if (value > 0) return RISE;
  if (value < 0) return FALL;
  return "var(--text-muted)";
}

/**
 * 지수 요약 바.
 * ⚠️ marketIndices[].price 는 프록시 ETF 의 실제 체결가(예: KODEX 200 ≈ 37,240)이지
 * 지수 포인트(코스피200 ≈ 2,600)가 아니다. 따라서 등락률(changePct)을 메인으로 보여주고,
 * ETF 가격은 "KODEX 200 37,240"처럼 ETF 소속을 명확히 한 보조 정보로만 표기한다.
 * QuoteRow 재사용 금지 — QuoteRow 는 price 를 formatPrice 로 그대로 찍어 오해를 부른다.
 */
export default function IndexBar({ indices }: { indices: StockQuote[] }) {
  if (!indices || indices.length === 0) return null;

  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
      {indices.map((idx) => {
        const color = changeColor(idx.changePct);
        const Icon = idx.changePct > 0 ? ArrowUp : idx.changePct < 0 ? ArrowDown : null;
        const proxyLabel = idx.englishName?.trim();
        const hasPrice = Number.isFinite(idx.price) && idx.price > 0;
        return (
          <div
            key={idx.symbol}
            className="flex min-w-0 flex-col gap-1.5 rounded-xl px-3.5 py-3"
            style={{
              background: `linear-gradient(135deg, ${color === FALL ? "rgba(59,130,246,0.06)" : color === RISE ? "rgba(244,63,94,0.06)" : "rgba(255,255,255,0.04)"}, rgba(255,255,255,0.02))`,
              border: "1px solid var(--border)",
            }}
          >
            {/* 지수명 + ETF 추정 라벨 */}
            <div className="flex min-w-0 items-center gap-1.5">
              <p className="truncate text-xs font-black" style={{ color: "var(--text-primary)" }}>
                {idx.name}
              </p>
              <span
                className="shrink-0 rounded px-1.5 py-0.5 text-[9px] font-bold"
                style={{ background: "rgba(245,158,11,0.18)", color: "#F59E0B" }}
              >
                ETF 추정
              </span>
            </div>

            {/* 등락률 (메인, 크게·색상) */}
            <div className="flex items-baseline gap-1.5" style={{ color }}>
              {Icon && <Icon size={16} className="shrink-0 self-center" />}
              <span className="text-xl font-black tabular-nums leading-none">
                {idx.changePct > 0 ? "+" : ""}
                {idx.changePct.toFixed(2)}%
              </span>
            </div>

            {/* 프록시 ETF명 + ETF가 (muted 보조, 함께 묶음) */}
            {(proxyLabel || hasPrice) && (
              <p className="truncate text-[10px] tabular-nums" style={{ color: "var(--text-muted)" }}>
                {proxyLabel ? proxyLabel : "프록시 ETF"}
                {hasPrice ? ` ${formatPrice(idx.price)}` : ""}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}
