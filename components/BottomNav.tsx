"use client";

import type { LucideIcon } from "lucide-react";
import { useRef, useState } from "react";
import {
  BookOpen,
  Building2,
  CalendarDays,
  Home,
  MapPinned,
  Ticket,
  TrendingUp,
  Wallet,
} from "lucide-react";

// 노출 순서: 홈 + 블로그·캘린더·가계부·로또·증권·여행지도·부동산
const NAV_ITEMS: { id: string; label: string; Icon: LucideIcon }[] = [
  { id: "top",        label: "홈",     Icon: Home },
  { id: "blog",       label: "블로그", Icon: BookOpen },
  { id: "calendar",   label: "캘린더", Icon: CalendarDays },
  { id: "budget",     label: "가계부", Icon: Wallet },
  { id: "lotto",      label: "로또",   Icon: Ticket },
  { id: "stock",      label: "증권",   Icon: TrendingUp },
  { id: "travel",     label: "여행",   Icon: MapPinned },
  { id: "realestate", label: "부동산", Icon: Building2 },
];

// 한 페이지(한 줄)당 최대 노출 항목 수. 초과 시 carousel 슬라이드로 페이징.
const PAGE_SIZE = 5;

export default function BottomNav() {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [page, setPage] = useState(0);

  const scrollTo = (id: string) => {
    if (id === "top") {
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    const candidates = document.querySelectorAll(`[data-widget-id="${id}"]`);
    const el = Array.from(candidates).find(
      (c) => (c as HTMLElement).offsetParent !== null,
    ) as HTMLElement | undefined;
    if (!el) return;
    window.scrollTo({
      top: el.getBoundingClientRect().top + window.scrollY - 16,
      behavior: "smooth",
    });
  };

  // PAGE_SIZE 단위로 페이지 분할
  const pages: typeof NAV_ITEMS[] = [];
  for (let i = 0; i < NAV_ITEMS.length; i += PAGE_SIZE) {
    pages.push(NAV_ITEMS.slice(i, i + PAGE_SIZE));
  }
  const isPaged = pages.length > 1;

  const handleScroll = () => {
    const node = scrollRef.current;
    if (!node) return;
    const width = node.clientWidth;
    if (width === 0) return;
    const next = Math.round(node.scrollLeft / width);
    setPage((prev) => (prev === next ? prev : next));
  };

  const goToPage = (index: number) => {
    const node = scrollRef.current;
    if (!node) return;
    node.scrollTo({ left: node.clientWidth * index, behavior: "smooth" });
  };

  const renderButton = ({ id, label, Icon }: (typeof NAV_ITEMS)[number]) => (
    <button
      key={id}
      type="button"
      onClick={() => scrollTo(id)}
      // 페이징 시 각 항목은 페이지 폭의 1/PAGE_SIZE 고정 → 마지막 페이지 정렬 유지
      className="min-w-0 flex flex-col items-center justify-center gap-0.5 py-2 transition-opacity hover:opacity-70 active:opacity-50"
      style={{ flex: `0 0 ${100 / PAGE_SIZE}%` }}
      aria-label={`${label}으로 이동`}
    >
      <Icon size={18} style={{ color: "var(--text-muted)" }} />
      <span
        className="text-[10px] font-semibold whitespace-nowrap"
        style={{ color: "var(--text-muted)" }}
      >
        {label}
      </span>
    </button>
  );

  return (
    <nav
      className="sm:hidden fixed bottom-0 left-0 right-0 z-40"
      style={{
        background: "var(--bg-card)",
        borderTop: "1px solid var(--border)",
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
        backdropFilter: "blur(12px)",
      }}
      aria-label="모바일 하단 탐색"
    >
      <style>{`
        .bottomnav-scroller {
          display: flex;
          overflow-x: auto;
          scroll-snap-type: x mandatory;
          -webkit-overflow-scrolling: touch;
          scrollbar-width: none;
        }
        .bottomnav-scroller::-webkit-scrollbar { display: none; }
        .bottomnav-page {
          flex: 0 0 100%;
          display: flex;
          scroll-snap-align: start;
        }
      `}</style>

      {isPaged ? (
        <>
          <div
            ref={scrollRef}
            className="bottomnav-scroller"
            onScroll={handleScroll}
          >
            {pages.map((items, i) => (
              <div key={i} className="bottomnav-page">
                {items.map(renderButton)}
              </div>
            ))}
          </div>
          <div
            className="flex items-center justify-center gap-1.5 pb-1"
            role="tablist"
            aria-label="탐색 메뉴 페이지"
          >
            {pages.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => goToPage(i)}
                aria-label={`${i + 1}페이지로 이동`}
                aria-selected={page === i}
                role="tab"
                style={{
                  width: page === i ? 16 : 6,
                  height: 6,
                  borderRadius: 999,
                  background:
                    page === i ? "var(--text-muted)" : "var(--border)",
                  transition: "width 0.2s ease, background 0.2s ease",
                }}
              />
            ))}
          </div>
        </>
      ) : (
        <div className="flex">
          {NAV_ITEMS.map(({ id, label, Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => scrollTo(id)}
              className="flex-1 min-w-0 flex flex-col items-center justify-center gap-0.5 py-2 transition-opacity hover:opacity-70 active:opacity-50"
              aria-label={`${label}으로 이동`}
            >
              <Icon size={18} style={{ color: "var(--text-muted)" }} />
              <span
                className="text-[10px] font-semibold whitespace-nowrap"
                style={{ color: "var(--text-muted)" }}
              >
                {label}
              </span>
            </button>
          ))}
        </div>
      )}
    </nav>
  );
}
