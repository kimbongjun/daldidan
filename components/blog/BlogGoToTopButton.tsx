"use client";

import { useEffect, useState } from "react";
import { ArrowUp } from "lucide-react";

export default function BlogGoToTopButton() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 300);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  if (!visible) return null;

  return (
    <button
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      aria-label="맨 위로 이동"
      className="fixed bottom-6 right-6 z-50 flex items-center justify-center rounded-full shadow-lg transition-all hover:scale-110 hover:opacity-90"
      style={{
        width: 44,
        height: 44,
        background: "#EA580C",
        color: "#fff",
      }}
    >
      <ArrowUp size={20} strokeWidth={2.5} />
    </button>
  );
}
