"use client";

import { useEffect, useState } from "react";
import {
  BookOpen,
  Building2,
  CalendarDays,
  MapPinned,
  Ticket,
  TrendingUp,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import type { WidgetId } from "@/store/useLayoutStore";

interface NavItem {
  id: WidgetId;
  label: string;
  Icon: LucideIcon;
  color: string;
}

// 사용자가 요청한 노출 순서: 블로그·캘린더·가계부·로또·증권·여행지도·부동산
const NAV_ITEMS: NavItem[] = [
  { id: "blog", label: "블로그", Icon: BookOpen, color: "#7C3AED" },
  { id: "calendar", label: "캘린더", Icon: CalendarDays, color: "#06B6D4" },
  { id: "budget", label: "가계부", Icon: Wallet, color: "#6366F1" },
  { id: "lotto", label: "로또", Icon: Ticket, color: "#F59E0B" },
  { id: "stock", label: "증권", Icon: TrendingUp, color: "#EA580C" },
  { id: "travel", label: "여행지도", Icon: MapPinned, color: "#10B981" },
  { id: "realestate", label: "부동산", Icon: Building2, color: "#F43F5E" },
];

function visibleWidgetEl(id: string): HTMLElement | undefined {
  const candidates = document.querySelectorAll(`[data-widget-id="${id}"]`);
  return Array.from(candidates).find(
    (c) => (c as HTMLElement).offsetParent !== null,
  ) as HTMLElement | undefined;
}

export default function QuickNav() {
  const [active, setActive] = useState<WidgetId | null>(null);

  const scrollTo = (id: WidgetId) => {
    const el = visibleWidgetEl(id);
    if (!el) return;
    setActive(id);
    window.scrollTo({
      top: el.getBoundingClientRect().top + window.scrollY - 80,
      behavior: "smooth",
    });
  };

  // 스크롤 스파이 — 현재 화면에 보이는 위젯을 활성 표시
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting && (e.target as HTMLElement).offsetParent !== null)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        const id = visible?.target.getAttribute("data-widget-id");
        if (id) setActive(id as WidgetId);
      },
      { rootMargin: "-80px 0px -55% 0px", threshold: [0.1, 0.25, 0.5] },
    );

    const els = document.querySelectorAll("[data-widget-id]");
    els.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  return (
    <nav
      aria-label="주요 메뉴"
      className="quicknav-sticky"
      style={{
        position: "sticky",
        top: 0,
        zIndex: 30,
        margin: "0 -1rem",
        padding: "0.6rem 1rem",
        background: "color-mix(in srgb, var(--bg-base) 82%, transparent)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        borderBottom: "1px solid var(--border)",
      }}
    >
      <ul
        className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide"
        style={{ listStyle: "none", margin: 0, padding: 0 }}
      >
        {NAV_ITEMS.map(({ id, label, Icon, color }) => {
          const isActive = active === id;
          return (
            <li key={id} style={{ flex: "0 0 auto" }}>
              <button
                type="button"
                onClick={() => scrollTo(id)}
                aria-current={isActive ? "true" : undefined}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold whitespace-nowrap transition-all hover:opacity-80"
                style={{
                  background: isActive ? color : "var(--bg-card)",
                  color: isActive ? "#fff" : "var(--text-muted)",
                  border: "1px solid",
                  borderColor: isActive ? color : "var(--border)",
                }}
              >
                <Icon size={15} style={{ color: isActive ? "#fff" : color }} />
                {label}
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
