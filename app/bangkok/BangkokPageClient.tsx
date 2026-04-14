"use client";

import { useState } from "react";
import { ExternalLink, MapPin } from "lucide-react";
import type { BangkokCategory, BangkokFilter, BangkokItem } from "@/lib/data/bangkok";

const ACCENT = "#F59E0B";

const CATEGORY_BG: Record<BangkokCategory, string> = {
  관광지: "linear-gradient(135deg, rgba(212,160,23,0.80), rgba(139,90,43,0.80))",
  음식: "linear-gradient(135deg, rgba(245,158,11,0.80), rgba(180,83,9,0.80))",
  쇼핑: "linear-gradient(135deg, rgba(99,102,241,0.80), rgba(49,46,129,0.80))",
  마켓: "linear-gradient(135deg, rgba(244,63,94,0.80), rgba(100,0,50,0.80))",
  술집: "linear-gradient(135deg, rgba(124,58,237,0.80), rgba(76,29,149,0.80))",
  마사지샵: "linear-gradient(135deg, rgba(16,185,129,0.80), rgba(5,100,70,0.80))",
  환율: "linear-gradient(135deg, rgba(6,182,212,0.80), rgba(3,105,161,0.80))",
  호텔: "linear-gradient(135deg, rgba(245,158,11,0.80), rgba(120,53,15,0.80))",
};

export default function BangkokPageClient({
  items,
  categories,
}: {
  items: BangkokItem[];
  categories: BangkokCategory[];
}) {
  const [activeCategory, setActiveCategory] = useState<BangkokFilter>("전체");

  const filtered =
    activeCategory === "전체"
      ? items
      : items.filter((i) => i.category === activeCategory);

  return (
    <div>
      {/* 카테고리 필터 */}
      <div className="flex gap-2 mb-6 overflow-x-auto scrollbar-hide pb-1">
        {(["전체", ...categories] as const).map((cat) => {
          const active = cat === activeCategory;
          return (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className="tag shrink-0 transition-all"
              style={
                active
                  ? { background: ACCENT, color: "#fff" }
                  : {
                      background: "var(--bg-card)",
                      color: "var(--text-muted)",
                      border: "1px solid var(--border)",
                    }
              }
            >
              {cat}
            </button>
          );
        })}
      </div>

      {/* 결과 수 */}
      <p className="text-sm mb-4" style={{ color: "var(--text-muted)" }}>
        총{" "}
        <span style={{ color: "var(--text-primary)", fontWeight: 700 }}>
          {filtered.length}
        </span>
        개 장소
      </p>

      {/* 카드 그리드 */}
      {filtered.length === 0 ? (
        <div
          className="rounded-2xl flex items-center justify-center py-20"
          style={{
            background: "var(--bg-card)",
            border: "1px solid var(--border)",
          }}
        >
          <p style={{ color: "var(--text-muted)" }}>해당 카테고리 장소가 없습니다.</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((item) => (
            <BangkokGridCard key={item.id} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}

function BangkokGridCard({ item }: { item: BangkokItem }) {
  const bg = CATEGORY_BG[item.category];
  const district = item.district ?? item.category;

  const content = (
    <div
      className="bento-card overflow-hidden flex flex-col hover:opacity-90 transition-opacity"
    >
      {/* 썸네일 */}
      <div
        className="relative w-full flex items-center justify-center"
        style={{
          aspectRatio: "16/9",
          background: bg,
          fontSize: "3.5rem",
        }}
      >
        {item.emoji}
        {/* 카테고리 뱃지 */}
        <div className="absolute top-2 left-2">
          <span
            className="tag text-xs"
            style={{
              background: "rgba(0,0,0,0.35)",
              color: "#FDE68A",
              backdropFilter: "blur(6px)",
            }}
          >
            {item.category}
          </span>
        </div>
        {item.url && (
          <div className="absolute top-2 right-2">
            <ExternalLink size={14} style={{ color: "rgba(255,255,255,0.7)" }} />
          </div>
        )}
      </div>

      {/* 내용 */}
      <div className="p-4 flex flex-col gap-2 flex-1">
        <p
          className="text-base font-bold leading-snug"
          style={{ color: "var(--text-primary)" }}
        >
          {item.name}
        </p>
        <div className="flex items-center gap-1.5 min-w-0">
          <MapPin size={12} style={{ color: "var(--text-muted)", flexShrink: 0 }} />
          <p className="text-sm truncate" style={{ color: "var(--text-muted)" }}>
            {district}
          </p>
        </div>
        <p
          className="text-sm leading-snug line-clamp-2"
          style={{ color: "var(--text-muted)" }}
        >
          {item.description}
        </p>
        {item.price && (
          <p className="text-sm font-semibold mt-auto" style={{ color: ACCENT }}>
            {item.price}
          </p>
        )}
        {item.hotelLinks && item.hotelLinks.length > 0 && (
          <div className="flex gap-2 mt-1">
            {item.hotelLinks.map((link) => (
              <a
                key={link.platform}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="flex items-center gap-1 rounded-lg px-3 py-1 text-xs font-semibold transition-opacity hover:opacity-70"
                style={
                  link.platform === "agoda"
                    ? { background: "rgba(239,68,68,0.15)", color: "#EF4444" }
                    : { background: "rgba(59,130,246,0.15)", color: "#3B82F6" }
                }
              >
                {link.platform === "agoda" ? "Agoda" : "Hotels.com"}
                <ExternalLink size={10} />
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  if (item.url) {
    return (
      <a
        href={item.url}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`${item.name} 바로가기`}
      >
        {content}
      </a>
    );
  }

  return <div>{content}</div>;
}
