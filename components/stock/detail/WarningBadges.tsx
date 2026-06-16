"use client";

import { AlertTriangle } from "lucide-react";
import type { StockWarning } from "@/lib/stocks/types";

const WARNING_LABELS: Record<string, string> = {
  INVESTMENT_WARNING: "투자경고",
  INVESTMENT_RISK: "투자위험",
  OVERHEATED: "단기과열",
  LIQUIDATION_TRADING: "정리매매",
  VI_STATIC: "정적VI",
  VI_DYNAMIC: "동적VI",
  VI_STATIC_AND_DYNAMIC: "정적·동적VI",
  STOCK_WARRANTS: "주식워런트",
};

/** 위험도 높은 경고는 더 진한 톤으로 강조 */
const HIGH_RISK = new Set(["INVESTMENT_RISK", "INVESTMENT_WARNING", "OVERHEATED", "LIQUIDATION_TRADING"]);

function labelFor(type: string): string {
  return WARNING_LABELS[type] ?? type;
}

export default function WarningBadges({ warnings }: { warnings: StockWarning[] }) {
  if (!warnings || warnings.length === 0) return null;
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {warnings.map((warning, index) => {
        const high = HIGH_RISK.has(warning.warningType);
        const bg = high ? "rgba(244,63,94,0.16)" : "rgba(245,158,11,0.16)";
        const color = high ? "var(--stock-rise)" : "#F59E0B";
        return (
          <span
            key={`${warning.warningType}-${index}`}
            className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-black"
            style={{ background: bg, color }}
            title={warning.endDate ? `${warning.startDate} ~ ${warning.endDate}` : `${warning.startDate} ~`}
          >
            <AlertTriangle size={10} />
            {labelFor(warning.warningType)}
          </span>
        );
      })}
    </div>
  );
}
