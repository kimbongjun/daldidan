"use client";

import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  /** URL 기반 이동 (블로그 등 서버 컴포넌트에서 사용) */
  getHref?: (page: number) => string;
  /** 상태 기반 이동 (클라이언트 컴포넌트에서 사용) */
  onPageChange?: (page: number) => void;
  accentColor?: string;
}

function buildPageList(current: number, total: number): (number | "el1" | "el2")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  if (current <= 4) return [1, 2, 3, 4, 5, "el1", total];
  if (current >= total - 3) return [1, "el1", total - 4, total - 3, total - 2, total - 1, total];
  return [1, "el1", current - 1, current, current + 1, "el2", total];
}

export default function Pagination({
  currentPage,
  totalPages,
  getHref,
  onPageChange,
  accentColor = "#EA580C",
}: PaginationProps) {
  if (totalPages <= 1) return null;

  const pages = buildPageList(currentPage, totalPages);
  const base = "w-9 h-9 rounded-lg flex items-center justify-center text-sm font-semibold transition-opacity";
  const idleStyle = { background: "var(--bg-card)", color: "var(--text-muted)", border: "1px solid var(--border)" };
  const activeStyle = { background: accentColor, color: "#fff" };
  const disabledStyle = { ...idleStyle, opacity: 0.35, cursor: "default" as const };

  function renderPage(page: number) {
    if (page === currentPage) {
      return <span key={page} className={base} style={activeStyle}>{page}</span>;
    }
    if (getHref) {
      return (
        <Link key={page} href={getHref(page)} className={`${base} hover:opacity-80`} style={idleStyle}>
          {page}
        </Link>
      );
    }
    return (
      <button key={page} onClick={() => onPageChange?.(page)} className={`${base} hover:opacity-80`} style={idleStyle}>
        {page}
      </button>
    );
  }

  function renderNav(page: number, disabled: boolean, icon: React.ReactNode) {
    if (disabled) return <span className={base} style={disabledStyle}>{icon}</span>;
    if (getHref) {
      return (
        <Link href={getHref(page)} className={`${base} hover:opacity-80`} style={idleStyle}>
          {icon}
        </Link>
      );
    }
    return (
      <button onClick={() => onPageChange?.(page)} className={`${base} hover:opacity-80`} style={idleStyle}>
        {icon}
      </button>
    );
  }

  return (
    <div className="flex items-center justify-center gap-1.5 mt-8">
      {renderNav(currentPage - 1, currentPage === 1, <ChevronLeft size={16} />)}
      {pages.map((p, i) =>
        typeof p === "number"
          ? renderPage(p)
          : <span key={`el-${i}`} className="w-9 h-9 flex items-center justify-center text-sm" style={{ color: "var(--text-muted)" }}>···</span>
      )}
      {renderNav(currentPage + 1, currentPage === totalPages, <ChevronRight size={16} />)}
    </div>
  );
}
