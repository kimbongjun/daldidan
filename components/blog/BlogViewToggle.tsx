"use client";

import { useRouter, useSearchParams } from "next/navigation";

export type BlogViewType = "list" | "weekly" | "monthly";

const VIEWS: { value: BlogViewType; label: string; icon: string }[] = [
  { value: "list", label: "목록", icon: "☰" },
  { value: "weekly", label: "주간", icon: "□" },
  { value: "monthly", label: "월간", icon: "◫" },
];

const ACCENT = "#EA580C";

export default function BlogViewToggle({ activeView }: { activeView: BlogViewType }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleViewChange = (view: BlogViewType) => {
    const params = new URLSearchParams(searchParams.toString());
    if (view === "list") {
      params.delete("view");
    } else {
      params.set("view", view);
    }
    const query = params.toString();
    router.push(`/blog${query ? `?${query}` : ""}`);
  };

  return (
    <div
      className="flex items-center gap-0.5 rounded-xl p-1"
      style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
    >
      {VIEWS.map(({ value, label }) => {
        const active = activeView === value;
        return (
          <button
            key={value}
            type="button"
            onClick={() => handleViewChange(value)}
            className="pressable px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
            style={
              active
                ? { background: ACCENT, color: "#fff" }
                : { color: "var(--text-muted)", background: "transparent" }
            }
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
