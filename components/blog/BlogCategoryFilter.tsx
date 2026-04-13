"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { BLOG_CATEGORIES } from "@/lib/blog-shared";

const ACCENT = "#EA580C";

export default function BlogCategoryFilter({ activeCategory }: { activeCategory: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleSelect = (cat: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (cat === activeCategory) {
      params.delete("category");
    } else {
      params.set("category", cat);
    }
    const query = params.toString();
    router.push(`/blog${query ? `?${query}` : ""}`);
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={() => {
          const params = new URLSearchParams(searchParams.toString());
          params.delete("category");
          router.push("/blog");
        }}
        className="pressable px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors"
        style={{
          background: !activeCategory ? "rgba(234,88,12,0.18)" : "var(--bg-input)",
          color: !activeCategory ? ACCENT : "var(--text-muted)",
          border: !activeCategory ? "1px solid rgba(234,88,12,0.4)" : "1px solid var(--border)",
        }}
      >
        전체
      </button>
      {BLOG_CATEGORIES.map((cat) => {
        const active = activeCategory === cat;
        return (
          <button
            key={cat}
            type="button"
            onClick={() => handleSelect(cat)}
            className="pressable px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors"
            style={{
              background: active ? "rgba(234,88,12,0.18)" : "var(--bg-input)",
              color: active ? ACCENT : "var(--text-muted)",
              border: active ? "1px solid rgba(234,88,12,0.4)" : "1px solid var(--border)",
            }}
          >
            {cat}
          </button>
        );
      })}
    </div>
  );
}
