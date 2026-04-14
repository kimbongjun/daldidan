"use client";
import React from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

interface Props {
  title: string;
  subtitle?: string;
  accentColor: string;
  backHref?: string;
  actions?: React.ReactNode;
}

export default function PageHeader({ title, subtitle, accentColor, backHref = "/", actions }: Props) {
  return (
    <div className="flex items-center gap-4 py-6">
      <Link
        href={backHref}
        className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-opacity hover:opacity-70"
        style={{ background: "#16161F", border: "1px solid #2A2A3A" }}
      >
        <ArrowLeft size={16} style={{ color: "#8B8BA7" }} />
      </Link>
      <div className="flex-1">
        <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: accentColor }}>
          달디단
        </p>
        <h1 className="text-2xl font-black text-white leading-tight">{title}</h1>
        {subtitle && <p className="text-sm mt-0.5" style={{ color: "#8B8BA7" }}>{subtitle}</p>}
      </div>
      {actions && <div className="shrink-0">{actions}</div>}
    </div>
  );
}
