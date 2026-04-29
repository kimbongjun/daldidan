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
import { SortableContext, arrayMove, rectSortingStrategy } from "@dnd-kit/sortable";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import BudgetWidget from "@/components/widgets/BudgetWidget";
import BlogWidget from "@/components/widgets/BlogWidget";
import FestivalWidget from "@/components/widgets/FestivalWidget";
import RealEstateWidget from "@/components/widgets/RealEstateWidget";
import StockWidget from "@/components/widgets/StockWidget";
import CalendarWidget from "@/components/widgets/CalendarWidget";
import FortuneWidget from "@/components/widgets/FortuneWidget";
import LottoWidget from "@/components/widgets/LottoWidget";
import ErrorBoundary from "@/components/ErrorBoundary";
import { SortableWidgetItem } from "@/components/home/SortableWidgetItem";
import type { BlogPostSummary } from "@/lib/blog-shared";
import type { MainWidgetId, FullWidgetId } from "@/store/useLayoutStore";
import { useLayoutStore } from "@/store/useLayoutStore";
import type { CSSProperties } from "react";

type DashboardShellProps = {
  initialBlogPosts: BlogPostSummary[];
};

const MAIN_STYLES: Record<MainWidgetId, CSSProperties> = {
  blog:     { minHeight: 480, gridColumn: "span 2" },
  budget:   { minHeight: 460 },
  calendar: { minHeight: 520 },
  fortune:  { minHeight: 420 },
  lotto:    { minHeight: 380 },
};

const FULL_STYLES: Record<FullWidgetId, CSSProperties> = {
  stock:      {},
  festival:   { height: 300 },
  realestate: { height: 340 },
};

const ALL_FULL_WIDGETS: FullWidgetId[] = ["stock", "festival", "realestate"];

function normalizeFullOrder(order: FullWidgetId[]): FullWidgetId[] {
  const known = order.filter((id): id is FullWidgetId => ALL_FULL_WIDGETS.includes(id));
  const missing = ALL_FULL_WIDGETS.filter((id) => !known.includes(id));
  return [...known, ...missing];
}

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
  const { mainOrder, fullOrder, setMainOrder, setFullOrder } = useLayoutStore();
  const [activeMainId, setActiveMainId] = useState<MainWidgetId | null>(null);
  const [activeFullId, setActiveFullId] = useState<FullWidgetId | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  );

  useEffect(() => {
    void useLayoutStore.persist.rehydrate();
  }, []);

  useEffect(() => {
    const normalized = normalizeFullOrder(fullOrder);
    if (normalized.join(",") !== fullOrder.join(",")) {
      setFullOrder(normalized);
    }
  }, [fullOrder, setFullOrder]);

  function getMainContent(id: MainWidgetId): React.ReactNode {
    switch (id) {
      case "blog":     return blog;
      case "budget":   return <ErrorBoundary><BudgetWidget /></ErrorBoundary>;
      case "calendar": return <ErrorBoundary><CalendarWidget /></ErrorBoundary>;
      case "fortune":  return fortune;
      case "lotto":    return lotto;
    }
  }

  function getFullContent(id: FullWidgetId): React.ReactNode {
    switch (id) {
      case "stock":      return <ErrorBoundary><StockWidget /></ErrorBoundary>;
      case "festival":   return <FestivalWidget />;
      case "realestate": return <RealEstateWidget />;
    }
  }

  function handleMainDragStart({ active }: DragStartEvent) {
    setActiveMainId(active.id as MainWidgetId);
  }

  function handleMainDragEnd({ active, over }: DragEndEvent) {
    if (over && active.id !== over.id) {
      const from = mainOrder.indexOf(active.id as MainWidgetId);
      const to = mainOrder.indexOf(over.id as MainWidgetId);
      setMainOrder(arrayMove(mainOrder, from, to));
    }
    setActiveMainId(null);
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
      `}</style>

      {/* ── 데스크톱 (≥1100px) — 3열 그리드, blog는 2칸 ── */}
      <div className="bento-desktop">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleMainDragStart}
          onDragEnd={handleMainDragEnd}
        >
          <SortableContext items={mainOrder} strategy={rectSortingStrategy}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0,1fr))", gap: "1rem" }}>
              {mainOrder.map((id) => (
                <SortableWidgetItem key={id} id={id} containerStyle={MAIN_STYLES[id]}>
                  {getMainContent(id)}
                </SortableWidgetItem>
              ))}
            </div>
          </SortableContext>
          <DragOverlay dropAnimation={{ duration: 180, easing: "ease" }}>
            {activeMainId && (
              <div style={{ opacity: 0.85, minHeight: (MAIN_STYLES[activeMainId] as { minHeight: number }).minHeight }}>
                {getMainContent(activeMainId)}
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
            <SortableContext items={fullOrder} strategy={rectSortingStrategy}>
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

      {/* ── 태블릿 (640–1099px) — 2열 그리드, blog는 2칸(전체 폭) ── */}
      <div className="bento-tablet">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleMainDragStart}
          onDragEnd={handleMainDragEnd}
        >
          <SortableContext items={mainOrder} strategy={rectSortingStrategy}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0,1fr))", gap: "1rem" }}>
              {mainOrder.map((id) => (
                <SortableWidgetItem key={`tablet-${id}`} id={id} containerStyle={MAIN_STYLES[id]}>
                  {getMainContent(id)}
                </SortableWidgetItem>
              ))}
            </div>
          </SortableContext>
          <DragOverlay dropAnimation={{ duration: 180, easing: "ease" }}>
            {activeMainId && (
              <div style={{ opacity: 0.85, minHeight: (MAIN_STYLES[activeMainId] as { minHeight: number }).minHeight }}>
                {getMainContent(activeMainId)}
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
            <SortableContext items={fullOrder} strategy={rectSortingStrategy}>
              <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                {fullOrder.map((id) => (
                  <SortableWidgetItem key={`tablet-full-${id}`} id={id} containerStyle={FULL_STYLES[id]}>
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
        {mainOrder.map((id) => (
          <div key={`mobile-${id}`} style={{ minWidth: 0, minHeight: (MAIN_STYLES[id] as { minHeight: number }).minHeight }}>
            {getMainContent(id)}
          </div>
        ))}
        {fullOrder.map((id) => (
          <div key={`mobile-full-${id}`} style={{ minWidth: 0, ...FULL_STYLES[id] }}>
            {getFullContent(id)}
          </div>
        ))}
      </div>
    </div>
  );
}
