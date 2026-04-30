"use client";

import { useEffect, useState, type CSSProperties } from "react";
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
import RealEstateWidget from "@/components/widgets/RealEstateWidget";
import StockWidget from "@/components/widgets/StockWidget";
import CalendarWidget from "@/components/widgets/CalendarWidget";
import FortuneWidget from "@/components/widgets/FortuneWidget";
import LottoWidget from "@/components/widgets/LottoWidget";
import ErrorBoundary from "@/components/ErrorBoundary";
import BottomNav from "@/components/BottomNav";
import { SortableWidgetItem } from "@/components/home/SortableWidgetItem";
import type { BlogPostSummary } from "@/lib/blog-shared";
import { useLayoutStore, type WidgetId } from "@/store/useLayoutStore";

type DashboardShellProps = {
  initialBlogPosts: BlogPostSummary[];
};

const WIDGET_META: Record<
  WidgetId,
  {
    minHeight: number;
    mobileCols: 1;
    tabletCols: 1 | 2;
    desktopCols: 1 | 2 | 3;
  }
> = {
  fortune: { minHeight: 420, mobileCols: 1, tabletCols: 1, desktopCols: 1 },
  lotto: { minHeight: 380, mobileCols: 1, tabletCols: 1, desktopCols: 1 },
  blog: { minHeight: 480, mobileCols: 1, tabletCols: 2, desktopCols: 2 },
  budget: { minHeight: 460, mobileCols: 1, tabletCols: 1, desktopCols: 1 },
  calendar: { minHeight: 520, mobileCols: 1, tabletCols: 1, desktopCols: 1 },
  stock: { minHeight: 520, mobileCols: 1, tabletCols: 2, desktopCols: 2 },
  realestate: { minHeight: 340, mobileCols: 1, tabletCols: 2, desktopCols: 1 },
};

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

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  );

  useEffect(() => {
    void Promise.resolve(useLayoutStore.persist.rehydrate()).finally(() => {
      setHydrated(true);
    });
  }, []);

  const orderedWidgets = hydrated ? widgetOrder : DEFAULT_WIDGET_ORDER;

  function getWidgetContent(id: WidgetId): React.ReactNode {
    switch (id) {
      case "blog":
        return <ErrorBoundary><BlogWidget initialPosts={initialBlogPosts} /></ErrorBoundary>;
      case "budget":
        return <ErrorBoundary><BudgetWidget /></ErrorBoundary>;
      case "calendar":
        return <ErrorBoundary><CalendarWidget /></ErrorBoundary>;
      case "fortune":
        return <ErrorBoundary><FortuneWidget /></ErrorBoundary>;
      case "lotto":
        return <ErrorBoundary><LottoWidget /></ErrorBoundary>;
      case "stock":
        return <ErrorBoundary><StockWidget /></ErrorBoundary>;
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
      const from = orderedWidgets.indexOf(active.id as WidgetId);
      const to = orderedWidgets.indexOf(over.id as WidgetId);
      setWidgetOrder(arrayMove(orderedWidgets, from, to));
    }
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

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={orderedWidgets} strategy={rectSortingStrategy}>
          <div className="bento-grid">
            {orderedWidgets.map((id, index) => (
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
            <div className="bento-item" style={{ ...getWidgetStyle(activeWidgetId, 0), opacity: 0.88 }}>
              {getWidgetContent(activeWidgetId)}
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
