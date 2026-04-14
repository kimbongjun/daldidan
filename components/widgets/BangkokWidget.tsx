"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { ChevronLeft, ChevronRight, ExternalLink } from "lucide-react";
import {
  BANGKOK_FEATURED,
  BANGKOK_CATEGORIES,
  getBangkokGrid,
  type BangkokItem,
  type BangkokFilter,
  type BangkokExchangeRate,
  type BangkokHotelLink,
} from "@/lib/data/bangkok";

const ACCENT = "#F59E0B";

// 환율 표시 포맷: ₩100 ≈ ฿X.XX
function formatKrwThb(rate: number): string {
  const val = (rate * 100).toFixed(2);
  return `₩100 ≈ ฿${val}`;
}

export default function BangkokWidget() {
  const [activeCategory, setActiveCategory] = useState<BangkokFilter>("전체");
  const [carouselIndex, setCarouselIndex] = useState(0);
  const [exchange, setExchange] = useState<BangkokExchangeRate | null>(null);

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

  // 실시간 환율 API 호출
  useEffect(() => {
    fetch("/api/bangkok")
      .then((r) => r.json())
      .then((d: BangkokExchangeRate) => setExchange(d))
      .catch(() => null);
  }, []);

  // 환율 카테고리 선택 시 실시간 데이터로 description 업데이트
  const displayItems = useMemo(() => {
    const gridItems = getBangkokGrid(activeCategory);
    return gridItems.map((item) => {
      if (!exchange || item.category !== "환율") return item;
      if (item.id === "ex1") {
        const thbPer100 = (exchange.krwThb * 100).toFixed(2);
        return {
          ...item,
          description: `₩100 ≈ ฿${thbPer100} (${exchange.date} 기준)`,
          price: `₩10,000 ≈ ฿${(exchange.krwThb * 10000).toFixed(0)}`,
        };
      }
      if (item.id === "ex2") {
        const usdPer1000 = (exchange.krwUsd * 1000).toFixed(4);
        return {
          ...item,
          description: `₩1,000 ≈ $${usdPer1000} (${exchange.date} 기준)`,
          price: `₩1,000,000 ≈ $${(exchange.krwUsd * 1000000).toFixed(2)}`,
        };
      }
      return item;
    });
  }, [activeCategory, exchange]);

  const currentFeatured = BANGKOK_FEATURED[carouselIndex];

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
            {exchange ? (
              <>
                <span
                  className="flex items-center gap-1 text-xs font-semibold"
                  style={{ color: ACCENT }}
                >
                  <span
                    className="w-1.5 h-1.5 rounded-full inline-block animate-pulse"
                    style={{ background: ACCENT }}
                  />
                  {formatKrwThb(exchange.krwThb)}
                </span>
                <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                  {exchange.source === "live" ? `실시간 · ${exchange.date}` : "환율 (참고용)"}
                </span>
              </>
            ) : (
              <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                환율 불러오는 중...
              </span>
            )}
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
            style={{
              opacity: i === carouselIndex ? 1 : 0,
              pointerEvents: i === carouselIndex ? "auto" : "none",
            }}
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
            {/* 클릭 가능한 오버레이 */}
            {item.url && (
              <a
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="absolute inset-0"
                aria-label={`${item.name} 바로가기`}
              />
            )}
            <div className="absolute bottom-0 left-0 right-0 p-3.5 pointer-events-none">
              <div className="flex items-center gap-1.5">
                <p className="font-bold text-sm leading-tight" style={{ color: "#fff" }}>
                  {item.name}
                </p>
                {item.url && (
                  <ExternalLink size={11} color="rgba(255,255,255,0.6)" />
                )}
              </div>
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
          className="absolute left-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full flex items-center justify-center transition-opacity hover:opacity-80 z-10"
          style={{ background: "rgba(0,0,0,0.45)" }}
          aria-label="이전 슬라이드"
        >
          <ChevronLeft size={14} color="#fff" />
        </button>
        <button
          onClick={nextSlide}
          className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full flex items-center justify-center transition-opacity hover:opacity-80 z-10"
          style={{ background: "rgba(0,0,0,0.45)" }}
          aria-label="다음 슬라이드"
        >
          <ChevronRight size={14} color="#fff" />
        </button>

        {/* 도트 네비게이션 */}
        <div className="absolute bottom-2.5 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
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

      {/* 캐러셀 현재 항목 링크 버튼 */}
      {currentFeatured?.url && (
        <div className="shrink-0 -mt-1">
          <a
            href={currentFeatured.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs font-semibold px-3 py-1 rounded-lg transition-opacity hover:opacity-70"
            style={{ background: `${ACCENT}22`, color: ACCENT }}
          >
            {currentFeatured.name} 공식 사이트 <ExternalLink size={10} />
          </a>
        </div>
      )}

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
        {displayItems.map((item) => (
          <BangkokCard key={item.id} item={item} />
        ))}
      </div>
    </div>
  );
}

function BangkokCard({ item }: { item: BangkokItem }) {
  const inner = (
    <div
      className="rounded-xl p-2.5 flex flex-col gap-1 overflow-hidden h-full"
      style={{
        background: item.accentColor,
        border: "1px solid var(--border)",
        transition: item.url ? "opacity 0.15s" : undefined,
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
      <div className="flex items-center gap-0.5 min-w-0">
        <p
          className="text-xs font-bold leading-snug line-clamp-1 min-w-0"
          style={{ color: "var(--text-primary)" }}
        >
          {item.name}
        </p>
        {item.url && (
          <ExternalLink
            size={9}
            style={{ color: "var(--text-muted)", flexShrink: 0 }}
          />
        )}
      </div>
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
      {item.hotelLinks && item.hotelLinks.length > 0 && (
        <div className="flex gap-1 mt-0.5">
          {item.hotelLinks.map((link: BangkokHotelLink) => (
            <a
              key={link.platform}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="flex items-center gap-0.5 rounded px-1.5 py-0.5 font-semibold transition-opacity hover:opacity-70"
              style={{
                fontSize: "0.58rem",
                background: link.platform === "agoda" ? "rgba(239,68,68,0.18)" : "rgba(59,130,246,0.18)",
                color: link.platform === "agoda" ? "#EF4444" : "#3B82F6",
              }}
            >
              {link.platform === "agoda" ? "Agoda" : "Hotels"}
              <ExternalLink size={7} />
            </a>
          ))}
        </div>
      )}
    </div>
  );

  if (item.url) {
    return (
      <a
        href={item.url}
        target="_blank"
        rel="noopener noreferrer"
        className="block hover:opacity-80 transition-opacity"
        aria-label={`${item.name} 바로가기`}
      >
        {inner}
      </a>
    );
  }

  return <div>{inner}</div>;
}
