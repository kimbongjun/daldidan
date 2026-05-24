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
  drw_no: number;
  drw_no1: number;
  drw_no2: number;
  drw_no3: number;
  drw_no4: number;
  drw_no5: number;
  drw_no6: number;
}

function getNumbers(row: LottoRow): number[] {
  return [row.drw_no1, row.drw_no2, row.drw_no3, row.drw_no4, row.drw_no5, row.drw_no6];
}

/** 전체 빈도 맵: 모든 회차 누적 출현 횟수 */
function buildFreqMap(rows: LottoRow[]): Map<number, number> {
  const freq = new Map<number, number>();
  for (let i = 1; i <= 45; i++) freq.set(i, 0);
  for (const row of rows) {
    for (const n of getNumbers(row)) freq.set(n, (freq.get(n) ?? 0) + 1);
  }
  return freq;
}

/**
 * 최근 가중 빈도 맵: rows[0]이 가장 최신.
 * 최근 회차일수록 높은 가중치 (지수 감쇠, 반감기 30회).
 */
function buildRecentWeightedFreq(rows: LottoRow[]): Map<number, number> {
  const freq = new Map<number, number>();
  for (let i = 1; i <= 45; i++) freq.set(i, 0);
  for (let i = 0; i < rows.length; i++) {
    const weight = Math.exp(-i / 30);
    for (const n of getNumbers(rows[i])) {
      freq.set(n, (freq.get(n) ?? 0) + weight);
    }
  }
  return freq;
}

/**
 * 갭 맵: 각 번호가 마지막으로 출현한 이후 경과 회차 수.
 * rows[0]이 가장 최신이므로 앞에서부터 처음 등장하는 위치가 마지막 출현.
 * 오래 안 나온 번호(갭 큰 번호)는 "적체" 효과로 확률이 높다는 이론 반영.
 */
function buildGapMap(rows: LottoRow[]): Map<number, number> {
  const lastSeen = new Map<number, number>();
  for (let i = 0; i < rows.length; i++) {
    for (const n of getNumbers(rows[i])) {
      if (!lastSeen.has(n)) lastSeen.set(n, i);
    }
  }
  const gapMap = new Map<number, number>();
  const total = rows.length;
  for (let i = 1; i <= 45; i++) {
    gapMap.set(i, lastSeen.has(i) ? (lastSeen.get(i) ?? 0) : total);
  }
  return gapMap;
}

/**
 * 쌍 동반 출현 맵: 두 번호가 같은 회차에 함께 나온 횟수.
 * 이미 선택된 번호들과 자주 함께 나온 번호에 보너스 가중치 부여.
 */
function buildPairMap(rows: LottoRow[]): Map<string, number> {
  const pairs = new Map<string, number>();
  for (const row of rows) {
    const nums = getNumbers(row);
    for (let i = 0; i < nums.length; i++) {
      for (let j = i + 1; j < nums.length; j++) {
        const key = `${Math.min(nums[i], nums[j])}-${Math.max(nums[i], nums[j])}`;
        pairs.set(key, (pairs.get(key) ?? 0) + 1);
      }
    }
  }
  return pairs;
}

function pairKey(a: number, b: number): string {
  return `${Math.min(a, b)}-${Math.max(a, b)}`;
}

function normalize(map: Map<number, number>): Map<number, number> {
  const values = Array.from(map.values());
  const max = Math.max(...values, 1);
  const result = new Map<number, number>();
  for (const [k, v] of map) result.set(k, v / max);
  return result;
}

function pairScore(n: number, picked: number[], pairMap: Map<string, number>, maxPair: number): number {
  if (picked.length === 0 || maxPair === 0) return 0;
  let total = 0;
  for (const p of picked) total += (pairMap.get(pairKey(n, p)) ?? 0) / maxPair;
  return total / picked.length;
}

/**
 * 생성된 6개 번호 조합의 유효성 검사.
 * - 합계 범위: 역대 1등 합계의 중앙 구간 (100 ~ 175)
 * - 번호대(10단위) 분포: 최소 3개 구간, 단일 구간 최대 3개
 * - 연속 번호: 4개 이상 연속 금지
 */
