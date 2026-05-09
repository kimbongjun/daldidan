"use client";

import { MapPin, Plus } from "lucide-react";
import Image from "next/image";
import { format, parseISO } from "date-fns";
import { ko } from "date-fns/locale";
import { useTravelStore } from "@/store/useTravelStore";
import { CONTINENTS, CONTINENT_LABELS } from "@/lib/travel-shared";
import type { TravelPlace, TravelContinent } from "@/lib/travel-shared";

const ACCENT = "#10B981";

interface TravelPanelProps {
  places: TravelPlace[];
  filteredPlaces: TravelPlace[];
  onPlaceClick: (place: TravelPlace) => void;
  onAddClick: () => void;
}

export default function TravelPanel({ places, filteredPlaces, onPlaceClick, onAddClick }: TravelPanelProps) {
  const { filter, setFilter } = useTravelStore();

  const years = Array.from(new Set(places.map((p) => new Date(p.travel_date).getFullYear())))
    .sort((a, b) => b - a);

  const uniqueCountries = new Set(places.map((p) => p.country)).size;

  const toggleYear = (year: number) => {
    const next = filter.years.includes(year)
      ? filter.years.filter((y) => y !== year)
      : [...filter.years, year];
    setFilter({ years: next });
  };

  const toggleContinent = (continent: TravelContinent) => {
    const next = filter.continents.includes(continent)
      ? filter.continents.filter((c) => c !== continent)
      : [...filter.continents, continent];
    setFilter({ continents: next });
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        background: "var(--bg-card)",
        borderRight: "1px solid var(--border)",
      }}
    >
      {/* 헤더 */}
      <div style={{ padding: "1.25rem 1rem 0.75rem", borderBottom: "1px solid var(--border)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.5rem" }}>
          <div>
            <p style={{ color: ACCENT, fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: "0.1em", margin: 0 }}>여행</p>
            <h2 style={{ color: "var(--text-primary)", fontSize: "1.1rem", fontWeight: 800, margin: 0 }}>여행 지도</h2>
          </div>
          <button
            onClick={onAddClick}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.3rem",
              background: ACCENT,
              color: "#fff",
              border: "none",
              borderRadius: 8,
              padding: "0.45rem 0.85rem",
              fontSize: "0.8rem",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            <Plus size={14} />
            추가
          </button>
        </div>
        <p style={{ color: "var(--text-muted)", fontSize: "0.78rem", margin: 0 }}>
          <span style={{ color: ACCENT, fontWeight: 700 }}>{uniqueCountries}</span>개국 방문
          &nbsp;·&nbsp;총 <span style={{ color: ACCENT, fontWeight: 700 }}>{places.length}</span>곳
        </p>
      </div>

      {/* 필터 */}
      <div style={{ padding: "0.75rem 1rem", borderBottom: "1px solid var(--border)" }}>
        {years.length > 0 && (
          <div style={{ marginBottom: "0.75rem" }}>
            <p style={{ color: "var(--text-muted)", fontSize: "0.72rem", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "0.4rem" }}>연도</p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.35rem" }}>
              {years.map((year) => (
                <label key={year} style={{ display: "flex", alignItems: "center", gap: "0.3rem", cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={filter.years.includes(year)}
                    onChange={() => toggleYear(year)}
                    style={{ accentColor: ACCENT, width: 13, height: 13 }}
                  />
                  <span style={{ color: "var(--text-primary)", fontSize: "0.8rem" }}>{year}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        <div>
          <p style={{ color: "var(--text-muted)", fontSize: "0.72rem", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "0.4rem" }}>대륙</p>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.3rem" }}>
            {CONTINENTS.map((cont) => (
              <label key={cont} style={{ display: "flex", alignItems: "center", gap: "0.4rem", cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={filter.continents.includes(cont)}
                  onChange={() => toggleContinent(cont)}
                  style={{ accentColor: ACCENT, width: 13, height: 13 }}
                />
                <span style={{ color: "var(--text-primary)", fontSize: "0.82rem" }}>{CONTINENT_LABELS[cont]}</span>
              </label>
            ))}
          </div>
        </div>
      </div>

      {/* 목록 */}
      <div style={{ flex: 1, overflowY: "auto", padding: "0.5rem 0.75rem" }}>
        {filteredPlaces.length === 0 ? (
          <div style={{ textAlign: "center", padding: "2rem 0", color: "var(--text-muted)", fontSize: "0.85rem" }}>
            <MapPin size={32} style={{ margin: "0 auto 0.5rem", opacity: 0.3, display: "block" }} />
            여행지가 없습니다
          </div>
        ) : (
          filteredPlaces.map((place) => (
            <button
              key={place.id}
              onClick={() => onPlaceClick(place)}
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                gap: "0.65rem",
                padding: "0.6rem 0.5rem",
                borderRadius: 8,
                border: "none",
                background: "transparent",
                cursor: "pointer",
                textAlign: "left",
                transition: "background 0.15s",
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "var(--bg-base)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "transparent"; }}
            >
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 8,
                  overflow: "hidden",
                  flexShrink: 0,
                  background: "var(--bg-base)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  position: "relative",
                }}
              >
                {place.photo_url ? (
                  <Image
                    src={place.photo_url}
                    alt={`${place.city} 사진`}
                    fill
                    sizes="44px"
                    style={{ objectFit: "cover" }}
                  />
                ) : (
                  <MapPin size={18} style={{ color: ACCENT, opacity: 0.6 }} />
                )}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{
                  color: "var(--text-primary)",
                  fontSize: "0.85rem",
                  fontWeight: 600,
                  margin: 0,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}>
                  {place.city}, {place.country}
                </p>
                <p style={{ color: "var(--text-muted)", fontSize: "0.74rem", margin: "0.1rem 0 0" }}>
                  {format(parseISO(place.travel_date), "yyyy.MM.dd", { locale: ko })}
                </p>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
