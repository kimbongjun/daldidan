"use client";

import { useEffect, useState } from "react";
import { ArrowRight, ArrowUp, ArrowDown, Minus, TrendingUp, Home, Wallet, CalendarCheck, AlertTriangle } from "lucide-react";
import type { SubscriptionItem } from "@/app/api/realestate/subscriptions/route";
import type { PolicyRate } from "@/app/api/realestate/rates/route";
import type { TransactionItem, MarketIndex } from "@/app/api/realestate/transactions/route";
import type { IllegalResupplyItem } from "@/app/api/realestate/illegal-resupply/route";
import { fetchWithTimeout } from "@/lib/fetch-with-timeout";

const ACCENT = "#5CABF2";

type Tab = "청약" | "시세" | "금리" | "재공급";
type SubscriptionRegionCategory =
  | "전체"
  | "서울"
  | "경기"
  | "인천"
  | "강원"
  | "충북"
  | "충남"
  | "대전"
  | "세종"
  | "전북"
  | "전남"
  | "광주"
  | "경북"
  | "대구"
  | "경남"
  | "부산"
  | "울산"
  | "제주";

const SUBSCRIPTION_REGION_ORDER: SubscriptionRegionCategory[] = [
  "전체",
  "서울",
  "경기",
  "인천",
  "강원",
  "충북",
  "충남",
  "대전",
  "세종",
  "전북",
  "전남",
  "광주",
  "경북",
  "대구",
  "경남",
  "부산",
  "울산",
  "제주",
];

function resolveSubscriptionRegionCategory(region: string): SubscriptionRegionCategory {
  const normalized = region.replace(/\s+/g, " ").trim();

  if (normalized.startsWith("서울")) return "서울";
  if (normalized.startsWith("경기")) return "경기";
  if (normalized.startsWith("인천")) return "인천";
  if (normalized.startsWith("강원")) return "강원";
  if (normalized.startsWith("충북") || normalized.startsWith("충청북")) return "충북";
  if (normalized.startsWith("충남") || normalized.startsWith("충청남")) return "충남";
  if (normalized.startsWith("대전")) return "대전";
  if (normalized.startsWith("세종")) return "세종";
  if (normalized.startsWith("전북") || normalized.startsWith("전라북")) return "전북";
  if (normalized.startsWith("전남") || normalized.startsWith("전라남")) return "전남";
  if (normalized.startsWith("광주")) return "광주";
  if (normalized.startsWith("경북") || normalized.startsWith("경상북")) return "경북";
  if (normalized.startsWith("대구")) return "대구";
  if (normalized.startsWith("경남") || normalized.startsWith("경상남")) return "경남";
  if (normalized.startsWith("부산")) return "부산";
  if (normalized.startsWith("울산")) return "울산";
  if (normalized.startsWith("제주")) return "제주";

  return "전체";
}


type DisplaySubscriptionItem = SubscriptionItem & {
  dday: number;
};

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
    <div className="flex items-center gap-3 rounded-xl px-3 py-2.5"
      style={{ background: "rgba(255,255,255,0.04)" }}>
      <div className="w-8 h-8 rounded-lg shrink-0 skeleton-shimmer" />
      <div className="flex-1 min-w-0 flex flex-col gap-1.5">
        <div className="h-3 w-3/4 rounded skeleton-shimmer" />
        <div className="h-2 w-1/2 rounded skeleton-shimmer" />
      </div>
      <div className="h-4 w-16 rounded shrink-0 skeleton-shimmer" />
    </div>
  );
}

// ── 청약 탭 ──────────────────────────────────────────────────────────────────

