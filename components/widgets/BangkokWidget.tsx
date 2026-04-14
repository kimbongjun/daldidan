"use client";

import { useState, useEffect, useCallback } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  BANGKOK_FEATURED,
  BANGKOK_CATEGORIES,
  getBangkokGrid,
  type BangkokItem,
  type BangkokFilter,
} from "@/lib/data/bangkok";

const ACCENT = "#F59E0B";

export default function BangkokWidget() {
  const [activeCategory, setActiveCategory] = useState<BangkokFilter>("전체");
  const [carouselIndex, setCarouselIndex] = useState(0);

  const nextSlide = useCallback(() => {
    setCarouselIndex((i) => (i + 1) % BANGKOK_FEATURED.length);
  }, []);

  const prevSlide = useCallback(() => {
    setCarouselIndex(
      (i) => (i - 1 + BANGKOK_FEATURED.length) % BANGKOK_FEATURED.length
    );
  }, []);

  useEffect(() => {
    const timer = setInterval(nextSlide, 4000);
    return () => clearInterval(timer);
  }, [nextSlide]);

  const gridItems = getBangkokGrid(activeCategory);

  return (
    <div className="bento-card gradient-amber h-full flex flex-col p-5 gap-3 overflow-hidden">
      {/* 헤더 */}
      <div className="flex items-start justify-between gap-3 shrink-0">
        <div className="min-w-0">
          <p
            className="text-xs font-semibold uppercase tracking-widest"
            style={{ color: ACCENT }}
          >
            Bangkok · 태국 🇹🇭
          </p>
          <h2 className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>
            방콕 주요 관광지
          </h2>
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            <span className="text-xs" style={{ color: "var(--text-muted)" }}>
              2026년 기준
            </span>
            <span
              className="flex items-center gap-1 text-xs font-semibold"
              style={{ color: ACCENT }}
            >
              <span
                className="w-1.5 h-1.5 rounded-full inline-block animate-pulse"
                style={{ background: ACCENT }}
              />
              ₩100 ≈ ฿2.60
            </span>
            <span className="text-xs" style={{ color: "var(--text-muted)" }}>
              환율
            </span>
          </div>
        </div>
      </div>

      {/* 캐러셀 */}
      <div
        className="relative rounded-xl overflow-hidden shrink-0"
        style={{ height: 150 }}
      >
        {BANGKOK_FEATURED.map((item, i) => (
          <div
            key={item.id}
            className="absolute inset-0 transition-opacity duration-500"
            style={{ opacity: i === carouselIndex ? 1 : 0, pointerEvents: i === carouselIndex ? "auto" : "none" }}
          >
            <div
              className="absolute inset-0 flex items-center justify-center"
              style={{ background: item.bg, fontSize: "3.5rem" }}
            >
              {item.emoji}
            </div>
            <div
              className="absolute inset-0"
              style={{
                background:
                  "linear-gradient(to top, rgba(0,0,0,0.82) 0%, transparent 60%)",
              }}
            />
            <div className="absolute bottom-0 left-0 right-0 p-3.5">
              <p className="font-bold text-sm leading-tight" style={{ color: "#fff" }}>
                {item.name}
              </p>
              <p
                className="text-xs mt-0.5 leading-snug"
                style={{ color: "rgba(255,255,255,0.72)" }}
              >
                {item.description}
              </p>
            </div>
          </div>
        ))}

        {/* 이전/다음 버튼 */}
        <button
          onClick={prevSlide}
          className="absolute left-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full flex items-center justify-center transition-opacity hover:opacity-80"
          style={{ background: "rgba(0,0,0,0.45)" }}
          aria-label="이전 슬라이드"
        >
          <ChevronLeft size={14} color="#fff" />
        </button>
        <button
          onClick={nextSlide}
          className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full flex items-center justify-center transition-opacity hover:opacity-80"
          style={{ background: "rgba(0,0,0,0.45)" }}
          aria-label="다음 슬라이드"
        >
          <ChevronRight size={14} color="#fff" />
        </button>

        {/* 도트 네비게이션 */}
        <div className="absolute bottom-2.5 left-1/2 -translate-x-1/2 flex gap-1.5">
          {BANGKOK_FEATURED.map((_, i) => (
            <button
              key={i}
              onClick={() => setCarouselIndex(i)}
              className="rounded-full transition-all duration-300"
              style={{
                width: i === carouselIndex ? 20 : 6,
                height: 6,
                background:
                  i === carouselIndex ? "#fff" : "rgba(255,255,255,0.4)",
              }}
              aria-label={`슬라이드 ${i + 1}`}
            />
          ))}
        </div>
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

      {/* 3×3 그리드 */}
      <div
        className="flex-1 min-h-0 grid gap-2"
        style={{
          gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
          gridTemplateRows: "repeat(3, minmax(0, 1fr))",
        }}
      >
        {gridItems.map((item) => (
          <BangkokCard key={item.id} item={item} />
        ))}
      </div>
    </div>
  );
}

function BangkokCard({ item }: { item: BangkokItem }) {
  return (
    <div
      className="rounded-xl p-2.5 flex flex-col gap-1 overflow-hidden"
      style={{
        background: item.accentColor,
        border: "1px solid var(--border)",
      }}
    >
      <div className="flex items-start justify-between gap-1">
        <span style={{ fontSize: "1.15rem", lineHeight: 1 }}>{item.emoji}</span>
        <span
          className="shrink-0 rounded-full px-1.5 py-0.5 font-semibold"
          style={{
            fontSize: "0.6rem",
            background: `${ACCENT}22`,
            color: ACCENT,
          }}
        >
          {item.category}
        </span>
      </div>
      <p
        className="text-xs font-bold leading-snug line-clamp-1"
        style={{ color: "var(--text-primary)" }}
      >
        {item.name}
      </p>
      <p
        className="flex-1 leading-snug line-clamp-2"
        style={{ fontSize: "0.65rem", color: "var(--text-muted)" }}
      >
        {item.description}
      </p>
      {item.price && (
        <p
          className="font-semibold truncate"
          style={{ fontSize: "0.65rem", color: ACCENT }}
        >
          {item.price}
        </p>
      )}
    </div>
  );
}
