"use client";
import { useAppStore } from "@/store/useAppStore";
import { TrendingUp, TrendingDown } from "lucide-react";
import clsx from "clsx";

export default function StockWidget() {
  const stocks = useAppStore((s) => s.stocks);
  const ticker = [...stocks, ...stocks]; // duplicate for seamless loop

  return (
    <div className="bento-card gradient-violet h-full flex flex-col p-5 gap-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: "#7C3AED" }}>주식</p>
          <h2 className="text-lg font-bold text-white">시장 현황</h2>
        </div>
        <span className="tag" style={{ background: "#7C3AED22", color: "#7C3AED" }}>실시간</span>
      </div>

      {/* Ticker tape */}
      <div className="overflow-hidden relative">
        <div className="flex gap-6 animate-ticker whitespace-nowrap">
          {ticker.map((s, i) => (
            <span key={i} className="inline-flex items-center gap-1.5 text-sm">
              <span className="font-semibold text-white">{s.symbol}</span>
              <span className={clsx("font-bold", s.change >= 0 ? "text-emerald-400" : "text-rose-400")}>
                {s.market === "KR"
                  ? s.price.toLocaleString() + "원"
                  : "$" + s.price.toFixed(2)}
              </span>
              <span className={clsx("text-xs", s.change >= 0 ? "text-emerald-400" : "text-rose-400")}>
                {s.change >= 0 ? "▲" : "▼"}{Math.abs(s.changePct).toFixed(2)}%
              </span>
            </span>
          ))}
        </div>
      </div>

      {/* Stock list */}
      <div className="flex flex-col gap-2 flex-1 overflow-auto scrollbar-hide">
        {stocks.map((s) => (
          <div
            key={s.symbol}
            className="flex items-center justify-between rounded-xl px-3 py-2.5"
            style={{ background: "rgba(255,255,255,0.03)" }}
          >
            <div className="flex items-center gap-2.5">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold shrink-0"
                style={{
                  background: s.market === "KR" ? "#06B6D422" : "#F59E0B22",
                  color: s.market === "KR" ? "#06B6D4" : "#F59E0B",
                }}
              >
                {s.market}
              </div>
              <div>
                <p className="text-sm font-semibold text-white leading-none">{s.name}</p>
                <p className="text-xs mt-0.5" style={{ color: "#8B8BA7" }}>{s.symbol}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm font-bold text-white">
                {s.market === "KR" ? s.price.toLocaleString() + "원" : "$" + s.price.toFixed(2)}
              </p>
              <p className={clsx("text-xs flex items-center gap-0.5 justify-end", s.change >= 0 ? "text-emerald-400" : "text-rose-400")}>
                {s.change >= 0 ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                {s.change >= 0 ? "+" : ""}{s.changePct.toFixed(2)}%
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
