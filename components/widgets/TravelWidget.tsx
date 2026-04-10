"use client";
import { useAppStore } from "@/store/useAppStore";
import { MapPin, Star } from "lucide-react";

export default function TravelWidget() {
  const spots = useAppStore((s) => s.travelSpots);

  return (
    <div className="bento-card gradient-emerald h-full flex flex-col p-5 gap-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: "#10B981" }}>여행</p>
          <h2 className="text-lg font-bold text-white">추천 여행지</h2>
        </div>
        <span className="tag" style={{ background: "#10B98122", color: "#10B981" }}>봄 시즌</span>
      </div>

      <div className="flex flex-col gap-3 flex-1 overflow-auto scrollbar-hide">
        {spots.map((s) => (
          <div
            key={s.id}
            className="rounded-xl p-3 flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity"
            style={{ background: "rgba(255,255,255,0.04)" }}
          >
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0 text-lg"
              style={{ background: "#10B98122" }}
            >
              🗺️
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <p className="text-sm font-semibold text-white truncate">{s.name}</p>
                {s.tag && (
                  <span className="tag shrink-0" style={{ background: "#10B98122", color: "#10B981" }}>
                    {s.tag}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1 mt-0.5">
                <MapPin size={10} style={{ color: "#8B8BA7" }} />
                <p className="text-xs" style={{ color: "#8B8BA7" }}>{s.location} · {s.category}</p>
              </div>
            </div>
            <div className="text-right shrink-0">
              <div className="flex items-center gap-0.5 justify-end">
                <Star size={10} fill="#10B981" style={{ color: "#10B981" }} />
                <span className="text-xs font-bold" style={{ color: "#10B981" }}>{s.rating}</span>
              </div>
              <p className="text-xs mt-0.5" style={{ color: "#8B8BA7" }}>{s.price}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
