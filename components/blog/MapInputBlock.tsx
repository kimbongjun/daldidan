"use client";

import { useState, useRef, useEffect } from "react";
import { Node, mergeAttributes } from "@tiptap/core";
import { NodeViewWrapper, ReactNodeViewRenderer } from "@tiptap/react";
import type { NodeViewProps } from "@tiptap/react";
import {
  CheckCircle2,
  LoaderCircle,
  MapPin,
  MapPinned,
  Search,
  X,
} from "lucide-react";
import { createGoogleMapEmbedSrc } from "@/lib/blog-embeds";

interface PlaceCandidate {
  id: string;
  name: string;
  formattedAddress: string;
  lat: number;
  lng: number;
}

function MapInputView({ editor, getPos, deleteNode }: NodeViewProps) {
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [candidates, setCandidates] = useState<PlaceCandidate[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [showPreview, setShowPreview] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 50);
  }, []);

  const selectedPlace = candidates.find((p) => p.id === selectedId) ?? null;
  const embedSrc = selectedPlace
    ? createGoogleMapEmbedSrc(selectedPlace.formattedAddress)
    : null;

  const search = async () => {
    const q = query.trim();
    if (!q) return;
    setSearching(true);
    setError("");
    setCandidates([]);
    setSelectedId(null);
    setShowPreview(false);

    try {
      const res = await fetch("/api/maps/place-search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: q }),
      });
      const payload = await res.json() as { places?: PlaceCandidate[]; error?: string };
      if (!res.ok) throw new Error(payload.error ?? "검색에 실패했습니다.");

      const places = payload.places ?? [];
      setCandidates(places);
      setSelectedId(places[0]?.id ?? null);
      if (places.length === 0) setError("검색된 장소가 없습니다. 더 구체적으로 입력해보세요.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "검색에 실패했습니다.");
    } finally {
      setSearching(false);
    }
  };

  const insertMap = () => {
    if (!selectedPlace || !embedSrc) {
      setError("NEXT_PUBLIC_GOOGLE_MAPS_EMBED_API_KEY 환경 변수가 필요합니다.");
      return;
    }
    const pos = typeof getPos === "function" ? getPos() : null;
    if (pos == null) return;

    editor
      .chain()
      .deleteRange({ from: pos, to: pos + 1 })
      .insertContentAt(pos, {
        type: "embedBlock",
        attrs: {
          kind: "map",
          src: embedSrc,
          title: `${selectedPlace.name} 지도`,
        },
      })
      .run();
  };

  return (
    <NodeViewWrapper>
      <div
        contentEditable={false}
        style={{
          margin: "1rem 0",
          borderRadius: "1.25rem",
          border: "2px solid rgba(234,88,12,0.3)",
          background: "var(--bg-input)",
          overflow: "hidden",
          userSelect: "none",
        }}
      >
        {/* 헤더 */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0.75rem 1rem",
            borderBottom: "1px solid var(--border)",
            background: "rgba(234,88,12,0.06)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <MapPinned size={15} style={{ color: "#EA580C" }} />
            <span style={{ fontSize: "0.8rem", fontWeight: 700, color: "#EA580C", letterSpacing: "0.04em" }}>
              Google 지도 삽입
            </span>
          </div>
          <button
            type="button"
            onClick={() => deleteNode()}
            style={{
              background: "transparent",
              border: "none",
              cursor: "pointer",
              color: "var(--text-muted)",
              display: "flex",
              alignItems: "center",
              padding: "0.25rem",
              borderRadius: "0.5rem",
            }}
          >
            <X size={15} />
          </button>
        </div>

        {/* 검색 입력 */}
        <div style={{ padding: "0.875rem 1rem", display: "flex", gap: "0.5rem" }}>
          <div
            style={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              background: "var(--bg-card)",
              border: "1px solid var(--border)",
              borderRadius: "0.875rem",
              padding: "0.55rem 0.875rem",
              minWidth: 0,
            }}
          >
            <Search size={14} style={{ color: "var(--text-muted)", flexShrink: 0 }} />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                e.stopPropagation();
                if (e.key === "Enter") { e.preventDefault(); search(); }
              }}
              placeholder="장소명 또는 주소 입력 (예: 경복궁, 여의도 한강공원)"
              style={{
                flex: 1,
                background: "transparent",
                border: "none",
                outline: "none",
                fontSize: "0.875rem",
                color: "var(--text-primary)",
                minWidth: 0,
              }}
            />
          </div>
          <button
            type="button"
            onClick={search}
            disabled={searching || !query.trim()}
            style={{
              background: "#EA580C",
              color: "#fff",
              border: "none",
              borderRadius: "0.875rem",
              padding: "0.55rem 1rem",
              fontSize: "0.8rem",
              fontWeight: 700,
              cursor: searching || !query.trim() ? "not-allowed" : "pointer",
              flexShrink: 0,
              display: "flex",
              alignItems: "center",
              gap: "0.35rem",
              opacity: searching || !query.trim() ? 0.5 : 1,
            }}
          >
            {searching
              ? <><LoaderCircle size={13} className="animate-spin" />검색 중</>
              : "검색"}
          </button>
        </div>

        {/* 에러 */}
        {error && (
          <div style={{ padding: "0 1rem 0.75rem", fontSize: "0.8rem", color: "#F43F5E" }}>
            {error}
          </div>
        )}

        {/* 결과 목록 */}
        {candidates.length > 0 && (
          <div style={{ padding: "0 1rem 0.875rem", display: "flex", flexDirection: "column", gap: "0.4rem" }}>
            <p style={{ fontSize: "0.7rem", fontWeight: 600, color: "var(--text-muted)", marginBottom: "0.25rem", letterSpacing: "0.06em", textTransform: "uppercase" }}>
              검색 결과 {candidates.length}개 — 삽입할 장소를 선택하세요
            </p>
            {candidates.map((place) => {
              const selected = place.id === selectedId;
              return (
                <button
                  key={place.id}
                  type="button"
                  onClick={() => { setSelectedId(place.id); setShowPreview(false); }}
                  style={{
                    background: selected ? "rgba(234,88,12,0.1)" : "var(--bg-card)",
                    border: `1px solid ${selected ? "rgba(234,88,12,0.4)" : "var(--border)"}`,
                    borderRadius: "0.875rem",
                    padding: "0.6rem 0.875rem",
                    cursor: "pointer",
                    textAlign: "left",
                    display: "flex",
                    alignItems: "flex-start",
                    justifyContent: "space-between",
                    gap: "0.75rem",
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    <p style={{ fontSize: "0.875rem", fontWeight: 600, color: "var(--text-primary)", margin: 0 }}>
                      {place.name}
                    </p>
                    <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", margin: "0.2rem 0 0", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {place.formattedAddress}
                    </p>
                  </div>
                  {selected
                    ? <CheckCircle2 size={16} style={{ color: "#EA580C", flexShrink: 0, marginTop: 2 }} />
                    : <MapPin size={15} style={{ color: "var(--text-muted)", flexShrink: 0, marginTop: 2 }} />}
                </button>
              );
            })}
          </div>
        )}

        {/* 미리보기 토글 + 삽입 버튼 */}
        {selectedPlace && (
          <div style={{ padding: "0 1rem 1rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            <button
              type="button"
              onClick={() => setShowPreview((v) => !v)}
              style={{
                background: "transparent",
                border: "1px solid var(--border)",
                borderRadius: "0.75rem",
                padding: "0.5rem 0.875rem",
                fontSize: "0.8rem",
                fontWeight: 600,
                color: "var(--text-muted)",
                cursor: "pointer",
                textAlign: "left",
              }}
            >
              {showPreview ? "▲ 미리보기 접기" : "▼ 지도 미리보기"}
            </button>

            {showPreview && embedSrc && (
              <div style={{ borderRadius: "0.875rem", overflow: "hidden", border: "1px solid var(--border)", aspectRatio: "4/3" }}>
                <iframe
                  src={embedSrc}
                  title={`${selectedPlace.name} 미리보기`}
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  style={{ width: "100%", height: "100%", border: 0, display: "block" }}
                  allowFullScreen
                />
              </div>
            )}

            {showPreview && !embedSrc && (
              <p style={{ fontSize: "0.78rem", color: "var(--text-muted)", padding: "0.5rem 0" }}>
                NEXT_PUBLIC_GOOGLE_MAPS_EMBED_API_KEY가 설정되지 않아 미리보기를 표시할 수 없습니다.
              </p>
            )}

            <button
              type="button"
              onClick={insertMap}
              style={{
                background: "#EA580C",
                color: "#fff",
                border: "none",
                borderRadius: "0.875rem",
                padding: "0.65rem 1rem",
                fontSize: "0.875rem",
                fontWeight: 700,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "0.4rem",
              }}
            >
              <MapPinned size={15} />
              &ldquo;{selectedPlace.name}&rdquo; 지도 본문에 삽입
            </button>
          </div>
        )}
      </div>
    </NodeViewWrapper>
  );
}

export const MapInputBlock = Node.create({
  name: "mapInputBlock",
  group: "block",
  atom: true,
  selectable: true,
  draggable: false,

  addAttributes() {
    return {};
  },

  parseHTML() {
    return [];
  },

  renderHTML({ HTMLAttributes }) {
    return ["div", mergeAttributes(HTMLAttributes, { "data-map-input": "true" })];
  },

  addNodeView() {
    return ReactNodeViewRenderer(MapInputView);
  },
});
