"use client";

import clsx from "clsx";
import Link from "next/link";
import { ArrowRight, TrendingDown, TrendingUp } from "lucide-react";
import { formatMoney } from "@/lib/data/format";
import { MarketQuote } from "@/lib/data/types";

export default function StockWidget({
  stocks,
  source,
  fetchedAt,
}: {
  stocks: MarketQuote[];
  source: string;
  fetchedAt?: string;
}) {
  const ticker = [...stocks, ...stocks];

  return (
    <div className="bento-card gradient-violet h-full flex flex-col p-5 gap-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: "#7C3AED" }}>주식</p>
          <h2 className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>실시간 시장 현황</h2>
          <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
            국내 KOSPI·KOSDAQ {source === "yahoo-finance" ? "· 실시간" : "· 샘플"}{fetchedAt ? ` · ${new Date(fetchedAt).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })} 기준` : ""}
          </p>
        </div>
        <Link href="/stock" className="flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg transition-opacity hover:opacity-70" style={{ background: "#7C3AED22", color: "#7C3AED" }}>
          상세보기 <ArrowRight size={11} />
        </Link>
      </div>

      <div className="overflow-hidden">
        <div className="flex gap-6 animate-ticker whitespace-nowrap">
          {ticker.map((stock, index) => (
            <span key={`${stock.symbol}-${index}`} className="inline-flex items-center gap-1.5 text-sm">
              <span className="font-semibold" style={{ color: "var(--text-primary)" }}>{stock.name}</span>
              <span className={clsx("font-bold", stock.change >= 0 ? "text-emerald-400" : "text-rose-400")}>
                {formatMoney(stock.price, stock.currency)}
              </span>
              <span className={clsx("text-xs", stock.change >= 0 ? "text-emerald-400" : "text-rose-400")}>
                {stock.change >= 0 ? "▲" : "▼"}{Math.abs(stock.changePct).toFixed(2)}%
              </span>
            </span>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-2 flex-1 overflow-auto scrollbar-hide">
        {stocks.slice(0, 6).map((stock) => (
          <Link
            href={`/stock?symbol=${encodeURIComponent(stock.symbol)}`}
            key={stock.symbol}
            className="flex items-center justify-between rounded-xl px-3 py-2.5 hover:opacity-80 transition-opacity"
            style={{ background: "rgba(255,255,255,0.03)" }}
          >
            <div className="flex items-center gap-2.5">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold shrink-0"
                style={{ background: stock.exchange === "KOSPI" ? "#06B6D422" : "#7C3AED22", color: stock.exchange === "KOSPI" ? "#06B6D4" : "#7C3AED" }}
              >
                {stock.exchange === "KOSPI" ? "KP" : "KQ"}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold leading-none truncate" style={{ color: "var(--text-primary)" }}>{stock.name}</p>
                <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>{stock.displaySymbol ?? stock.symbol}</p>
              </div>
            </div>
            <div className="text-right shrink-0">
              <p className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>{formatMoney(stock.price, stock.currency)}</p>
              <p className={clsx("text-xs flex items-center gap-0.5 justify-end", stock.change >= 0 ? "text-emerald-400" : "text-rose-400")}>
                {stock.change >= 0 ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                {stock.change >= 0 ? "+" : ""}{stock.changePct.toFixed(2)}%
              </p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
