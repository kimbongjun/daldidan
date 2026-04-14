"use client";

import { useState } from "react";
import Image from "next/image";
import { Calendar, ExternalLink, MapPin } from "lucide-react";
import { FestivalItem, FestivalStatus, REGION_GROUPS } from "@/lib/data/festival";

const ACCENT = "#10B981";

const STATUS_STYLE: Record<FestivalStatus, { bg: string; color: string }> = {
  진행중: { bg: "#10B98122", color: "#10B981" },
  예정:   { bg: "#F59E0B22", color: "#F59E0B" },
  종료:   { bg: "#8B8BA722", color: "#8B8BA7" },
};

type PeriodFilter = "전체" | "진행중" | "예정" | "종료";
const PERIOD_TABS: PeriodFilter[] = ["전체", "진행중", "예정", "종료"];

export default function FestivalPageClient({
  items,
  source,
}: {
  items: FestivalItem[];
  source: string;
}) {
  const [region, setRegion] = useState<string>("전체");
  const [period, setPeriod] = useState<PeriodFilter>("전체");

  const regionGroup = REGION_GROUPS.find((g) => g.label === region);

  const filtered = items.filter((item) => {
    const regionOk =
      !regionGroup || regionGroup.codes.length === 0
        ? true
        : regionGroup.codes.includes(item.areaCode);
    const periodOk = period === "전체" ? true : item.status === period;
    return regionOk && periodOk;
  });

  return (
    <div>
      {/* 데이터 출처 */}
      <p className="text-xs mb-5" style={{ color: "var(--text-muted)" }}>
        {source === "fallback"
          ? "현재 샘플 데이터입니다. TOUR_API_KEY (한국관광공사)를 설정하면 실정보로 교체됩니다."
          : "한국관광공사 / 서울시 열린데이터 실데이터"}
      </p>

      {/* 기간 필터 */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {PERIOD_TABS.map((tab) => {
          const active = period === tab;
          return (
            <button
              key={tab}
              onClick={() => setPeriod(tab)}
              className="px-4 py-1.5 rounded-full text-sm font-semibold transition-all"
              style={
                active
                  ? { background: ACCENT, color: "#fff" }
                  : { background: "var(--bg-card)", color: "var(--text-muted)", border: "1px solid var(--border)" }
              }
            >
              {tab}
            </button>
          );
        })}
      </div>

      {/* 지역 필터 */}
      <div className="flex gap-2 mb-6 overflow-x-auto scrollbar-hide pb-1">
        {REGION_GROUPS.map((g) => {
          const active = region === g.label;
          return (
            <button
              key={g.label}
              onClick={() => setRegion(g.label)}
              className="tag shrink-0 transition-all"
              style={
                active
                  ? { background: ACCENT, color: "#fff" }
                  : { background: "var(--bg-card)", color: "var(--text-muted)", border: "1px solid var(--border)" }
              }
            >
              {g.label}
            </button>
          );
        })}
      </div>

      {/* 결과 수 */}
      <p className="text-sm mb-4" style={{ color: "var(--text-muted)" }}>
        총 <span style={{ color: "var(--text-primary)", fontWeight: 700 }}>{filtered.length}</span>개 행사
      </p>

      {/* 카드 그리드 */}
      {filtered.length === 0 ? (
        <div
          className="rounded-2xl flex items-center justify-center py-20"
          style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
        >
          <p style={{ color: "var(--text-muted)" }}>해당 조건의 행사가 없습니다.</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((item) => {
            const st = STATUS_STYLE[item.status];
            return (
              <a
                key={item.id}
                href={item.detailUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="bento-card overflow-hidden flex flex-col hover:opacity-90 transition-opacity"
              >
                {/* 썸네일 */}
                <div
                  className="relative w-full"
                  style={{ aspectRatio: "16/9", background: "var(--border)" }}
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
                    <div
                      className="absolute inset-0 flex items-center justify-center text-4xl"
                      style={{ background: "#10B98110" }}
                    >
                      🎪
                    </div>
                  )}
                  <div className="absolute top-2 left-2 flex gap-1.5">
                    <span
                      className="tag text-xs"
                      style={{ background: st.bg, color: st.color, backdropFilter: "blur(6px)" }}
                    >
                      {item.status}
                    </span>
                    {item.isFree !== null && (
                      <span
                        className="tag text-xs"
                        style={
                          item.isFree
                            ? { background: "#10B98133", color: "#10B981", backdropFilter: "blur(6px)" }
                            : { background: "#F59E0B33", color: "#F59E0B", backdropFilter: "blur(6px)" }
                        }
                      >
                        {item.isFree ? "무료" : "유료"}
                      </span>
                    )}
                  </div>
                  <div className="absolute top-2 right-2">
                    <ExternalLink size={14} style={{ color: "rgba(255,255,255,0.7)" }} />
                  </div>
                </div>

                {/* 내용 */}
                <div className="p-4 flex flex-col gap-2 flex-1">
                  <p className="text-base font-bold leading-snug" style={{ color: "var(--text-primary)" }}>
                    {item.title}
                  </p>
                  <div className="flex items-center gap-1.5 min-w-0">
                    <MapPin size={12} style={{ color: "var(--text-muted)", flexShrink: 0 }} />
                    <p className="text-sm truncate" style={{ color: "var(--text-muted)" }}>
                      {item.region}
                      {item.address && item.address !== item.region ? ` · ${item.address}` : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Calendar size={12} style={{ color: "var(--text-muted)", flexShrink: 0 }} />
                    <p className="text-sm" style={{ color: "var(--text-muted)" }}>{item.dateLabel}</p>
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
