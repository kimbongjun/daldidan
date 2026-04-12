"use client";

import Link from "next/link";
import { ArrowRight, Film, Music, Palette, Star } from "lucide-react";
import { CultureItem } from "@/lib/data/types";
import { typeLabel } from "@/lib/data/format";

const TYPE_CONFIG = {
  movie: { icon: Film, color: "#F43F5E", bg: "#F43F5E22" },
  concert: { icon: Music, color: "#7C3AED", bg: "#7C3AED22" },
  exhibition: { icon: Palette, color: "#06B6D4", bg: "#06B6D422" },
};

export default function EventWidget({ items, source }: { items: CultureItem[]; source: string }) {
  return (
    <div className="bento-card gradient-rose h-full flex flex-col p-5 gap-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: "#F43F5E" }}>문화생활</p>
          <h2 className="text-lg font-bold text-white">상영중 · 예매중 · 진행중</h2>
          <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>{source === "mixed-live" ? "실데이터 수집" : "API 연결 전 fallback 데이터"}</p>
        </div>
        <Link href="/culture" className="flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg transition-opacity hover:opacity-70" style={{ background: "#F43F5E22", color: "#F43F5E" }}>
          상세보기 <ArrowRight size={11} />
        </Link>
      </div>

      <div className="flex flex-col gap-3 flex-1 overflow-auto scrollbar-hide">
        {items.slice(0, 5).map((item) => {
          const config = TYPE_CONFIG[item.type];
          const Icon = config.icon;
          return (
            <Link key={item.id} href={`/culture/${item.slug}`} className="rounded-xl p-3 flex items-center gap-3 hover:opacity-80 transition-opacity" style={{ background: "rgba(255,255,255,0.04)" }}>
              <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0" style={{ background: config.bg }}>
                <Icon size={18} style={{ color: config.color }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white truncate">{item.title}</p>
                <p className="text-xs mt-0.5" style={{ color: "#8B8BA7" }}>{item.venue}</p>
              </div>
              <div className="text-right shrink-0">
                <span className="tag text-xs" style={{ background: config.bg, color: config.color }}>{typeLabel(item.type)}</span>
                {typeof item.rating === "number" ? (
                  <div className="flex items-center gap-0.5 justify-end mt-1">
                    <Star size={9} fill="#F59E0B" style={{ color: "#F59E0B" }} />
                    <span className="text-xs font-semibold" style={{ color: "#F59E0B" }}>{item.rating}</span>
                  </div>
                ) : null}
                <p className="text-xs mt-0.5" style={{ color: "#8B8BA7" }}>{item.dateLabel}</p>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
