"use client";

import { useState, useMemo } from "react";
import { ArrowRight, MapPin } from "lucide-react";
import Link from "next/link";
import {
  BANGKOK_CATEGORIES,
  BANGKOK_ITEMS,
  type BangkokCategory,
  type BangkokFilter,
  type BangkokItem,
} from "@/lib/data/bangkok";

const ACCENT = "#F59E0B";

// 카테고리별 카드 배경 그라디언트
const CATEGORY_BG: Record<BangkokCategory, string> = {
  관광지: "linear-gradient(135deg, rgba(212,160,23,0.80), rgba(139,90,43,0.80))",
  음식: "linear-gradient(135deg, rgba(245,158,11,0.80), rgba(180,83,9,0.80))",
  쇼핑: "linear-gradient(135deg, rgba(99,102,241,0.80), rgba(49,46,129,0.80))",
  마켓: "linear-gradient(135deg, rgba(244,63,94,0.80), rgba(100,0,50,0.80))",
  술집: "linear-gradient(135deg, rgba(124,58,237,0.80), rgba(76,29,149,0.80))",
  마사지샵: "linear-gradient(135deg, rgba(16,185,129,0.80), rgba(5,100,70,0.80))",
  환율: "linear-gradient(135deg, rgba(6,182,212,0.80), rgba(3,105,161,0.80))",
  호텔: "linear-gradient(135deg, rgba(245,158,11,0.80), rgba(120,53,15,0.80))",
};

function SkeletonCard() {
  return (
    <div
      className="shrink-0 rounded-xl overflow-hidden animate-pulse"
      style={{ width: 168, height: "100%", background: "rgba(255,255,255,0.06)" }}
    />
  );
}

export default function BangkokWidget() {
  const [activeCategory, setActiveCategory] = useState<BangkokFilter>("전체");

  const visible = useMemo(() => {
    if (activeCategory === "전체") return BANGKOK_ITEMS.slice(0, 12);
    return BANGKOK_ITEMS.filter((i) => i.category === activeCategory).slice(0, 12);
  }, [activeCategory]);

  return (
    <div className="bento-card gradient-amber h-full flex flex-col p-5 gap-3">
      {/* 헤더 */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p
            className="text-xs font-semibold uppercase tracking-widest"
            style={{ color: ACCENT }}
          >
            Bangkok · 태국 🇹🇭
          </p>
          <h2 className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>
            방콕 여행 정보
          </h2>
        </div>
        <Link
          href="/bangkok"
          className="flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg shrink-0 transition-opacity hover:opacity-70"
          style={{ background: `${ACCENT}22`, color: ACCENT }}
        >
          전체보기 <ArrowRight size={11} />
        </Link>
      </div>

      {/* 카테고리 필터 */}
      <div className="flex gap-1.5 overflow-x-auto scrollbar-hide shrink-0">
        {(["전체", ...BANGKOK_CATEGORIES] as const).map((cat) => {
          const active = cat === activeCategory;
          return (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className="tag shrink-0 transition-all"
              style={
                active
                  ? { background: ACCENT, color: "#fff" }
                  : { background: `${ACCENT}18`, color: "var(--text-muted)" }
              }
            >
              {cat}
            </button>
          );
        })}
      </div>

      {/* 카드 carousel — 가로 스크롤 */}
      <div className="flex gap-3 overflow-x-auto scrollbar-hide flex-1 pb-0.5">
        {visible.length === 0 ? (
          <>
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </>
        ) : (
          visible.map((item) => <BangkokCard key={item.id} item={item} />)
        )}
      </div>
    </div>
  );
}

function BangkokCard({ item }: { item: BangkokItem }) {
  const bg = CATEGORY_BG[item.category];
  const district = item.district ?? item.category;

  const inner = (
    <div
      className="relative shrink-0 rounded-xl overflow-hidden group"
      style={{ width: 168, minWidth: 168, height: "100%" }}
    >
      {/* 배경 */}
      <div
        className="absolute inset-0 flex items-center justify-center transition-transform duration-300 group-hover:scale-105"
        style={{ background: bg, fontSize: "3.5rem" }}
      >
        {item.emoji}
      </div>

      {/* 그라디언트 오버레이 */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(to bottom, rgba(0,0,0,0.10) 0%, transparent 35%, rgba(0,0,0,0.72) 70%, rgba(0,0,0,0.90) 100%)",
        }}
      />

      {/* 상단: 카테고리 뱃지 */}
      <div className="absolute top-2.5 left-2.5">
        <span
          className="px-2 py-0.5 rounded-full text-xs font-semibold"
          style={{ background: "rgba(245,158,11,0.35)", color: "#FDE68A" }}
        >
          {item.category}
        </span>
      </div>

      {/* 하단: 타이틀 + 위치 */}
      <div className="absolute bottom-0 left-0 right-0 p-3 flex flex-col gap-1">
        <p
          className="text-sm font-bold leading-snug line-clamp-2"
          style={{ color: "#fff" }}
        >
          {item.name}
        </p>
        <div className="flex items-center gap-1">
          <MapPin size={10} color="rgba(255,255,255,0.65)" />
          <span
            className="text-xs truncate"
            style={{ color: "rgba(255,255,255,0.65)" }}
          >
            {district}
          </span>
        </div>
      </div>
    </div>
  );

  if (item.url) {
    return (
      <a
        href={item.url}
        target="_blank"
        rel="noopener noreferrer"
        className="hover:opacity-85 transition-opacity"
        style={{ display: "block", height: "100%" }}
        aria-label={`${item.name} 바로가기`}
      >
        {inner}
      </a>
    );
  }

  return <div style={{ height: "100%" }}>{inner}</div>;
}
