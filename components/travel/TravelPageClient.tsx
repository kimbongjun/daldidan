"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import dynamic from "next/dynamic";
import { ArrowLeft, Plus } from "lucide-react";
import Link from "next/link";
import type { TravelPlace, TravelContinent, KoreaRegion } from "@/lib/travel-shared";
import { PROVINCE_TO_REGION } from "@/lib/travel-shared";
import { useTravelStore } from "@/store/useTravelStore";
import TravelSidebar from "@/components/travel/TravelSidebar";
import TravelDetailModal from "@/components/travel/TravelDetailModal";
import TravelFormModal from "@/components/travel/TravelFormModal";
import { createClient } from "@/lib/supabase/client";

// ssr:false 동적 로드 — 모듈 preload는 useEffect에서 즉시 시작
const TravelWorldMap = dynamic(
  () => import("@/components/travel/TravelWorldMap"),
  { ssr: false }
);

const TravelKoreaMap = dynamic(
  () => import("@/components/travel/TravelKoreaMap"),
  { ssr: false }
);

export default function TravelPageClient() {
  const {
    places,
    setPlaces,
    isAddModalOpen,
    isDetailModalOpen,
    selectedPlace,
    editingPlace,
    openAddModal,
    closeAddModal,
    openDetailModal,
    closeDetailModal,
    filter,
    setFilter,
    activeMapTab,
    setActiveMapTab,
  } = useTravelStore();
  const [loading, setLoading] = useState(true);
  const [mapReady, setMapReady] = useState(false);
  const [highlightedId, setHighlightedId] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | undefined>(undefined);

  // 페이지 마운트 즉시 지도 모듈 preload — 리스트 노출 중 백그라운드 다운로드
  useEffect(() => {
    void import("@/components/travel/TravelWorldMap");
    void import("@/components/travel/TravelKoreaMap");
  }, []);

  useEffect(() => {
    void (async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setCurrentUserId(user.id);
    })();
  }, []);

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

  const filteredPlaces = useMemo(() => {
    return places
      .filter((p) => {
        // activeMapTab에 따라 domestic/world 분리
        if (activeMapTab === "world" && p.is_domestic) return false;
        if (activeMapTab === "domestic" && !p.is_domestic) return false;
        const year = new Date(p.travel_date).getFullYear();
        if (filter.years.length > 0 && !filter.years.includes(year)) return false;
        if (activeMapTab === "world" && filter.continents.length > 0 && !filter.continents.includes(p.continent as TravelContinent)) return false;
        if (activeMapTab === "domestic" && filter.regions.length > 0) {
          const region = p.province ? PROVINCE_TO_REGION[p.province] : null;
          if (!region || !filter.regions.includes(region)) return false;
        }
        return true;
      })
      .sort((a, b) => new Date(b.travel_date).getTime() - new Date(a.travel_date).getTime());
  }, [places, filter, activeMapTab]);

  const activeContinents = useMemo(() => {
    return [...new Set(
      places
        .filter((p) => !p.is_domestic && p.continent)
        .map((p) => p.continent as TravelContinent),
    )];
  }, [places]);

  const activeProvinces = useMemo(() => {
    return [...new Set(
      places
        .filter((p) => p.is_domestic && p.province)
        .map((p) => p.province!),
    )];
  }, [places]);

  const worldCount = places.filter((p) => !p.is_domestic).length;
  const domesticCount = places.filter((p) => p.is_domestic).length;

  const handlePinClick = useCallback((place: TravelPlace) => {
    setHighlightedId(place.id);
    openDetailModal(place);
  }, [openDetailModal]);

  const handleSave = useCallback((saved: TravelPlace) => {
    setPlaces(
      places.some((p) => p.id === saved.id)
        ? places.map((p) => (p.id === saved.id ? saved : p))
        : [saved, ...places],
    );
    closeAddModal();
    setHighlightedId(saved.id);
  }, [places, setPlaces, closeAddModal]);

  const handleDelete = useCallback(async (id: string) => {
    await fetch(`/api/travel/${id}`, { method: "DELETE" });
    setPlaces(places.filter((p) => p.id !== id));
    closeDetailModal();
    if (highlightedId === id) setHighlightedId(null);
  }, [places, setPlaces, closeDetailModal, highlightedId]);

  const handleEdit = useCallback((place: TravelPlace) => {
    closeDetailModal();
    openAddModal(place);
  }, [closeDetailModal, openAddModal]);

  const handleCloseDetail = useCallback(() => {
    closeDetailModal();
    setHighlightedId(null);
  }, [closeDetailModal]);

  function toggleYear(year: number) {
    const next = filter.years.includes(year)
      ? filter.years.filter((y) => y !== year)
      : [...filter.years, year];
    setFilter({ years: next });
  }

  function toggleContinent(continent: TravelContinent) {
    const next = filter.continents.includes(continent)
      ? filter.continents.filter((c) => c !== continent)
      : [...filter.continents, continent];
    setFilter({ continents: next });
  }

  function toggleRegion(region: KoreaRegion) {
    const next = filter.regions.includes(region)
      ? filter.regions.filter((r) => r !== region)
      : [...filter.regions, region];
    setFilter({ regions: next });
  }

  function resetYearFilter() { setFilter({ years: [] }); }
  function resetContinentFilter() { setFilter({ continents: [] }); }
  function resetRegionFilter() { setFilter({ regions: [] }); }

  return (
    <div className="travel-page-shell">
      {/* 상단 헤더 */}
      <header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "1rem 1.25rem",
          borderBottom: "1px solid var(--border)",
          background: "var(--bg-card)",
          flexShrink: 0,
          gap: "0.75rem",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <Link
            href="/"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 36,
              height: 36,
              borderRadius: "50%",
              border: "1px solid var(--border)",
              color: "var(--text-primary)",
              textDecoration: "none",
              background: "var(--bg-base)",
            }}
          >
            <ArrowLeft size={18} />
          </Link>
          <div>
            <h1 style={{ margin: 0, fontSize: "1.05rem", fontWeight: 800, color: "var(--text-primary)" }}>
              우리의 여행 지도
            </h1>
            <p style={{ margin: 0, fontSize: "0.72rem", color: "var(--text-secondary)" }}>
              {`해외 ${worldCount}곳 · 국내 ${domesticCount}곳`}
            </p>
          </div>
        </div>
        <button
          onClick={() => openAddModal()}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.4rem",
            padding: "0.5rem 1rem",
            borderRadius: 10,
            border: "none",
            background: "var(--accent-emerald, #10b981)",
            color: "#fff",
            fontWeight: 700,
            fontSize: "0.85rem",
            cursor: "pointer",
            whiteSpace: "nowrap",
          }}
        >
          <Plus size={16} />
          <span className="hide-xs">여행 추가</span>
        </button>
      </header>

      <div className="travel-layout">
        {/* 1순위: 지도 영역 — 항상 상단 표시, 로딩 중엔 오버레이 */}
        <div className="travel-globe-wrap">
          {/* 세계/국내 탭 — 지도 위 상단 중앙 */}
          <div style={{
            position: "absolute", top: 12, left: "50%", transform: "translateX(-50%)",
            zIndex: 10, display: "flex", gap: 0,
            background: "rgba(0,0,0,0.5)", backdropFilter: "blur(8px)",
            borderRadius: 999, padding: 3,
          }}>
            {(["world", "domestic"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => {
                  setActiveMapTab(tab);
                  setFilter({ years: [], continents: [], regions: [] });
                  setMapReady(false);
                }}
                style={{
                  padding: "5px 16px", borderRadius: 999, border: "none",
                  fontSize: "0.8rem", fontWeight: activeMapTab === tab ? 700 : 500,
                  cursor: "pointer",
                  background: activeMapTab === tab ? "rgba(16,185,129,0.9)" : "transparent",
                  color: activeMapTab === tab ? "#fff" : "rgba(255,255,255,0.65)",
                  transition: "all 0.2s",
                }}
              >
                {tab === "world" ? "🌍 세계여행" : "🇰🇷 국내여행"}
              </button>
            ))}
          </div>

          {/* 로딩 오버레이 */}
          {!mapReady && (
            <div className="globe-loading-overlay">
              <div className="globe-loading-pulse" />
              <span className="globe-loading-text">지도 불러오는 중…</span>
            </div>
          )}

          {/* 조건부 지도 렌더링 */}
          {!loading && activeMapTab === "world" && (
            <TravelWorldMap
              places={filteredPlaces}
              onPinClick={handlePinClick}
              highlightedId={highlightedId}
              selectedContinents={filter.continents}
              activeContinents={activeContinents}
              onLoad={() => setMapReady(true)}
            />
          )}
          {!loading && activeMapTab === "domestic" && (
            <TravelKoreaMap
              places={filteredPlaces}
              onPinClick={handlePinClick}
              highlightedId={highlightedId}
              selectedRegions={filter.regions}
              activeProvinces={activeProvinces}
              onLoad={() => setMapReady(true)}
            />
          )}
        </div>

        {/* 2순위: 리스트 */}
        <div className="travel-sidebar-wrap">
          <div className="travel-sidebar-inner">
            {loading ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                {[1, 2, 3].map((i) => (
                  <div key={i} style={{ height: 60, borderRadius: 10, background: "var(--bg-card)", animation: "pulse 1.5s ease-in-out infinite" }} />
                ))}
              </div>
            ) : (
              <TravelSidebar
                places={places.filter((p) => activeMapTab === "world" ? !p.is_domestic : p.is_domestic)}
                filteredPlaces={filteredPlaces}
                selectedYears={filter.years}
                selectedContinents={filter.continents}
                selectedRegions={filter.regions}
                activeMapTab={activeMapTab}
                onYearToggle={toggleYear}
                onContinentToggle={toggleContinent}
                onRegionToggle={toggleRegion}
                onYearReset={resetYearFilter}
                onContinentReset={resetContinentFilter}
                onRegionReset={resetRegionFilter}
                onPlaceClick={handlePinClick}
                highlightedId={highlightedId}
              />
            )}
          </div>
        </div>
      </div>

      {/* 모달들 */}
      {isDetailModalOpen && selectedPlace && (
        <TravelDetailModal
          place={selectedPlace}
          currentUserId={currentUserId}
          onClose={handleCloseDetail}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      )}
      {isAddModalOpen && (
        <TravelFormModal
          editingPlace={editingPlace}
          onClose={closeAddModal}
          onSave={handleSave}
        />
      )}

      <style>{`
        /* 헤더만 sticky — 페이지 전체는 자연 스크롤 */
        .travel-page-shell {
          min-height: 100dvh;
          background: var(--bg-base);
        }
        .travel-page-shell > header {
          position: sticky;
          top: 0;
          z-index: 20;
        }
        .travel-layout {
          display: flex;
          flex-direction: column;
        }
        /* 리스트 영역: 전체 너비, 자연 높이 */
        .travel-sidebar-wrap {
          width: 100%;
          background: var(--bg-base);
        }
        .travel-sidebar-inner {
          padding: 1rem;
          box-sizing: border-box;
        }
        .travel-sidebar-panel { height: auto; }
        .travel-record-list { padding-bottom: 1.5rem; }
        /* 지도: 고정 높이로 D3 clientHeight 확정, sticky 없음 */
        .travel-globe-wrap {
          width: 100%;
          height: min(62dvh, 680px);
          background: #0d1b2a;
          overflow: hidden;
          position: relative;
          border-bottom: 1px solid var(--border);
        }
        /* 지도 로딩 오버레이 — D3 렌더 완료 전 네이비 빈 화면 대신 표시 */
        .globe-loading-overlay {
          position: absolute;
          inset: 0;
          background: #0d1b2a;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 0.75rem;
          z-index: 2;
        }
        .globe-loading-pulse {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          border: 3px solid rgba(255,255,255,0.12);
          border-top-color: rgba(255,255,255,0.55);
          animation: map-spin 0.9s linear infinite;
        }
        .globe-loading-text {
          font-size: 0.8rem;
          color: rgba(255,255,255,0.45);
          letter-spacing: 0.02em;
        }
        @keyframes map-spin {
          to { transform: rotate(360deg); }
        }
        .hide-xs { display: inline; }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
        @media (max-width: 768px) {
          .travel-globe-wrap {
            height: 45dvh;
            min-height: 260px;
          }
          .hide-xs { display: none; }
        }
      `}</style>
    </div>
  );
}
