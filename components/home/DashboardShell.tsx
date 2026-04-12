"use client";

import Footer from "@/components/Footer";
import Header from "@/components/Header";
import BudgetWidget from "@/components/widgets/BudgetWidget";
import BlogWidget from "@/components/widgets/BlogWidget";
import type { BlogPostSummary } from "@/lib/blog-shared";

type DashboardShellProps = {
  initialBlogPosts: BlogPostSummary[];
};

export default function DashboardShell({
  initialBlogPosts,
}: DashboardShellProps) {
  return (
    <div style={{ background: "var(--bg-base)", minHeight: "100vh", width: "100%", overflowX: "hidden" }}>
      <div style={{ maxWidth: 1400, margin: "0 auto", padding: "0 1rem 3rem", width: "100%", boxSizing: "border-box" }}>
        <Header />
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
            grid-template-columns: minmax(0,1fr) minmax(0,2fr);
            
            grid-template-areas:
              "budget blog";
          }
        }
      `}</style>

      {/* 데스크톱 */}
      <div className="bento-desktop">
        <div style={{ gridArea: "budget", minWidth: 0 }}><BudgetWidget /></div>
        <div style={{ gridArea: "blog",   minWidth: 0 }}>{blog}</div>
      </div>

      {/* 태블릿 */}
      <div className="bento-tablet">
        <div style={{ minWidth: 0, height: 420 }}><BudgetWidget /></div>
        <div style={{ minWidth: 0, height: 420 }}>{blog}</div>
      </div>

      {/* 모바일 */}
      <div className="bento-mobile">
        <div style={{ minWidth: 0, height: 480 }}><BudgetWidget /></div>
        <div style={{ minWidth: 0, height: 360 }}>{blog}</div>
      </div>
    </div>
  );
}
