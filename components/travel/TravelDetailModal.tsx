"use client";

import { X, Edit2, Trash2, MapPin, Calendar, FileText } from "lucide-react";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import type { TravelPlace } from "@/lib/travel-shared";
import { CONTINENT_LABELS, type TravelContinent } from "@/lib/travel-shared";

interface TravelDetailModalProps {
  place: TravelPlace;
  onClose: () => void;
  onEdit: (place: TravelPlace) => void;
  onDelete: (id: string) => void;
}

export default function TravelDetailModal({ place, onClose, onEdit, onDelete }: TravelDetailModalProps) {
  function handleDelete() {
    if (confirm(`"${place.city}" 여행 기록을 삭제할까요?`)) {
      onDelete(place.id);
    }
  }

  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "1rem",
        background: "rgba(0,0,0,0.6)",
        backdropFilter: "blur(4px)",
      }}
    >
      <div
        style={{
          background: "var(--bg-card)",
          border: "1px solid var(--border)",
          borderRadius: 20,
          width: "100%",
          maxWidth: 440,
          maxHeight: "90vh",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 24px 64px rgba(0,0,0,0.4)",
        }}
      >
        {/* 대표 사진 */}
        {place.photo_url ? (
          <div style={{ position: "relative", height: 220, flexShrink: 0 }}>
            <img
              src={place.photo_url}
              alt={`${place.city} 여행`}
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
            <div
              style={{
                position: "absolute",
                inset: 0,
                background: "linear-gradient(to top, rgba(0,0,0,0.5) 0%, transparent 60%)",
              }}
            />
            <button
              onClick={onClose}
              style={{
                position: "absolute",
                top: 12,
                right: 12,
                background: "rgba(0,0,0,0.5)",
                border: "none",
                borderRadius: "50%",
                width: 32,
                height: 32,
                cursor: "pointer",
                color: "#fff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <X size={16} />
            </button>
          </div>
        ) : (
          <div
            style={{
              height: 80,
              background: "linear-gradient(135deg, rgba(16,185,129,0.2), rgba(5,150,105,0.1))",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "0 1.25rem",
              flexShrink: 0,
            }}
          >
            <MapPin size={28} style={{ color: "var(--accent-emerald, #10b981)" }} />
            <button
              onClick={onClose}
              style={{
                background: "var(--bg-base)",
                border: "1px solid var(--border)",
                borderRadius: "50%",
                width: 32,
                height: 32,
                cursor: "pointer",
                color: "var(--text-primary)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <X size={16} />
            </button>
          </div>
        )}

        {/* 내용 */}
        <div style={{ padding: "1.25rem", overflowY: "auto", flex: 1 }}>
          <h2 style={{ margin: "0 0 0.25rem", fontSize: "1.4rem", fontWeight: 800, color: "var(--text-primary)" }}>
            {place.city}
          </h2>
          <p style={{ margin: 0, fontSize: "0.9rem", color: "var(--text-secondary)" }}>
            {place.country}
            {place.continent && ` · ${CONTINENT_LABELS[place.continent as TravelContinent] ?? place.continent}`}
          </p>

          <div style={{ margin: "1rem 0", display: "flex", flexDirection: "column", gap: "0.6rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <Calendar size={15} style={{ color: "var(--accent-emerald, #10b981)", flexShrink: 0 }} />
              <span style={{ fontSize: "0.85rem", color: "var(--text-primary)" }}>
                {format(new Date(place.travel_date), "yyyy년 MM월 dd일 (eee)", { locale: ko })}
              </span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <MapPin size={15} style={{ color: "var(--accent-emerald, #10b981)", flexShrink: 0 }} />
              <span style={{ fontSize: "0.82rem", color: "var(--text-secondary)" }}>
                {place.lat.toFixed(4)}°N, {place.lng.toFixed(4)}°E
              </span>
            </div>
          </div>

          {place.note && (
            <div
              style={{
                background: "var(--bg-base)",
                borderRadius: 10,
                padding: "0.75rem 1rem",
                border: "1px solid var(--border)",
              }}
            >
              <div style={{ display: "flex", alignItems: "flex-start", gap: "0.5rem" }}>
                <FileText size={14} style={{ color: "var(--accent-emerald, #10b981)", flexShrink: 0, marginTop: 2 }} />
                <p style={{ margin: 0, fontSize: "0.85rem", color: "var(--text-primary)", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
                  {place.note}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* 액션 버튼 */}
        <div
          style={{
            padding: "0.875rem 1.25rem",
            borderTop: "1px solid var(--border)",
            display: "flex",
            gap: "0.5rem",
            flexShrink: 0,
          }}
        >
          <button
            onClick={handleDelete}
            style={{
              flex: 1,
              padding: "0.6rem",
              borderRadius: 10,
              border: "1px solid var(--border)",
              background: "transparent",
              color: "#ef4444",
              cursor: "pointer",
              fontWeight: 600,
              fontSize: "0.85rem",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "0.4rem",
            }}
          >
            <Trash2 size={15} />
            삭제
          </button>
          <button
            onClick={() => onEdit(place)}
            style={{
              flex: 2,
              padding: "0.6rem",
              borderRadius: 10,
              border: "none",
              background: "var(--accent-emerald, #10b981)",
              color: "#fff",
              cursor: "pointer",
              fontWeight: 700,
              fontSize: "0.85rem",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "0.4rem",
            }}
          >
            <Edit2 size={15} />
            수정
          </button>
        </div>
      </div>
    </div>
  );
}
