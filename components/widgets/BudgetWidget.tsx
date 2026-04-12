"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, LogIn, TrendingDown, TrendingUp, Wallet } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";

interface Transaction {
  id: string;
  type: "income" | "expense";
  category: string;
  amount: number;
  note: string;
  date: string;
}

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
  const [user, setUser] = useState<User | null | undefined>(undefined); // undefined = 로딩 중
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);

  // 세션 감지
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => setUser(data.user ?? null));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  // 거래 목록 로드
  useEffect(() => {
    if (!user) return;
    setLoading(true);
    fetch("/api/transactions")
      .then((r) => r.json())
      .then((data) => setTransactions(Array.isArray(data) ? data : []))
      .catch(() => setTransactions([]))
      .finally(() => setLoading(false));
  }, [user]);

  // 집계
  const income = transactions.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
  const expense = transactions.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);
  const balance = income - expense;

  const recentExpenses = transactions
    .filter((t) => t.type === "expense")
    .slice(0, 4);

  // ── 로딩 중 (세션 확인 전) ──
  if (user === undefined) {
    return (
      <div className="bento-card gradient-indigo h-full flex flex-col p-5 items-center justify-center gap-2">
        <div style={{ width: 28, height: 28, borderRadius: "50%", border: "3px solid #6366F1", borderTopColor: "transparent", animation: "spin 0.8s linear infinite" }} />
      </div>
    );
  }

  // ── 비로그인 ──
  if (!user) {
    return (
      <div className="bento-card gradient-indigo h-full flex flex-col p-5 gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: "#6366F1" }}>가계부</p>
          <h2 className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>분석 중심 관리</h2>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center gap-3">
          <div style={{ width: 48, height: 48, borderRadius: "0.875rem", background: "rgba(99,102,241,0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Wallet size={22} style={{ color: "#6366F1" }} />
          </div>
          <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>로그인 후 이용 가능합니다</p>
          <p className="text-xs text-center" style={{ color: "var(--text-muted)" }}>로그인하면 나만의 가계부를<br />기록하고 분석할 수 있어요.</p>
          <Link
            href="/login"
            className="flex items-center gap-1.5 text-xs font-semibold px-4 py-2 rounded-lg transition-opacity hover:opacity-70"
            style={{ background: "#6366F1", color: "#fff" }}
          >
            <LogIn size={12} />로그인하기
          </Link>
        </div>
      </div>
    );
  }

  // ── 로그인 상태 ──
  return (
    <div className="bento-card gradient-indigo h-full flex flex-col p-5 gap-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: "#6366F1" }}>가계부</p>
          <h2 className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>분석 중심 관리</h2>
        </div>
        <Link
          href="/budget"
          className="flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg transition-opacity hover:opacity-70"
          style={{ background: "#6366F122", color: "#6366F1" }}
        >
          수정/분석 <ArrowRight size={11} />
        </Link>
      </div>

      {/* 요약 카드 */}
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

      {/* 거래 목록 or 안내 */}
      <div className="flex flex-col gap-2 flex-1 overflow-auto scrollbar-hide">
        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <div style={{ width: 20, height: 20, borderRadius: "50%", border: "2px solid #6366F1", borderTopColor: "transparent", animation: "spin 0.8s linear infinite" }} />
          </div>
        ) : recentExpenses.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-2">
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>아직 거래 내역이 없습니다.</p>
            <Link href="/budget" className="text-xs font-semibold" style={{ color: "#6366F1" }}>
              + 첫 거래 추가하기
            </Link>
          </div>
        ) : (
          <>
            <p className="text-xs font-semibold" style={{ color: "var(--text-muted)" }}>최근 소비 내역</p>
            {recentExpenses.map((transaction) => (
              <Link
                key={transaction.id}
                href={`/budget?transaction=${transaction.id}`}
                className="rounded-xl px-3 py-2.5 flex items-center justify-between gap-2 transition-opacity hover:opacity-80"
                style={{ background: "rgba(255,255,255,0.03)" }}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold shrink-0"
                    style={{ background: (CATEGORY_COLORS[transaction.category] ?? "#8B8BA7") + "22", color: CATEGORY_COLORS[transaction.category] ?? "#8B8BA7" }}
                  >
                    {transaction.category.slice(0, 1)}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold truncate" style={{ color: "var(--text-primary)" }}>
                      {transaction.note || transaction.category}
                    </p>
                    <p className="text-xs truncate" style={{ color: "var(--text-muted)" }}>
                      {transaction.category} · {transaction.date}
                    </p>
                  </div>
                </div>
                <span className="text-sm font-bold shrink-0" style={{ color: CATEGORY_COLORS[transaction.category] ?? "#8B8BA7" }}>
                  {transaction.amount.toLocaleString()}원
                </span>
              </Link>
            ))}
          </>
        )}
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
