"use client";
import { useAppStore } from "@/store/useAppStore";
import { Film, Music, Palette, Star } from "lucide-react";

const TYPE_CONFIG = {
  movie:      { icon: Film,    color: "#F43F5E", bg: "#F43F5E22", label: "영화" },
  concert:    { icon: Music,   color: "#7C3AED", bg: "#7C3AED22", label: "공연" },
  exhibition: { icon: Palette, color: "#06B6D4", bg: "#06B6D422", label: "전시" },
};

export default function EventWidget() {
  const events = useAppStore((s) => s.events);

  return (
    <div className="bento-card gradient-rose h-full flex flex-col p-5 gap-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: "#F43F5E" }}>문화생활</p>
          <h2 className="text-lg font-bold text-white">영화 · 공연 · 전시</h2>
        </div>
        <span className="tag" style={{ background: "#F43F5E22", color: "#F43F5E" }}>이번 달</span>
      </div>

      <div className="flex flex-col gap-3 flex-1 overflow-auto scrollbar-hide">
        {events.map((ev) => {
          const cfg = TYPE_CONFIG[ev.type];
          const Icon = cfg.icon;
          return (
            <div
              key={ev.id}
              className="rounded-xl p-3 flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity"
              style={{ background: "rgba(255,255,255,0.04)" }}
            >
              <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0" style={{ background: cfg.bg }}>
                <Icon size={18} style={{ color: cfg.color }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white truncate">{ev.title}</p>
                <p className="text-xs mt-0.5" style={{ color: "#8B8BA7" }}>{ev.venue}</p>
              </div>
              <div className="text-right shrink-0">
                <span className="tag text-xs" style={{ background: cfg.bg, color: cfg.color }}>
                  {ev.tag ?? cfg.label}
                </span>
                {ev.rating && (
                  <div className="flex items-center gap-0.5 justify-end mt-1">
                    <Star size={9} fill="#F59E0B" style={{ color: "#F59E0B" }} />
                    <span className="text-xs font-semibold" style={{ color: "#F59E0B" }}>{ev.rating}</span>
                  </div>
                )}
                <p className="text-xs mt-0.5" style={{ color: "#8B8BA7" }}>{ev.date}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
