"use client";

import { useEffect, useRef, useState } from "react";
import type { SummaryTarget } from "@/app/api/summary/route";

interface Props {
  target: SummaryTarget;
  items: string[];
  fallback: string;
  accentColor?: string;
}

export default function AiSummarySubtitle({ target, items, fallback, accentColor = "#EA580C" }: Props) {
  const [summary, setSummary] = useState<string | null>(null);
  const prevKeyRef = useRef<string>("");

  useEffect(() => {
    if (!items.length) return;
    const key = `${target}:${items.slice(0, 10).join("|")}`;
    if (key === prevKeyRef.current) return;
    prevKeyRef.current = key;

    setSummary(null);
    let cancelled = false;

    fetch("/api/summary", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ target, items }),
    })
      .then((r) => r.json())
      .then((data) => { if (!cancelled && data.summary) setSummary(data.summary); })
      .catch(() => {});

    return () => { cancelled = true; };
  }, [target, items]);

  if (!summary) {
    return (
      <span style={{ color: "var(--text-muted)", fontSize: "0.875rem" }}>
        {fallback}
      </span>
    );
  }

  return (
    <span
      style={{
        color: accentColor,
        fontSize: "0.875rem",
        fontWeight: 500,
        display: "inline-flex",
        alignItems: "center",
        gap: "0.25rem",
      }}
    >
      <span style={{ fontSize: "0.7rem", opacity: 0.7 }}>✦ AI</span>
      {summary}
    </span>
  );
}
