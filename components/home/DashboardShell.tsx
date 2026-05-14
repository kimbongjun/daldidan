"use client";

import { useEffect, useState, useDeferredValue, Suspense, lazy, startTransition, type CSSProperties } from "react";
import {
  DndContext,
  DragOverlay,
  MouseSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { SortableContext, arrayMove, rectSortingStrategy } from "@dnd-kit/sortable";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import BiometricSetupBanner from "@/components/auth/BiometricSetupBanner";
import BudgetWidget from "@/components/widgets/BudgetWidget";
import BlogWidget from "@/components/widgets/BlogWidget";
import RealEstateWidget from "@/components/widgets/RealEstateWidget";
import TravelWidget from "@/components/widgets/TravelWidget";
import FortuneWidget from "@/components/widgets/FortuneWidget";
import LottoWidget from "@/components/widgets/LottoWidget";
import ErrorBoundary from "@/components/ErrorBoundary";
import BottomNav from "@/components/BottomNav";
import { SortableWidgetItem } from "@/components/home/SortableWidgetItem";
import type { BlogPostSummary } from "@/lib/blog-shared";
import { useLayoutStore, MOBILE_WIDGET_ORDER, type WidgetId } from "@/store/useLayoutStore";

const CalendarWidget = lazy(() => import("@/components/widgets/CalendarWidget"));
const StockWidget = lazy(() => import("@/components/widgets/StockWidget"));

type DashboardShellProps = {
  initialBlogPosts: BlogPostSummary[];
};

const WIDGET_META: Record<
  WidgetId,
  {
    label: string;
    minHeight: number;
    mobileCols: 1;
    tabletCols: 1 | 2;
    desktopCols: 1 | 2 | 3;
  }
> = {
  fortune: { label: "운세", minHeight: 0, mobileCols: 1, tabletCols: 1, desktopCols: 1 },
  lotto: { label: "로또", minHeight: 0, mobileCols: 1, tabletCols: 1, desktopCols: 1 },
  blog: { label: "블로그", minHeight: 0, mobileCols: 1, tabletCols: 1, desktopCols: 2 },
  budget: { label: "가계부", minHeight: 0, mobileCols: 1, tabletCols: 1, desktopCols: 1 },
  calendar: { label: "캘린더", minHeight: 0, mobileCols: 1, tabletCols: 1, desktopCols: 1 },
  stock: { label: "증시", minHeight: 0, mobileCols: 1, tabletCols: 2, desktopCols: 2 },
  realestate: { label: "부동산", minHeight: 0, mobileCols: 1, tabletCols: 1, desktopCols: 1 },
  travel: { label: "여행지도", minHeight: 0, mobileCols: 1, tabletCols: 1, desktopCols: 1 },
};

function CalendarWidgetSkeleton() {
  return (
    <div
      style={{
        background: "var(--bg-card)",
        border: "1px solid var(--border)",
        borderRadius: 12,
        minHeight: 320,
        width: "100%",
      }}
      className="skeleton-shimmer"
    />
  );
}

function StockWidgetSkeleton() {
  return (
    <div
      style={{
        background: "var(--bg-card)",
        border: "1px solid var(--border)",
        borderRadius: 12,
        minHeight: 360,
        width: "100%",
      }}
      className="skeleton-shimmer"
    />
  );
}

const DEFAULT_WIDGET_ORDER = useLayoutStore.getState().widgetOrder;

export default function DashboardShell({ initialBlogPosts }: DashboardShellProps) {
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
        className="dashboard-wrap"
        style={{
          maxWidth: 1400,
          margin: "0 auto",
          padding: "0 1rem 3rem",
          width: "100%",
          boxSizing: "border-box",
        }}
      >
        <Header />
        <BiometricSetupBanner />
        <BentoGrid initialBlogPosts={initialBlogPosts} />
        <BottomNav />
        <Footer />
      </div>
    </div>
  );
}

