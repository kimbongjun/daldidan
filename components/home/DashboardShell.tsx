"use client";

import { useEffect, useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { SortableContext, arrayMove, verticalListSortingStrategy } from "@dnd-kit/sortable";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import BudgetWidget from "@/components/widgets/BudgetWidget";
import BlogWidget from "@/components/widgets/BlogWidget";
import FestivalWidget from "@/components/widgets/FestivalWidget";
import RealEstateWidget from "@/components/widgets/RealEstateWidget";
import CalendarWidget from "@/components/widgets/CalendarWidget";
import FortuneWidget from "@/components/widgets/FortuneWidget";
import LottoWidget from "@/components/widgets/LottoWidget";
import ErrorBoundary from "@/components/ErrorBoundary";
import { SortableWidgetItem } from "@/components/home/SortableWidgetItem";
import type { BlogPostSummary } from "@/lib/blog-shared";
import type { SidebarWidgetId, FullWidgetId } from "@/store/useLayoutStore";
import { useLayoutStore } from "@/store/useLayoutStore";

type DashboardShellProps = {
  initialBlogPosts: BlogPostSummary[];
};

const SIDEBAR_STYLES: Record<SidebarWidgetId, { minHeight: number }> = {
  budget:   { minHeight: 460 },
  calendar: { minHeight: 520 },
  fortune:  { minHeight: 420 },
  lotto:    { minHeight: 380 },
};

const FULL_STYLES: Record<FullWidgetId, { height: number }> = {
  festival:   { height: 300 },
  realestate: { height: 340 },
};

export default function DashboardShell({ initialBlogPosts }: DashboardShellProps) {
  const [currentLocation, setCurrentLocation] = useState<string | null>(null);
  const [locationLoading, setLocationLoading] = useState(true);

  useEffect(() => {
    if (!navigator.geolocation) {
      setLocationLoading(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        try {
          const res = await fetch(
            `/api/geocode/reverse?lat=${coords.latitude}&lng=${coords.longitude}`,
          );
          const data = (await res.json()) as { location?: string };
          if (data.location) setCurrentLocation(data.location);
        } catch {
          // 위치 표시 생략
        } finally {
          setLocationLoading(false);
        }
      },
      () => {
        setLocationLoading(false);
      },
      { timeout: 8000 },
    );
  }, []);

  return (
    <div
      style={{
        background: "var(--bg-base)",
        minHeight: "100vh",
        width: "100%",
        overflowX: "hidden",
      }}
    >
      <div
        style={{
          maxWidth: 1400,
          margin: "0 auto",
          padding: "0 1rem 3rem",
          width: "100%",
          boxSizing: "border-box",
        }}
      >
        <Header currentLocation={currentLocation} locationLoading={locationLoading} />
        <BentoGrid
          blog={
            <ErrorBoundary>
              <BlogWidget initialPosts={initialBlogPosts} />
            </ErrorBoundary>
          }
          fortune={
            <ErrorBoundary>
              <FortuneWidget />
            </ErrorBoundary>
          }
          lotto={
            <ErrorBoundary>
              <LottoWidget />
            </ErrorBoundary>
          }
        />
        <Footer />
      </div>
    </div>
  );
}

function BentoGrid({
  blog,
  fortune,
  lotto,
}: {
  blog: React.ReactNode;
  fortune: React.ReactNode;
  lotto: React.ReactNode;
}) {
  const { sidebarOrder, fullOrder, setSidebarOrder, setFullOrder } = useLayoutStore();
  const [activeSidebarId, setActiveSidebarId] = useState<SidebarWidgetId | null>(null);
  const [activeFullId, setActiveFullId] = useState<FullWidgetId | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  );

  function getSidebarContent(id: SidebarWidgetId): React.ReactNode {
    switch (id) {
      case "budget":   return <ErrorBoundary><BudgetWidget /></ErrorBoundary>;
      case "calendar": return <ErrorBoundary><CalendarWidget /></ErrorBoundary>;
      case "fortune":  return fortune;
      case "lotto":    return lotto;
    }
  }

  function getFullContent(id: FullWidgetId): React.ReactNode {
    switch (id) {
      case "festival":   return <FestivalWidget />;
      case "realestate": return <RealEstateWidget />;
    }
  }

  function handleSidebarDragStart({ active }: DragStartEvent) {
    setActiveSidebarId(active.id as SidebarWidgetId);
  }

  function handleSidebarDragEnd({ active, over }: DragEndEvent) {
    if (over && active.id !== over.id) {
      const from = sidebarOrder.indexOf(active.id as SidebarWidgetId);
      const to = sidebarOrder.indexOf(over.id as SidebarWidgetId);
      setSidebarOrder(arrayMove(sidebarOrder, from, to));
    }
    setActiveSidebarId(null);
  }

  function handleFullDragStart({ active }: DragStartEvent) {
    setActiveFullId(active.id as FullWidgetId);
  }

  function handleFullDragEnd({ active, over }: DragEndEvent) {
    if (over && active.id !== over.id) {
      const from = fullOrder.indexOf(active.id as FullWidgetId);
      const to = fullOrder.indexOf(over.id as FullWidgetId);
      setFullOrder(arrayMove(fullOrder, from, to));
    }
    setActiveFullId(null);
  }

  return (
    <div style={{ width: "100%", marginTop: "1rem" }}>
      <style>{`
        .bento-desktop { display: none; }
        .bento-tablet  { display: none; }
        .bento-mobile  { display: flex; flex-direction: column; gap: 1rem; }
        @media (min-width: 640px) {
          .bento-mobile  { display: none; }
          .bento-tablet  { display: flex; flex-direction: column; gap: 1rem; }
        }
        @media (min-width: 1100px) {
          .bento-tablet  { display: none; }
          .bento-desktop { display: block; }
        }
        .bento-desktop-cols {
          display: grid;
          gap: 1rem;
          grid-template-columns: minmax(0,2fr) minmax(0,1fr);
        }
      `}</style>

      {/* ── 데스크톱 (≥1100px) ── */}
      <div className="bento-desktop">
        <div className="bento-desktop-cols">
          {/* 좌: 블로그 고정 */}
          <div style={{ minWidth: 0 }}>{blog}</div>

          {/* 우: 사이드바 정렬 가능 */}
          <div style={{ minWidth: 0 }}>
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragStart={handleSidebarDragStart}
              onDragEnd={handleSidebarDragEnd}
            >
              <SortableContext items={sidebarOrder} strategy={verticalListSortingStrategy}>
                <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                  {sidebarOrder.map((id) => (
                    <SortableWidgetItem key={id} id={id} containerStyle={SIDEBAR_STYLES[id]}>
                      {getSidebarContent(id)}
                    </SortableWidgetItem>
                  ))}
                </div>
              </SortableContext>
              <DragOverlay dropAnimation={{ duration: 180, easing: "ease" }}>
                {activeSidebarId && (
                  <div style={{ opacity: 0.85, ...SIDEBAR_STYLES[activeSidebarId] }}>
                    {getSidebarContent(activeSidebarId)}
                  </div>
                )}
              </DragOverlay>
            </DndContext>
          </div>
        </div>

        {/* 하단: 풀-와이드 정렬 가능 */}
        <div style={{ marginTop: "1rem" }}>
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleFullDragStart}
            onDragEnd={handleFullDragEnd}
          >
            <SortableContext items={fullOrder} strategy={verticalListSortingStrategy}>
              <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                {fullOrder.map((id) => (
                  <SortableWidgetItem key={id} id={id} containerStyle={FULL_STYLES[id]}>
                    {getFullContent(id)}
                  </SortableWidgetItem>
                ))}
              </div>
            </SortableContext>
            <DragOverlay dropAnimation={{ duration: 180, easing: "ease" }}>
              {activeFullId && (
                <div style={{ opacity: 0.85, ...FULL_STYLES[activeFullId] }}>
                  {getFullContent(activeFullId)}
                </div>
              )}
            </DragOverlay>
          </DndContext>
        </div>
      </div>

      {/* ── 태블릿 (640–1099px) ── */}
      <div className="bento-tablet">
        <div style={{ minWidth: 0, marginBottom: "1rem" }}>{blog}</div>

        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleSidebarDragStart}
          onDragEnd={handleSidebarDragEnd}
        >
          <SortableContext items={sidebarOrder} strategy={verticalListSortingStrategy}>
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              {sidebarOrder.map((id) => (
                <SortableWidgetItem
                  key={`tablet-${id}`}
                  id={id}
                  containerStyle={SIDEBAR_STYLES[id]}
                >
                  {getSidebarContent(id)}
                </SortableWidgetItem>
              ))}
            </div>
          </SortableContext>
          <DragOverlay dropAnimation={{ duration: 180, easing: "ease" }}>
            {activeSidebarId && (
              <div style={{ opacity: 0.85, ...SIDEBAR_STYLES[activeSidebarId] }}>
                {getSidebarContent(activeSidebarId)}
              </div>
            )}
          </DragOverlay>
        </DndContext>

        <div style={{ marginTop: "1rem" }}>
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleFullDragStart}
            onDragEnd={handleFullDragEnd}
          >
            <SortableContext items={fullOrder} strategy={verticalListSortingStrategy}>
              <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                {fullOrder.map((id) => (
                  <SortableWidgetItem
                    key={`tablet-${id}`}
                    id={id}
                    containerStyle={FULL_STYLES[id]}
                  >
                    {getFullContent(id)}
                  </SortableWidgetItem>
                ))}
              </div>
            </SortableContext>
            <DragOverlay dropAnimation={{ duration: 180, easing: "ease" }}>
              {activeFullId && (
                <div style={{ opacity: 0.85, ...FULL_STYLES[activeFullId] }}>
                  {getFullContent(activeFullId)}
                </div>
              )}
            </DragOverlay>
          </DndContext>
        </div>
      </div>

      {/* ── 모바일 (<640px) — 드래그 비활성 ── */}
      <div className="bento-mobile">
        <div style={{ minWidth: 0 }}>{blog}</div>
        <div style={{ minWidth: 0, minHeight: 460 }}>
          <ErrorBoundary><BudgetWidget /></ErrorBoundary>
        </div>
        <div style={{ minWidth: 0, minHeight: 520 }}>
          <ErrorBoundary><CalendarWidget /></ErrorBoundary>
        </div>
        <div style={{ minWidth: 0, minHeight: 420 }}>{fortune}</div>
        <div style={{ minWidth: 0, minHeight: 380 }}>{lotto}</div>
        <div style={{ minWidth: 0, height: 300 }}><FestivalWidget /></div>
        <div style={{ minWidth: 0, height: 340 }}><RealEstateWidget /></div>
      </div>
    </div>
  );
}
