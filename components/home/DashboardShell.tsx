"use client";

import { useEffect, useState } from "react";
import { MapPin } from "lucide-react";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import BudgetWidget from "@/components/widgets/BudgetWidget";
import BlogWidget from "@/components/widgets/BlogWidget";
import FestivalWidget from "@/components/widgets/FestivalWidget";
import BangkokWidget from "@/components/widgets/BangkokWidget";
import type { BlogPostSummary } from "@/lib/blog-shared";

type DashboardShellProps = {
  initialBlogPosts: BlogPostSummary[];
};

export default function DashboardShell({
  initialBlogPosts,
}: DashboardShellProps) {
  const [currentLocation, setCurrentLocation] = useState<string>("");

  useEffect(() => {
    if (!navigator.geolocation) return;
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
        }
      },
      () => { /* 권한 거부 시 표시 생략 */ },
      { timeout: 8000 },
    );
  }, []);

  return (
    <div style={{ background: "var(--bg-base)", minHeight: "100vh", width: "100%", overflowX: "hidden" }}>
      <div style={{ maxWidth: 1400, margin: "0 auto", padding: "0 1rem 3rem", width: "100%", boxSizing: "border-box" }}>
        <Header />
        {currentLocation && (
          <div className="flex items-center gap-1.5 px-1 mb-3">
            <MapPin size={12} style={{ color: "var(--text-muted)" }} />
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>
              {currentLocation}
            </p>
          </div>
        )}
        <BentoGrid
          blog={<BlogWidget initialPosts={initialBlogPosts} />}
        />
        <Footer />
      </div>
    </div>
  );
}

function BentoGrid({
  blog,
}: {
  blog: React.ReactNode;
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
              "festival festival"
              "bangkok  bangkok";
          }
        }
      `}</style>

      {/* 데스크톱 */}
      <div className="bento-desktop">
        <div style={{ gridArea: "blog",     minWidth: 0 }}>{blog}</div>
        <div style={{ gridArea: "budget",   minWidth: 0 }}><BudgetWidget /></div>
        <div style={{ gridArea: "festival", minWidth: 0, height: 480 }}><FestivalWidget /></div>
        <div style={{ gridArea: "bangkok",  minWidth: 0, height: 600 }}><BangkokWidget /></div>
      </div>

      {/* 태블릿 */}
      <div className="bento-tablet">
        <div style={{ minWidth: 0, height: 420 }}>{blog}</div>
        <div style={{ minWidth: 0, height: 420 }}><BudgetWidget /></div>
        <div style={{ minWidth: 0, height: 480, gridColumn: "1 / -1" }}><FestivalWidget /></div>
        <div style={{ minWidth: 0, height: 600, gridColumn: "1 / -1" }}><BangkokWidget /></div>
      </div>

      {/* 모바일 */}
      <div className="bento-mobile">
        <div style={{ minWidth: 0, height: 360 }}>{blog}</div>
        <div style={{ minWidth: 0, height: 480 }}><BudgetWidget /></div>
        <div style={{ minWidth: 0, height: 480 }}><FestivalWidget /></div>
        <div style={{ minWidth: 0, height: 580 }}><BangkokWidget /></div>
      </div>
    </div>
  );
}
