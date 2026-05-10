"use client";

import { MapPin, Filter, ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import type { TravelPlace, TravelContinent, KoreaRegion } from "@/lib/travel-shared";
import { CONTINENTS, CONTINENT_LABELS, KOREA_REGIONS, KOREA_REGION_LABELS } from "@/lib/travel-shared";

interface TravelSidebarProps {
  places: TravelPlace[];
  filteredPlaces: TravelPlace[];
  selectedYears: number[];
  selectedContinents: TravelContinent[];
  selectedRegions: KoreaRegion[];
  activeMapTab: "world" | "domestic";
  onYearToggle: (year: number) => void;
  onContinentToggle: (continent: TravelContinent) => void;
  onRegionToggle: (region: KoreaRegion) => void;
  onYearReset: () => void;
  onContinentReset: () => void;
  onRegionReset: () => void;
  onPlaceClick: (place: TravelPlace) => void;
  highlightedId?: string | null;
}

export default function TravelSidebar({
  places,
  filteredPlaces,
  selectedYears,
  selectedContinents,
  selectedRegions,
  activeMapTab,
  onYearToggle,
  onContinentToggle,
  onRegionToggle,
  onYearReset,
  onContinentReset,
  onRegionReset,
  onPlaceClick,
  highlightedId,
}: TravelSidebarProps) {
  const [filterOpen, setFilterOpen] = useState(true);

  const allYears = [...new Set(places.map((p) => new Date(p.travel_date).getFullYear()))].sort((a, b) => b - a);

  const isFiltered = selectedYears.length > 0 || selectedContinents.length > 0 || selectedRegions.length > 0;

  return (
    <aside
      className="travel-sidebar-panel"
      style={{
        width: "100%",
        display: "flex",
        flexDirection: "column",
        gap: "0.75rem",
      }}
    >
      {/* 필터 */}
      <div
        style={{
          background: "var(--bg-card)",
          border: "1px solid var(--border)",
          borderRadius: 10,
          padding: "0.75rem",
          flexShrink: 0,
        }}
      >
        <button
          onClick={() => setFilterOpen((v) => !v)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.4rem",
            background: "none",
            border: "none",
            cursor: "pointer",
            color: "var(--text-primary)",
            fontWeight: 600,
            fontSize: "0.82rem",
            width: "100%",
            justifyContent: "space-between",
            padding: 0,
          }}
        >
          <span style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
            <Filter size={14} />
            필터
            {isFiltered && (
              <span style={{ color: "var(--accent-emerald, #10b981)", fontSize: "0.72rem" }}>
                적용중
              </span>
            )}
          </span>
          {filterOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>

        {filterOpen && (
          <div style={{ marginTop: "0.75rem", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            {allYears.length > 0 && (
              <div>
                <p style={{ fontSize: "0.72rem", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "0.35rem", margin: "0 0 0.35rem" }}>
                  연도
                </p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "0.3rem" }}>
                  <button
                    onClick={onYearReset}
                    style={{
                      padding: "2px 10px",
                      borderRadius: 999,
                      fontSize: "0.75rem",
                      fontWeight: 600,
                      cursor: "pointer",
                      border: "1px solid",
                      borderColor: selectedYears.length === 0 ? "var(--accent-emerald, #10b981)" : "var(--border)",
                      background: selectedYears.length === 0 ? "var(--accent-emerald, #10b981)" : "transparent",
                      color: selectedYears.length === 0 ? "#fff" : "var(--text-secondary)",
                      transition: "all 0.15s",
                    }}
                  >
                    전체
                  </button>
                  {allYears.map((y) => (
                    <button
                      key={y}
                      onClick={() => onYearToggle(y)}
                      style={{
                        padding: "2px 10px",
                        borderRadius: 999,
                        fontSize: "0.75rem",
                        fontWeight: 600,
                        cursor: "pointer",
                        border: "1px solid",
                        borderColor: selectedYears.includes(y) ? "var(--accent-emerald, #10b981)" : "var(--border)",
                        background: selectedYears.includes(y) ? "var(--accent-emerald, #10b981)" : "transparent",
                        color: selectedYears.includes(y) ? "#fff" : "var(--text-secondary)",
                        transition: "all 0.15s",
                      }}
                    >
                      {y}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {activeMapTab === "world" && (
              <div>
                <p style={{ fontSize: "0.72rem", fontWeight: 600, color: "var(--text-secondary)", margin: "0 0 0.35rem" }}>
                  대륙
                </p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "0.3rem" }}>
                  <button
                    onClick={onContinentReset}
                    style={{
                      padding: "2px 10px",
                      borderRadius: 999,
                      fontSize: "0.75rem",
                      fontWeight: 600,
                      cursor: "pointer",
                      border: "1px solid",
                      borderColor: selectedContinents.length === 0 ? "var(--accent-emerald, #10b981)" : "var(--border)",
                      background: selectedContinents.length === 0 ? "var(--accent-emerald, #10b981)" : "transparent",
                      color: selectedContinents.length === 0 ? "#fff" : "var(--text-secondary)",
                      transition: "all 0.15s",
                    }}
                  >
                    전체
                  </button>
                  {CONTINENTS.map((c) => (
                    <button
                      key={c}
                      onClick={() => onContinentToggle(c)}
                      style={{
                        padding: "2px 10px",
                        borderRadius: 999,
                        fontSize: "0.75rem",
                        fontWeight: 600,
                        cursor: "pointer",
                        border: "1px solid",
                        borderColor: selectedContinents.includes(c) ? "var(--accent-emerald, #10b981)" : "var(--border)",
                        background: selectedContinents.includes(c) ? "var(--accent-emerald, #10b981)" : "transparent",
                        color: selectedContinents.includes(c) ? "#fff" : "var(--text-secondary)",
                        transition: "all 0.15s",
                      }}
                    >
                      {CONTINENT_LABELS[c]}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {activeMapTab === "domestic" && (
              <div>
                <p style={{ fontSize: "0.72rem", fontWeight: 600, color: "var(--text-secondary)", margin: "0 0 0.35rem" }}>
                  지역
                </p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "0.3rem" }}>
                  <button
                    onClick={onRegionReset}
                    style={{
                      padding: "2px 10px",
                      borderRadius: 999,
                      fontSize: "0.75rem",
                      fontWeight: 600,
                      cursor: "pointer",
                      border: "1px solid",
                      borderColor: selectedRegions.length === 0 ? "var(--accent-emerald, #10b981)" : "var(--border)",
                      background: selectedRegions.length === 0 ? "var(--accent-emerald, #10b981)" : "transparent",
                      color: selectedRegions.length === 0 ? "#fff" : "var(--text-secondary)",
                      transition: "all 0.15s",
                    }}
                  >
                    전체
                  </button>
                  {KOREA_REGIONS.map((r) => (
                    <button
                      key={r}
                      onClick={() => onRegionToggle(r)}
                      style={{
                        padding: "2px 10px",
                        borderRadius: 999,
                        fontSize: "0.75rem",
                        fontWeight: 600,
                        cursor: "pointer",
                        border: "1px solid",
                        borderColor: selectedRegions.includes(r) ? "var(--accent-emerald, #10b981)" : "var(--border)",
                        background: selectedRegions.includes(r) ? "var(--accent-emerald, #10b981)" : "transparent",
                        color: selectedRegions.includes(r) ? "#fff" : "var(--text-secondary)",
                        transition: "all 0.15s",
                      }}
                    >
                      {KOREA_REGION_LABELS[r]}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 장소 목록 - 내부 스크롤 없이 전체 항목 노출 */}
      <div
        className="travel-record-list"
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "0.4rem",
        }}
      >
        {filteredPlaces.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              color: "var(--text-secondary)",
              fontSize: "0.82rem",
              padding: "2rem 0",
            }}
          >
            {places.length === 0 ? (
              <>
                <MapPin size={32} style={{ margin: "0 auto 0.5rem", opacity: 0.3 }} />
                <p>아직 기록된 여행이 없어요</p>
                <p style={{ fontSize: "0.75rem", marginTop: "0.25rem" }}>+ 추가 버튼으로 시작하세요</p>
              </>
            ) : (
              "필터에 맞는 여행지가 없어요"
            )}
          </div>
        ) : (
          filteredPlaces.map((place) => (
            <button
              key={place.id}
              onClick={() => onPlaceClick(place)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.6rem",
                padding: "0.6rem 0.75rem",
                borderRadius: 10,
                border: "1px solid",
                borderColor: highlightedId === place.id ? "var(--accent-emerald, #10b981)" : "var(--border)",
                background: highlightedId === place.id ? "rgba(16,185,129,0.08)" : "var(--bg-card)",
                cursor: "pointer",
                textAlign: "left",
                width: "100%",
                transition: "all 0.15s",
              }}
            >
              {place.photo_url ? (
                <img
                  src={place.photo_url}
                  alt={place.city}
                  style={{ width: 40, height: 40, borderRadius: 8, objectFit: "cover", flexShrink: 0 }}
                />
              ) : (
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 8,
                    background: "rgba(16,185,129,0.15)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <MapPin size={18} style={{ color: "var(--accent-emerald, #10b981)" }} />
                </div>
              )}
              <div style={{ flex: 1, minWidth: 0 }}>
                <p
                  style={{
                    fontWeight: 700,
                    fontSize: "0.85rem",
                    color: "var(--text-primary)",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    margin: 0,
                  }}
                >
                  {place.city}
                </p>
                <p
                  style={{
                    fontSize: "0.72rem",
                    color: "var(--text-secondary)",
                    margin: "1px 0 0",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {activeMapTab === "domestic" ? (place.province ?? place.country) : place.country} · {format(new Date(place.travel_date), "yyyy.MM", { locale: ko })}
                </p>
              </div>
            </button>
          ))
        )}
      </div>
    </aside>
  );
}
