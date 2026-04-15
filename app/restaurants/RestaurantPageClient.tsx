"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Clock, MapPin, Star } from "lucide-react";
import {
  isRestaurantOpen,
  RESTAURANT_CATEGORIES,
  SAMPLE_RESTAURANTS,
  type Restaurant,
  type RestaurantCategory,
} from "@/lib/data/restaurant";

const ACCENT = "#EA580C";

const CATEGORY_STYLE: Record<RestaurantCategory, { bg: string; color: string; gradient: string }> = {
  한식: {
    bg: "rgba(245,158,11,0.2)",
    color: "#F59E0B",
    gradient: "linear-gradient(135deg, rgba(245,158,11,0.22), rgba(234,88,12,0.14))",
  },
  중식: {
    bg: "rgba(239,68,68,0.2)",
    color: "#EF4444",
    gradient: "linear-gradient(135deg, rgba(239,68,68,0.22), rgba(249,115,22,0.14))",
  },
  양식: {
    bg: "rgba(99,102,241,0.2)",
    color: "#6366F1",
    gradient: "linear-gradient(135deg, rgba(99,102,241,0.22), rgba(139,92,246,0.14))",
  },
  퓨전: {
    bg: "rgba(139,92,246,0.2)",
    color: "#8B5CF6",
    gradient: "linear-gradient(135deg, rgba(139,92,246,0.22), rgba(236,72,153,0.14))",
  },
};

type CategoryFilter = "전체" | RestaurantCategory;
const FILTER_OPTIONS: CategoryFilter[] = ["전체", ...RESTAURANT_CATEGORIES];

function RestaurantListCard({ restaurant }: { restaurant: Restaurant }) {
  const open = isRestaurantOpen(restaurant.openTime, restaurant.closeTime);
  const catStyle = CATEGORY_STYLE[restaurant.category];

  return (
    <div
      className="bento-card flex items-center gap-4 p-4 hover:opacity-90 transition-opacity"
    >
      {/* 썸네일 */}
      <div
        className="shrink-0 rounded-xl flex items-center justify-center text-3xl"
        style={{ width: 64, height: 64, background: catStyle.gradient }}
        role="img"
        aria-label={restaurant.category}
      >
        {restaurant.emoji}
      </div>

      {/* 내용 */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-base font-bold truncate" style={{ color: "var(--text-primary)" }}>
            {restaurant.name}
          </p>
          <span
            className="tag text-xs shrink-0"
            style={{ background: catStyle.bg, color: catStyle.color }}
          >
            {restaurant.category}
          </span>
        </div>
        <div className="flex items-center gap-1.5 mt-1 min-w-0">
          <MapPin size={11} style={{ color: "var(--text-muted)", flexShrink: 0 }} />
          <p className="text-xs truncate" style={{ color: "var(--text-muted)" }}>
            {restaurant.address}
          </p>
        </div>
        <div className="flex items-center gap-1.5 mt-0.5">
          <Clock size={11} style={{ color: "var(--text-muted)", flexShrink: 0 }} />
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            {restaurant.openTime} – {restaurant.closeTime}
          </p>
        </div>
        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
          <div className="flex items-center gap-0.5">
            <Star size={11} fill="#F59E0B" style={{ color: "#F59E0B" }} />
            <span className="text-xs font-semibold tabular-nums" style={{ color: "#F59E0B" }}>
              {restaurant.rating}
            </span>
            <span className="text-xs ml-0.5" style={{ color: "var(--text-muted)" }}>
              ({restaurant.reviewCount.toLocaleString()})
            </span>
          </div>
          <span className="text-xs" style={{ color: "var(--text-muted)" }}>
            {restaurant.distance}
          </span>
          <span className="text-xs font-semibold" style={{ color: "var(--text-muted)" }}>
            {restaurant.priceRange}
          </span>
        </div>
      </div>

      {/* 우측: 영업 상태 */}
      <div className="shrink-0 flex flex-col items-end gap-1">
        <span
          className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-semibold"
          style={
            open
              ? { background: "rgba(16,185,129,0.18)", color: "#10B981" }
              : { background: "rgba(239,68,68,0.18)", color: "#EF4444" }
          }
        >
          {open && (
            <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse inline-block" />
          )}
          {open ? "영업중" : "영업종료"}
        </span>
        <div className="flex gap-0.5 flex-wrap justify-end">
          {restaurant.tags.slice(0, 2).map((tag) => (
            <span
              key={tag}
              className="text-xs px-1.5 py-0.5 rounded"
              style={{ background: "rgba(255,255,255,0.06)", color: "var(--text-muted)" }}
            >
              {tag}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function RestaurantPageClient() {
  const [activeCategory, setActiveCategory] = useState<CategoryFilter>("전체");

  const filtered = useMemo(() => {
    return activeCategory === "전체"
      ? SAMPLE_RESTAURANTS
      : SAMPLE_RESTAURANTS.filter((r) => r.category === activeCategory);
  }, [activeCategory]);

  const openCount = useMemo(
    () => filtered.filter((r) => isRestaurantOpen(r.openTime, r.closeTime)).length,
    [filtered],
  );

  return (
    <div>
      {/* 뒤로가기 */}
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-sm mb-5 transition-opacity hover:opacity-70"
        style={{ color: "var(--text-muted)" }}
      >
        <ArrowLeft size={14} />
        메인으로
      </Link>

      {/* 카테고리 필터 */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {FILTER_OPTIONS.map((cat) => {
          const active = activeCategory === cat;
          return (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className="px-4 py-1.5 rounded-full text-sm font-semibold transition-all"
              style={
                active
                  ? { background: ACCENT, color: "#fff" }
                  : {
                      background: "var(--bg-card)",
                      color: "var(--text-muted)",
                      border: "1px solid var(--border)",
                    }
              }
            >
              {cat}
            </button>
          );
        })}
      </div>

      {/* 결과 요약 */}
      <p className="text-sm mb-4" style={{ color: "var(--text-muted)" }}>
        총{" "}
        <span style={{ color: "var(--text-primary)", fontWeight: 700 }}>{filtered.length}</span>개
        {openCount > 0 && (
          <>
            {" "}·{" "}
            <span className="inline-flex items-center gap-1">
              <span
                className="w-1.5 h-1.5 rounded-full inline-block animate-pulse"
                style={{ background: "#10B981" }}
              />
              <span style={{ color: "#10B981", fontWeight: 700 }}>{openCount}</span>
              <span>곳 영업중</span>
            </span>
          </>
        )}
      </p>

      {/* 리스트 */}
      {filtered.length === 0 ? (
        <div
          className="rounded-2xl flex items-center justify-center py-20"
          style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
        >
          <p style={{ color: "var(--text-muted)" }}>해당 카테고리의 맛집이 없습니다.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map((restaurant) => (
            <RestaurantListCard key={restaurant.id} restaurant={restaurant} />
          ))}
        </div>
      )}
    </div>
  );
}
