import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

export const revalidate = 300;
export const dynamic = "force-dynamic";

export interface LottoGenerateResponse {
  numbers: number[];
  bonus: number;
  topNumbers: { number: number; count: number }[];
}

interface LottoRow {
  drw_no1: number;
  drw_no2: number;
  drw_no3: number;
  drw_no4: number;
  drw_no5: number;
  drw_no6: number;
}

function buildFrequencyMap(rows: LottoRow[]): Map<number, number> {
  const freq = new Map<number, number>();
  for (let i = 1; i <= 45; i++) freq.set(i, 0);
  for (const row of rows) {
    for (const n of [row.drw_no1, row.drw_no2, row.drw_no3, row.drw_no4, row.drw_no5, row.drw_no6]) {
      freq.set(n, (freq.get(n) ?? 0) + 1);
    }
  }
  return freq;
}

function weightedRandom(pool: number[], weights: number[]): number {
  const total = weights.reduce((s, w) => s + w, 0);
  let rand = Math.random() * total;
  for (let i = 0; i < pool.length; i++) {
    rand -= weights[i];
    if (rand <= 0) return pool[i];
  }
  return pool[pool.length - 1];
}

function generateNumbers(freq: Map<number, number>): { numbers: number[]; bonus: number } {
  const allNums = Array.from({ length: 45 }, (_, i) => i + 1);
  const allWeights = allNums.map((n) => (freq.get(n) ?? 0) + 1); // +1 minimum weight

  const picked: Set<number> = new Set();
  const remaining = [...allNums];
  const remainingWeights = [...allWeights];

  while (picked.size < 6) {
    const chosen = weightedRandom(remaining, remainingWeights);
    picked.add(chosen);
    const idx = remaining.indexOf(chosen);
    remaining.splice(idx, 1);
    remainingWeights.splice(idx, 1);
  }

  const numbers = Array.from(picked).sort((a, b) => a - b);

  // Bonus from remaining pool
  const bonus = weightedRandom(remaining, remainingWeights);

  return { numbers, bonus };
}

function pureRandom(): { numbers: number[]; bonus: number } {
  const pool = Array.from({ length: 45 }, (_, i) => i + 1);
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return {
    numbers: pool.slice(0, 6).sort((a, b) => a - b),
    bonus: pool[6],
  };
}

export async function GET() {
  const supabase = createAdminClient();

  const { data: rows, error } = await supabase
    .from("lotto_results")
    .select("drw_no1, drw_no2, drw_no3, drw_no4, drw_no5, drw_no6")
    .order("drw_no", { ascending: false })
    .limit(52);

  if (error) {
    console.error("[lotto/generate] Supabase 에러:", error);
  }

  if (!rows || rows.length === 0) {
    const { numbers, bonus } = pureRandom();
    return NextResponse.json({ numbers, bonus, topNumbers: [] } satisfies LottoGenerateResponse);
  }

  const freq = buildFrequencyMap(rows);
  const { numbers, bonus } = generateNumbers(freq);

  const topNumbers = Array.from(freq.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 7)
    .map(([n, count]) => ({ number: n, count }));

  return NextResponse.json({ numbers, bonus, topNumbers } satisfies LottoGenerateResponse);
}
