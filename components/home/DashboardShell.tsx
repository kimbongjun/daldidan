"use client";

import type { CSSProperties } from "react";
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
import type { BlogPostSummary } from "@/lib/blog-shared";

type DashboardShellProps = {
  initialBlogPosts: BlogPostSummary[];
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
  return (
    <div style={{ width: "100%", marginTop: "1rem" }}>
      <style>{`
        .bento-main-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 1.25rem;
        }
        @media (min-width: 640px) {
          .bento-main-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
        }
        @media (min-width: 1100px) {
          .bento-main-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); }
        }
      `}</style>

      <div className="bento-main-grid">
        <div className="widget-enter" style={{ "--widget-delay": "0ms" } as CSSProperties}>
          <ErrorBoundary><FortuneWidget /></ErrorBoundary>
        </div>
        <div className="widget-enter" style={{ "--widget-delay": "50ms" } as CSSProperties}>
          <ErrorBoundary><LottoWidget /></ErrorBoundary>
        </div>
        <div className="widget-enter" style={{ "--widget-delay": "100ms" } as CSSProperties}>
          <ErrorBoundary><BlogWidget initialPosts={initialBlogPosts} /></ErrorBoundary>
        </div>
        <div className="widget-enter" style={{ "--widget-delay": "150ms" } as CSSProperties}>
          <ErrorBoundary><BudgetWidget /></ErrorBoundary>
        </div>
        <div className="widget-enter" style={{ "--widget-delay": "200ms" } as CSSProperties}>
          <ErrorBoundary><CalendarWidget /></ErrorBoundary>
        </div>
      </div>

      <div style={{ marginTop: "1.25rem", display: "flex", flexDirection: "column", gap: "1.25rem" }}>
        <div className="widget-enter" style={{ "--widget-delay": "250ms" } as CSSProperties}>
          <ErrorBoundary><StockWidget /></ErrorBoundary>
        </div>
        <div className="widget-enter" style={{ "--widget-delay": "300ms" } as CSSProperties}>
          <div style={{ height: 340 }}>
            <ErrorBoundary><RealEstateWidget /></ErrorBoundary>
          </div>
        </div>
      </div>
    </div>
  );
}
