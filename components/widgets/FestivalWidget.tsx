"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Calendar, MapPin } from "lucide-react";
import { FestivalItem, FestivalResponse, FestivalStatus, REGION_GROUPS } from "@/lib/data/festival";

const ACCENT = "#10B981";

// D-day 계산 (예정 행사에만 표시)
function getDday(startDate: string): string {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const start = new Date(
    `${startDate.slice(0, 4)}-${startDate.slice(4, 6)}-${startDate.slice(6, 8)}`
  );
  const diff = Math.ceil((start.getTime() - today.getTime()) / 86_400_000);
  if (diff === 0) return "D-Day";
  if (diff > 0) return `D-${diff}`;
  return "";
}

const STATUS_CONFIG: Partial<Record<
  FestivalStatus,
  { bg: string; color: string; label: string; pulse: boolean }
>> = {
  진행중: { bg: "rgba(16,185,129,0.25)", color: "#10B981", label: "진행중", pulse: true },
  예정:   { bg: "rgba(245,158,11,0.25)", color: "#F59E0B", label: "예정",   pulse: false },
};

function StatusBadge({ status, startDate }: { status: FestivalStatus; startDate: string }) {
  const cfg = STATUS_CONFIG[status];
  if (!cfg) return null;
  const dday = status === "예정" ? getDday(startDate) : "";
  return (
    <div className="flex items-center gap-1.5">
      <span
        className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold"
        style={{ background: cfg.bg, color: cfg.color }}
      >
        {cfg.pulse && (
          <span
            className="w-1.5 h-1.5 rounded-full animate-pulse inline-block"
            style={{ background: cfg.color }}
          />
        )}
        {cfg.label}
      </span>
      {dday && (
        <span className="text-xs font-bold tabular-nums" style={{ color: "#F59E0B" }}>
          {dday}
        </span>
      )}
    </div>
  );
}

// 스켈레톤 카드
function SkeletonCard() {
  return (
    <div
      className="shrink-0 rounded-xl overflow-hidden animate-pulse"
      style={{ width: 168, height: 224, background: "rgba(255,255,255,0.06)" }}
    >
      <div className="w-full h-full" />
    </div>
  );
}

export default function FestivalWidget() {
  const [data, setData] = useState<FestivalResponse | null>(null);
  const [regionFilter, setRegionFilter] = useState<string>("전체");

  useEffect(() => {
    fetch("/api/festival")
      .then((r) => r.json())
      .then((d: FestivalResponse) => setData(d))
      .catch(() => null);
  }, []);

  const { ongoingCount, upcomingCount, visible } = useMemo(() => {
    const allItems: FestivalItem[] = data?.items ?? [];
    const active = allItems.filter((i) => i.status !== "종료");
    const selectedGroup = REGION_GROUPS.find((g) => g.label === regionFilter);
    const filtered =
      !selectedGroup || selectedGroup.codes.length === 0
        ? active
        : active.filter((i) => selectedGroup.codes.includes(i.areaCode));
    return {
      ongoingCount: active.filter((i) => i.status === "진행중").length,
      upcomingCount: active.filter((i) => i.status === "예정").length,
      visible: filtered.slice(0, 10),
    };
  }, [data, regionFilter]);

  return (
    <div className="bento-card gradient-emerald h-full flex flex-col p-5 gap-3">
      {/* 헤더 */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: ACCENT }}>
            축제 / 행사
          </p>
          <h2 className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>
            국내 행사·축제
          </h2>
          {/* 실데이터 여부 + 진행중/예정 카운트 */}
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            {data ? (
              <>
                {data.source !== "fallback" ? (
                  <>
                    {ongoingCount > 0 && (
                      <span className="flex items-center gap-1 text-xs" style={{ color: "#10B981" }}>
                        <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse inline-block" />
                        진행중 {ongoingCount}
                      </span>
                    )}
                    {upcomingCount > 0 && (
                      <span className="text-xs" style={{ color: "#F59E0B" }}>
                        예정 {upcomingCount}
                      </span>
                    )}
                  </>
                ) : (
                  <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                    샘플 데이터 — TOUR_API_KEY 설정 필요
                  </span>
                )}
              </>
            ) : (
              <span className="text-xs" style={{ color: "var(--text-muted)" }}>불러오는 중...</span>
            )}
          </div>
        </div>
        <Link
          href="/festival"
          className="flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg shrink-0 transition-opacity hover:opacity-70"
          style={{ background: "#10B98122", color: ACCENT }}
        >
          전체보기 <ArrowRight size={11} />
        </Link>
      </div>

      {/* 지역 필터 */}
      <div className="flex gap-1.5 overflow-x-auto scrollbar-hide">
        {REGION_GROUPS.map((g) => {
          const active = regionFilter === g.label;
          return (
            <button
              key={g.label}
              onClick={() => setRegionFilter(g.label)}
              className="tag shrink-0 transition-all"
              style={
                active
                  ? { background: ACCENT, color: "#fff" }
                  : { background: "#10B98115", color: "var(--text-muted)" }
              }
            >
              {g.label}
            </button>
          );
        })}
      </div>

      {/* 카드 목록 — 가로 스크롤 */}
      <div className="flex gap-3 overflow-x-auto scrollbar-hide flex-1 pb-0.5">
        {!data ? (
          // 스켈레톤
          <>
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </>
        ) : visible.length === 0 ? (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>해당 지역 행사가 없습니다.</p>
          </div>
        ) : (
          visible.map((item) => <FestivalCard key={item.id} item={item} />)
        )}
      </div>
    </div>
  );
}

