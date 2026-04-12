"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import PageHeader from "@/components/PageHeader";
import { sendNativeNotification } from "@/lib/notifications";
import { PencilLine, Plus, Trash2, TrendingDown, TrendingUp, Wallet } from "lucide-react";

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

interface Transaction {
  id: string;
  type: "income" | "expense";
  category: string;
  amount: number;
  note: string;
  date: string;
}

type Period = "daily" | "monthly" | "yearly";

const EMPTY_FORM = (): Omit<Transaction, "id"> => ({
  type: "expense",
  category: "식비",
  amount: 0,
  note: "",
  date: new Date().toISOString().slice(0, 10),
});

export default function BudgetPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<Period>("monthly");
  const [editingId, setEditingId] = useState<string | null>(null); // null = 새 거래 추가 모드
  const [showEditor, setShowEditor] = useState(false);
  const [selectedTransactionId, setSelectedTransactionId] = useState<string | null>(null);

  // ── 거래 목록 로드 ──────────────────────────────────────────
  const loadTransactions = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/transactions");
      if (res.ok) {
        const data = await res.json() as Transaction[];
        setTransactions(data);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadTransactions(); }, [loadTransactions]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const params = new URLSearchParams(window.location.search);
    setSelectedTransactionId(params.get("transaction"));
  }, []);

  useEffect(() => {
    if (!selectedTransactionId || transactions.length === 0) return;

    const matched = transactions.find((transaction) => transaction.id === selectedTransactionId);
    if (!matched) return;

    setEditingId(matched.id);
    setShowEditor(true);
  }, [selectedTransactionId, transactions]);

  // ── 집계 ──────────────────────────────────────────────────
  const income = transactions.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
  const expense = transactions.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);
  const balance = income - expense;
  const editing = transactions.find((t) => t.id === editingId) ?? null;

  // ── 거래 추가 ──────────────────────────────────────────────
  const handleAdd = async (form: Omit<Transaction, "id">) => {
    const res = await fetch("/api/transactions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (res.ok) {
      const created = await res.json() as Transaction;
      setTransactions((prev) => [created, ...prev]);
      sendNativeNotification(
        "가계부 내역이 추가되었어요",
        `${created.note || created.category} · ${created.amount.toLocaleString()}원`,
      );
    }
    setShowEditor(false);
    setEditingId(null);
  };

  // ── 거래 수정 ──────────────────────────────────────────────
  const handleUpdate = async (id: string, patch: Omit<Transaction, "id">) => {
    const res = await fetch(`/api/transactions/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    if (res.ok) {
      const updated = await res.json() as Transaction;
      setTransactions((prev) => prev.map((t) => (t.id === id ? updated : t)));
    }
    setEditingId(null);
    setShowEditor(false);
  };

  // ── 거래 삭제 ──────────────────────────────────────────────
  const handleDelete = async (id: string) => {
    await fetch(`/api/transactions/${id}`, { method: "DELETE" });
    setTransactions((prev) => prev.filter((t) => t.id !== id));
    if (editingId === id) { setEditingId(null); setShowEditor(false); }
  };

  const openAdd = () => { setEditingId(null); setShowEditor(true); };
  const openEdit = (id: string) => { setEditingId(id); setShowEditor(true); };

  return (
    <div className="min-h-screen" style={{ background: "var(--bg-base)" }}>
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 pb-12">
        <PageHeader title="가계부 분석" subtitle="내 소비 흐름을 한눈에" accentColor={ACCENT} />

        {/* 요약 카드 */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          {[
            { label: "잔액", value: balance, color: balance >= 0 ? "#10B981" : "#F43F5E", icon: <Wallet size={18} /> },
            { label: "총 수입", value: income, color: "#10B981", icon: <TrendingUp size={18} /> },
            { label: "총 지출", value: expense, color: "#F43F5E", icon: <TrendingDown size={18} /> },
          ].map((item) => (
            <div key={item.label} className="bento-card p-4">
              <div className="flex items-center gap-2 mb-2" style={{ color: item.color }}>{item.icon}<span className="text-sm font-semibold">{item.label}</span></div>
              <p className="text-md md:text-2xl font-black" style={{ color: item.color }}>{(Math.abs(item.value) / 10000).toFixed(1)}만원</p>
              <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>{item.value.toLocaleString()}원</p>
            </div>
          ))}
        </div>

        {/* 기간 탭 */}
        <div className="flex gap-2 mb-6">
          {([["daily", "일별"], ["monthly", "월별"], ["yearly", "연간"]] as const).map(([key, label]) => (
            <button key={key} onClick={() => setPeriod(key)}
              className="px-4 py-2 rounded-xl text-sm font-semibold transition-colors"
              style={{ background: period === key ? ACCENT : "var(--bg-card)", color: period === key ? "#fff" : "var(--text-muted)", border: "1px solid", borderColor: period === key ? ACCENT : "var(--border)" }}>
              {label}
            </button>
          ))}
        </div>

        <div className="grid lg:grid-cols-[1fr_380px] gap-6">
          {/* 차트 영역 */}
          <div className="flex flex-col gap-4">
            {period === "daily"   && <DailyBarChart   transactions={transactions} />}
            {period === "monthly" && <MonthlyLineChart transactions={transactions} />}
            {period === "yearly"  && <YearlyBarChart   transactions={transactions} />}
            <PieChart transactions={transactions} />
          </div>

          {/* 에디터 + 목록 */}
          <div className="flex flex-col gap-4">
            {showEditor ? (
              <EditorCard
                key={editingId ?? "new"}
                transaction={editing}
                onCancel={() => { setShowEditor(false); setEditingId(null); }}
                onSave={(form) => {
                  if (editingId) handleUpdate(editingId, form);
                  else handleAdd(form);
                }}
              />
            ) : (
              <div className="bento-card p-5 flex flex-col items-center justify-center gap-3" style={{ minHeight: 180 }}>
                <PencilLine size={28} style={{ color: ACCENT }} />
                <p className="text-sm text-center" style={{ color: "var(--text-muted)" }}>내역을 선택해 수정하거나<br />새 거래를 추가하세요.</p>
                <button
                  onClick={openAdd}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold transition-opacity hover:opacity-80"
                  style={{ background: ACCENT, color: "#fff" }}
                >
                  <Plus size={14} /> 거래 추가
                </button>
              </div>
            )}

            {/* 거래 목록 */}
            <div className="bento-card p-4 flex flex-col gap-2 flex-1 overflow-auto" style={{ maxHeight: 520 }}>
              <div className="flex items-center justify-between mb-1">
                <p className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>전체 내역</p>
                <button
                  onClick={openAdd}
                  className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-lg transition-opacity hover:opacity-70"
                  style={{ background: ACCENT + "22", color: ACCENT }}
                >
                  <Plus size={11} />추가
                </button>
              </div>

              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <div style={{ width: 20, height: 20, borderRadius: "50%", border: `2px solid ${ACCENT}`, borderTopColor: "transparent", animation: "spin 0.8s linear infinite" }} />
                </div>
              ) : transactions.length === 0 ? (
                <p className="text-sm text-center py-8" style={{ color: "var(--text-muted)" }}>아직 거래 내역이 없습니다.</p>
              ) : (
                transactions.map((tx) => (
                  <div key={tx.id} className="flex items-center gap-2.5 rounded-xl px-3 py-2.5"
                    style={{
                      background: editingId === tx.id ? ACCENT + "11" : "rgba(255,255,255,0.03)",
                      border: selectedTransactionId === tx.id ? `1px solid ${ACCENT}55` : "1px solid transparent",
                    }}>
                    <button onClick={() => openEdit(tx.id)} className="flex items-center gap-2.5 flex-1 min-w-0 text-left">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-xs font-bold"
                        style={{ background: (CATEGORY_COLORS[tx.category] ?? "#8B8BA7") + "22", color: CATEGORY_COLORS[tx.category] ?? "#8B8BA7" }}>
                        {tx.category.slice(0, 1)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate" style={{ color: "var(--text-primary)" }}>{tx.note || tx.category}</p>
                        <p className="text-xs" style={{ color: "var(--text-muted)" }}>{tx.category} · {tx.date}</p>
                      </div>
                    </button>
                    <span className={`text-sm font-bold shrink-0 ${tx.type === "income" ? "text-emerald-400" : "text-rose-400"}`}>
                      {tx.type === "income" ? "+" : "-"}{tx.amount.toLocaleString()}원
                    </span>
                    <button onClick={() => handleDelete(tx.id)} className="opacity-40 hover:opacity-80 transition-opacity shrink-0">
                      <Trash2 size={12} style={{ color: "var(--text-muted)" }} />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

function EditorCard({
  transaction,
  onCancel,
  onSave,
}: {
  transaction: Transaction | null;
  onCancel: () => void;
  onSave: (value: Omit<Transaction, "id">) => void;
}) {
  const [form, setForm] = useState<Omit<Transaction, "id">>(
    transaction
      ? { type: transaction.type, category: transaction.category, amount: transaction.amount, note: transaction.note, date: transaction.date }
      : EMPTY_FORM(),
  );

  const inputStyle: React.CSSProperties = {
    background: "var(--bg-input)",
    border: "1px solid var(--border)",
    borderRadius: "0.5rem",
    padding: "0.5rem 0.75rem",
    fontSize: "0.875rem",
    color: "var(--text-primary)",
    outline: "none",
    width: "100%",
    boxSizing: "border-box",
  };

  return (
    <div className="bento-card p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>{transaction ? "내역 수정" : "거래 추가"}</p>
        <button onClick={onCancel} className="text-xs font-semibold" style={{ color: "var(--text-muted)" }}>닫기</button>
      </div>

      <div className="flex gap-2">
        {(["expense", "income"] as const).map((type) => (
          <button key={type} onClick={() => setForm((f) => ({ ...f, type }))}
            className="flex-1 py-2 rounded-lg text-sm font-semibold transition-colors"
            style={{ background: form.type === type ? ACCENT : "transparent", color: form.type === type ? "#fff" : "var(--text-muted)", border: "1px solid", borderColor: form.type === type ? ACCENT : "var(--border)" }}>
            {type === "expense" ? "지출" : "수입"}
          </button>
        ))}
      </div>

      <select value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))} style={inputStyle}>
        {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
      </select>

      <input type="number" placeholder="금액 (원)" value={form.amount || ""} onChange={(e) => setForm((f) => ({ ...f, amount: Number(e.target.value) }))} style={inputStyle} />
      <input placeholder="메모" value={form.note} onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))} style={inputStyle} />
      <input type="date" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} style={inputStyle} />

      <button
        onClick={() => onSave(form)}
        disabled={form.amount <= 0}
        className="w-full py-2.5 rounded-lg text-sm font-bold text-white transition-opacity disabled:opacity-40"
        style={{ background: ACCENT }}
      >
        {transaction ? "수정 저장" : "추가하기"}
      </button>
    </div>
  );
}

function DailyBarChart({ transactions }: { transactions: Transaction[] }) {
  const days = useMemo(() => {
    const map: Record<string, { income: number; expense: number }> = {};
    transactions.forEach((t) => {
      if (!map[t.date]) map[t.date] = { income: 0, expense: 0 };
      map[t.date][t.type] += t.amount;
    });
    return Object.entries(map).sort((a, b) => a[0].localeCompare(b[0])).slice(-10);
  }, [transactions]);
  const maxValue = Math.max(...days.flatMap(([, v]) => [v.income, v.expense]), 1);
  return (
    <div className="bento-card p-5">
      <p className="text-sm font-bold mb-4" style={{ color: "var(--text-primary)" }}>일별 수입/지출</p>
      <div className="flex items-end gap-2 h-40">
        {days.map(([date, v]) => (
          <div key={date} className="flex-1 flex flex-col items-center gap-1">
            <div className="w-full flex items-end justify-center gap-0.5" style={{ height: 120 }}>
              <div className="w-[45%] rounded-t" style={{ height: `${(v.income / maxValue) * 110}px`, background: "#10B98188", minHeight: v.income ? 4 : 0 }} />
              <div className="w-[45%] rounded-t" style={{ height: `${(v.expense / maxValue) * 110}px`, background: "#F43F5E88", minHeight: v.expense ? 4 : 0 }} />
            </div>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>{date.slice(5)}</p>
          </div>
        ))}
      </div>
      {days.length === 0 && <p className="text-sm text-center py-4" style={{ color: "var(--text-muted)" }}>데이터 없음</p>}
    </div>
  );
}

function MonthlyLineChart({ transactions }: { transactions: Transaction[] }) {
  const months = useMemo(() => {
    const map: Record<string, { income: number; expense: number }> = {};
    transactions.forEach((t) => {
      const key = t.date.slice(0, 7);
      if (!map[key]) map[key] = { income: 0, expense: 0 };
      map[key][t.type] += t.amount;
    });
    const now = new Date();
    return Array.from({ length: 6 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      return { label: `${d.getMonth() + 1}월`, ...(map[key] ?? { income: 0, expense: 0 }) };
    });
  }, [transactions]);
  const maxValue = Math.max(...months.flatMap((m) => [m.income, m.expense]), 1);
  const W = 340, H = 100, P = 20, step = (W - P * 2) / Math.max(months.length - 1, 1);
  const toY = (v: number) => H - P - (v / maxValue) * (H - P * 2);
  const ipts = months.map((m, i) => `${P + i * step},${toY(m.income)}`).join(" ");
  const epts = months.map((m, i) => `${P + i * step},${toY(m.expense)}`).join(" ");
  return (
    <div className="bento-card p-5">
      <p className="text-sm font-bold mb-4" style={{ color: "var(--text-primary)" }}>월별 추이</p>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 120 }}>
        <polyline points={ipts} fill="none" stroke="#10B981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <polyline points={epts} fill="none" stroke="#F43F5E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        {months.map((m, i) => (
          <text key={m.label} x={P + i * step} y={H - 2} textAnchor="middle" fontSize="9" fill="var(--text-muted)">{m.label}</text>
        ))}
      </svg>
    </div>
  );
}

function YearlyBarChart({ transactions }: { transactions: Transaction[] }) {
  const year = new Date().getFullYear();
  const months = useMemo(() => Array.from({ length: 12 }, (_, i) => {
    const key = `${year}-${String(i + 1).padStart(2, "0")}`;
    const expense = transactions.filter((t) => t.type === "expense" && t.date.startsWith(key)).reduce((s, t) => s + t.amount, 0);
    return { label: `${i + 1}`, expense };
  }), [transactions, year]);
  const maxValue = Math.max(...months.map((m) => m.expense), 1);
  return (
    <div className="bento-card p-5">
      <p className="text-sm font-bold mb-4" style={{ color: "var(--text-primary)" }}>{year}년 월별 지출</p>
      <div className="flex items-end gap-1.5 h-36">
        {months.map((m) => (
          <div key={m.label} className="flex-1 flex flex-col items-center gap-1">
            <div className="w-full rounded-t" style={{ height: `${Math.max((m.expense / maxValue) * 100, m.expense ? 4 : 0)}px`, background: m.expense > 0 ? `linear-gradient(180deg, ${ACCENT}, ${ACCENT}66)` : "var(--border)", minHeight: m.expense ? 4 : 2 }} />
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>{m.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function PieChart({ transactions }: { transactions: Transaction[] }) {
  const slices = useMemo(() => {
    const map: Record<string, number> = {};
    transactions.filter((t) => t.type === "expense").forEach((t) => { map[t.category] = (map[t.category] ?? 0) + t.amount; });
    const total = Object.values(map).reduce((s, v) => s + v, 0);
    return Object.entries(map).sort((a, b) => b[1] - a[1]).map(([category, amount]) => ({ category, amount, pct: total ? amount / total : 0 }));
  }, [transactions]);

  if (slices.length === 0) {
    return (
      <div className="bento-card p-5">
        <p className="text-sm font-bold mb-4" style={{ color: "var(--text-primary)" }}>지출 카테고리 비율</p>
        <p className="text-sm text-center py-4" style={{ color: "var(--text-muted)" }}>지출 내역이 없습니다.</p>
      </div>
    );
  }

  const R = 60, CX = 80, CY = 80, T = 22;
  let a = -Math.PI / 2;
  const arcs = slices.map(({ category, pct }) => {
    const angle = pct * 2 * Math.PI;
    const x1 = CX + R * Math.cos(a), y1 = CY + R * Math.sin(a);
    a += angle;
    const x2 = CX + R * Math.cos(a), y2 = CY + R * Math.sin(a);
    const large = angle > Math.PI ? 1 : 0;
    const ix1 = CX + (R - T) * Math.cos(a - angle), iy1 = CY + (R - T) * Math.sin(a - angle);
    const ix2 = CX + (R - T) * Math.cos(a), iy2 = CY + (R - T) * Math.sin(a);
    return { category, pct, amount: slices.find((s) => s.category === category)?.amount ?? 0, d: `M${x1} ${y1} A${R} ${R} 0 ${large} 1 ${x2} ${y2} L${ix2} ${iy2} A${R-T} ${R-T} 0 ${large} 0 ${ix1} ${iy1} Z` };
  });

  return (
    <div className="bento-card p-5">
      <p className="text-sm font-bold mb-4" style={{ color: "var(--text-primary)" }}>지출 카테고리 비율</p>
      <div className="flex gap-6 items-center flex-wrap">
        <svg viewBox="0 0 160 160" style={{ width: 160, height: 160, flexShrink: 0 }}>
          {arcs.map((arc) => <path key={arc.category} d={arc.d} fill={CATEGORY_COLORS[arc.category] ?? "#8B8BA7"} />)}
        </svg>
        <div className="flex flex-col gap-2 flex-1">
          {slices.map((s) => (
            <div key={s.category} className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: CATEGORY_COLORS[s.category] ?? "#8B8BA7" }} />
              <span className="text-xs flex-1" style={{ color: "var(--text-primary)" }}>{s.category}</span>
              <span className="text-xs font-semibold" style={{ color: CATEGORY_COLORS[s.category] ?? "#8B8BA7" }}>{(s.pct * 100).toFixed(1)}%</span>
              <span className="text-xs" style={{ color: "var(--text-muted)" }}>{(s.amount / 10000).toFixed(1)}만</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