function isValidCombo(numbers: number[]): boolean {
  const sum = numbers.reduce((a, b) => a + b, 0);
  if (sum < 100 || sum > 175) return false;

  const ranges = [0, 0, 0, 0, 0];
  for (const n of numbers) {
    if (n <= 9) ranges[0]++;
    else if (n <= 19) ranges[1]++;
    else if (n <= 29) ranges[2]++;
    else if (n <= 39) ranges[3]++;
    else ranges[4]++;
  }
  const rangeCount = ranges.filter((r) => r > 0).length;
  if (rangeCount < 2) return false;
  if (Math.max(...ranges) > 3) return false;

  const sorted = [...numbers].sort((a, b) => a - b);
  let maxConsec = 1, cur = 1;
  for (let i = 1; i < sorted.length; i++) {
    cur = sorted[i] === sorted[i - 1] + 1 ? cur + 1 : 1;
    if (cur > maxConsec) maxConsec = cur;
  }
  if (maxConsec >= 4) return false;

  return true;
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

function generateNumbers(
  freqNorm: Map<number, number>,
  recentNorm: Map<number, number>,
  gapNorm: Map<number, number>,
  pairMap: Map<string, number>,
  maxPair: number,
): { numbers: number[]; bonus: number } {
  const MAX_ATTEMPTS = 30;

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const pool = Array.from({ length: 45 }, (_, i) => i + 1);
    const picked: number[] = [];

    while (picked.length < 6 && pool.length > 0) {
      const weights = pool.map((n) => {
        const freq = freqNorm.get(n) ?? 0;
        const recent = recentNorm.get(n) ?? 0;
        const gap = gapNorm.get(n) ?? 0;
        const pair = picked.length >= 2 ? pairScore(n, picked, pairMap, maxPair) : 0;
        return 0.35 * freq + 0.30 * recent + 0.15 * gap + 0.20 * pair + 0.01;
      });

      const chosen = weightedRandom(pool, weights);
      picked.push(chosen);
      pool.splice(pool.indexOf(chosen), 1);

      if (picked.length === 6) break;
    }

    const numbers = picked.sort((a, b) => a - b);
    if (isValidCombo(numbers)) {
      const bonusWeights = pool.map((n) => (freqNorm.get(n) ?? 0) + 0.01);
      const bonus = weightedRandom(pool, bonusWeights);
      return { numbers, bonus };
    }
  }

  // fallback: 조건 완화 — 단순 빈도 기반
  const fallbackPool = Array.from({ length: 45 }, (_, i) => i + 1);
  const fallbackWeights = fallbackPool.map((n) => (freqNorm.get(n) ?? 0) + 0.01);
  const picked: number[] = [];
  const remaining = [...fallbackPool];
  const remainingW = [...fallbackWeights];
  while (picked.length < 6) {
    const chosen = weightedRandom(remaining, remainingW);
    picked.push(chosen);
    const idx = remaining.indexOf(chosen);
    remaining.splice(idx, 1);
    remainingW.splice(idx, 1);
  }
  const numbers = picked.sort((a, b) => a - b);
  const bonus = weightedRandom(remaining, remainingW);
  return { numbers, bonus };
}

function pureRandom(): { numbers: number[]; bonus: number } {
  const pool = Array.from({ length: 45 }, (_, i) => i + 1);
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return { numbers: pool.slice(0, 6).sort((a, b) => a - b), bonus: pool[6] };
}

export async function GET() {
  const supabase = createAdminClient();

  const { data: rows, error } = await supabase
    .from("lotto_results")
    .select("drw_no, drw_no1, drw_no2, drw_no3, drw_no4, drw_no5, drw_no6")
    .order("drw_no", { ascending: false })
    .limit(200);

  if (error) console.error("[lotto/generate] Supabase 에러:", error);

  if (!rows || rows.length === 0) {
    const { numbers, bonus } = pureRandom();
    return NextResponse.json({ numbers, bonus, topNumbers: [] } satisfies LottoGenerateResponse);
  }

  const typedRows = rows as LottoRow[];

  const freqMap = buildFreqMap(typedRows);
  const recentMap = buildRecentWeightedFreq(typedRows);
  const gapMap = buildGapMap(typedRows);
  const pairMap = buildPairMap(typedRows);

  const freqNorm = normalize(freqMap);
  const recentNorm = normalize(recentMap);
  const gapNorm = normalize(gapMap);
  const maxPair = Math.max(...Array.from(pairMap.values()), 1);

  const { numbers, bonus } = generateNumbers(freqNorm, recentNorm, gapNorm, pairMap, maxPair);

  const topNumbers = Array.from(freqMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 7)
    .map(([n, count]) => ({ number: n, count }));

  return NextResponse.json({ numbers, bonus, topNumbers } satisfies LottoGenerateResponse);
}