function FestivalCard({ item }: { item: FestivalItem }) {
  return (
    <a
      href={item.detailUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="relative shrink-0 rounded-xl overflow-hidden cursor-pointer group"
      style={{ width: 168, minWidth: 168, height: "100%" }}
    >
      {/* 배경 이미지 */}
      {item.thumbnail ? (
        <Image
          src={item.thumbnail}
          alt={item.title}
          fill
          sizes="168px"
          className="object-cover transition-transform duration-300 group-hover:scale-105"
          unoptimized
        />
      ) : (
        <div
          className="absolute inset-0 flex items-center justify-center text-4xl"
          style={{ background: "rgba(16,185,129,0.12)" }}
        >
          🎪
        </div>
      )}

      {/* 그라디언트 오버레이 */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(to bottom, rgba(0,0,0,0.15) 0%, transparent 35%, rgba(0,0,0,0.75) 70%, rgba(0,0,0,0.92) 100%)",
        }}
      />

      {/* 상단: 상태 뱃지 + 무료/유료 */}
      <div className="absolute top-2.5 left-2.5 right-2.5 flex items-start justify-between gap-1">
        <StatusBadge status={item.status} startDate={item.startDate} />
        {item.isFree !== null && (
          <span
            className="text-xs px-1.5 py-0.5 rounded-full font-semibold shrink-0"
            style={
              item.isFree
                ? { background: "rgba(16,185,129,0.3)", color: "#10B981" }
                : { background: "rgba(245,158,11,0.3)", color: "#F59E0B" }
            }
          >
            {item.isFree ? "무료" : "유료"}
          </span>
        )}
      </div>

      {/* 하단: 제목 + 날짜 + 지역 */}
      <div className="absolute bottom-0 left-0 right-0 p-3 flex flex-col gap-1">
        <p
          className="text-sm font-bold leading-snug line-clamp-2"
          style={{ color: "#fff" }}
        >
          {item.title}
        </p>
        <div className="flex items-center gap-1">
          <MapPin size={10} color="rgba(255,255,255,0.65)" />
          <span className="text-xs truncate" style={{ color: "rgba(255,255,255,0.65)" }}>
            {item.region}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <Calendar size={10} color="rgba(255,255,255,0.55)" />
          <span className="text-xs leading-tight" style={{ color: "rgba(255,255,255,0.55)" }}>
            {item.dateLabel}
          </span>
        </div>
      </div>
    </a>
  );
}
