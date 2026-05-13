"use client";

import { differenceInCalendarDays } from "date-fns";
import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/queryKeys";
import { fetchWithTimeout } from "@/lib/fetch-with-timeout";
import type { DdayProfile } from "@/app/api/dday/profiles/route";
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
  if (days === 0) return "D-Day 🥳";
  return `D-${days}`;
}

type DdayItem = {
  key: string;
  emoji: string;
  label: string;
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

  const { data: profiles = [] } = useQuery<DdayProfile[]>({
    queryKey: queryKeys.dday.profiles,
    queryFn: () =>
      fetchWithTimeout("/api/dday/profiles", {}, 6000).then((r) => r.json() as Promise<DdayProfile[]>),
    staleTime: 5 * 60 * 1000,
  });

  const metDate = settings?.met_date ?? "";
  const marriedDate = settings?.married_date ?? "";

  const items: DdayItem[] = [];

  if (metDate) {
    const days = calcElapsed(metDate);
    if (days !== null) {
      items.push({ key: "met", emoji: "💑", label: "만난 지", value: formatElapsed(days) });
    }
  }

  if (marriedDate) {
    const days = calcElapsed(marriedDate);
    if (days !== null) {
      items.push({ key: "married", emoji: "💍", label: "결혼한 지", value: formatElapsed(days) });
    }
  }

  if (marriedDate) {
    const d = new Date(marriedDate + "T00:00:00");
    if (!isNaN(d.getTime())) {
      const daysLeft = calcNextOccurrence(d.getMonth() + 1, d.getDate());
      items.push({ key: "anniversary", emoji: "🎂", label: "기념일", value: formatDday(daysLeft) });
    }
  }

  for (const profile of profiles) {
    if (profile.birth_month && profile.birth_day && profile.display_name) {
      const daysLeft = calcNextOccurrence(profile.birth_month, profile.birth_day);
      items.push({
        key: `bday-${profile.id}`,
        emoji: "🎁",
        label: profile.display_name,
        value: formatDday(daysLeft),
      });
    }
  }

  if (items.length === 0) return null;

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 0,
        background: "var(--bg-card)",
        border: "1px solid var(--border)",
        borderRadius: "0.75rem",
        padding: "0.35rem 0.5rem",
        overflowX: "auto",
        scrollbarWidth: "none",
        width: "100%",
      }}
    >
      <style>{`
        @keyframes dday-bounce {
          0%, 100% { transform: translateY(0) scale(1); }
          30% { transform: translateY(-4px) scale(1.2); }
          60% { transform: translateY(-1px) scale(1.05); }
        }
        @keyframes dday-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.6; }
        }
      `}</style>
      {items.map((item, i) => {
        const isHovered = hoveredKey === item.key;
        return (
          <div
            key={item.key}
            style={{
              display: "flex",
              alignItems: "center",
              flexShrink: 0,
              paddingLeft: i > 0 ? "0.5rem" : "0.25rem",
              paddingRight: i < items.length - 1 ? "0.5rem" : "0.25rem",
              borderRight: i < items.length - 1 ? "1px solid var(--border)" : "none",
            }}
          >
            <div
              onMouseEnter={() => setHoveredKey(item.key)}
              onMouseLeave={() => setHoveredKey(null)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.3rem",
                borderRadius: "0.5rem",
                padding: "0.2rem 0.4rem",
                background: isHovered ? "rgba(124,58,237,0.08)" : "transparent",
                transition: "background 0.2s ease, transform 0.15s ease",
                transform: isHovered ? "scale(1.04)" : "scale(1)",
                cursor: "default",
              }}
            >
              <span
                style={{
                  fontSize: "0.875rem",
                  lineHeight: 1,
                  display: "inline-block",
                  animation: isHovered ? "dday-bounce 0.6s ease forwards" : "none",
                }}
              >
                {item.emoji}
              </span>
              <span
                style={{
                  fontSize: "0.65rem",
                  color: "var(--text-muted)",
                  whiteSpace: "nowrap",
                  transition: "color 0.2s ease",
                  ...(isHovered ? { color: "rgba(124,58,237,0.7)" } : {}),
                }}
              >
                {item.label}
              </span>
              <span
                style={{
                  fontSize: "0.75rem",
                  fontWeight: 700,
                  whiteSpace: "nowrap",
                  transition: "color 0.2s ease",
                  color: isHovered ? "#7C3AED" : "var(--text-primary)",
                }}
              >
                {item.value}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
