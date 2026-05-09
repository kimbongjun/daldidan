"use client";

import { useEffect, useState } from "react";
import { MapPin, Globe, Plus, ArrowRight } from "lucide-react";
import Link from "next/link";
import type { TravelPlace } from "@/lib/travel-shared";
import { useTravelStore } from "@/store/useTravelStore";

export default function TravelWidget() {
  const { places, setPlaces } = useTravelStore();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
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
  }, [setPlaces]);

  const recent = places.slice(0, 3);
  const countryCount = new Set(places.map((p) => p.country)).size;

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
      {/* 헤더 */}
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

      {/* 통계 */}
      <div style={{ display: "flex", gap: "0.5rem" }}>
        {[
          { label: "전체 여행지", value: loading ? "—" : String(places.length) },
          { label: "전체 국가", value: loading ? "—" : String(countryCount) },
        ].map(({ label, value }) => (
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
              {value}
            </p>
            <p style={{ margin: 0, fontSize: "0.7rem", color: "var(--text-secondary)", marginTop: 1 }}>
              {label}
            </p>
          </div>
        ))}
      </div>

      {/* 최근 여행지 */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "0.35rem" }}>
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
        ) : recent.length === 0 ? (
          <Link
            href="/travel"
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
          </Link>
        ) : (
          recent.map((place) => (
            <Link
              key={place.id}
              href="/travel"
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                padding: "0.4rem 0.5rem",
                borderRadius: 8,
                textDecoration: "none",
                background: "var(--bg-base)",
                border: "1px solid var(--border)",
              }}
            >
              {place.photo_url ? (
                <img
                  src={place.photo_url}
                  alt={place.city}
                  style={{ width: 28, height: 28, borderRadius: 6, objectFit: "cover", flexShrink: 0 }}
                />
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
                  {place.country} · {place.travel_date.slice(0, 7)}
                </p>
              </div>
            </Link>
          ))
        )}
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </div>
  );
}
