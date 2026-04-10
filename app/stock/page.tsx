"use client";
import { useState, useMemo } from "react";
import { useAppStore, Stock } from "@/store/useAppStore";
import PageHeader from "@/components/PageHeader";
import Sparkline from "@/components/Sparkline";
import { Search, TrendingUp, TrendingDown, X, Globe, BarChart2, Info } from "lucide-react";
import clsx from "clsx";

const REGION_LABEL: Record<string, string> = { KR: "국내", US: "미국", JP: "일본", CN: "중국" };
const ACCENT = "#7C3AED";

export default function StockPage() {
  const { indices, stocks } = useAppStore();
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Stock | null>(null);
  const [marketFilter, setMarketFilter] = useState<"ALL" | "KR" | "US">("ALL");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return stocks.filter((s) => {
      const matchMarket = marketFilter === "ALL" || s.market === marketFilter;
      const matchQuery  = !q || s.name.toLowerCase().includes(q) || s.symbol.toLowerCase().includes(q);
      return matchMarket && matchQuery;
    });
  }, [stocks, query, marketFilter]);

  return (
    <div className="min-h-screen" style={{ background: "var(--bg-base)" }}>
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 pb-12">
        <PageHeader title="주식 시장" subtitle="국내·해외 주요 지수 및 종목 검색" accentColor={ACCENT} />

        {/* ── 주요 지수 ── */}
        <section className="mb-6">
          <h2 className="text-sm font-bold mb-3" style={{ color: "#8B8BA7" }}>주요 지수</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
            {indices.map((idx) => (
              <div key={idx.name} className="bento-card p-3">
                <div className="flex items-center justify-between mb-1">
                  <span
                    className="text-xs font-bold px-1.5 py-0.5 rounded"
                    style={{ background: ACCENT + "22", color: ACCENT }}
                  >
                    {REGION_LABEL[idx.region]}
                  </span>
                  {idx.changePct >= 0
                    ? <TrendingUp size={12} className="text-emerald-400" />
                    : <TrendingDown size={12} className="text-rose-400" />}
                </div>
                <p className="text-xs font-semibold text-white">{idx.name}</p>
                <p className="text-sm font-black text-white mt-0.5">{idx.value.toLocaleString()}</p>
                <p className={clsx("text-xs font-semibold mt-0.5", idx.changePct >= 0 ? "text-emerald-400" : "text-rose-400")}>
                  {idx.changePct >= 0 ? "▲" : "▼"} {Math.abs(idx.changePct).toFixed(2)}%
                </p>
              </div>
            ))}
          </div>
        </section>

        <div className="grid lg:grid-cols-[1fr_360px] gap-6">
          {/* ── 왼쪽: 검색 + 목록 ── */}
          <div>
            {/* 검색바 */}
            <div className="flex gap-3 mb-4">
              <div
                className="flex-1 flex items-center gap-2 rounded-xl px-4 py-2.5"
                style={{ background: "#16161F", border: "1px solid #2A2A3A" }}
              >
                <Search size={15} style={{ color: "#8B8BA7" }} />
                <input
                  className="flex-1 bg-transparent text-sm text-white outline-none placeholder:text-[#8B8BA7]"
                  placeholder="종목명 또는 심볼 검색 (예: 삼성, AAPL)"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
                {query && (
                  <button onClick={() => setQuery("")}>
                    <X size={13} style={{ color: "#8B8BA7" }} />
                  </button>
                )}
              </div>

              {/* 마켓 필터 */}
              <div className="flex rounded-xl overflow-hidden" style={{ border: "1px solid #2A2A3A" }}>
                {(["ALL", "KR", "US"] as const).map((m) => (
                  <button
                    key={m}
                    onClick={() => setMarketFilter(m)}
                    className="px-3 py-2 text-xs font-semibold transition-colors"
                    style={{
                      background: marketFilter === m ? ACCENT : "#16161F",
                      color: marketFilter === m ? "#fff" : "#8B8BA7",
                    }}
                  >
                    {m === "ALL" ? "전체" : m}
                  </button>
                ))}
              </div>
            </div>

            {/* 종목 목록 */}
            <div className="bento-card overflow-hidden">
              <div className="grid grid-cols-[1fr_auto_auto] gap-x-4 px-4 py-2.5 text-xs font-semibold border-b" style={{ color: "#8B8BA7", borderColor: "#2A2A3A" }}>
                <span>종목</span>
                <span className="text-right">현재가</span>
                <span className="text-right w-20">등락</span>
              </div>
              {filtered.length === 0 && (
                <div className="py-12 text-center" style={{ color: "#8B8BA7" }}>
                  <Search size={28} className="mx-auto mb-2 opacity-30" />
                  <p className="text-sm">검색 결과가 없습니다</p>
                </div>
              )}
              {filtered.map((s, i) => (
                <button
                  key={s.symbol}
                  onClick={() => setSelected(s)}
                  className="w-full grid grid-cols-[1fr_auto_auto] gap-x-4 items-center px-4 py-3 text-left transition-colors hover:opacity-80"
                  style={{
                    background: selected?.symbol === s.symbol ? ACCENT + "11" : "transparent",
                    borderBottom: i < filtered.length - 1 ? "1px solid #2A2A3A" : "none",
                  }}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold shrink-0"
                      style={{ background: s.market === "KR" ? "#06B6D422" : "#F59E0B22", color: s.market === "KR" ? "#06B6D4" : "#F59E0B" }}
                    >
                      {s.market}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-white truncate">{s.name}</p>
                      <p className="text-xs" style={{ color: "#8B8BA7" }}>{s.symbol}</p>
                    </div>
                  </div>
                  <div className="shrink-0">
                    {s.sparkline && <Sparkline data={s.sparkline} color={s.changePct >= 0 ? "#10B981" : "#F43F5E"} />}
                  </div>
                  <div className="text-right w-20 shrink-0">
                    <p className="text-sm font-bold text-white">
                      {s.market === "KR" ? s.price.toLocaleString() + "원" : "$" + s.price.toFixed(2)}
                    </p>
                    <p className={clsx("text-xs font-semibold", s.changePct >= 0 ? "text-emerald-400" : "text-rose-400")}>
                      {s.changePct >= 0 ? "▲" : "▼"} {Math.abs(s.changePct).toFixed(2)}%
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* ── 오른쪽: 상세 패널 ── */}
          <div>
            {selected ? (
              <StockDetail stock={selected} onClose={() => setSelected(null)} />
            ) : (
              <div className="bento-card h-full flex flex-col items-center justify-center py-20 gap-3" style={{ minHeight: 300 }}>
                <BarChart2 size={36} style={{ color: "#2A2A3A" }} />
                <p className="text-sm" style={{ color: "#8B8BA7" }}>종목을 선택하면<br />상세 정보를 볼 수 있습니다</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Stock Detail Panel ───────────────────────────────────────────────────────

function StockDetail({ stock: s, onClose }: { stock: Stock; onClose: () => void }) {
  const isUp = s.changePct >= 0;
  const changeColor = isUp ? "#10B981" : "#F43F5E";

  return (
    <div className="bento-card p-5 flex flex-col gap-5 sticky top-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span
              className="text-xs font-bold px-2 py-0.5 rounded"
              style={{ background: s.market === "KR" ? "#06B6D422" : "#F59E0B22", color: s.market === "KR" ? "#06B6D4" : "#F59E0B" }}
            >
              {s.market === "KR" ? "KRX" : "NASDAQ"}
            </span>
            <span className="text-xs" style={{ color: "#8B8BA7" }}>{s.symbol}</span>
          </div>
          <h3 className="text-xl font-black text-white">{s.name}</h3>
        </div>
        <button onClick={onClose} className="opacity-40 hover:opacity-70 transition-opacity">
          <X size={16} style={{ color: "#8B8BA7" }} />
        </button>
      </div>

      {/* Price */}
      <div>
        <p className="text-3xl font-black text-white">
          {s.market === "KR" ? s.price.toLocaleString() + "원" : "$" + s.price.toFixed(2)}
        </p>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-sm font-bold flex items-center gap-1" style={{ color: changeColor }}>
            {isUp ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
            {isUp ? "+" : ""}{s.market === "KR" ? s.change.toLocaleString() + "원" : "$" + s.change.toFixed(2)}
          </span>
          <span className="text-sm font-bold" style={{ color: changeColor }}>
            ({isUp ? "+" : ""}{s.changePct.toFixed(2)}%)
          </span>
        </div>
      </div>

      {/* Sparkline chart */}
      {s.sparkline && (
        <div className="rounded-xl p-3" style={{ background: "rgba(255,255,255,0.03)" }}>
          <p className="text-xs mb-2" style={{ color: "#8B8BA7" }}>최근 7일 추이</p>
          <Sparkline data={s.sparkline} color={changeColor} width={280} height={60} />
          <div className="flex justify-between mt-1">
            <span className="text-xs" style={{ color: "#8B8BA7" }}>7일 전</span>
            <span className="text-xs" style={{ color: "#8B8BA7" }}>오늘</span>
          </div>
        </div>
      )}

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-3">
        {[
          { label: "거래량",     value: s.volume ?? "-" },
          { label: "시가총액",   value: s.marketCap ?? "-" },
          { label: "52주 고가",  value: s.high52w ? (s.market === "KR" ? s.high52w.toLocaleString() + "원" : "$" + s.high52w) : "-" },
          { label: "52주 저가",  value: s.low52w  ? (s.market === "KR" ? s.low52w.toLocaleString() + "원"  : "$" + s.low52w)  : "-" },
          { label: "PER",        value: s.per  ? s.per + "배"   : "-" },
          { label: "EPS",        value: s.eps  ? (s.market === "KR" ? s.eps.toLocaleString() + "원" : "$" + s.eps) : "-" },
        ].map((item) => (
          <div key={item.label} className="rounded-xl p-3" style={{ background: "rgba(255,255,255,0.04)" }}>
            <p className="text-xs mb-1" style={{ color: "#8B8BA7" }}>{item.label}</p>
            <p className="text-sm font-bold text-white">{item.value}</p>
          </div>
        ))}
      </div>

      {/* 52w range bar */}
      {s.high52w && s.low52w && (
        <div className="rounded-xl p-3" style={{ background: "rgba(255,255,255,0.03)" }}>
          <div className="flex justify-between mb-2">
            <span className="text-xs" style={{ color: "#8B8BA7" }}>52주 범위</span>
            <span className="text-xs flex items-center gap-1" style={{ color: "#8B8BA7" }}>
              <Info size={10} />
              현재가 위치
            </span>
          </div>
          <div className="relative h-1.5 rounded-full" style={{ background: "#2A2A3A" }}>
            <div
              className="absolute top-0 left-0 h-full rounded-full"
              style={{
                width: `${((s.price - s.low52w) / (s.high52w - s.low52w)) * 100}%`,
                background: `linear-gradient(90deg, #F43F5E, ${changeColor})`,
              }}
            />
          </div>
          <div className="flex justify-between mt-1.5">
            <span className="text-xs font-semibold" style={{ color: "#F43F5E" }}>
              {s.market === "KR" ? s.low52w.toLocaleString() : "$" + s.low52w}
            </span>
            <span className="text-xs font-semibold" style={{ color: "#10B981" }}>
              {s.market === "KR" ? s.high52w.toLocaleString() : "$" + s.high52w}
            </span>
          </div>
        </div>
      )}

      <div className="flex items-center gap-1.5 rounded-xl px-3 py-2" style={{ background: "#7C3AED11" }}>
        <Globe size={12} style={{ color: ACCENT }} />
        <p className="text-xs" style={{ color: "#8B8BA7" }}>
          데이터는 시연용 Mock 데이터입니다. 실제 시세와 다를 수 있습니다.
        </p>
      </div>
    </div>
  );
}
