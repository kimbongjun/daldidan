"use client";
import { useAppStore } from "@/store/useAppStore";
import { Tag, Clock } from "lucide-react";

export default function ShoppingWidget() {
  const deals = useAppStore((s) => s.deals);

  return (
    <div className="bento-card gradient-amber h-full flex flex-col p-5 gap-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: "#F59E0B" }}>쇼핑</p>
          <h2 className="text-lg font-bold text-white">이벤트 특가</h2>
        </div>
        <span className="tag" style={{ background: "#F59E0B22", color: "#F59E0B" }}>HOT DEAL</span>
      </div>

      <div className="flex flex-col gap-3 flex-1 overflow-auto scrollbar-hide">
        {deals.map((d) => (
          <div
            key={d.id}
            className="rounded-xl p-3 flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity"
            style={{ background: "rgba(255,255,255,0.04)" }}
          >
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
              style={{ background: "#F59E0B22" }}
            >
              <Tag size={18} style={{ color: "#F59E0B" }} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white truncate">{d.title}</p>
              <p className="text-xs mt-0.5" style={{ color: "#8B8BA7" }}>{d.store} · {d.category}</p>
            </div>
            <div className="text-right shrink-0">
              <p className="text-sm font-black" style={{ color: "#F59E0B" }}>
                -{d.discountPct}%
              </p>
              <p className="text-xs font-semibold text-white">
                {d.salePrice.toLocaleString()}원
              </p>
              <div className="flex items-center gap-0.5 justify-end mt-0.5" style={{ color: "#8B8BA7" }}>
                <Clock size={9} />
                <span className="text-xs">{d.expiresAt}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
