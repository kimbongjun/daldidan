"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import dynamic from "next/dynamic";
import { ArrowLeft, Plus } from "lucide-react";
import Link from "next/link";
import type { TravelPlace, TravelContinent } from "@/lib/travel-shared";
import { useTravelStore } from "@/store/useTravelStore";
import TravelSidebar from "@/components/travel/TravelSidebar";
import TravelDetailModal from "@/components/travel/TravelDetailModal";
import TravelFormModal from "@/components/travel/TravelFormModal";
import { createClient } from "@/lib/supabase/client";

const TravelWorldMap = dynamic(() => import("@/components/travel/TravelWorldMap"), {
  ssr: false,
  loading: () => (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#0d1b2a",
        borderRadius: 0,
      }}
    >
      <div style={{ textAlign: "center", color: "#4fc3f7" }}>
        <div
          style={{
            width: 48,
            height: 48,
            border: "3px solid rgba(79,195,247,0.2)",
            borderTop: "3px solid #4fc3f7",
            borderRadius: "50%",
            animation: "spin 1s linear infinite",
            margin: "0 auto 0.75rem",
          }}
        />
        <p style={{ margin: 0, fontSize: "0.85rem", opacity: 0.7 }}>지도 로딩 중...</p>
      </div>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  ),
});

export default function TravelPageClient() {
  const { places, setPlaces, isAddModalOpen, isDetailModalOpen, selectedPlace, editingPlace, openAddModal, closeAddModal, openDetailModal, closeDetailModal, filter, setFilter } = useTravelStore();
  const [loading, setLoading] = useState(true);
  const [highlightedId, setHighlightedId] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | undefined>(undefined);

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
        const year = new Date(p.travel_date).getFullYear();
        if (filter.years.length > 0 && !filter.years.includes(year)) return false;
        if (filter.continents.length > 0 && !filter.continents.includes(p.continent as TravelContinent)) return false;
        return true;
      })
      .sort((a, b) => new Date(b.travel_date).getTime() - new Date(a.travel_date).getTime());
  }, [places, filter]);

  const handlePinClick = useCallback((place: TravelPlace) => {
    setHighlightedId(place.id);
    openDetailModal(place);
  }, [openDetailModal]);

  const handlePlaceClick = useCallback((place: TravelPlace) => {
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

  function resetYearFilter() { setFilter({ years: [] }); }
  function resetContinentFilter() { setFilter({ continents: [] }); }

  return (
    <div
      className="travel-page-shell"
      style={{
        minHeight: "100vh",
        background: "var(--bg-base)",
        display: "flex",
        flexDirection: "column",
      }}
    >
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
              {places.length}곳의 여행 기록
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

      {/* 본문: 데스크톱 = 사이드바 + 지구본, 모바일 = 지구본 + 사이드바 */}
      <div
        style={{
          display: "flex",
        }}
        className="travel-layout"
      >
        <div className="travel-sidebar-wrap">
          <div
            className="travel-sidebar-inner"
            style={{
              display: "flex",
              flexDirection: "column",
              padding: "1rem",
              boxSizing: "border-box",
            }}
          >
            {loading ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                {[1, 2, 3].map((i) => (
                  <div key={i} style={{ height: 60, borderRadius: 10, background: "var(--bg-card)", animation: "pulse 1.5s ease-in-out infinite" }} />
                ))}
              </div>
            ) : (
              <TravelSidebar
                places={places}
                filteredPlaces={filteredPlaces}
                selectedYears={filter.years}
                selectedContinents={filter.continents}
                onYearToggle={toggleYear}
                onContinentToggle={toggleContinent}
                onYearReset={resetYearFilter}
                onContinentReset={resetContinentFilter}
                onPlaceClick={handlePlaceClick}
                onAddClick={() => openAddModal()}
                highlightedId={highlightedId}
              />
            )}
          </div>
        </div>

        {/* 지도 영역 */}
        <div className="travel-globe-wrap">
          <TravelWorldMap
            places={filteredPlaces}
            onPinClick={handlePinClick}
            highlightedId={highlightedId}
            selectedContinents={filter.continents}
          />
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
        .travel-page-shell {
          overflow: visible;
        }
        .travel-layout {
          display: grid;
          grid-template-columns: minmax(0, 320px) minmax(0, 1fr);
          align-items: start;
        }
        .travel-sidebar-wrap {
          border-right: 1px solid var(--border);
          background: var(--bg-base);
        }
        .travel-sidebar-inner {
          height: auto;
        }
        .travel-sidebar-panel {
          height: auto;
        }
        .travel-record-list {
          padding-bottom: 1rem;
        }
        .travel-globe-wrap {
          min-width: 0;
          height: min(68vh, 760px);
          background: #0d1b2a;
          border-radius: 0;
          overflow: hidden;
          position: sticky;
          top: 0;
        }
        .hide-xs { display: inline; }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
        @media (max-width: 768px) {
          .travel-page-shell {
            min-height: 100dvh;
            overflow: visible;
          }
          .travel-layout {
            display: flex;
            flex-direction: column-reverse;
          }
          .travel-sidebar-wrap {
            width: 100%;
            border-right: none;
            border-top: 1px solid var(--border);
            height: auto;
          }
          .travel-record-list {
            padding-bottom: 0;
          }
          .travel-globe-wrap {
            height: 45vh;
            min-height: 280px;
            position: relative;
            top: auto;
          }
          .hide-xs { display: none; }
        }
      `}</style>
    </div>
  );
}
