"use client";
import { useEffect, useState } from "react";
import { Bell, Settings, Sparkles, Moon, Sun } from "lucide-react";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { useThemeStore } from "@/store/useThemeStore";

export default function Header() {
  const [now, setNow] = useState(new Date());
  const { theme, toggle } = useThemeStore();

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(id);
  }, []);

  const hour = now.getHours();
  const greeting =
    hour < 6  ? "새벽이에요" :
    hour < 12 ? "좋은 아침이에요" :
    hour < 18 ? "좋은 오후예요" : "좋은 저녁이에요";

  const isLight = theme === "light";

  return (
    <header className="flex items-center justify-between py-6 px-1">
      {/* ── 로고 ── */}
      <div className="flex items-center gap-3">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: "linear-gradient(135deg, #7C3AED, #06B6D4)" }}
        >
          <Sparkles size={18} className="text-white" />
        </div>
        <div>
          <h1 className="text-xl font-black tracking-tight" style={{ color: "var(--text-primary)" }}>달디단</h1>
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>{greeting} ✨</p>
        </div>
      </div>

      {/* ── 우측 컨트롤 ── */}
      <div className="flex items-center gap-2">
        {/* 날짜/시간 */}
        <div className="text-right hidden sm:block mr-2">
          <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
            {format(now, "M월 d일 (E)", { locale: ko })}
          </p>
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>{format(now, "HH:mm")}</p>
        </div>

        {/* 다크/라이트 토글 */}
        <button
          onClick={toggle}
          aria-label={isLight ? "다크 모드로 전환" : "라이트 모드로 전환"}
          className="w-9 h-9 rounded-xl flex items-center justify-center transition-all hover:opacity-80"
          style={{
            background: isLight
              ? "linear-gradient(135deg, #FEF3C7, #FDE68A)"
              : "linear-gradient(135deg, #1E1B4B, #312E81)",
            border: "1px solid var(--border)",
          }}
        >
          {isLight
            ? <Sun  size={15} style={{ color: "#D97706" }} />
            : <Moon size={15} style={{ color: "#A5B4FC" }} />
          }
        </button>

        {/* 알림 */}
        <button
          className="w-9 h-9 rounded-xl flex items-center justify-center transition-colors hover:opacity-80"
          style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
        >
          <Bell size={16} style={{ color: "var(--text-muted)" }} />
        </button>

        {/* 설정 */}
        <button
          className="w-9 h-9 rounded-xl flex items-center justify-center transition-colors hover:opacity-80"
          style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
        >
          <Settings size={16} style={{ color: "var(--text-muted)" }} />
        </button>
      </div>
    </header>
  );
}
