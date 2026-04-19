"use client";

import Link from "next/link";
import Image from "next/image";
import { useState, useMemo } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { BlogPostSummary } from "@/lib/blog-shared";
import { formatBlogDateTime } from "@/lib/blog-shared";

const ACCENT = "#EA580C";
const DAYS_OF_WEEK = ["일", "월", "화", "수", "목", "금", "토"];

const CATEGORY_COLORS: Record<string, { bg: string; color: string }> = {
  여행: { bg: "rgba(16,185,129,0.15)", color: "#10B981" },
  스윙: { bg: "rgba(99,102,241,0.15)", color: "#6366F1" },
  일상: { bg: "rgba(234,88,12,0.15)", color: "#EA580C" },
  육아: { bg: "rgba(244,63,94,0.15)", color: "#F43F5E" },
  재테크: { bg: "rgba(245,158,11,0.15)", color: "#F59E0B" },
  기타: { bg: "rgba(139,139,167,0.15)", color: "#8B8BA7" },
};

function getCalendarDays(year: number, month: number): (number | null)[] {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startDow = firstDay.getDay();

  const days: (number | null)[] = [];
  for (let i = 0; i < startDow; i++) days.push(null);
  for (let d = 1; d <= lastDay.getDate(); d++) days.push(d);
  while (days.length % 7 !== 0) days.push(null);
  return days;
}

