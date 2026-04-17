"use client";

import { useCallback, useEffect, useState } from "react";
import { ArrowRight, ArrowUp, ArrowDown, Minus, TrendingUp, Home, Wallet, CalendarCheck } from "lucide-react";
import type { SubscriptionItem } from "@/app/api/realestate/subscriptions/route";
import type { PolicyRate } from "@/app/api/realestate/rates/route";
import type { TransactionItem, MarketIndex } from "@/app/api/realestate/transactions/route";

const ACCENT = "#0EA5E9";

type Tab = "청약" | "시세" | "금리";

// ── 유틸 ────────────────────────────────────────────────────────────────────

function priceFmt(manwon: number): string {
  if (manwon >= 10000) {
    const uk = Math.floor(manwon / 10000);
    const man = manwon % 10000;
    return man > 0 ? `${uk}억 ${man.toLocaleString()}만` : `${uk}억`;
  }
  return `${manwon.toLocaleString()}만원`;
}

function getDdayLabel(dateStr: string): { label: string; urgent: boolean } {
  const target = new Date(dateStr);
  target.setHours(0, 0, 0, 0);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const diff = Math.ceil((target.getTime() - now.getTime()) / 86400000);
  if (diff === 0) return { label: "D-Day", urgent: true };
  if (diff > 0) return { label: `D-${diff}`, urgent: diff <= 3 };
  return { label: `D+${Math.abs(diff)}`, urgent: false };
}

function PriceDiff({ prev, curr }: { prev: number | null; curr: number }) {
  if (!prev) return null;
  const diff = curr - prev;
  const pct = ((diff / prev) * 100).toFixed(1);
  if (diff > 0)
    return (
      <span className="flex items-center gap-0.5 text-[10px] font-semibold" style={{ color: "#F43F5E" }}>
        <ArrowUp size={8} />+{priceFmt(diff)} ({pct}%)
      </span>
    );
  if (diff < 0)
    return (
      <span className="flex items-center gap-0.5 text-[10px] font-semibold" style={{ color: "#10B981" }}>
        <ArrowDown size={8} />{priceFmt(Math.abs(diff))} ({pct}%)
      </span>
    );
  return <span className="flex items-center gap-0.5 text-[10px]" style={{ color: "var(--text-muted)" }}><Minus size={8} />보합</span>;
}

// ── 스켈레톤 ─────────────────────────────────────────────────────────────────

function SkeletonRow() {
  return (
    <div className="flex items-center gap-3 rounded-xl px-3 py-2.5 animate-pulse"
      style={{ background: "rgba(255,255,255,0.04)" }}>
      <div className="w-8 h-8 rounded-lg shrink-0" style={{ background: "rgba(255,255,255,0.08)" }} />
      <div className="flex-1 min-w-0 flex flex-col gap-1.5">
        <div className="h-3 w-3/4 rounded" style={{ background: "rgba(255,255,255,0.08)" }} />
        <div className="h-2 w-1/2 rounded" style={{ background: "rgba(255,255,255,0.06)" }} />
      </div>
      <div className="h-4 w-16 rounded shrink-0" style={{ background: "rgba(255,255,255,0.08)" }} />
    </div>
  );
}

// ── 청약 탭 ──────────────────────────────────────────────────────────────────

