"use client";

import { useEffect, useState } from "react";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import BudgetWidget from "@/components/widgets/BudgetWidget";
import BlogWidget from "@/components/widgets/BlogWidget";
import FestivalWidget from "@/components/widgets/FestivalWidget";
import RealEstateWidget from "@/components/widgets/RealEstateWidget";
import CalendarWidget from "@/components/widgets/CalendarWidget";
import FortuneWidget from "@/components/widgets/FortuneWidget";
import ErrorBoundary from "@/components/ErrorBoundary";
import type { BlogPostSummary } from "@/lib/blog-shared";

type DashboardShellProps = {
  initialBlogPosts: BlogPostSummary[];
};

export default function DashboardShell({
  initialBlogPosts,
}: DashboardShellProps) {
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
          const data = await res.json() as { location?: string };
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
    <div style={{ background: "var(--bg-base)", minHeight: "100vh", width: "100%", overflowX: "hidden" }}>
      <div style={{ maxWidth: 1400, margin: "0 auto", padding: "0 1rem 3rem", width: "100%", boxSizing: "border-box" }}>
        <Header currentLocation={currentLocation} locationLoading={locationLoading} />
        <BentoGrid
          blog={<ErrorBoundary><BlogWidget initialPosts={initialBlogPosts} /></ErrorBoundary>}
          fortune={<ErrorBoundary><FortuneWidget /></ErrorBoundary>}
        />
        <Footer />
      </div>
    </div>
  );
}

function BentoGrid({
  blog,
  fortune,
}: {
  blog: React.ReactNode;
  fortune: React.ReactNode;
}) {
  return (
    <div style={{ width: "100%", marginTop: "1rem" }}>
      <style>{`
        .bento-desktop { display: none; }
        .bento-tablet  { display: none; }
        .bento-mobile  {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }
        @media (min-width: 640px) {
          .bento-mobile { display: none; }
          .bento-tablet {
            display: grid;
            gap: 1rem;
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }
        @media (min-width: 1100px) {
          .bento-tablet { display: none; }
          .bento-desktop {
            display: grid;
            gap: 1rem;
            width: 100%;
            grid-template-columns: minmax(0,2fr) minmax(0,1fr);
            grid-template-areas:
              "blog    budget"
              "blog    calendar"
              "blog    fortune"
              "festival festival"
              "realestate realestate";
          }
        }
      `}</style>

      {/* 데스크톱 */}
      <div className="bento-desktop">
        <div style={{ gridArea: "blog",       minWidth: 0 }}>{blog}</div>
        <div style={{ gridArea: "budget",     minWidth: 0, minHeight: 460 }}><ErrorBoundary><BudgetWidget /></ErrorBoundary></div>
        <div style={{ gridArea: "calendar",   minWidth: 0, minHeight: 520 }}><ErrorBoundary><CalendarWidget /></ErrorBoundary></div>
        <div style={{ gridArea: "fortune",    minWidth: 0, minHeight: 420 }}>{fortune}</div>
        <div style={{ gridArea: "festival",   minWidth: 0, height: 300 }}><FestivalWidget /></div>
        <div style={{ gridArea: "realestate", minWidth: 0, height: 340 }}><RealEstateWidget /></div>
      </div>

      {/* 태블릿 */}
      <div className="bento-tablet">
        <div style={{ minWidth: 0 }}>{blog}</div>
        <div style={{ minWidth: 0 }}><ErrorBoundary><BudgetWidget /></ErrorBoundary></div>
        <div style={{ minWidth: 0, gridColumn: "1 / -1", minHeight: 520 }}><ErrorBoundary><CalendarWidget /></ErrorBoundary></div>
        <div style={{ minWidth: 0, minHeight: 420, gridColumn: "1 / -1" }}>{fortune}</div>
        <div style={{ minWidth: 0, height: 300, gridColumn: "1 / -1" }}><FestivalWidget /></div>
        <div style={{ minWidth: 0, gridColumn: "1 / -1" }}><RealEstateWidget /></div>
      </div>

      {/* 모바일 */}
      <div className="bento-mobile">
        <div style={{ minWidth: 0 }}>{blog}</div>
        <div style={{ minWidth: 0 }}><ErrorBoundary><BudgetWidget /></ErrorBoundary></div>
        <div style={{ minWidth: 0, minHeight: 520 }}><ErrorBoundary><CalendarWidget /></ErrorBoundary></div>
        <div style={{ minWidth: 0, minHeight: 420 }}>{fortune}</div>
        <div style={{ minWidth: 0, height: 300 }}><FestivalWidget /></div>
        <div style={{ minWidth: 0 }}><RealEstateWidget /></div>
      </div>
    </div>
  );
}