export default function BlogMonthlyView({ posts }: { posts: BlogPostSummary[] }) {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth()); // 0-indexed
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  function prevMonth() {
    if (month === 0) { setYear((y) => y - 1); setMonth(11); }
    else setMonth((m) => m - 1);
    setSelectedDay(null);
  }

  function nextMonth() {
    if (month === 11) { setYear((y) => y + 1); setMonth(0); }
    else setMonth((m) => m + 1);
    setSelectedDay(null);
  }

  // 현재 달에 속하는 글들만 날짜별로 분류
  const postsByDay = useMemo(() => {
    const map = new Map<number, BlogPostSummary[]>();
    for (const post of posts) {
      const d = new Date(post.publishedAt);
      if (d.getFullYear() === year && d.getMonth() === month) {
        const day = d.getDate();
        if (!map.has(day)) map.set(day, []);
        map.get(day)!.push(post);
      }
    }
    return map;
  }, [posts, year, month]);

  // 현재 달 전체 글 수
  const monthlyTotal = useMemo(() => {
    let count = 0;
    postsByDay.forEach((arr) => { count += arr.length; });
    return count;
  }, [postsByDay]);

  const calendarDays = useMemo(() => getCalendarDays(year, month), [year, month]);
  const selectedPosts = selectedDay != null ? (postsByDay.get(selectedDay) ?? []) : [];

  const isToday = (day: number) =>
    year === today.getFullYear() && month === today.getMonth() && day === today.getDate();

  return (
    <div className="flex flex-col gap-6">
      <div className="bento-card p-5 sm:p-6">
        {/* ── 월 네비게이션 ── */}
        <div className="flex items-center justify-between mb-5">
          <button
            type="button"
            onClick={prevMonth}
            className="pressable rounded-xl p-2 transition-colors hover:opacity-70"
            style={{ background: "var(--bg-input)", color: "var(--text-muted)" }}
            aria-label="이전 달"
          >
            <ChevronLeft size={16} />
          </button>

          <div className="flex items-center gap-3">
            <h2 className="text-lg font-black" style={{ color: "var(--text-primary)" }}>
              <span style={{ color: ACCENT }}>{year}년</span> {month + 1}월
            </h2>
            {monthlyTotal > 0 && (
              <span
                className="text-xs font-semibold px-2 py-0.5 rounded-full"
                style={{ background: "rgba(234,88,12,0.14)", color: ACCENT }}
              >
                {monthlyTotal}편
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={nextMonth}
            className="pressable rounded-xl p-2 transition-colors hover:opacity-70"
            style={{ background: "var(--bg-input)", color: "var(--text-muted)" }}
            aria-label="다음 달"
          >
            <ChevronRight size={16} />
          </button>
        </div>

        {/* ── 요일 헤더 ── */}
        <div className="grid grid-cols-7 mb-1">
          {DAYS_OF_WEEK.map((day, i) => (
            <div
              key={day}
              className="text-center text-xs font-bold py-2"
              style={{
                color: i === 0 ? "#F43F5E" : i === 6 ? "#6366F1" : "var(--text-muted)",
              }}
            >
              {day}
            </div>
          ))}
        </div>

        {/* ── 날짜 그리드 ── */}
        <div className="grid grid-cols-7 gap-0.5">
          {calendarDays.map((day, i) => {
            if (day === null) {
              return <div key={`empty-${i}`} className="aspect-square" />;
            }
            const hasPosts = postsByDay.has(day);
            const isSelected = selectedDay === day;
            const dayOfWeek = i % 7;

            return (
              <button
                key={day}
                type="button"
                onClick={() => {
                  if (!hasPosts) return;
                  setSelectedDay((prev) => (prev === day ? null : day));
                }}
                className="pressable aspect-square rounded-xl flex flex-col items-center justify-center gap-0.5 transition-all"
                style={{
                  background: isSelected
                    ? "rgba(234,88,12,0.18)"
                    : hasPosts && !isSelected
                    ? "var(--bg-input)"
                    : "transparent",
                  border: isSelected
                    ? "1px solid rgba(234,88,12,0.45)"
                    : isToday(day)
                    ? "1px solid rgba(234,88,12,0.3)"
                    : "1px solid transparent",
                  cursor: hasPosts ? "pointer" : "default",
                }}
                aria-label={`${month + 1}월 ${day}일${hasPosts ? ` (${postsByDay.get(day)!.length}편)` : ""}`}
              >
                <span
                  className="text-sm font-semibold leading-none"
                  style={{
                    color: isSelected
                      ? ACCENT
                      : isToday(day)
                      ? ACCENT
                      : dayOfWeek === 0
                      ? "rgba(244,63,94,0.8)"
                      : dayOfWeek === 6
                      ? "rgba(99,102,241,0.8)"
                      : "var(--text-primary)",
                    fontWeight: isToday(day) ? 800 : 600,
                  }}
                >
                  {day}
                </span>
                {hasPosts && (
                  <span
                    className="rounded-full"
                    style={{
                      width: 5,
                      height: 5,
                      background: isSelected ? ACCENT : "rgba(234,88,12,0.6)",
                      flexShrink: 0,
                    }}
                  />
                )}
              </button>
            );
          })}
        </div>

        {/* ── 선택된 날짜의 글 목록 (depth) ── */}
        {selectedDay != null && selectedPosts.length > 0 && (
          <div
            className="mt-4 rounded-2xl p-4 flex flex-col gap-3"
            style={{
              background: "rgba(234,88,12,0.06)",
              border: "1px solid rgba(234,88,12,0.18)",
            }}
          >
            <p className="text-xs font-bold" style={{ color: ACCENT }}>
              {month + 1}월 {selectedDay}일 · {selectedPosts.length}편
            </p>
            {selectedPosts.map((post) => {
              const catStyle = post.category ? CATEGORY_COLORS[post.category] : null;
              return (
                <Link
                  key={post.id}
                  href={`/blog/${encodeURIComponent(post.slug)}`}
                  className="pressable flex items-center gap-3 rounded-xl p-3 transition-opacity hover:opacity-80"
                  style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
                >
                  {post.thumbnailUrl ? (
                    <div className="relative shrink-0 rounded-lg overflow-hidden" style={{ width: 56, height: 40 }}>
                      <Image
                        src={post.thumbnailUrl}
                        alt={post.title}
                        fill
                        sizes="56px"
                        className="object-cover"
                        unoptimized
                      />
                    </div>
                  ) : (
                    <div
                      className="shrink-0 rounded-lg flex items-center justify-center"
                      style={{
                        width: 56, height: 40,
                        background: "linear-gradient(135deg, rgba(234,88,12,0.1), rgba(234,88,12,0.03))",
                      }}
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgba(234,88,12,0.4)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" />
                        <polyline points="21 15 16 10 5 21" />
                      </svg>
                    </div>
                  )}
                  <div className="flex-1 min-w-0 flex flex-col gap-1">
                    <p
                      className="text-sm font-bold leading-snug truncate"
                      style={{ color: "var(--text-primary)" }}
                    >
                      {post.title}
                    </p>
                    <div className="flex items-center gap-2">
                      <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                        {formatBlogDateTime(post.publishedAt)}
                      </span>
                      {post.category && catStyle && (
                        <span
                          className="text-xs font-semibold px-1.5 py-0.5 rounded-md"
                          style={{ background: catStyle.bg, color: catStyle.color }}
                        >
                          {post.category}
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {/* 해당 달에 글이 없을 때 안내 */}
      {monthlyTotal === 0 && (
        <div
          className="bento-card p-8 text-center"
          style={{ color: "var(--text-muted)" }}
        >
          <p className="text-sm">{year}년 {month + 1}월에 작성된 글이 없습니다.</p>
        </div>
      )}
    </div>
  );
}
