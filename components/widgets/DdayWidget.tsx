"use client";

import { differenceInCalendarDays } from "date-fns";
import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/queryKeys";
import { fetchWithTimeout } from "@/lib/fetch-with-timeout";
import { useState } from "react";

function calcElapsed(dateStr: string): number | null {
  if (!dateStr) return null;
  const target = new Date(dateStr + "T00:00:00");
  if (isNaN(target.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const days = differenceInCalendarDays(today, target) + 1;
  return days > 0 ? days : null;
}

function calcNextOccurrence(month: number, day: number): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const year = today.getFullYear();
  let target = new Date(year, month - 1, day);
  if (differenceInCalendarDays(target, today) < 0) {
    target = new Date(year + 1, month - 1, day);
  }
  return differenceInCalendarDays(target, today);
}

function formatElapsed(days: number): string {
  return `D+${days.toLocaleString()}일`;
}

function formatDday(days: number): string {
  if (days === 0) return "D-Day";
  return `D-${days}`;
}

type DdayItem = {
  key: string;
  emoji: string;
  value: string;
};

export default function DdayWidget() {
  const [hoveredKey, setHoveredKey] = useState<string | null>(null);

  const { data: settings } = useQuery<Record<string, string>>({
    queryKey: queryKeys.siteSettings.all,
    queryFn: () =>
      fetchWithTimeout("/api/site-settings", {}, 6000).then((r) => r.json() as Promise<Record<string, string>>),
    staleTime: 5 * 60 * 1000,
  });

  const metDate = settings?.met_date ?? "";
  const marriedDate = settings?.married_date ?? "";

  const items: DdayItem[] = [];

  if (metDate) {
    const days = calcElapsed(metDate);
    if (days !== null) {
      items.push({ key: "met", emoji: "💑", value: formatElapsed(days) });
    }
  }

  if (marriedDate) {
    const days = calcElapsed(marriedDate);
    if (days !== null) {
      items.push({ key: "married", emoji: "💍", value: formatElapsed(days) });
    }
  }

  if (marriedDate) {
    const d = new Date(marriedDate + "T00:00:00");
    if (!isNaN(d.getTime())) {
      const daysLeft = calcNextOccurrence(d.getMonth() + 1, d.getDate());
      items.push({ key: "anniversary", emoji: "🎂", value: formatDday(daysLeft) });
    }
  }

  if (items.length === 0) return null;

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(${items.length}, 1fr)`,
        background: "var(--bg-card)",
        border: "1px solid var(--border)",
        borderRadius: "0.75rem",
        overflow: "hidden",
      }}
    >
      <style>{`
        @keyframes dday-bounce {
          0%, 100% { transform: translateY(0) scale(1); }
          30% { transform: translateY(-4px) scale(1.2); }
          60% { transform: translateY(-1px) scale(1.05); }
        }
      `}</style>
      {items.map((item, i) => {
        const isHovered = hoveredKey === item.key;
        return (
          <div
            key={item.key}
            onMouseEnter={() => setHoveredKey(item.key)}
            onMouseLeave={() => setHoveredKey(null)}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "0.3rem",
              padding: "0.35rem 0.5rem",
              borderRight: i < items.length - 1 ? "1px solid var(--border)" : "none",
              background: isHovered ? "rgba(124,58,237,0.08)" : "transparent",
              transition: "background 0.2s ease",
              cursor: "default",
              minWidth: 0,
            }}
          >
            <span
              style={{
                fontSize: "0.875rem",
                lineHeight: 1,
                flexShrink: 0,
                display: "inline-block",
                animation: isHovered ? "dday-bounce 0.6s ease forwards" : "none",
              }}
            >
              {item.emoji}
            </span>
            <span
              style={{
                fontSize: "0.72rem",
                fontWeight: 700,
                whiteSpace: "nowrap",
                transition: "color 0.2s ease",
                color: isHovered ? "#7C3AED" : "var(--text-primary)",
              }}
            >
              {item.value}
            </span>
          </div>
        );
      })}
    </div>
  );
}
