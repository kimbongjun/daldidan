"use client";

import { useEffect, useState, useMemo } from "react";
import Image from "next/image";
import { MapPin, Globe, Plus, ArrowRight } from "lucide-react";
import Link from "next/link";
import type { TravelPlace } from "@/lib/travel-shared";
import TravelDetailModal from "@/components/travel/TravelDetailModal";
import { useTravelStore } from "@/store/useTravelStore";
import { createClient } from "@/lib/supabase/client";
import type { AuthUser as User } from "@supabase/supabase-js";

export default function TravelWidget() {
  const { places, setPlaces } = useTravelStore();
  const [loading, setLoading] = useState(true);
  const [selectedPlace, setSelectedPlace] = useState<TravelPlace | null>(null);
  const [activeTab, setActiveTab] = useState<"all" | "world" | "domestic">("all");
  // undefined = 인증 상태 미확인, null = 비로그인
  const [user, setUser] = useState<User | null | undefined>(undefined);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => setUser(data.user ?? null));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (user === undefined) return; // 인증 상태 확인 전 대기
    // 비로그인: 인증이 필요한 /api/travel 호출 없이 빈 상태로 둔다 (401 콘솔 오류 방지)
    if (!user) {
      setPlaces([]);
      setLoading(false);
      return;
    }
    void (async () => {
      try {
        const res = await fetch("/api/travel");
        if (res.ok) {
          const data = await res.json() as TravelPlace[];
          setPlaces(data);
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [user, setPlaces]);

  const displayPlaces = useMemo(() => {
    if (activeTab === "world") return places.filter((p) => !p.is_domestic);
    if (activeTab === "domestic") return places.filter((p) => p.is_domestic);
    return places;
  }, [places, activeTab]);

  const statA = activeTab === "domestic"
    ? { label: "국내 여행지", value: String(displayPlaces.length) }
    : { label: activeTab === "world" ? "해외 여행지" : "전체 여행지", value: String(displayPlaces.length) };

  const statB = activeTab === "domestic"
    ? { label: "방문 지역", value: String(new Set(displayPlaces.map((p) => p.province).filter(Boolean)).size) }
    : { label: "방문 국가", value: String(new Set(displayPlaces.map((p) => p.country)).size) };

  return (
    <div
      className="bento-card"
      style={{
        background: "var(--bg-card)",
        border: "1px solid var(--border)",
        borderRadius: 16,
        padding: "1.1rem",
        display: "flex",
        flexDirection: "column",
        gap: "0.75rem",
        height: "100%",
        minHeight: 200,
        boxSizing: "border-box",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              background: "rgba(16,185,129,0.15)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Globe size={17} style={{ color: "var(--accent-emerald, #10b981)" }} />
          </div>
          <span style={{ fontWeight: 700, fontSize: "0.9rem", color: "var(--text-primary)" }}>
            여행 지도
          </span>
        </div>
        <Link
          href="/travel"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.25rem",
            fontSize: "0.75rem",
            color: "var(--accent-emerald, #10b981)",
            textDecoration: "none",
            fontWeight: 600,
          }}
        >
          전체보기 <ArrowRight size={13} />
        </Link>
      </div>

      {/* 탭 */}
      <div style={{ display: "flex", gap: 0, background: "var(--bg-base)", borderRadius: 999, padding: 2 }}>
        {(["all", "world", "domestic"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              flex: 1, padding: "3px 0", borderRadius: 999, border: "none",
              fontSize: "0.7rem", fontWeight: activeTab === tab ? 700 : 400,
              cursor: "pointer",
              background: activeTab === tab ? "var(--bg-card)" : "transparent",
              color: activeTab === tab ? "var(--text-primary)" : "var(--text-secondary)",
              boxShadow: activeTab === tab ? "0 1px 4px rgba(0,0,0,0.12)" : "none",
              transition: "all 0.15s",
            }}
          >
            {tab === "all" ? "전체" : tab === "world" ? "해외" : "국내"}
          </button>
        ))}
      </div>

      <div style={{ display: "flex", gap: "0.5rem" }}>
        {[statA, statB].map(({ label, value }) => (
          <div
            key={label}
            style={{
              flex: 1,
              background: "rgba(16,185,129,0.08)",
              borderRadius: 10,
              padding: "0.5rem 0.75rem",
              textAlign: "center",
            }}
          >
            <p style={{ margin: 0, fontSize: "1.3rem", fontWeight: 800, color: "var(--accent-emerald, #10b981)" }}>
              {loading ? "—" : value}
            </p>
            <p style={{ margin: 0, fontSize: "0.7rem", color: "var(--text-secondary)", marginTop: 1 }}>
              {label}
            </p>
          </div>
        ))}
      </div>

      <div style={{ flex: 1, minHeight: 0, overflowY: "auto", display: "flex", flexDirection: "column", gap: "0.35rem", maxHeight: 145 }}>
        {loading ? (
          [1, 2, 3].map((i) => (
            <div
              key={i}
              style={{
                height: 36,
                borderRadius: 8,
                background: "var(--bg-base)",
                animation: "pulse 1.5s ease-in-out infinite",
              }}
            />
          ))
        ) : displayPlaces.length === 0 ? (
          <div
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: "0.35rem",
              borderRadius: 10,
              border: "2px dashed var(--border)",
              textDecoration: "none",
              color: "var(--text-secondary)",
              fontSize: "0.8rem",
              padding: "1rem",
            }}
          >
            <Plus size={20} style={{ color: "var(--accent-emerald, #10b981)" }} />
            첫 여행지를 공유해보세요
          </div>
        ) : (
          displayPlaces.map((place) => (
            <button
              key={place.id}
              type="button"
              onClick={() => setSelectedPlace(place)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                padding: "0.4rem 0.5rem",
                borderRadius: 8,
                background: "var(--bg-base)",
                border: "1px solid var(--border)",
                width: "100%",
                cursor: "pointer",
                textAlign: "left",
              }}
            >
              {place.photo_url ? (
                <span style={{ position: "relative", width: 28, height: 28, borderRadius: 6, overflow: "hidden", flexShrink: 0 }}>
                  <Image
                    src={place.photo_url}
                    alt={place.city}
                    fill
                    sizes="28px"
                    style={{ objectFit: "cover" }}
                  />
                </span>
              ) : (
                <div
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 6,
                    background: "rgba(16,185,129,0.15)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <MapPin size={13} style={{ color: "var(--accent-emerald, #10b981)" }} />
                </div>
              )}
              <div style={{ flex: 1, minWidth: 0 }}>
                <p
                  style={{
                    margin: 0,
                    fontSize: "0.8rem",
                    fontWeight: 600,
                    color: "var(--text-primary)",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {place.city}
                </p>
                <p
                  style={{
                    margin: 0,
                    fontSize: "0.68rem",
                    color: "var(--text-secondary)",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {place.is_domestic ? (place.province ?? place.country) : place.country} · {place.travel_date.slice(0, 7)}
                </p>
              </div>
            </button>
          ))
        )}
      </div>

      {selectedPlace && (
        <TravelDetailModal
          place={selectedPlace}
          onClose={() => setSelectedPlace(null)}
          onEdit={() => undefined}
          onDelete={() => undefined}
        />
      )}

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </div>
  );
}
