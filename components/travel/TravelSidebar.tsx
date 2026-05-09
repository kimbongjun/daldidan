"use client";

import { MapPin, Filter, ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import type { TravelPlace, TravelContinent } from "@/lib/travel-shared";
import { CONTINENTS, CONTINENT_LABELS } from "@/lib/travel-shared";

interface TravelSidebarProps {
  places: TravelPlace[];
  filteredPlaces: TravelPlace[];
  selectedYears: number[];
  selectedContinents: TravelContinent[];
  onYearToggle: (year: number) => void;
  onContinentToggle: (continent: TravelContinent) => void;
  onPlaceClick: (place: TravelPlace) => void;
  onAddClick: () => void;
  highlightedId?: string | null;
}

export default function TravelSidebar({
  places,
  filteredPlaces,
  selectedYears,
  selectedContinents,
  onYearToggle,
  onContinentToggle,
  onPlaceClick,
  onAddClick,
  highlightedId,
}: TravelSidebarProps) {
  const [filterOpen, setFilterOpen] = useState(true);

  const allYears = [...new Set(places.map((p) => new Date(p.travel_date).getFullYear()))].sort((a, b) => b - a);

  const isFiltered = selectedYears.length > 0 || selectedContinents.length > 0;

  return (
    <aside
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        gap: "0.75rem",
        overflowY: "auto",
      }}
    >
      {/* 헤더 */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <MapPin size={18} style={{ color: "var(--accent-emerald, #10b981)" }} />
          <span style={{ fontWeight: 700, fontSize: "0.95rem", color: "var(--text-primary)" }}>
            여행 기록
          </span>
          <span
            style={{
              background: "var(--accent-emerald, #10b981)",
              color: "#fff",
              borderRadius: 999,
              fontSize: "0.7rem",
              fontWeight: 700,
              padding: "1px 7px",
            }}
          >
            {places.length}
          </span>
        </div>
        <button
          onClick={onAddClick}
          style={{
            background: "var(--accent-emerald, #10b981)",
            color: "#fff",
            border: "none",
            borderRadius: 8,
            padding: "5px 12px",
            fontSize: "0.8rem",
            fontWeight: 600,
            cursor: "pointer",
            whiteSpace: "nowrap",
          }}
        >
          + 추가
        </button>
      </div>

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

            <div>
              <p style={{ fontSize: "0.72rem", fontWeight: 600, color: "var(--text-secondary)", margin: "0 0 0.35rem" }}>
                대륙
              </p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.3rem" }}>
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
          </div>
        )}
      </div>

      {/* 장소 목록 */}
      <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: "0.4rem" }}>
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
                  {place.country} · {format(new Date(place.travel_date), "yyyy.MM", { locale: ko })}
                </p>
              </div>
            </button>
          ))
        )}
      </div>
    </aside>
  );
}
