"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

// ── 이번 달 요약 ─────────────────────────────────────────────
export async function getMonthlyBudget(yearMonth?: string) {
  const supabase = await createClient();
  const ym = yearMonth ?? new Date().toISOString().slice(0, 7); // "YYYY-MM"

  const { data, error } = await supabase
    .from("monthly_summary")
    .select("*")
    .eq("ym", ym)
    .single();

  if (error) return null;
  return data;
}

// ── 이번 달 카테고리별 지출 ───────────────────────────────────
export async function getCategoryExpense(yearMonth?: string) {
  const supabase = await createClient();
  const ym = yearMonth ?? new Date().toISOString().slice(0, 7);

  const { data, error } = await supabase
    .from("category_expense_summary")
    .select("category, total_amount, tx_count")
    .eq("ym", ym)
    .order("total_amount", { ascending: false })
    .limit(5);

  if (error) return [];
  return data;
}

// ── 거래 목록 ────────────────────────────────────────────────
export async function getTransactions(limit = 20) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("transactions")
    .select("id, type, category, amount, note, date")
    .order("date", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) return [];
  return data;
}

// ── 거래 추가 ────────────────────────────────────────────────
export async function addTransaction(payload: {
  type: "income" | "expense";
  category: string;
  amount: number;
  note?: string;
  date?: string;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("로그인이 필요합니다.");

  const { error } = await supabase
    .from("transactions")
    .insert({ ...payload, user_id: user.id });

  if (error) throw new Error(error.message);
  revalidatePath("/budget");
  revalidatePath("/");
}

// ── 거래 수정 ────────────────────────────────────────────────
export async function updateTransaction(
  id: string,
  patch: {
    type?: "income" | "expense";
    category?: string;
    amount?: number;
    note?: string;
    date?: string;
  },
) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("transactions")
    .update(patch)
    .eq("id", id);

  if (error) throw new Error(error.message);
  revalidatePath("/budget");
  revalidatePath("/");
}

// ── 거래 삭제 ────────────────────────────────────────────────
export async function deleteTransaction(id: string) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("transactions")
    .delete()
    .eq("id", id);

  if (error) throw new Error(error.message);
  revalidatePath("/budget");
  revalidatePath("/");
}