function SubscriptionTab() {
  const [items, setItems] = useState<(SubscriptionItem & { dday: number })[]>([]);
  const [isMock, setIsMock] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/realestate/subscriptions")
      .then((r) => r.json() as Promise<{ subscriptions: (SubscriptionItem & { dday: number })[]; isMock?: boolean }>)
      .then((d) => { setItems(d.subscriptions); setIsMock(d.isMock ?? false); })
      .catch(() => null)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex flex-col gap-2">{[1, 2, 3].map((i) => <SkeletonRow key={i} />)}</div>;

  return (
    <div className="flex flex-col gap-2">
      {/* 샘플 데이터 안내 */}
      {isMock && (
        <div className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg"
          style={{ background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.2)" }}>
          <span className="text-[10px]" style={{ color: "#F59E0B" }}>
            샘플 데이터 · 실제 청약 일정은
          </span>
          <a href="https://www.applyhome.co.kr" target="_blank" rel="noopener noreferrer"
            className="text-[10px] font-semibold underline" style={{ color: "#F59E0B" }}>
            청약홈
          </a>
          <span className="text-[10px]" style={{ color: "#F59E0B" }}>에서 확인</span>
        </div>
      )}
      <div className="flex flex-col gap-2 overflow-y-auto scrollbar-hide" style={{ maxHeight: isMock ? 196 : 220 }}>
        {items.map((item) => {
          const { label, urgent } = getDdayLabel(item.startDate);
          return (
            <a key={item.id} href={item.detailUrl} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors hover:opacity-80"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid transparent" }}>
              {/* D-day 배지 */}
              <div className="w-11 h-11 rounded-xl flex flex-col items-center justify-center shrink-0 text-center"
                style={{ background: urgent ? `${ACCENT}22` : "rgba(255,255,255,0.06)" }}>
                <span className="text-[9px] font-semibold uppercase" style={{ color: urgent ? ACCENT : "var(--text-muted)" }}>청약</span>
                <span className="text-xs font-black leading-none" style={{ color: urgent ? ACCENT : "var(--text-muted)" }}>{label}</span>
              </div>
              {/* 단지 정보 */}
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold truncate" style={{ color: "var(--text-primary)" }}>{item.name}</p>
                <p className="text-[11px] truncate mt-0.5" style={{ color: "var(--text-muted)" }}>
                  {item.region} · {item.totalUnits > 0 ? `${item.totalUnits.toLocaleString()}세대` : "세대수 미정"}
                </p>
                <p className="text-[10px] mt-0.5" style={{ color: "var(--text-muted)" }}>
                  {item.startDate.slice(5)} ~ {item.endDate.slice(5)}
                </p>
              </div>
              {/* 분양가 + 타입 */}
              <div className="text-right shrink-0">
                {item.minPrice > 0 && (
                  <p className="text-xs font-bold" style={{ color: "var(--text-primary)" }}>
                    {priceFmt(item.minPrice)}~
                  </p>
                )}
                <span className="text-[10px] px-1.5 py-0.5 rounded-md"
                  style={{
                    background: item.type === "공공" ? "rgba(16,185,129,0.15)" : `${ACCENT}15`,
                    color: item.type === "공공" ? "#10B981" : ACCENT,
                  }}>
                  {item.type}
                </span>
              </div>
            </a>
          );
        })}
      </div>
    </div>
  );
}

// ── 시세 탭 ──────────────────────────────────────────────────────────────────

