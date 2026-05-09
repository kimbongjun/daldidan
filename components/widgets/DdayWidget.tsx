"use client";

import { differenceInCalendarDays } from "date-fns";
import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/queryKeys";
import { fetchWithTimeout } from "@/lib/fetch-with-timeout";
import type { DdayProfile } from "@/app/api/dday/profiles/route";

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
        padding: "0.3rem 0.625rem",
        overflowX: "auto",
        scrollbarWidth: "none",
        flexShrink: 1,
        minWidth: 0,
      }}
    >
      {items.map((item, i) => (
        <div
          key={item.key}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.2rem",
            flexShrink: 0,
            paddingLeft: i > 0 ? "0.5rem" : 0,
            paddingRight: i < items.length - 1 ? "0.5rem" : 0,
            borderRight: i < items.length - 1 ? "1px solid var(--border)" : "none",
          }}
        >
          <span style={{ fontSize: "0.8rem", lineHeight: 1 }}>{item.emoji}</span>
          <span style={{ fontSize: "0.65rem", color: "var(--text-muted)", whiteSpace: "nowrap" }}>
            {item.label}
          </span>
          <span
            style={{
              fontSize: "0.72rem",
              fontWeight: 700,
              color: "var(--text-primary)",
              whiteSpace: "nowrap",
            }}
          >
            {item.value}
          </span>
        </div>
      ))}
    </div>
  );
}
