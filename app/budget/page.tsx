"use client";

import { useMemo, useState } from "react";
import PageHeader from "@/components/PageHeader";
import { Transaction, useAppStore } from "@/store/useAppStore";
import { PencilLine, Trash2, TrendingDown, TrendingUp, Wallet } from "lucide-react";

const ACCENT = "#6366F1";

const CATEGORIES = ["식비", "교통", "쇼핑", "문화", "의료", "통신", "공과금", "구독비", "대출", "급여", "기타"];

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

type Period = "daily" | "monthly" | "yearly";

export default function BudgetPage() {
  const { transactions, updateTransaction, removeTransaction } = useAppStore();
  const [period, setPeriod] = useState<Period>("monthly");
  const [editingId, setEditingId] = useState<string | null>(null);

  const income = transactions.filter((item) => item.type === "income").reduce((sum, item) => sum + item.amount, 0);
  const expense = transactions.filter((item) => item.type === "expense").reduce((sum, item) => sum + item.amount, 0);
  const balance = income - expense;
  const editing = transactions.find((item) => item.id === editingId) ?? null;

  return (
    <div className="min-h-screen" style={{ background: "var(--bg-base)" }}>
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 pb-12">
        <PageHeader title="가계부 분석" subtitle="추가 대신 수정 중심으로 소비 흐름 관리" accentColor={ACCENT} />

        <div className="grid grid-cols-3 gap-4 mb-6">
          {[
            { label: "잔액", value: balance, color: balance >= 0 ? "#10B981" : "#F43F5E", icon: <Wallet size={18} /> },
            { label: "총 수입", value: income, color: "#10B981", icon: <TrendingUp size={18} /> },
            { label: "총 지출", value: expense, color: "#F43F5E", icon: <TrendingDown size={18} /> },
          ].map((item) => (
            <div key={item.label} className="bento-card p-4">
              <div className="flex items-center gap-2 mb-2" style={{ color: item.color }}>{item.icon}<span className="text-sm font-semibold">{item.label}</span></div>
              <p className="text-2xl font-black" style={{ color: item.color }}>{(Math.abs(item.value) / 10000).toFixed(1)}만원</p>
              <p className="text-xs mt-1" style={{ color: "#8B8BA7" }}>{item.value.toLocaleString()}원</p>
            </div>
          ))}
        </div>

        <div className="flex gap-2 mb-6">
          {[
            { key: "daily", label: "일별" },
            { key: "monthly", label: "월별" },
            { key: "yearly", label: "연간" },
          ].map((tab) => (
            <button key={tab.key} onClick={() => setPeriod(tab.key as Period)} className="px-4 py-2 rounded-xl text-sm font-semibold transition-colors" style={{ background: period === tab.key ? ACCENT : "#16161F", color: period === tab.key ? "#fff" : "#8B8BA7", border: "1px solid", borderColor: period === tab.key ? ACCENT : "#2A2A3A" }}>
              {tab.label}
            </button>
          ))}
        </div>

        <div className="grid lg:grid-cols-[1fr_380px] gap-6">
          <div className="flex flex-col gap-4">
            {period === "daily" ? <DailyBarChart transactions={transactions} /> : null}
            {period === "monthly" ? <MonthlyLineChart transactions={transactions} /> : null}
            {period === "yearly" ? <YearlyBarChart transactions={transactions} /> : null}
            <PieChart transactions={transactions} />
          </div>

          <div className="flex flex-col gap-4">            

            {editing ? (
              <EditorCard key={editing.id} transaction={editing} onCancel={() => setEditingId(null)} onSave={(patch) => { updateTransaction(editing.id, patch); setEditingId(null); }} />
            ) : (
              <div className="bento-card p-5 flex flex-col items-center justify-center gap-3" style={{ minHeight: 220 }}>
                <PencilLine size={28} style={{ color: ACCENT }} />
                <p className="text-sm text-center" style={{ color: "var(--text-muted)" }}>오른쪽 내역 목록에서 항목을 선택하면 수정 패널이 열립니다.</p>
              </div>
            )}

            <div className="bento-card p-4 flex flex-col gap-2 flex-1 overflow-auto" style={{ maxHeight: 520 }}>
              <p className="text-sm font-bold text-white mb-1">전체 내역</p>
              {transactions.map((tx) => (
                <div key={tx.id} className="flex items-center gap-2.5 rounded-xl px-3 py-2.5" style={{ background: editingId === tx.id ? ACCENT + "11" : "rgba(255,255,255,0.03)" }}>
                  <button onClick={() => setEditingId(tx.id)} className="flex items-center gap-2.5 flex-1 min-w-0 text-left">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-xs font-bold" style={{ background: (CATEGORY_COLORS[tx.category] ?? "#8B8BA7") + "22", color: CATEGORY_COLORS[tx.category] ?? "#8B8BA7" }}>
                      {tx.category.slice(0, 1)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-white truncate">{tx.note}</p>
                      <p className="text-xs" style={{ color: "#8B8BA7" }}>{tx.category} · {tx.date}</p>
                    </div>
                  </button>
                  <span className={`text-sm font-bold shrink-0 ${tx.type === "income" ? "text-emerald-400" : "text-rose-400"}`}>{tx.type === "income" ? "+" : "-"}{tx.amount.toLocaleString()}원</span>
                  <button onClick={() => removeTransaction(tx.id)} className="opacity-40 hover:opacity-80 transition-opacity shrink-0">
                    <Trash2 size={12} style={{ color: "#8B8BA7" }} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function EditorCard({
  transaction,
  onCancel,
  onSave,
}: {
  transaction: Transaction;
  onCancel: () => void;
  onSave: (value: Omit<Transaction, "id">) => void;
}) {
  const [form, setForm] = useState<Omit<Transaction, "id">>({
    type: transaction.type,
    category: transaction.category,
    amount: transaction.amount,
    note: transaction.note,
    date: transaction.date,
  });

  return (
    <div className="bento-card p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-bold text-white">내역 수정</p>
        <button onClick={onCancel} className="text-xs font-semibold" style={{ color: "var(--text-muted)" }}>닫기</button>
      </div>

      <div className="flex gap-2">
        {(["expense", "income"] as const).map((type) => (
          <button key={type} onClick={() => setForm((current) => ({ ...current, type }))} className="flex-1 py-2 rounded-lg text-sm font-semibold transition-colors" style={{ background: form.type === type ? ACCENT : "transparent", color: form.type === type ? "#fff" : "#8B8BA7", border: "1px solid", borderColor: form.type === type ? ACCENT : "#2A2A3A" }}>
            {type === "expense" ? "지출" : "수입"}
          </button>
        ))}
      </div>

      <select value={form.category} onChange={(event) => setForm((current) => ({ ...current, category: event.target.value }))} className="w-full rounded-lg px-3 py-2 text-sm text-white outline-none" style={{ background: "#0F0F14", border: "1px solid #2A2A3A" }}>
        {CATEGORIES.map((category) => <option key={category} value={category}>{category}</option>)}
      </select>

      <input type="number" value={form.amount} onChange={(event) => setForm((current) => ({ ...current, amount: Number(event.target.value) }))} className="w-full rounded-lg px-3 py-2 text-sm text-white outline-none" style={{ background: "#0F0F14", border: "1px solid #2A2A3A" }} />
      <input value={form.note} onChange={(event) => setForm((current) => ({ ...current, note: event.target.value }))} className="w-full rounded-lg px-3 py-2 text-sm text-white outline-none" style={{ background: "#0F0F14", border: "1px solid #2A2A3A" }} />
      <input type="date" value={form.date} onChange={(event) => setForm((current) => ({ ...current, date: event.target.value }))} className="w-full rounded-lg px-3 py-2 text-sm text-white outline-none" style={{ background: "#0F0F14", border: "1px solid #2A2A3A" }} />

      <button onClick={() => onSave(form)} className="w-full py-2.5 rounded-lg text-sm font-bold text-white" style={{ background: ACCENT }}>
        수정 저장
      </button>
    </div>
  );
}

function DailyBarChart({ transactions }: { transactions: Transaction[] }) {
  const days = useMemo(() => {
    const map: Record<string, { income: number; expense: number }> = {};
    transactions.forEach((transaction) => {
      if (!map[transaction.date]) map[transaction.date] = { income: 0, expense: 0 };
      map[transaction.date][transaction.type] += transaction.amount;
    });
    return Object.entries(map).sort((a, b) => a[0].localeCompare(b[0])).slice(-10);
  }, [transactions]);

  const maxValue = Math.max(...days.flatMap(([, value]) => [value.income, value.expense]), 1);

  return (
    <div className="bento-card p-5">
      <p className="text-sm font-bold text-white mb-4">일별 수입/지출</p>
      <div className="flex items-end gap-2 h-40">
        {days.map(([date, value]) => (
          <div key={date} className="flex-1 flex flex-col items-center gap-1">
            <div className="w-full flex items-end justify-center gap-0.5" style={{ height: "120px" }}>
              <div className="w-[45%] rounded-t transition-all" style={{ height: `${(value.income / maxValue) * 110}px`, background: "#10B98188", minHeight: value.income ? 4 : 0 }} />
              <div className="w-[45%] rounded-t transition-all" style={{ height: `${(value.expense / maxValue) * 110}px`, background: "#F43F5E88", minHeight: value.expense ? 4 : 0 }} />
            </div>
            <p className="text-xs" style={{ color: "#8B8BA7" }}>{date.slice(5)}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function MonthlyLineChart({ transactions }: { transactions: Transaction[] }) {
  const months = useMemo(() => {
    const map: Record<string, { income: number; expense: number }> = {};
    transactions.forEach((transaction) => {
      const key = transaction.date.slice(0, 7);
      if (!map[key]) map[key] = { income: 0, expense: 0 };
      map[key][transaction.type] += transaction.amount;
    });
    const result: Array<{ label: string; income: number; expense: number }> = [];
    for (let index = 5; index >= 0; index -= 1) {
      const date = new Date(2026, 3 - index, 1);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      result.push({ label: `${date.getMonth() + 1}월`, ...(map[key] ?? { income: 0, expense: 0 }) });
    }
    return result;
  }, [transactions]);

  const maxValue = Math.max(...months.flatMap((month) => [month.income, month.expense]), 1);
  const width = 340;
  const height = 100;
  const pad = 20;
  const step = (width - pad * 2) / Math.max(months.length - 1, 1);
  const toY = (value: number) => height - pad - (value / maxValue) * (height - pad * 2);
  const incomePoints = months.map((month, index) => `${pad + index * step},${toY(month.income)}`).join(" ");
  const expensePoints = months.map((month, index) => `${pad + index * step},${toY(month.expense)}`).join(" ");

  return (
    <div className="bento-card p-5">
      <p className="text-sm font-bold text-white mb-4">월별 추이</p>
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full" style={{ height: 120 }}>
        <polyline points={incomePoints} fill="none" stroke="#10B981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <polyline points={expensePoints} fill="none" stroke="#F43F5E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        {months.map((month, index) => (
          <text key={month.label} x={pad + index * step} y={height - 2} textAnchor="middle" fontSize="9" fill="#8B8BA7">
            {month.label}
          </text>
        ))}
      </svg>
    </div>
  );
}

function YearlyBarChart({ transactions }: { transactions: Transaction[] }) {
  const months = useMemo(() => Array.from({ length: 12 }, (_, index) => {
    const key = `2026-${String(index + 1).padStart(2, "0")}`;
    const expense = transactions.filter((transaction) => transaction.type === "expense" && transaction.date.startsWith(key)).reduce((sum, transaction) => sum + transaction.amount, 0);
    return { label: `${index + 1}`, expense };
  }), [transactions]);

  const maxValue = Math.max(...months.map((month) => month.expense), 1);

  return (
    <div className="bento-card p-5">
      <p className="text-sm font-bold text-white mb-4">2026년 월별 지출</p>
      <div className="flex items-end gap-1.5 h-36">
        {months.map((month) => (
          <div key={month.label} className="flex-1 flex flex-col items-center gap-1">
            <div className="w-full rounded-t transition-all" style={{ height: `${Math.max((month.expense / maxValue) * 100, month.expense ? 4 : 0)}px`, background: month.expense > 0 ? `linear-gradient(180deg, ${ACCENT}, ${ACCENT}66)` : "#2A2A3A", minHeight: month.expense ? 4 : 2 }} />
            <p className="text-xs" style={{ color: "#8B8BA7" }}>{month.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function PieChart({ transactions }: { transactions: Transaction[] }) {
  const slices = useMemo(() => {
    const map: Record<string, number> = {};
    transactions.filter((transaction) => transaction.type === "expense").forEach((transaction) => {
      map[transaction.category] = (map[transaction.category] ?? 0) + transaction.amount;
    });
    const total = Object.values(map).reduce((sum, value) => sum + value, 0);
    return Object.entries(map).sort((a, b) => b[1] - a[1]).map(([category, amount]) => ({ category, amount, pct: total ? amount / total : 0 }));
  }, [transactions]);

  const radius = 60;
  const centerX = 80;
  const centerY = 80;
  const thickness = 22;
  let currentAngle = -Math.PI / 2;
  const arcs = slices.map(({ category, pct }) => {
    const angle = pct * 2 * Math.PI;
    const x1 = centerX + radius * Math.cos(currentAngle);
    const y1 = centerY + radius * Math.sin(currentAngle);
    currentAngle += angle;
    const x2 = centerX + radius * Math.cos(currentAngle);
    const y2 = centerY + radius * Math.sin(currentAngle);
    const large = angle > Math.PI ? 1 : 0;
    const innerX1 = centerX + (radius - thickness) * Math.cos(currentAngle - angle);
    const innerY1 = centerY + (radius - thickness) * Math.sin(currentAngle - angle);
    const innerX2 = centerX + (radius - thickness) * Math.cos(currentAngle);
    const innerY2 = centerY + (radius - thickness) * Math.sin(currentAngle);
    return { category, pct, amount: slices.find((item) => item.category === category)?.amount ?? 0, d: `M${x1} ${y1} A${radius} ${radius} 0 ${large} 1 ${x2} ${y2} L${innerX2} ${innerY2} A${radius - thickness} ${radius - thickness} 0 ${large} 0 ${innerX1} ${innerY1} Z` };
  });

  return (
    <div className="bento-card p-5">
      <p className="text-sm font-bold text-white mb-4">지출 카테고리 비율</p>
      <div className="flex gap-6 items-center flex-wrap">
        <svg viewBox="0 0 160 160" style={{ width: 160, height: 160, flexShrink: 0 }}>
          {arcs.map((arc) => <path key={arc.category} d={arc.d} fill={CATEGORY_COLORS[arc.category] ?? "#8B8BA7"} />)}
        </svg>
        <div className="flex flex-col gap-2 flex-1">
          {slices.map((slice) => (
            <div key={slice.category} className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: CATEGORY_COLORS[slice.category] ?? "#8B8BA7" }} />
              <span className="text-xs flex-1 text-white">{slice.category}</span>
              <span className="text-xs font-semibold" style={{ color: CATEGORY_COLORS[slice.category] ?? "#8B8BA7" }}>{(slice.pct * 100).toFixed(1)}%</span>
              <span className="text-xs" style={{ color: "#8B8BA7" }}>{(slice.amount / 10000).toFixed(1)}만</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
