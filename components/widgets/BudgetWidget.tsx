"use client";

import Link from "next/link";
import { ArrowRight, TrendingDown, TrendingUp, Wallet } from "lucide-react";
import { useAppStore } from "@/store/useAppStore";

const CATEGORY_COLORS: Record<string, string> = {
  식비: "#F59E0B",
  교통: "#06B6D4",
  쇼핑: "#F43F5E",
  문화: "#7C3AED",
  의료: "#10B981",
  통신: "#6366F1",
  공과금: "#EC4899",
  구독비: "#14B8A6",
  대출: "#EF4444",
  급여: "#10B981",
  기타: "#8B8BA7",
};

export default function BudgetWidget() {
  const transactions = useAppStore((state) => state.transactions);
  const income = transactions.filter((item) => item.type === "income").reduce((sum, item) => sum + item.amount, 0);
  const expense = transactions.filter((item) => item.type === "expense").reduce((sum, item) => sum + item.amount, 0);
  const balance = income - expense;

  const topCategories = Object.entries(
    transactions.filter((item) => item.type === "expense").reduce<Record<string, number>>((acc, item) => {
      acc[item.category] = (acc[item.category] ?? 0) + item.amount;
      return acc;
    }, {}),
  )
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4);

  return (
    <div className="bento-card gradient-indigo h-full flex flex-col p-5 gap-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: "#6366F1" }}>가계부</p>
          <h2 className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>분석 중심 관리</h2>
        </div>
        <Link href="/budget" className="flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg transition-opacity hover:opacity-70" style={{ background: "#6366F122", color: "#6366F1" }}>
          수정/분석 <ArrowRight size={11} />
        </Link>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {[
          { label: "잔액", value: balance, color: balance >= 0 ? "#10B981" : "#F43F5E", icon: <Wallet size={13} /> },
          { label: "수입", value: income, color: "#10B981", icon: <TrendingUp size={13} /> },
          { label: "지출", value: expense, color: "#F43F5E", icon: <TrendingDown size={13} /> },
        ].map((item) => (
          <div key={item.label} className="rounded-xl p-2.5" style={{ background: "rgba(255,255,255,0.04)" }}>
            <div className="flex items-center gap-1 mb-1" style={{ color: item.color }}>{item.icon}<span className="text-xs">{item.label}</span></div>
            <p className="text-sm font-black" style={{ color: item.color }}>{(item.value / 10000).toFixed(0)}만</p>
          </div>
        ))}
      </div>    

      <div className="flex flex-col gap-2 flex-1 overflow-auto scrollbar-hide">
        <p className="text-xs font-semibold" style={{ color: "var(--text-muted)" }}>이번 달 주요 지출</p>
        {topCategories.map(([category, amount]) => (
          <div key={category} className="rounded-xl px-3 py-2.5 flex items-center justify-between gap-2" style={{ background: "rgba(255,255,255,0.03)" }}>
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold shrink-0" style={{ background: (CATEGORY_COLORS[category] ?? "#8B8BA7") + "22", color: CATEGORY_COLORS[category] ?? "#8B8BA7" }}>
                {category.slice(0, 1)}
              </div>
              <p className="text-sm font-semibold truncate" style={{ color: "var(--text-primary)" }}>{category}</p>
            </div>
            <span className="text-sm font-bold shrink-0" style={{ color: CATEGORY_COLORS[category] ?? "#8B8BA7" }}>{amount.toLocaleString()}원</span>
          </div>
        ))}
      </div>
    </div>
  );
}
