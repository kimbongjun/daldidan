"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, LogIn, TrendingDown, TrendingUp, Wallet } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { AuthUser as User } from "@supabase/supabase-js";

interface Transaction {
  id: string;
  type: "income" | "expense";
  category: string;
  amount: number;
  note: string;
  date: string;
}


export default function BudgetWidget() {
  const [user, setUser] = useState<User | null | undefined>(undefined);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => setUser(data.user ?? null));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;
    let active = true;
    setLoading(true);
    const controller = new AbortController();

    const now = new Date();
    const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    fetch(`/api/transactions?month=${month}`, { signal: controller.signal })
      .then((r) => r.json())
      .then((data) => {
        if (!active) return;
        setTransactions(Array.isArray(data) ? data : []);
      })
      .catch(() => {
        if (!active) return;
        setTransactions([]);
      })
      .finally(() => {
        if (!active) return;
        setLoading(false);
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, [user]);

  const { income, expense, balance, savingRate } = useMemo(() => {
    const inc = transactions.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
    const exp = transactions.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);
    return {
      income: inc,
      expense: exp,
      balance: inc - exp,
      savingRate: inc > 0 ? Math.round(((inc - exp) / inc) * 100) : 0,
    };
  }, [transactions]);

  if (user === undefined) {
    return (
      <div className="bento-card gradient-indigo h-full flex flex-col p-5 items-center justify-center gap-2">
        <div style={{ width: 28, height: 28, borderRadius: "50%", border: "3px solid #6366F1", borderTopColor: "transparent", animation: "spin 0.8s linear infinite" }} />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="bento-card gradient-indigo h-full flex flex-col p-5 gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: "#6366F1" }}>가계부</p>
          <h2 className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>분석 요약</h2>
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

  return (
    <div className="bento-card gradient-indigo h-full flex flex-col p-5 gap-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: "#6366F1" }}>가계부</p>
          <h2 className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>분석 요약</h2>
        </div>
        <Link
          href="/budget"
          className="flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg transition-opacity hover:opacity-70"
          style={{ background: "#6366F122", color: "#6366F1" }}
        >
          상세보기 <ArrowRight size={11} />
        </Link>
      </div>

      {/* 수입/지출/잔액 요약 */}
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

      {/* 저축률 */}
      <div className="rounded-xl p-3" style={{ background: "rgba(255,255,255,0.04)" }}>
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold" style={{ color: "var(--text-muted)" }}>저축률</span>
          <span className="text-sm font-black" style={{ color: savingRate >= 0 ? "#10B981" : "#F43F5E" }}>{savingRate}%</span>
        </div>
        <div style={{ height: 6, borderRadius: 999, background: "rgba(255,255,255,0.08)", overflow: "hidden" }}>
          <div
            style={{
              width: `${Math.min(Math.max(savingRate, 0), 100)}%`,
              height: "100%",
              borderRadius: 999,
              background: savingRate >= 0 ? "#10B981" : "#F43F5E",
              transition: "width 0.6s ease",
            }}
          />
        </div>
      </div>

      {/* 거래 없을 때 안내 */}
      {!loading && transactions.length === 0 && (
        <div className="flex-1 flex flex-col items-center justify-center gap-2">
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>아직 거래 내역이 없습니다.</p>
          <Link href="/budget" className="text-xs font-semibold" style={{ color: "#6366F1" }}>
            + 첫 거래 추가하기
          </Link>
        </div>
      )}
      {loading && (
        <div className="flex-1 flex items-center justify-center">
          <div style={{ width: 20, height: 20, borderRadius: "50%", border: "2px solid #6366F1", borderTopColor: "transparent", animation: "spin 0.8s linear infinite" }} />
        </div>
      )}
    </div>
  );
}
