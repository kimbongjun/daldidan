"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, LogIn, Plus, ReceiptText, TrendingDown, Wallet } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { queryKeys } from "@/lib/queryKeys";
import type { AuthUser as User } from "@supabase/supabase-js";
import BudgetAddModal from "@/components/BudgetAddModal";
import TransactionDetailModal from "@/components/budget/TransactionDetailModal";

interface Transaction {
  id: string;
  type: "expense";
  category: string;
  amount: number;
  note: string;
  date: string;
  merchant_name?: string;
  buyer?: string;
  author_display?: string;
  authorName?: string;
}

const ACCENT = "#3DD9C0";

function BudgetSkeleton() {
  return (
    <div className="bento-card h-full flex flex-col p-5 gap-4">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-1.5">
          <div className="h-3 w-12 rounded skeleton-shimmer" />
          <div className="h-5 w-24 rounded skeleton-shimmer" />
        </div>
        <div className="h-7 w-20 rounded-lg skeleton-shimmer" />
      </div>

      {/* 지출 요약 3셀 */}
      <div className="grid grid-cols-3 gap-2">
        {[0, 1, 2].map((i) => (
          <div key={i} className="rounded-xl p-2.5" style={{ background: "rgba(255,255,255,0.04)" }}>
            <div className="h-3 w-10 rounded skeleton-shimmer mb-2" />
            <div className="h-5 w-8 rounded skeleton-shimmer" />
          </div>
        ))}
      </div>

      {/* 카테고리 집중도 */}
      <div className="rounded-xl p-3" style={{ background: "rgba(255,255,255,0.04)" }}>
        <div className="flex items-center justify-between mb-2">
          <div className="h-3 w-14 rounded skeleton-shimmer" />
          <div className="h-4 w-10 rounded skeleton-shimmer" />
        </div>
        <div className="h-1.5 w-full rounded-full skeleton-shimmer" />
      </div>

      {/* 최근 거래 3줄 */}
      <div className="flex flex-col gap-1.5">
        <div className="h-3 w-16 rounded skeleton-shimmer" />
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex items-center justify-between gap-2 rounded-lg px-2.5 py-2" style={{ background: "rgba(255,255,255,0.04)" }}>
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <div className="h-4 w-10 rounded-full skeleton-shimmer shrink-0" />
              <div className="flex flex-col gap-1 flex-1 min-w-0">
                <div className="h-3 w-3/4 rounded skeleton-shimmer" />
                <div className="h-2.5 w-1/2 rounded skeleton-shimmer" />
              </div>
            </div>
            <div className="h-4 w-12 rounded skeleton-shimmer shrink-0" />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function BudgetWidget() {
  const [user, setUser] = useState<User | null | undefined>(undefined);
  const [showAddModal, setShowAddModal] = useState(false);
  const [detailTransaction, setDetailTransaction] = useState<Transaction | null>(null);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => setUser(data.user ?? null));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  const now = new Date();
  const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  const { data: transactions = [], isLoading } = useQuery({
    queryKey: queryKeys.budget.byMonth(month),
    queryFn: async ({ signal }) => {
      const res = await fetch(`/api/transactions?month=${month}`, { signal });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json() as unknown;
      if (!Array.isArray(data)) return [];
      return (data as Transaction[]).map((tx) => ({
        ...tx,
        authorName: tx.author_display ?? tx.authorName,
      }));
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });

  const expenseTransactions = useMemo(
    () => transactions.filter((t) => t.type === "expense"),
    [transactions],
  );

  const { expense, averageExpense, topCategory, topCategoryAmount, topCategoryShare } = useMemo(() => {
    const exp = expenseTransactions.reduce((s, t) => s + t.amount, 0);
    const categoryTotals = expenseTransactions.reduce<Record<string, number>>((acc, t) => {
      acc[t.category] = (acc[t.category] ?? 0) + t.amount;
      return acc;
    }, {});
    const [category = "-", amount = 0] = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1])[0] ?? [];
    return {
      expense: exp,
      averageExpense: expenseTransactions.length > 0 ? Math.round(exp / expenseTransactions.length) : 0,
      topCategory: category,
      topCategoryAmount: amount,
      topCategoryShare: exp > 0 ? Math.round((amount / exp) * 100) : 0,
    };
  }, [expenseTransactions]);

  if (user === undefined || (user !== null && isLoading)) {
    return <BudgetSkeleton />;
  }

  if (!user) {
    return (
      <div className="bento-card h-full flex flex-col p-5 gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: ACCENT }}>가계부</p>
          <h2 className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>분석 요약</h2>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center gap-3">
          <div style={{ width: 48, height: 48, borderRadius: "0.875rem", background: "rgba(61,217,192,0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Wallet size={22} style={{ color: ACCENT }} />
          </div>
          <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>로그인 후 이용 가능합니다</p>
          <p className="text-xs text-center" style={{ color: "var(--text-muted)" }}>로그인하면 공유 가계부를<br />함께 기록하고 분석할 수 있어요.</p>
          <Link
            href="/login"
            className="flex items-center gap-1.5 text-xs font-semibold px-4 py-2 rounded-lg transition-opacity hover:opacity-70"
            style={{ background: ACCENT, color: "#fff" }}
          >
            <LogIn size={12} />로그인하기
          </Link>
        </div>
      </div>
    );
  }

  return (
    <>
      {showAddModal && <BudgetAddModal onClose={() => setShowAddModal(false)} />}
      {detailTransaction && (
        <TransactionDetailModal
          transaction={detailTransaction}
          onClose={() => setDetailTransaction(null)}
          onEdit={() => {
            setEditingTransaction(detailTransaction);
            setDetailTransaction(null);
          }}
        />
      )}
      {editingTransaction && (
        <BudgetAddModal
          onClose={() => setEditingTransaction(null)}
          initialData={{
            id: editingTransaction.id,
            category: editingTransaction.category,
            buyer: editingTransaction.buyer,
            merchantName: editingTransaction.merchant_name,
            amount: editingTransaction.amount,
            note: editingTransaction.note,
            date: editingTransaction.date,
          }}
        />
      )}
      <div className="bento-card h-full flex flex-col p-5 gap-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: ACCENT }}>가계부</p>
            <h2 className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>분석 요약</h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-lg transition-opacity hover:opacity-70"
              style={{ background: "#6366F122", color: "#6366F1" }}
              aria-label="지출 추가"
            >
              <Plus size={12} /> 추가
            </button>
            <Link
              href="/budget"
              className="flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg transition-opacity hover:opacity-70"
              style={{ background: "#3DD9C022", color: ACCENT }}
            >
              상세보기 <ArrowRight size={11} />
            </Link>
          </div>
        </div>

      {/* 지출 요약 */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: "총지출", value: expense, color: "#F43F5E", icon: <TrendingDown size={13} /> },
          { label: "건평균", value: averageExpense, color: ACCENT, icon: <ReceiptText size={13} /> },
          { label: "건수", value: expenseTransactions.length, color: "var(--text-muted)", icon: <Wallet size={13} />, raw: true },
        ].map((item) => (
          <div key={item.label} className="rounded-xl p-2.5" style={{ background: "rgba(255,255,255,0.04)" }}>
            <div className="flex items-center gap-1 mb-1" style={{ color: item.color }}>{item.icon}<span className="text-xs">{item.label}</span></div>
            <p className="text-sm font-black" style={{ color: item.color }}>
              {item.raw ? `${item.value}건` : `${(item.value / 10000).toFixed(0)}만`}
            </p>
          </div>
        ))}
      </div>

      {/* 카테고리 집중도 */}
      <div className="rounded-xl p-3" style={{ background: "rgba(255,255,255,0.04)" }}>
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold" style={{ color: "var(--text-muted)" }}>최다 지출 카테고리</span>
          <span className="text-sm font-black" style={{ color: ACCENT }}>{topCategoryShare}%</span>
        </div>
        <div className="mb-2 flex items-center justify-between gap-2">
          <span className="text-xs font-bold truncate" style={{ color: "var(--text-primary)" }}>{topCategory}</span>
          <span className="text-xs tabular-nums" style={{ color: "var(--text-muted)" }}>{topCategoryAmount.toLocaleString()}원</span>
        </div>
        <div style={{ height: 6, borderRadius: 999, background: "rgba(255,255,255,0.08)", overflow: "hidden" }}>
          <div
            style={{
              width: `${Math.min(Math.max(topCategoryShare, 0), 100)}%`,
              height: "100%",
              borderRadius: 999,
              background: ACCENT,
              transition: "width 0.6s ease",
            }}
          />
        </div>
      </div>

      {/* 최근 지출 3건 */}
      {expenseTransactions.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <p className="text-xs font-semibold" style={{ color: "var(--text-muted)" }}>최근 지출</p>
          {expenseTransactions.slice(0, 3).map((tx) => (
            <button
              key={tx.id}
              onClick={() => setDetailTransaction(tx)}
              className="flex items-center justify-between gap-2 rounded-lg px-2.5 py-2 w-full text-left transition-opacity hover:opacity-70"
              style={{ background: "rgba(255,255,255,0.04)" }}
            >
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <span
                  className="shrink-0 text-[10px] px-1.5 py-0.5 rounded-full font-semibold"
                  style={{
                    background: "rgba(244,63,94,0.18)",
                    color: "#F43F5E",
                  }}
                >
                  {tx.category}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold truncate" style={{ color: "var(--text-primary)" }}>
                    {tx.merchant_name || tx.note || tx.category}
                  </p>
                  <p className="text-[10px] truncate" style={{ color: "var(--text-muted)" }}>
                    {[tx.buyer, tx.date.slice(5)].filter(Boolean).join(" · ")}
                  </p>
                </div>
              </div>
              <span className="text-xs font-black shrink-0" style={{ color: "#F43F5E" }}>
                −{tx.amount.toLocaleString()}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* 지출 없을 때 안내 */}
      {expenseTransactions.length === 0 && (
        <div className="flex-1 flex flex-col items-center justify-center gap-2">
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>아직 지출 내역이 없습니다.</p>
          <Link href="/budget" className="text-xs font-semibold" style={{ color: ACCENT }}>
            + 첫 지출 추가하기
          </Link>
        </div>
      )}
      </div>
    </>
  );
}