function TransactionTab() {
  const [transactions, setTransactions] = useState<TransactionItem[]>([]);
  const [marketIndex, setMarketIndex] = useState<MarketIndex[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/realestate/transactions")
      .then((r) => r.json() as Promise<{ transactions: TransactionItem[]; marketIndex: MarketIndex[] }>)
      .then((d) => { setTransactions(d.transactions); setMarketIndex(d.marketIndex); })
      .catch(() => null)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex flex-col gap-2">{[1, 2, 3].map((i) => <SkeletonRow key={i} />)}</div>;

  return (
    <div className="flex flex-col gap-3">
      {/* 시장 지수 게이지 */}
      {marketIndex.length > 0 && (
        <div className="flex gap-2">
          {marketIndex.map((idx) => {
            const pct = Math.min(Math.max((idx.value / 200) * 100, 0), 100);
            const color = idx.value > 100 ? "#F43F5E" : idx.value < 100 ? "#10B981" : ACCENT;
            return (
              <div key={idx.label} className="flex-1 rounded-xl px-3 py-2.5"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid var(--border)" }}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] font-semibold truncate" style={{ color: "var(--text-muted)" }}>{idx.label}</span>
                  <span className="text-xs font-black" style={{ color }}>{idx.value}</span>
                </div>
                <div style={{ height: 4, borderRadius: 999, background: "var(--border)", overflow: "hidden" }}>
                  <div style={{ width: `${pct}%`, height: "100%", borderRadius: 999, background: color, transition: "width 0.6s ease" }} />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 실거래 목록 */}
      <div className="flex flex-col gap-1.5 overflow-y-auto scrollbar-hide" style={{ maxHeight: 168 }}>
        {transactions.map((tx) => (
          <div key={tx.id} className="flex items-center gap-2.5 rounded-xl px-3 py-2"
            style={{ background: "rgba(255,255,255,0.04)" }}>
            <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
              style={{ background: `${ACCENT}18` }}>
              <Home size={13} style={{ color: ACCENT }} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold truncate" style={{ color: "var(--text-primary)" }}>
                {tx.complexName}
              </p>
              <p className="text-[10px] truncate" style={{ color: "var(--text-muted)" }}>
                {tx.region} · {tx.area}㎡ · {tx.floor}층
              </p>
            </div>
            <div className="text-right shrink-0">
              <p className="text-xs font-black" style={{ color: "var(--text-primary)" }}>
                {priceFmt(tx.price)}
              </p>
              <PriceDiff prev={tx.prevPrice} curr={tx.price} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── 금리 탭 ──────────────────────────────────────────────────────────────────

function RateTab() {
  const [rates, setRates] = useState<PolicyRate[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    fetch("/api/realestate/rates")
      .then((r) => r.json() as Promise<{ rates: PolicyRate[] }>)
      .then((d) => setRates(d.rates))
      .catch(() => null)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) return <div className="flex flex-col gap-2">{[1, 2, 3].map((i) => <SkeletonRow key={i} />)}</div>;

  return (
    <div className="flex flex-col gap-2 overflow-y-auto scrollbar-hide" style={{ maxHeight: 220 }}>
      {rates.map((rate) => (
        <a key={rate.id} href={rate.applyUrl} target="_blank" rel="noopener noreferrer"
          className="flex items-center gap-3 rounded-xl px-3 py-2.5 hover:opacity-80 transition-opacity"
          style={{ background: "rgba(255,255,255,0.04)", border: "1px solid var(--border)" }}>
          {/* 금리 아이콘 */}
          <div className="w-11 h-11 rounded-xl flex flex-col items-center justify-center shrink-0"
            style={{ background: `${ACCENT}18` }}>
            <span className="text-[9px] font-semibold" style={{ color: ACCENT }}>금리</span>
            <span className="text-xs font-black leading-none" style={{ color: ACCENT }}>
              {rate.minRate}%
            </span>
          </div>
          {/* 상품 정보 */}
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold truncate" style={{ color: "var(--text-primary)" }}>{rate.name}</p>
            <p className="text-[10px] truncate mt-0.5" style={{ color: "var(--text-muted)" }}>{rate.target}</p>
            <p className="text-[10px] mt-0.5" style={{ color: "var(--text-muted)" }}>
              {rate.institution} · 한도 {priceFmt(rate.maxAmount)}
            </p>
          </div>
          {/* 금리 범위 */}
          <div className="text-right shrink-0">
            <p className="text-xs font-black" style={{ color: ACCENT }}>
              {rate.minRate}~{rate.maxRate}%
            </p>
            <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>
              {rate.updatedAt.slice(0, 7)} 기준
            </p>
          </div>
        </a>
      ))}
    </div>
  );
}

// ── 메인 위젯 ─────────────────────────────────────────────────────────────────

export default function RealEstateWidget() {
  const [activeTab, setActiveTab] = useState<Tab>("청약");

  const TABS: { key: Tab; icon: React.ReactNode; label: string }[] = [
    { key: "청약", icon: <CalendarCheck size={11} />, label: "청약" },
    { key: "시세", icon: <TrendingUp size={11} />,   label: "시세" },
    { key: "금리", icon: <Wallet size={11} />,        label: "금리" },
  ];

  return (
    <div className="bento-card gradient-sky h-full flex flex-col p-5 gap-3">
      {/* 헤더 */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: ACCENT }}>
            부동산
          </p>
          <h2 className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>
            부동산 정보
          </h2>
          <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
            청약 · 실거래 · 정책 금리
          </p>
        </div>
        <a
          href="https://www.applyhome.co.kr"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg shrink-0 transition-opacity hover:opacity-70"
          style={{ background: `${ACCENT}22`, color: ACCENT }}
        >
          청약홈 <ArrowRight size={11} />
        </a>
      </div>

      {/* 탭 */}
      <div className="flex gap-1.5">
        {TABS.map(({ key, icon, label }) => {
          const active = activeTab === key;
          return (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className="flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg flex-1 justify-center transition-all"
              style={{
                background: active ? ACCENT : `${ACCENT}15`,
                color: active ? "#fff" : "var(--text-muted)",
              }}
            >
              {icon}
              {label}
            </button>
          );
        })}
      </div>

      {/* 탭 콘텐츠 */}
      <div className="flex-1 overflow-hidden">
        {activeTab === "청약" && <SubscriptionTab />}
        {activeTab === "시세" && <TransactionTab />}
        {activeTab === "금리" && <RateTab />}
      </div>
    </div>
  );
}
