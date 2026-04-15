"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { ArrowRight, Star } from "lucide-react";
import { RESTAURANT_CATEGORIES, type RestaurantCategory } from "@/lib/data/restaurant";

const ACCENT = "#EA580C";

const CATEGORY_STYLE: Record<RestaurantCategory, { bg: string; color: string; gradient: string }> =
  {
    한식: {
      bg: "rgba(245,158,11,0.25)",
      color: "#F59E0B",
      gradient: "linear-gradient(135deg, rgba(245,158,11,0.28), rgba(234,88,12,0.18))",
    },
    중식: {
      bg: "rgba(239,68,68,0.25)",
      color: "#EF4444",
      gradient: "linear-gradient(135deg, rgba(239,68,68,0.28), rgba(249,115,22,0.18))",
    },
    양식: {
      bg: "rgba(99,102,241,0.25)",
      color: "#6366F1",
      gradient: "linear-gradient(135deg, rgba(99,102,241,0.28), rgba(139,92,246,0.18))",
    },
    퓨전: {
      bg: "rgba(139,92,246,0.25)",
      color: "#8B5CF6",
      gradient: "linear-gradient(135deg, rgba(139,92,246,0.28), rgba(236,72,153,0.18))",
    },
  };

const CATEGORY_EMOJI: Record<RestaurantCategory, string> = {
  한식: "🍚",
  중식: "🥟",
  양식: "🍝",
  퓨전: "🍱",
};

interface NearbyRestaurant {
  id: string;
  name: string;
  address: string;
  rating: number;
  reviewCount: number;
  isOpen: boolean | null;
  photoRef: string | null;
  googleMapsUri: string;
  types: string[];
  category: RestaurantCategory;
  distance: string;
}

type CategoryFilter = "전체" | RestaurantCategory;
const FILTER_OPTIONS: CategoryFilter[] = ["전체", ...RESTAURANT_CATEGORIES];

function SkeletonCard() {
  return (
    <div
      className="shrink-0 rounded-xl overflow-hidden animate-pulse"
      style={{ width: 160, minWidth: 160, background: "rgba(255,255,255,0.06)" }}
    />
  );
}