function BentoGrid({ initialBlogPosts }: { initialBlogPosts: BlogPostSummary[] }) {
  const { widgetOrder, setWidgetOrder } = useLayoutStore();
  const [activeWidgetId, setActiveWidgetId] = useState<WidgetId | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);
  // CalendarWidget 지연 렌더링 제어
  const [calendarReady, setCalendarReady] = useState(false);
  // useDeferredValue로 Fiber가 낮은 우선순위로 처리하게 함
  const deferredCalendarReady = useDeferredValue(calendarReady);
  const [stockReady, setStockReady] = useState(false);
  const deferredStockReady = useDeferredValue(stockReady);

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 8 } }),
  );

  useEffect(() => {
    let active = true;
    void Promise.resolve(useLayoutStore.persist.rehydrate()).finally(() => {
      if (active) setHydrated(true);
    });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const check = () => setIsDesktop(window.innerWidth >= 1100);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  useEffect(() => {
    // 초기 렌더 완료 후 낮은 우선순위로 CalendarWidget 마운트 예약
    setCalendarReady(true);
  }, []);

  useEffect(() => {
    let cancelled = false;

    const schedule = () => {
      if (cancelled) return;
      startTransition(() => {
        if (!cancelled) setStockReady(true);
      });
    };

    if (typeof window !== "undefined" && "requestIdleCallback" in window) {
      const callbackId = window.requestIdleCallback(() => schedule(), { timeout: 2_000 });
      return () => {
        cancelled = true;
        window.cancelIdleCallback(callbackId);
      };
    }

    const timeoutId = setTimeout(schedule, 250);
    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
    };
  }, []);

  const desktopWidgets = hydrated ? widgetOrder : DEFAULT_WIDGET_ORDER;

  function getWidgetContent(id: WidgetId): React.ReactNode {
    switch (id) {
      case "blog":
        return <ErrorBoundary><BlogWidget initialPosts={initialBlogPosts} /></ErrorBoundary>;
      case "budget":
        return <ErrorBoundary><BudgetWidget /></ErrorBoundary>;
      case "calendar":
        return (
          <ErrorBoundary>
            <Suspense fallback={<CalendarWidgetSkeleton />}>
              {deferredCalendarReady ? <CalendarWidget /> : <CalendarWidgetSkeleton />}
            </Suspense>
          </ErrorBoundary>
        );
      case "fortune":
        return <ErrorBoundary><FortuneWidget /></ErrorBoundary>;
      case "lotto":
        return <ErrorBoundary><LottoWidget /></ErrorBoundary>;
      case "stock":
        return (
          <ErrorBoundary>
            <Suspense fallback={<StockWidgetSkeleton />}>
              {deferredStockReady ? <StockWidget /> : <StockWidgetSkeleton />}
            </Suspense>
          </ErrorBoundary>
        );
      case "travel":
        return <ErrorBoundary><TravelWidget /></ErrorBoundary>;
      case "realestate":
        return <ErrorBoundary><RealEstateWidget /></ErrorBoundary>;
    }
  }

  function getWidgetStyle(id: WidgetId, index: number): CSSProperties {
    const meta = WIDGET_META[id];
    return {
      minHeight: meta.minHeight,
      ["--widget-delay" as string]: `${index * 45}ms`,
      ["--widget-span-mobile" as string]: String(meta.mobileCols),
      ["--widget-span-tablet" as string]: String(meta.tabletCols),
      ["--widget-span-desktop" as string]: String(meta.desktopCols),
    };
  }

  function handleDragStart({ active }: DragStartEvent) {
    setActiveWidgetId(active.id as WidgetId);
  }

  function handleDragEnd({ active, over }: DragEndEvent) {
    if (over && active.id !== over.id) {
      const from = desktopWidgets.indexOf(active.id as WidgetId);
      const to = desktopWidgets.indexOf(over.id as WidgetId);
      if (from >= 0 && to >= 0) {
        setWidgetOrder(arrayMove(desktopWidgets, from, to));
      }
    }
    setActiveWidgetId(null);
  }

  function handleDragCancel() {
    setActiveWidgetId(null);
  }

  return (
    <div style={{ width: "100%", marginTop: "1rem" }}>
      <style>{`
        .bento-grid {
          display: grid;
          gap: 1.25rem;
          grid-template-columns: minmax(0, 1fr);
          grid-auto-flow: dense;
          align-items: stretch;
        }
        @media (min-width: 640px) {
          .bento-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }
        @media (min-width: 1100px) {
          .bento-grid {
            grid-template-columns: repeat(3, minmax(0, 1fr));
          }
        }
        .bento-item {
          grid-column: span var(--widget-span-mobile, 1);
        }
        @media (min-width: 640px) {
          .bento-item {
            grid-column: span var(--widget-span-tablet, 1);
          }
        }
        @media (min-width: 1100px) {
          .bento-item {
            grid-column: span var(--widget-span-desktop, 1);
          }
        }
      `}</style>

      {isDesktop ? (
        <ErrorBoundary fallback={<StaticWidgetGrid orderedWidgets={desktopWidgets} getWidgetContent={getWidgetContent} getWidgetStyle={getWidgetStyle} />}>
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            onDragCancel={handleDragCancel}
          >
            <SortableContext items={desktopWidgets} strategy={rectSortingStrategy}>
              <div className="bento-grid">
                {desktopWidgets.map((id, index) => (
                  <SortableWidgetItem
                    key={id}
                    id={id}
                    widgetId={id}
                    className="bento-item"
                    containerStyle={getWidgetStyle(id, index)}
                  >
                    <div className="widget-enter">
                      {getWidgetContent(id)}
                    </div>
                  </SortableWidgetItem>
                ))}
              </div>
            </SortableContext>
            <DragOverlay dropAnimation={{ duration: 180, easing: "ease" }}>
              {activeWidgetId ? (
                <WidgetDragPreview id={activeWidgetId} />
              ) : null}
            </DragOverlay>
          </DndContext>
        </ErrorBoundary>
      ) : (
        <StaticWidgetGrid
          orderedWidgets={MOBILE_WIDGET_ORDER}
          getWidgetContent={getWidgetContent}
          getWidgetStyle={getWidgetStyle}
        />
      )}
    </div>
  );
}

function StaticWidgetGrid({
  orderedWidgets,
  getWidgetContent,
  getWidgetStyle,
}: {
  orderedWidgets: WidgetId[];
  getWidgetContent: (id: WidgetId) => React.ReactNode;
  getWidgetStyle: (id: WidgetId, index: number) => CSSProperties;
}) {
  return (
    <div className="bento-grid">
      {orderedWidgets.map((id, index) => (
        <div
          key={id}
          data-widget-id={id}
          className="bento-item widget-enter"
          style={getWidgetStyle(id, index)}
        >
          {getWidgetContent(id)}
        </div>
      ))}
    </div>
  );
}

function WidgetDragPreview({ id }: { id: WidgetId }) {
  return (
    <div
      style={{
        width: 220,
        minHeight: 76,
        borderRadius: 16,
        background: "var(--bg-card)",
        border: "1px solid var(--border)",
        boxShadow: "var(--shadow-card)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "var(--text-primary)",
        fontSize: "0.85rem",
        fontWeight: 800,
        pointerEvents: "none",
      }}
    >
      {WIDGET_META[id].label}
    </div>
  );
}