function SubscriptionTab() {
  const [items, setItems] = useState<DisplaySubscriptionItem[]>([]);
  const [isMock, setIsMock] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeRegion, setActiveRegion] = useState<SubscriptionRegionCategory>("전체");

  useEffect(() => {
    const controller = new AbortController();
    fetchWithTimeout("/api/realestate/subscriptions", { signal: controller.signal }, 12000)
      .then((r) => r.json() as Promise<{ subscriptions: (SubscriptionItem & { dday: number })[]; isMock?: boolean }>)
      .then((d) => { setItems(d.subscriptions); setIsMock(d.isMock ?? false); })
      .catch(() => null)
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, []);

  if (loading) return <div className="flex flex-col gap-2">{[1, 2, 3].map((i) => <SkeletonRow key={i} />)}</div>;

  const availableRegions = SUBSCRIPTION_REGION_ORDER.filter((region) => (
    region === "전체"
    || items.some((item) => resolveSubscriptionRegionCategory(item.region) === region)
  ));
  const mergedItems = activeRegion === "전체"
    ? items
    : items.filter((item) => resolveSubscriptionRegionCategory(item.region) === activeRegion);

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

      <div className="flex gap-1.5 overflow-x-auto scrollbar-hide pb-0.5">
        {availableRegions.map((region) => {
          const active = activeRegion === region;
          return (
            <button
              key={region}
              type="button"
              onClick={() => setActiveRegion(region)}
              className="shrink-0 rounded-full px-3 py-1.5 text-[11px] font-semibold transition-all"
              style={{
                background: active ? ACCENT : "rgba(255,255,255,0.06)",
                color: active ? "#fff" : "var(--text-muted)",
                border: active ? `1px solid ${ACCENT}` : "1px solid rgba(255,255,255,0.08)",
              }}
            >
              {region}
            </button>
          );
        })}
      </div>

      <div className="flex flex-col gap-2 overflow-y-auto scrollbar-hide" style={{ maxHeight: isMock ? 196 : 220 }}>
        {mergedItems.map((item) => {
          const { label, urgent } = getDdayLabel(item.startDate);
          return (
            <a key={item.id} href={item.detailUrl} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors hover:opacity-80"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid transparent" }}>
              {/* D-day 배지 */}
              <div className="w-11 h-11 rounded-xl flex flex-col items-center justify-center shrink-0 text-center"
                style={{ background: urgent ? `${ACCENT}22` : "rgba(255,255,255,0.06)" }}>
                <span className="text-[9px] font-semibold uppercase" style={{ color: urgent ? ACCENT : "var(--text-muted)" }}>
                  청약
                </span>
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

        {mergedItems.length === 0 && (
          <div
            className="rounded-xl px-3 py-6 text-center text-xs"
            style={{ background: "rgba(255,255,255,0.04)", color: "var(--text-muted)" }}
          >
            {activeRegion} 지역의 청약 일정이 아직 없습니다.
          </div>
        )}
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
    const controller = new AbortController();
    fetchWithTimeout("/api/realestate/transactions", { signal: controller.signal }, 12000)
      .then((r) => r.json() as Promise<{ transactions: TransactionItem[]; marketIndex: MarketIndex[] }>)
      .then((d) => { setTransactions(d.transactions); setMarketIndex(d.marketIndex); })
      .catch(() => null)
      .finally(() => setLoading(false));
    return () => controller.abort();
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

  useEffect(() => {
    const controller = new AbortController();
    fetchWithTimeout("/api/realestate/rates", { signal: controller.signal }, 12000)
      .then((r) => r.json() as Promise<{ rates: PolicyRate[] }>)
      .then((d) => setRates(d.rates))
      .catch(() => null)
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, []);

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

// ── 재공급 탭 ─────────────────────────────────────────────────────────────────

function IllegalResupplyTab() {
  const [items, setItems] = useState<IllegalResupplyItem[]>([]);
  const [isMock, setIsMock] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeRegion, setActiveRegion] = useState<SubscriptionRegionCategory>("전체");

  useEffect(() => {
    const controller = new AbortController();
    fetchWithTimeout("/api/realestate/illegal-resupply", { signal: controller.signal }, 12000)
      .then((r) => r.json() as Promise<{ items: IllegalResupplyItem[]; isMock?: boolean }>)
      .then((d) => { setItems(d.items); setIsMock(d.isMock ?? false); })
      .catch(() => null)
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, []);

  if (loading) return <div className="flex flex-col gap-2">{[1, 2, 3].map((i) => <SkeletonRow key={i} />)}</div>;

  const availableRegions = SUBSCRIPTION_REGION_ORDER.filter((region) =>
    region === "전체" || items.some((item) => resolveSubscriptionRegionCategory(item.region) === region)
  );
  const filteredItems = activeRegion === "전체"
    ? items
    : items.filter((item) => resolveSubscriptionRegionCategory(item.region) === activeRegion);

  return (
    <div className="flex flex-col gap-2">
      {isMock && (
        <div className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg"
          style={{ background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.2)" }}>
          <span className="text-[10px]" style={{ color: "#F59E0B" }}>샘플 데이터 · 실제 재공급 일정은</span>
          <a href="https://www.applyhome.co.kr/rs/rsa/selectResaleIlglActListView.do"
            target="_blank" rel="noopener noreferrer"
            className="text-[10px] font-semibold underline" style={{ color: "#F59E0B" }}>
            청약홈
          </a>
          <span className="text-[10px]" style={{ color: "#F59E0B" }}>에서 확인</span>
        </div>
      )}

      <div className="flex gap-1.5 overflow-x-auto scrollbar-hide pb-0.5">
        {availableRegions.map((region) => {
          const active = activeRegion === region;
          return (
            <button key={region} type="button" onClick={() => setActiveRegion(region)}
              className="shrink-0 rounded-full px-3 py-1.5 text-[11px] font-semibold transition-all"
              style={{
                background: active ? "#F43F5E" : "rgba(255,255,255,0.06)",
                color: active ? "#fff" : "var(--text-muted)",
                border: active ? "1px solid #F43F5E" : "1px solid rgba(255,255,255,0.08)",
              }}>
              {region}
            </button>
          );
        })}
      </div>

      <div className="flex flex-col gap-2 overflow-y-auto scrollbar-hide" style={{ maxHeight: isMock ? 196 : 220 }}>
        {filteredItems.map((item) => {
          const { label, urgent } = getDdayLabel(item.announcementDate);
          return (
            <a key={item.id} href={item.detailUrl} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors hover:opacity-80"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid transparent" }}>
              {/* D-day 배지 */}
              <div className="w-11 h-11 rounded-xl flex flex-col items-center justify-center shrink-0 text-center"
                style={{ background: urgent ? "rgba(244,63,94,0.14)" : "rgba(255,255,255,0.06)" }}>
                <span className="text-[9px] font-semibold uppercase"
                  style={{ color: urgent ? "#F43F5E" : "var(--text-muted)" }}>재공급</span>
                <span className="text-xs font-black leading-none"
                  style={{ color: urgent ? "#F43F5E" : "var(--text-muted)" }}>{label}</span>
              </div>
              {/* 단지 정보 */}
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold truncate" style={{ color: "var(--text-primary)" }}>{item.name}</p>
                <p className="text-[11px] truncate mt-0.5" style={{ color: "var(--text-muted)" }}>
                  {item.region} · {item.units > 0 ? `${item.units}세대` : "세대수 미정"}
                </p>
                <p className="text-[10px] mt-0.5" style={{ color: "var(--text-muted)" }}>
                  공고 {item.announcementDate.slice(5)} · 발표 {item.winnerAnnouncementDate ? item.winnerAnnouncementDate.slice(5) : "-"}
                </p>
              </div>
              {/* 전매제한 배지 */}
              <div className="text-right shrink-0 max-w-[80px]">
                <span className="text-[10px] px-1.5 py-0.5 rounded-md block truncate"
                  style={{ background: "rgba(244,63,94,0.12)", color: "#F43F5E" }}>
                  {item.transferRestriction.length > 8 ? item.transferRestriction.slice(0, 8) + "…" : item.transferRestriction}
                </span>
              </div>
            </a>
          );
        })}

        {filteredItems.length === 0 && (
          <div className="rounded-xl px-3 py-6 text-center text-xs"
            style={{ background: "rgba(255,255,255,0.04)", color: "var(--text-muted)" }}>
            {activeRegion} 지역의 불법행위 재공급 일정이 없습니다.
          </div>
        )}
      </div>
    </div>
  );
}

// ── 메인 위젯 ─────────────────────────────────────────────────────────────────

export default function RealEstateWidget() {
  const [activeTab, setActiveTab] = useState<Tab>("청약");

  const TABS: { key: Tab; icon: React.ReactNode; label: string }[] = [
    { key: "청약",  icon: <CalendarCheck size={11} />,   label: "청약" },
    { key: "시세",  icon: <TrendingUp size={11} />,      label: "시세" },
    { key: "금리",  icon: <Wallet size={11} />,          label: "금리" },
    { key: "재공급", icon: <AlertTriangle size={11} />,  label: "재공급" },
  ];

  return (
    <div className="bento-card h-full flex flex-col p-5 gap-3">
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
            청약 · 실거래 · 금리 · 재공급
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
      <div className="flex gap-1">
        {TABS.map(({ key, icon, label }) => {
          const active = activeTab === key;
          const activeColor = key === "재공급" ? "#F43F5E" : ACCENT;
          return (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className="flex items-center gap-1 text-xs font-semibold px-2 py-1.5 rounded-lg flex-1 justify-center transition-all"
              style={{
                background: active ? activeColor : `${ACCENT}15`,
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
        {activeTab === "청약"   && <SubscriptionTab />}
        {activeTab === "시세"   && <TransactionTab />}
        {activeTab === "금리"   && <RateTab />}
        {activeTab === "재공급" && <IllegalResupplyTab />}
      </div>
    </div>
  );
}
