"use client";

import { useEffect, useState } from "react";
import { MapPin, Star, ExternalLink, LoaderCircle } from "lucide-react";
import type { TravelActivity } from "@/app/api/travel/activities/route";

const KLOOK_COLOR = "#FF5722";
const KKDAY_COLOR = "#00B6BD";
const EMERALD = "#10B981";

function PlatformBadge({ platform }: { platform: "klook" | "kkday" }) {
  const isKlook = platform === "klook";
  return (
    <span
      className="tag shrink-0 font-bold"
      style={{
        background: isKlook ? `${KLOOK_COLOR}22` : `${KKDAY_COLOR}22`,
        color: isKlook ? KLOOK_COLOR : KKDAY_COLOR,
        fontSize: "0.65rem",
        letterSpacing: "0.03em",
      }}
    >
      {isKlook ? "Klook" : "KKday"}
    </span>
  );
}

export default function TravelWidget() {
  const [activities, setActivities] = useState<TravelActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let active = true;
    const controller = new AbortController();

    fetch("/api/travel/activities", { signal: controller.signal })
      .then((r) => r.json())
      .then((data: TravelActivity[]) => {
        if (!active) return;
        setActivities(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => {
        if (!active) return;
        setError(true);
        setLoading(false);
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, []);

  return (
    <div className="bento-card h-full flex flex-col p-5 gap-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: EMERALD }}>여행</p>
          <h2 className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>추천 액티비티</h2>
        </div>
        <span className="tag" style={{ background: `${EMERALD}22`, color: EMERALD }}>봄 시즌</span>
      </div>

      <div className="flex flex-col gap-3 flex-1 overflow-auto scrollbar-hide">
        {loading ? (
          <div className="flex items-center justify-center flex-1">
            <LoaderCircle size={18} className="animate-spin" style={{ color: EMERALD }} />
          </div>
        ) : error ? (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-xs text-center" style={{ color: "var(--text-muted)" }}>
              데이터를 불러오지 못했습니다.
            </p>
          </div>
        ) : (
          activities.map((a) => (
            <a
              key={a.id}
              href={a.url}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-xl p-3 flex items-center gap-3 hover:opacity-80 transition-opacity"
              style={{ background: "rgba(255,255,255,0.04)", textDecoration: "none" }}
            >
              {/* 플랫폼 아이콘 */}
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0 text-lg"
                style={{ background: `${EMERALD}22` }}
              >
                {a.category === "테마파크" ? "🎡" : a.category === "크루즈" ? "🚢" : a.category === "문화투어" ? "🏯" : "🗺️"}
              </div>

              {/* 본문 */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <p className="text-sm font-semibold truncate" style={{ color: "var(--text-primary)" }}>{a.name}</p>
                  {a.tag && (
                    <span className="tag shrink-0" style={{ background: `${EMERALD}22`, color: EMERALD }}>
                      {a.tag}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                  <MapPin size={10} style={{ color: "var(--text-muted)", flexShrink: 0 }} />
                  <p className="text-xs truncate" style={{ color: "var(--text-muted)" }}>{a.location} · {a.category}</p>
                  <PlatformBadge platform={a.platform} />
                </div>
              </div>

              {/* 오른쪽: 평점 + 가격 + 링크 */}
              <div className="text-right shrink-0 max-w-[90px] flex flex-col items-end gap-0.5">
                <div className="flex items-center gap-0.5">
                  <Star size={10} fill={EMERALD} style={{ color: EMERALD }} />
                  <span className="text-xs font-bold" style={{ color: EMERALD }}>{a.rating}</span>
                  <span className="text-xs" style={{ color: "var(--text-muted)" }}>({(a.reviewCount / 1000).toFixed(1)}k)</span>
                </div>
                <div className="flex items-center gap-1">
                  {a.discountPct && (
                    <span className="text-xs font-bold" style={{ color: "#F43F5E" }}>-{a.discountPct}%</span>
                  )}
                  <p className="text-xs font-semibold leading-tight" style={{ color: "var(--text-primary)" }}>{a.price}</p>
                </div>
                {a.originalPrice && (
                  <p className="text-xs leading-tight line-through" style={{ color: "var(--text-muted)" }}>{a.originalPrice}</p>
                )}
                <ExternalLink size={10} style={{ color: "var(--text-muted)" }} />
              </div>
            </a>
          ))
        )}
      </div>
    </div>
  );
}
