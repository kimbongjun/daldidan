"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Calendar, MapPin } from "lucide-react";
import { FestivalItem, FestivalResponse, FestivalStatus, REGION_GROUPS } from "@/lib/data/festival";

const ACCENT = "#10B981";

const STATUS_STYLE: Record<FestivalStatus, { bg: string; color: string; label: string }> = {
  진행중: { bg: "#10B98122", color: "#10B981", label: "진행중" },
  예정:   { bg: "#F59E0B22", color: "#F59E0B", label: "예정" },
  종료:   { bg: "#8B8BA722", color: "#8B8BA7", label: "종료" },
};

function FreeTag({ isFree }: { isFree: boolean | null }) {
  if (isFree === null) return null;
  return (
    <span
      className="tag shrink-0"
      style={
        isFree
          ? { background: "#10B98122", color: "#10B981" }
          : { background: "#F59E0B22", color: "#F59E0B" }
      }
    >
      {isFree ? "무료" : "유료"}
    </span>
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

  const allItems: FestivalItem[] = data?.items ?? [];

  const selectedGroup = REGION_GROUPS.find((g) => g.label === regionFilter);
  const filtered =
    !selectedGroup || selectedGroup.codes.length === 0
      ? allItems
      : allItems.filter((i) => selectedGroup.codes.includes(i.areaCode));

  const visible = filtered.slice(0, 6);

  return (
    <div className="bento-card gradient-emerald h-full flex flex-col p-5 gap-4">
      {/* 헤더 */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: ACCENT }}>
            축제 / 행사
          </p>
          <h2 className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>
            국내 행사·축제
          </h2>
          <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
            {data
              ? data.source === "fallback"
                ? "샘플 데이터 — TOUR_API_KEY 설정 시 실정보 수집"
                : "한국관광공사 / 서울시 실데이터"
              : "불러오는 중..."}
          </p>
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
      <div className="flex gap-1.5 overflow-x-auto scrollbar-hide pb-0.5">
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

      {/* 카드 목록 */}
      {!data ? (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>불러오는 중...</p>
        </div>
      ) : visible.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>해당 지역 행사가 없습니다.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 flex-1 overflow-auto scrollbar-hide">
          {visible.map((item) => {
            const st = STATUS_STYLE[item.status];
            return (
              <a
                key={item.id}
                href={item.detailUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-xl overflow-hidden flex flex-col cursor-pointer hover:opacity-80 transition-opacity"
                style={{ background: "rgba(255,255,255,0.04)" }}
              >
                {/* 썸네일 */}
                <div
                  className="relative w-full"
                  style={{ aspectRatio: "16/9", background: "rgba(255,255,255,0.06)" }}
                >
                  {item.thumbnail ? (
                    <Image
                      src={item.thumbnail}
                      alt={item.title}
                      fill
                      sizes="(max-width:640px) 100vw, (max-width:1024px) 50vw, 33vw"
                      className="object-cover"
                      unoptimized
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-2xl">🎪</div>
                  )}
                  {/* 상태 뱃지 */}
                  <span
                    className="absolute top-2 left-2 tag text-xs"
                    style={{ background: st.bg, color: st.color, backdropFilter: "blur(4px)" }}
                  >
                    {st.label}
                  </span>
                </div>

                {/* 정보 */}
                <div className="p-2.5 flex flex-col gap-1">
                  <p className="text-sm font-semibold leading-tight line-clamp-2" style={{ color: "var(--text-primary)" }}>
                    {item.title}
                  </p>
                  <div className="flex items-center gap-1 min-w-0">
                    <MapPin size={10} style={{ color: "var(--text-muted)", flexShrink: 0 }} />
                    <p className="text-xs truncate" style={{ color: "var(--text-muted)" }}>{item.region}</p>
                    <FreeTag isFree={item.isFree} />
                  </div>
                  <div className="flex items-center gap-1">
                    <Calendar size={10} style={{ color: "var(--text-muted)", flexShrink: 0 }} />
                    <p className="text-xs" style={{ color: "var(--text-muted)" }}>{item.dateLabel}</p>
                  </div>
                </div>
              </a>
            );
          })}
        </div>
      )}
    </div>
  );
}
