"use client";

import type { LucideIcon } from "lucide-react";
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

export default function BottomNav() {
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
    </nav>
  );
}