export default function RestaurantWidget() {
  const [restaurants, setRestaurants] = useState<NearbyRestaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<CategoryFilter>("전체");
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null);

  const fetchRestaurants = useCallback(async (lat: number, lng: number) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/places/nearby?lat=${lat}&lng=${lng}`);
      if (!res.ok) throw new Error("맛집 정보를 불러오지 못했습니다.");
      const data = (await res.json()) as { restaurants: NearbyRestaurant[] };
      setRestaurants(data.restaurants);
    } catch (e) {
      setError(e instanceof Error ? e.message : "오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Seoul city center fallback
    const fallback = () => {
      const lat = 37.5665;
      const lng = 126.978;
      setUserCoords({ lat, lng });
      fetchRestaurants(lat, lng);
    };

    if (!navigator.geolocation) {
      fallback();
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setUserCoords({ lat, lng });
        fetchRestaurants(lat, lng);
      },
      fallback,
      { timeout: 10000, maximumAge: 300000 },
    );
  }, [fetchRestaurants]);

  const visible = useMemo(() => {
    const all =
      activeCategory === "전체"
        ? restaurants
        : restaurants.filter((r) => r.category === activeCategory);
    return all.slice(0, 12);
  }, [restaurants, activeCategory]);

  const mapsSearchUrl = userCoords
    ? `https://www.google.com/maps/search/음식점/@${userCoords.lat},${userCoords.lng},15z`
    : "https://www.google.com/maps/search/음식점/";

  return (
    <div className="bento-card gradient-orange h-full flex flex-col p-5 gap-3">
      {/* 헤더 */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p
            className="text-xs font-semibold uppercase tracking-widest"
            style={{ color: ACCENT }}
          >
            맛집 추천
          </p>
          <h2 className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>
            주변 맛집
          </h2>
          <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
            현위치 기준 실시간
          </p>
        </div>
        <a
          href={mapsSearchUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg shrink-0 transition-opacity hover:opacity-70"
          style={{ background: `${ACCENT}22`, color: ACCENT }}
        >
          전체보기 <ArrowRight size={11} />
        </a>
      </div>

      {/* 카테고리 필터 */}
      <div className="flex gap-1.5 overflow-x-auto scrollbar-hide">
        {FILTER_OPTIONS.map((cat) => {
          const active = activeCategory === cat;
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

      {/* 카드 캐러셀 */}
      <div className="flex gap-3 overflow-x-auto scrollbar-hide flex-1 pb-0.5">
        {loading ? (
          <>
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </>
        ) : error ? (
          <div
            className="flex-1 flex items-center justify-center text-sm"
            style={{ color: "var(--text-muted)" }}
          >
            {error}
          </div>
        ) : visible.length === 0 ? (
          <div
            className="flex-1 flex items-center justify-center text-sm"
            style={{ color: "var(--text-muted)" }}
          >
            주변 맛집이 없습니다.
          </div>
        ) : (
          visible.map((restaurant) => (
            <RestaurantCard key={restaurant.id} restaurant={restaurant} />
          ))
        )}
      </div>
    </div>
  );
}

function RestaurantCard({ restaurant }: { restaurant: NearbyRestaurant }) {
  const [imgError, setImgError] = useState(false);
  const catStyle = CATEGORY_STYLE[restaurant.category];

  const handleClick = () => {
    window.open(restaurant.googleMapsUri, "_blank", "noopener,noreferrer");
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={(e) => e.key === "Enter" && handleClick()}
      className="relative shrink-0 rounded-xl overflow-hidden cursor-pointer group"
      style={{ width: 160, minWidth: 160, height: "100%" }}
    >
      {/* 배경: 실제 사진 or 그라디언트 + 이모지 */}
      <div
        className="absolute inset-0 flex items-center justify-center"
        style={{ background: catStyle.gradient }}
      >
        {restaurant.photoRef && !imgError ? (
          <Image
            src={`/api/places/photo?name=${encodeURIComponent(restaurant.photoRef)}`}
            alt={restaurant.name}
            fill
            sizes="160px"
            unoptimized
            className="object-cover transition-transform duration-300 group-hover:scale-105"
            onError={() => setImgError(true)}
          />
        ) : (
          <span
            className="text-6xl select-none transition-transform duration-300 group-hover:scale-110"
            role="img"
            aria-label={restaurant.category}
          >
            {CATEGORY_EMOJI[restaurant.category]}
          </span>
        )}
      </div>

      {/* 하단 그라디언트 오버레이 */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(to bottom, rgba(0,0,0,0.05) 0%, transparent 30%, rgba(0,0,0,0.72) 65%, rgba(0,0,0,0.93) 100%)",
        }}
      />

      {/* 상단: 카테고리 뱃지 */}
      <div className="absolute top-2.5 left-2.5">
        <span
          className="text-xs px-2 py-0.5 rounded-full font-semibold"
          style={{ background: catStyle.bg, color: catStyle.color, backdropFilter: "blur(6px)" }}
        >
          {restaurant.category}
        </span>
      </div>

      {/* 하단: 영업상태 + 이름 + 평점 + 거리 */}
      <div className="absolute bottom-0 left-0 right-0 p-3 flex flex-col gap-1.5">
        {/* 영업 상태 */}
        {restaurant.isOpen !== null && (
          <span
            className="self-start flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-semibold"
            style={
              restaurant.isOpen
                ? { background: "rgba(16,185,129,0.32)", color: "#10B981" }
                : { background: "rgba(239,68,68,0.32)", color: "#EF4444" }
            }
          >
            {restaurant.isOpen && (
              <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse inline-block" />
            )}
            {restaurant.isOpen ? "영업중" : "영업종료"}
          </span>
        )}

        {/* 식당 이름 */}
        <p className="text-sm font-bold leading-snug line-clamp-2" style={{ color: "#fff" }}>
          {restaurant.name}
        </p>

        {/* 평점 + 거리 */}
        <div className="flex items-center gap-2">
          {restaurant.rating > 0 && (
            <div className="flex items-center gap-0.5">
              <Star size={10} fill="#F59E0B" style={{ color: "#F59E0B" }} />
              <span
                className="text-xs font-semibold tabular-nums"
                style={{ color: "#F59E0B" }}
              >
                {restaurant.rating.toFixed(1)}
              </span>
            </div>
          )}
          <span className="text-xs" style={{ color: "rgba(255,255,255,0.6)" }}>
            {restaurant.distance}
          </span>
        </div>
      </div>
    </div>
  );
}
