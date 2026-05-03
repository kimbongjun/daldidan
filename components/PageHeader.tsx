"use client";
import React from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

interface Props {
  title: string;
  subtitle?: React.ReactNode;
  description?: React.ReactNode;
  accentColor: string;
  backHref?: string;
  actions?: React.ReactNode;
}

export default function PageHeader({ title, subtitle, description, accentColor, backHref = "/", actions }: Props) {
  return (
    <div className="flex flex-col pt-6 pb-4 gap-1">
      {/* 뒤로가기 — 독립 행 */}
      <div>
        <Link
          href={backHref}
          className="inline-flex items-center gap-1.5 text-xs font-medium transition-opacity hover:opacity-70"
          style={{ color: "var(--text-muted)" }}
        >
          <ArrowLeft size={13} />
          홈으로
        </Link>
      </div>

      {/* 타이틀 + 액션 — 겹침 없이 wrap */}
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: accentColor }}>
            달디단
          </p>
          <h1 className="text-2xl font-black text-white leading-tight truncate">{title}</h1>
          {subtitle && (
            <div className="text-sm mt-0.5" style={{ color: "var(--text-muted)" }}>
              {subtitle}
            </div>
          )}
          {description && (
            <div
              className="mt-2 rounded-2xl px-4 py-3 text-sm leading-relaxed"
              style={{
                background: "rgba(234,88,12,0.08)",
                border: "1px solid rgba(234,88,12,0.16)",
                color: "var(--text-primary)",
              }}
            >
              <span className="mr-2 text-xs font-bold uppercase tracking-widest" style={{ color: accentColor }}>
                AI Summary
              </span>
              {description}
            </div>
          )}
        </div>
        {actions && <div className="shrink-0">{actions}</div>}
      </div>
    </div>
  );
}
