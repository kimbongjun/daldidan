"use client";

import { useEffect, useMemo, useState } from "react";
import clsx from "clsx";
import PageHeader from "@/components/PageHeader";
import Sparkline from "@/components/Sparkline";
import { FALLBACK_INDICES, FALLBACK_STOCKS } from "@/lib/data/fallback";
import { formatMoney, formatNumber } from "@/lib/data/format";
import { buildStockCatalog } from "@/lib/data/stockCatalog";
import { MarketQuote, MarketResponse } from "@/lib/data/types";
import { useLiveQuery } from "@/lib/data/useLiveQuery";
import { BarChart2, Search, TrendingDown, TrendingUp } from "lucide-react";

const ACCENT = "#7C3AED";

export default function StockPage() {
  const { data } = useLiveQuery<MarketResponse>("/api/market");
  const stocks = useMemo(() => buildStockCatalog(data?.stocks ?? FALLBACK_STOCKS), [data?.stocks]);
  const indices = data?.indices ?? FALLBACK_INDICES;
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<MarketQuote | null>(null);
  const [targetSymbol, setTargetSymbol] = useState<string | null>(null);

  useEffect(() => {
    const symbol = new URLSearchParams(window.location.search).get("symbol");
    setTargetSymbol(symbol);
  }, []);

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return stocks.filter((stock) => {
      if (!normalized) return true;
      return (
        stock.name.toLowerCase().includes(normalized) ||
        stock.symbol.toLowerCase().includes(normalized) ||
        stock.displaySymbol?.toLowerCase().includes(normalized) ||
        stock.exchange.toLowerCase().includes(normalized)
        || stock.listingMarket?.toLowerCase().includes(normalized)
        || stock.sector?.toLowerCase().includes(normalized)
      );
    });
  }, [query, stocks]);

  const active = selected ?? stocks.find((stock) => stock.symbol === targetSymbol || stock.displaySymbol === targetSymbol) ?? filtered[0] ?? null;

  return (
    <div className="min-h-screen" style={{ background: "var(--bg-base)" }}>
      <div className="max-w-[1240px] mx-auto px-4 sm:px-6 pb-12">
        <PageHeader title="주식 시장" subtitle="국내/미국 대표 종목 실시간 시세" accentColor={ACCENT} />

        <section className="mb-6">
          <h2 className="text-sm font-bold mb-3" style={{ color: "var(--text-muted)" }}>주요 지수</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-7 gap-3">
            {indices.map((index) => (
              <div key={index.symbol} className="bento-card p-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold px-1.5 py-0.5 rounded" style={{ background: ACCENT + "22", color: ACCENT }}>{index.region}</span>
                  {index.changePct >= 0 ? <TrendingUp size={12} className="text-emerald-400" /> : <TrendingDown size={12} className="text-rose-400" />}
                </div>
                <p className="text-xs font-semibold" style={{ color: "var(--text-primary)" }}>{index.name}</p>
                <p className="text-sm font-black mt-0.5" style={{ color: "var(--text-primary)" }}>{index.value.toLocaleString()}</p>
                <p className={clsx("text-xs font-semibold mt-0.5", index.changePct >= 0 ? "text-emerald-400" : "text-rose-400")}>
                  {index.changePct >= 0 ? "▲" : "▼"} {Math.abs(index.changePct).toFixed(2)}%
                </p>
              </div>
            ))}
          </div>
        </section>

        <div className="grid lg:grid-cols-[1fr_360px] gap-6">
          <div>
            <div className="flex items-center gap-2 rounded-xl px-4 py-2.5 mb-3" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
              <Search size={15} style={{ color: "var(--text-muted)" }} />
              <input className="flex-1 bg-transparent text-sm outline-none" style={{ color: "var(--text-primary)" }} placeholder="종목명·심볼·섹터 검색" value={query} onChange={(event) => setQuery(event.target.value)} />
              <span className="text-xs" style={{ color: "var(--text-muted)" }}>{filtered.length}개</span>
            </div>

            <div className="bento-card overflow-hidden">
              <div className="grid px-4 py-2.5 text-xs font-semibold border-b" style={{ color: "var(--text-muted)", borderColor: "var(--border)", gridTemplateColumns: "1fr auto auto", gap: "1rem" }}>
                <span>종목</span>
                <span className="text-right">추이</span>
                <span className="text-right w-28">현재가 / 등락</span>
              </div>

              <div className="overflow-y-auto" style={{ maxHeight: 560 }}>
                {filtered.map((stock, index) => (
                  <button
                    key={stock.symbol}
                    onClick={() => setSelected(stock)}
                    className="w-full text-left transition-colors hover:opacity-80"
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr auto auto",
                      gap: "1rem",
                      alignItems: "center",
                      padding: "0.85rem 1rem",
                      background: active?.symbol === stock.symbol ? ACCENT + "11" : "transparent",
                      borderBottom: index < filtered.length - 1 ? "1px solid var(--border)" : "none",
                    }}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold shrink-0" style={{ background: stock.market === "KR" ? "#06B6D422" : "#F59E0B22", color: stock.market === "KR" ? "#06B6D4" : "#F59E0B" }}>
                        {stock.market}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold truncate" style={{ color: "var(--text-primary)" }}>{stock.name}</p>
                        <p className="text-xs" style={{ color: "var(--text-muted)" }}>{stock.displaySymbol ?? stock.symbol} · {stock.listingMarket ?? stock.exchange}{stock.sector ? ` · ${stock.sector}` : ""}</p>
                      </div>
                    </div>

                    <div className="shrink-0">
                      <Sparkline data={stock.sparkline} color={stock.change >= 0 ? "#10B981" : "#F43F5E"} />
                    </div>

                    <div className="text-right w-28 shrink-0">
                      <p className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>{formatMoney(stock.price, stock.currency)}</p>
                      <p className={clsx("text-xs font-semibold flex items-center gap-0.5 justify-end", stock.change >= 0 ? "text-emerald-400" : "text-rose-400")}>
                        {stock.change >= 0 ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                        {stock.change >= 0 ? "+" : ""}{stock.changePct.toFixed(2)}%
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div>
            {active ? <StockDetail stock={active} /> : <EmptyState />}
          </div>
        </div>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="bento-card flex flex-col items-center justify-center py-20 gap-3" style={{ minHeight: 320 }}>
      <BarChart2 size={36} style={{ color: "var(--border)" }} />
      <p className="text-sm text-center" style={{ color: "var(--text-muted)" }}>종목을 선택하면 상세 시세를 볼 수 있습니다.</p>
    </div>
  );
}

function StockDetail({ stock }: { stock: MarketQuote }) {
  const isUp = stock.change >= 0;
  const color = isUp ? "#10B981" : "#F43F5E";
  const range = stock.range52w;
  const position = range ? ((stock.price - range.low) / Math.max(range.high - range.low, 1)) * 100 : 50;

  return (
    <div className="bento-card p-5 flex flex-col gap-5 sticky top-6">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-bold px-2 py-0.5 rounded" style={{ background: stock.market === "KR" ? "#06B6D422" : "#F59E0B22", color: stock.market === "KR" ? "#06B6D4" : "#F59E0B" }}>{stock.exchange}</span>
          <span className="text-xs" style={{ color: "var(--text-muted)" }}>{stock.displaySymbol ?? stock.symbol}</span>
        </div>
        <h3 className="text-xl font-black" style={{ color: "var(--text-primary)" }}>{stock.name}</h3>
      </div>

      <div>
        <p className="text-3xl font-black" style={{ color: "var(--text-primary)" }}>{formatMoney(stock.price, stock.currency)}</p>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-sm font-bold flex items-center gap-1" style={{ color }}>
            {isUp ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
            {stock.change >= 0 ? "+" : ""}{formatMoney(Math.abs(stock.change), stock.currency)}
          </span>
          <span className="text-sm font-bold" style={{ color }}>({stock.changePct >= 0 ? "+" : ""}{stock.changePct.toFixed(2)}%)</span>
        </div>
      </div>

      <div className="rounded-xl p-3" style={{ background: "rgba(128,128,128,0.05)" }}>
        <p className="text-xs mb-2" style={{ color: "var(--text-muted)" }}>최근 흐름</p>
        <Sparkline data={stock.sparkline} color={color} width={280} height={60} />
      </div>

      <div className="grid grid-cols-2 gap-3">
          {[
            { label: "전일 종가", value: formatMoney(stock.previousClose, stock.currency) },
            { label: "거래량", value: formatNumber(stock.volume) },
            { label: "당일 고가", value: stock.dayHigh ? formatMoney(stock.dayHigh, stock.currency) : "-" },
            { label: "당일 저가", value: stock.dayLow ? formatMoney(stock.dayLow, stock.currency) : "-" },
            { label: "시장", value: stock.listingMarket ?? stock.exchange },
            { label: "섹터", value: stock.sector ?? "-" },
        ].map((item) => (
          <div key={item.label} className="rounded-xl p-3" style={{ background: "rgba(128,128,128,0.05)" }}>
            <p className="text-xs mb-1" style={{ color: "var(--text-muted)" }}>{item.label}</p>
            <p className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>{item.value}</p>
          </div>
        ))}
      </div>

      {range ? (
        <div className="rounded-xl p-3" style={{ background: "rgba(128,128,128,0.04)" }}>
          <div className="flex justify-between mb-2">
            <span className="text-xs" style={{ color: "var(--text-muted)" }}>52주 범위</span>
            <span className="text-xs" style={{ color: "var(--text-muted)" }}>현재 위치 {position.toFixed(0)}%</span>
          </div>
          <div className="relative h-1.5 rounded-full" style={{ background: "var(--border)" }}>
            <div className="absolute top-0 left-0 h-full rounded-full" style={{ width: `${Math.min(Math.max(position, 2), 100)}%`, background: `linear-gradient(90deg, #F43F5E, ${color})` }} />
          </div>
          <div className="flex justify-between mt-1.5">
            <span className="text-xs font-semibold" style={{ color: "#F43F5E" }}>{formatMoney(range.low, stock.currency)}</span>
            <span className="text-xs font-semibold" style={{ color: "#10B981" }}>{formatMoney(range.high, stock.currency)}</span>
          </div>
        </div>
      ) : null}
    </div>
  );
}
