"use client";
import { useState } from "react";
import { useAppStore } from "@/store/useAppStore";
import { PlusCircle, TrendingUp, TrendingDown, Wallet, X } from "lucide-react";

const CATEGORIES = ["식비", "교통", "쇼핑", "문화", "의료", "통신", "급여", "기타"];

const CATEGORY_COLORS: Record<string, string> = {
  식비: "#F59E0B", 교통: "#06B6D4", 쇼핑: "#F43F5E",
  문화: "#7C3AED", 의료: "#10B981", 통신: "#6366F1",
  급여: "#10B981", 기타: "#8B8BA7",
};

export default function BudgetWidget() {
  const { transactions, addTransaction, removeTransaction } = useAppStore();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ type: "expense" as "income" | "expense", category: "식비", amount: "", note: "" });

  const income  = transactions.filter((t) => t.type === "income").reduce((a, t) => a + t.amount, 0);
  const expense = transactions.filter((t) => t.type === "expense").reduce((a, t) => a + t.amount, 0);
  const balance = income - expense;

  const submit = () => {
    if (!form.amount || isNaN(Number(form.amount))) return;
    addTransaction({
      type: form.type,
      category: form.category,
      amount: Number(form.amount),
      note: form.note || form.category,
      date: new Date().toISOString().slice(0, 10),
    });
    setForm({ type: "expense", category: "식비", amount: "", note: "" });
    setShowForm(false);
  };

  return (
    <div className="bento-card gradient-indigo h-full flex flex-col p-5 gap-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: "#6366F1" }}>가계부</p>
          <h2 className="text-lg font-bold text-white">이번 달 지출</h2>
        </div>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors"
          style={{ background: "#6366F122", color: "#6366F1" }}
        >
          <PlusCircle size={13} />
          추가
        </button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: "잔액", value: balance, color: balance >= 0 ? "#10B981" : "#F43F5E", icon: <Wallet size={13} /> },
          { label: "수입", value: income,  color: "#10B981", icon: <TrendingUp size={13} /> },
          { label: "지출", value: expense, color: "#F43F5E", icon: <TrendingDown size={13} /> },
        ].map((item) => (
          <div key={item.label} className="rounded-xl p-2.5" style={{ background: "rgba(255,255,255,0.04)" }}>
            <div className="flex items-center gap-1 mb-1" style={{ color: item.color }}>{item.icon}<span className="text-xs">{item.label}</span></div>
            <p className="text-sm font-black" style={{ color: item.color }}>
              {(item.value / 10000).toFixed(0)}만
            </p>
          </div>
        ))}
      </div>

      {/* Add form */}
      {showForm && (
        <div className="rounded-xl p-3 flex flex-col gap-2" style={{ background: "rgba(99,102,241,0.08)", border: "1px solid #6366F133" }}>
          <div className="flex gap-2">
            {(["expense", "income"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setForm((f) => ({ ...f, type: t }))}
                className="flex-1 py-1.5 rounded-lg text-xs font-semibold transition-colors"
                style={{
                  background: form.type === t ? "#6366F1" : "transparent",
                  color: form.type === t ? "#fff" : "#8B8BA7",
                  border: "1px solid",
                  borderColor: form.type === t ? "#6366F1" : "#2A2A3A",
                }}
              >
                {t === "expense" ? "지출" : "수입"}
              </button>
            ))}
          </div>
          <select
            value={form.category}
            onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
            className="w-full rounded-lg px-3 py-1.5 text-sm text-white outline-none"
            style={{ background: "#16161F", border: "1px solid #2A2A3A" }}
          >
            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <div className="flex gap-2">
            <input
              type="number"
              placeholder="금액"
              value={form.amount}
              onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
              className="flex-1 rounded-lg px-3 py-1.5 text-sm text-white outline-none"
              style={{ background: "#16161F", border: "1px solid #2A2A3A" }}
            />
            <input
              placeholder="메모"
              value={form.note}
              onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
              className="flex-1 rounded-lg px-3 py-1.5 text-sm text-white outline-none"
              style={{ background: "#16161F", border: "1px solid #2A2A3A" }}
            />
          </div>
          <button
            onClick={submit}
            className="w-full py-2 rounded-lg text-sm font-semibold text-white"
            style={{ background: "#6366F1" }}
          >
            저장
          </button>
        </div>
      )}

      {/* Transaction list */}
      <div className="flex flex-col gap-1.5 flex-1 overflow-auto scrollbar-hide">
        {transactions.slice(0, 8).map((tx) => (
          <div key={tx.id} className="flex items-center gap-2.5 rounded-xl px-3 py-2" style={{ background: "rgba(255,255,255,0.03)" }}>
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 text-xs font-bold"
              style={{
                background: (CATEGORY_COLORS[tx.category] ?? "#8B8BA7") + "22",
                color: CATEGORY_COLORS[tx.category] ?? "#8B8BA7",
              }}
            >
              {tx.category.slice(0, 1)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-white truncate">{tx.note}</p>
              <p className="text-xs" style={{ color: "#8B8BA7" }}>{tx.category} · {tx.date}</p>
            </div>
            <div className="flex items-center gap-1.5">
              <span className={`text-xs font-bold ${tx.type === "income" ? "text-emerald-400" : "text-rose-400"}`}>
                {tx.type === "income" ? "+" : "-"}{tx.amount.toLocaleString()}원
              </span>
              <button onClick={() => removeTransaction(tx.id)} className="opacity-30 hover:opacity-70 transition-opacity">
                <X size={11} style={{ color: "#8B8BA7" }} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
