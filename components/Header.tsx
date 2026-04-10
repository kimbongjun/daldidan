"use client";
import { useEffect, useState } from "react";
import { Bell, Settings, Sparkles } from "lucide-react";
import { format } from "date-fns";
import { ko } from "date-fns/locale";

export default function Header() {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(id);
  }, []);

  const hour = now.getHours();
  const greeting = hour < 6 ? "새벽이에요" : hour < 12 ? "좋은 아침이에요" : hour < 18 ? "좋은 오후예요" : "좋은 저녁이에요";

  return (
    <header className="flex items-center justify-between py-6 px-1">
      <div className="flex items-center gap-3">
        {/* Logo */}
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: "linear-gradient(135deg, #7C3AED, #06B6D4)" }}
        >
          <Sparkles size={18} className="text-white" />
        </div>
        <div>
          <h1 className="text-xl font-black text-white tracking-tight">달디단</h1>
          <p className="text-xs" style={{ color: "#8B8BA7" }}>{greeting} ✨</p>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="text-right hidden sm:block">
          <p className="text-sm font-semibold text-white">{format(now, "M월 d일 (E)", { locale: ko })}</p>
          <p className="text-xs" style={{ color: "#8B8BA7" }}>{format(now, "HH:mm")}</p>
        </div>
        <button className="w-9 h-9 rounded-xl flex items-center justify-center transition-colors hover:opacity-80" style={{ background: "#16161F", border: "1px solid #2A2A3A" }}>
          <Bell size={16} style={{ color: "#8B8BA7" }} />
        </button>
        <button className="w-9 h-9 rounded-xl flex items-center justify-center transition-colors hover:opacity-80" style={{ background: "#16161F", border: "1px solid #2A2A3A" }}>
          <Settings size={16} style={{ color: "#8B8BA7" }} />
        </button>
      </div>
    </header>
  );
}
