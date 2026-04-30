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
import { SortableContext, arrayMove, rectSortingStrategy, verticalListSortingStrategy } from "@dnd-kit/sortable";
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
import { useLayoutStore, type FullWidgetId, type MainWidgetId } from "@/store/useLayoutStore";

type DashboardShellProps = {
  initialBlogPosts: BlogPostSummary[];
};

const MAIN_STYLES: Record<MainWidgetId, CSSProperties> = {
  blog: { minHeight: 480, gridColumn: "span 2" },
  budget: { minHeight: 460 },
  calendar: { minHeight: 520 },
  fortune: { minHeight: 420 },
  lotto: { minHeight: 380 },
};

const FULL_STYLES: Record<FullWidgetId, CSSProperties> = {
  stock: { minHeight: 520 },
  realestate: { minHeight: 340 },
};

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
  const { mainOrder, fullOrder, setMainOrder, setFullOrder } = useLayoutStore();
  const [activeMainId, setActiveMainId] = useState<MainWidgetId | null>(null);
  const [activeFullId, setActiveFullId] = useState<FullWidgetId | null>(null);
  const [hydrated, setHydrated] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  );

  useEffect(() => {
    void Promise.resolve(useLayoutStore.persist.rehydrate()).finally(() => {
      setHydrated(true);
    });
  }, []);

  function getMainContent(id: MainWidgetId): React.ReactNode {
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
    }
  }

  function getFullContent(id: FullWidgetId): React.ReactNode {
    switch (id) {
      case "stock":
        return <ErrorBoundary><StockWidget /></ErrorBoundary>;
      case "realestate":
        return <ErrorBoundary><RealEstateWidget /></ErrorBoundary>;
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
        .bento-responsive { display: none; }
        .bento-mobile { display: flex; flex-direction: column; gap: 1.25rem; }
        @media (min-width: 640px) {
          .bento-responsive { display: flex; flex-direction: column; gap: 1.25rem; }
          .bento-mobile { display: none; }
        }
        .bento-grid-main {
          display: grid;
          gap: 1.25rem;
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }
        @media (min-width: 1100px) {
          .bento-grid-main { grid-template-columns: repeat(3, minmax(0, 1fr)); }
        }
      `}</style>

      <div className="bento-responsive">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleMainDragStart}
          onDragEnd={handleMainDragEnd}
        >
          <SortableContext items={hydrated ? mainOrder : useLayoutStore.getState().mainOrder} strategy={rectSortingStrategy}>
            <div className="bento-grid-main">
              {(hydrated ? mainOrder : useLayoutStore.getState().mainOrder).map((id, index) => (
                <SortableWidgetItem
                  key={id}
                  id={id}
                  widgetId={id}
                  containerStyle={{
                    ...MAIN_STYLES[id],
                    ["--widget-delay" as string]: `${index * 50}ms`,
                  }}
                >
                  <div className="widget-enter">
                    {getMainContent(id)}
                  </div>
                </SortableWidgetItem>
              ))}
            </div>
          </SortableContext>
          <DragOverlay dropAnimation={{ duration: 180, easing: "ease" }}>
            {activeMainId ? (
              <div style={{ ...MAIN_STYLES[activeMainId], opacity: 0.88 }}>
                {getMainContent(activeMainId)}
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>

        <div style={{ marginTop: "1.25rem" }}>
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleFullDragStart}
            onDragEnd={handleFullDragEnd}
          >
            <SortableContext items={hydrated ? fullOrder : useLayoutStore.getState().fullOrder} strategy={verticalListSortingStrategy}>
              <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
                {(hydrated ? fullOrder : useLayoutStore.getState().fullOrder).map((id, index) => (
                  <SortableWidgetItem
                    key={id}
                    id={id}
                    widgetId={id}
                    containerStyle={{
                      ...FULL_STYLES[id],
                      ["--widget-delay" as string]: `${(mainOrder.length + index) * 50}ms`,
                    }}
                  >
                    <div className="widget-enter">
                      {getFullContent(id)}
                    </div>
                  </SortableWidgetItem>
                ))}
              </div>
            </SortableContext>
            <DragOverlay dropAnimation={{ duration: 180, easing: "ease" }}>
              {activeFullId ? (
                <div style={{ ...FULL_STYLES[activeFullId], opacity: 0.88 }}>
                  {getFullContent(activeFullId)}
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>
        </div>
      </div>

      <div className="bento-mobile">
        {mainOrder.map((id, index) => (
          <div
            key={`mobile-${id}`}
            data-widget-id={id}
            className="widget-enter"
            style={{
              ...MAIN_STYLES[id],
              ["--widget-delay" as string]: `${index * 50}ms`,
            }}
          >
            {getMainContent(id)}
          </div>
        ))}
        {fullOrder.map((id, index) => (
          <div
            key={`mobile-${id}`}
            data-widget-id={id}
            className="widget-enter"
            style={{
              ...FULL_STYLES[id],
              ["--widget-delay" as string]: `${(mainOrder.length + index) * 50}ms`,
            }}
          >
            {getFullContent(id)}
          </div>
        ))}
      </div>
    </div>
  );
}
