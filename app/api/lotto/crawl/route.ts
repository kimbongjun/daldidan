import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

// ── 상수 ─────────────────────────────────────────────────────────────────────
const DHLOTTERY_URL = "https://www.dhlottery.co.kr/common.do?method=getLottoNumber&drwNo=";
const DHLOTTERY_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  "Accept": "application/json, text/plain, */*",
  "Accept-Language": "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7",
  "Referer": "https://www.dhlottery.co.kr/gameResult.do?method=byWin",
};

// ── 타입 ──────────────────────────────────────────────────────────────────────
interface LottoData {
  drwNo: number;
  drwNoDate: string;
  drwtNo1: number;
  drwtNo2: number;
  drwtNo3: number;
  drwtNo4: number;
  drwtNo5: number;
  drwtNo6: number;
  bnusNo: number;
  firstWinamnt: number;
  firstPrzwnerCo: number;
  firstAccumAmnt: number;
}

type FetchResult =
  | { ok: true; data: LottoData }
  | { ok: false; reason: string };

// ── 유틸 ──────────────────────────────────────────────────────────────────────
function getLatestRound(): number {
  const firstDrawMs = new Date("2002-12-07T20:45:00+09:00").getTime();
  const elapsed = Date.now() - firstDrawMs;
  if (elapsed < 0) return 1;
  return Math.floor(elapsed / (7 * 24 * 60 * 60 * 1000)) + 1;
}

function checkAuth(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true;
  return request.headers.get("authorization") === `Bearer ${secret}`;
}

// ── 공공데이터포털 API (Vercel에서 동작 — 키 필요) ──────────────────────────
async function fetchFromPublicApi(drwNo: number): Promise<FetchResult> {
  const key = process.env.LOTTO_API_KEY;
  if (!key) return { ok: false, reason: "LOTTO_API_KEY 미설정" };

  try {
    const url =
      `https://apis.data.go.kr/B551015/LrsrClfInfo/getLottoNumber` +
      `?serviceKey=${encodeURIComponent(key)}&drwNo=${drwNo}&_type=json`;

    const res = await fetch(url, { signal: AbortSignal.timeout(10000), cache: "no-store" });
    if (!res.ok) return { ok: false, reason: `공공데이터 HTTP ${res.status}` };

    const json = await res.json() as {
      response?: {
        header?: { resultCode?: string; resultMsg?: string };
        body?: { items?: { item?: unknown } };
      };
    };
    const header = json.response?.header;
    if (header?.resultCode !== "00") {
      return { ok: false, reason: `공공데이터 오류: ${header?.resultMsg ?? "unknown"}` };
    }

    const raw = json.response?.body?.items?.item;
    const item = Array.isArray(raw) ? raw[0] : raw;
    if (!item || typeof (item as Record<string, unknown>).drwNo !== "number") {
      return { ok: false, reason: "공공데이터 응답 형식 불일치" };
    }

    const d = item as Record<string, unknown>;
    return {
      ok: true,
      data: {
        drwNo: d.drwNo as number,
        drwNoDate: d.drwNoDate as string,
        drwtNo1: d.drwtNo1 as number,
        drwtNo2: d.drwtNo2 as number,
        drwtNo3: d.drwtNo3 as number,
        drwtNo4: d.drwtNo4 as number,
        drwtNo5: d.drwtNo5 as number,
        drwtNo6: d.drwtNo6 as number,
        bnusNo: d.bnusNo as number,
        firstWinamnt: (d.firstWinamnt as number) ?? 0,
        firstPrzwnerCo: (d.firstPrzwnerCo as number) ?? 0,
        firstAccumAmnt: (d.firstAccumAmnt as number) ?? 0,
      },
    };
  } catch (e) {
    return { ok: false, reason: `공공데이터 네트워크 오류: ${e instanceof Error ? e.message : String(e)}` };
  }
}

// ── 동행복권 직접 API (로컬/한국 IP에서 동작 — 키 불필요) ───────────────────
async function fetchFromDhlottery(drwNo: number): Promise<FetchResult> {
  try {
    const res = await fetch(DHLOTTERY_URL + drwNo, {
      signal: AbortSignal.timeout(10000),
      cache: "no-store",
      headers: DHLOTTERY_HEADERS,
    });
    if (!res.ok) return { ok: false, reason: `dhlottery HTTP ${res.status}` };

    const text = await res.text();
    let data: unknown;
    try {
      data = JSON.parse(text);
    } catch {
      // HTML이 돌아오면 IP 차단 — Vercel 등 비한국 IP에서 발생
      const isHtml = text.trimStart().startsWith("<");
      return { ok: false, reason: isHtml ? "dhlottery IP 차단 (비한국 IP) — LOTTO_API_KEY 설정 필요" : "dhlottery JSON 파싱 실패" };
    }

    const r = data as Record<string, unknown>;
    if (r.returnValue === "fail") return { ok: false, reason: "추첨 전 또는 존재하지 않는 회차" };
    if (r.returnValue !== "success" || typeof r.drwNo !== "number") {
      return { ok: false, reason: "dhlottery 응답 형식 불일치" };
    }

    return {
      ok: true,
      data: {
        drwNo: r.drwNo as number,
        drwNoDate: r.drwNoDate as string,
        drwtNo1: r.drwtNo1 as number,
        drwtNo2: r.drwtNo2 as number,
        drwtNo3: r.drwtNo3 as number,
        drwtNo4: r.drwtNo4 as number,
        drwtNo5: r.drwtNo5 as number,
        drwtNo6: r.drwtNo6 as number,
        bnusNo: r.bnusNo as number,
        firstWinamnt: (r.firstWinamnt as number) ?? 0,
        firstPrzwnerCo: (r.firstPrzwnerCo as number) ?? 0,
        firstAccumAmnt: (r.firstAccumAmnt as number) ?? 0,
      },
    };
  } catch (e) {
    return { ok: false, reason: `dhlottery 네트워크 오류: ${e instanceof Error ? e.message : String(e)}` };
  }
}

// 공공데이터 우선, 실패 시 dhlottery 직접 시도
async function fetchLotto(drwNo: number): Promise<FetchResult> {
  const pub = await fetchFromPublicApi(drwNo);
  if (pub.ok) return pub;
  const dhl = await fetchFromDhlottery(drwNo);
  if (dhl.ok) return dhl;
  return { ok: false, reason: `공공데이터: ${pub.reason} / dhlottery: ${dhl.reason}` };
}

async function upsertResult(data: LottoData) {
  const supabase = createAdminClient();
  return supabase.from("lotto_results").upsert(
    {
      drw_no: data.drwNo,
      drw_no_date: data.drwNoDate,
      drw_no1: data.drwtNo1,
      drw_no2: data.drwtNo2,
      drw_no3: data.drwtNo3,
      drw_no4: data.drwtNo4,
      drw_no5: data.drwtNo5,
      drw_no6: data.drwtNo6,
      drw_no_bonus_no: data.bnusNo,
      first_win_cnt: data.firstPrzwnerCo,
      first_win_amnt: data.firstWinamnt,
      first_accum_prize_r: data.firstAccumAmnt,
    },
    { onConflict: "drw_no" },
  );
}

// ── 핸들러 ────────────────────────────────────────────────────────────────────

/**
 * GET /api/lotto/crawl?drwNo=1219
 * 진단용 — 특정 회차를 테스트하고 상세 결과를 반환한다.
 */
export async function GET(request: NextRequest) {
  if (!checkAuth(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const latestRound = getLatestRound();
  const drwNo = Number(request.nextUrl.searchParams.get("drwNo") ?? latestRound);
  const result = await fetchLotto(drwNo);

  return NextResponse.json(
    { drwNo, latestRound, ...result },
    { status: result.ok ? 200 : 502 },
  );
}

/**
 * POST /api/lotto/crawl
 * Vercel Cron이 매주 토요일 21:10 KST(12:10 UTC)에 자동 호출.
 * Authorization: Bearer {CRON_SECRET} 헤더로 보호.
 */
export async function POST(request: NextRequest) {
  if (!checkAuth(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const latestRound = getLatestRound();
  const errors: Record<number, string> = {};

  for (const drwNo of [latestRound, latestRound - 1]) {
    const result = await fetchLotto(drwNo);
    if (!result.ok) { errors[drwNo] = result.reason; continue; }

    const { error: dbError } = await upsertResult(result.data);
    if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 });

    return NextResponse.json({
      ok: true,
      drwNo: result.data.drwNo,
      drwNoDate: result.data.drwNoDate,
      numbers: [result.data.drwtNo1, result.data.drwtNo2, result.data.drwtNo3, result.data.drwtNo4, result.data.drwtNo5, result.data.drwtNo6],
      bonus: result.data.bnusNo,
    });
  }

  return NextResponse.json(
    { error: "데이터를 가져오지 못했습니다.", latestRound, errors },
    { status: 502 },
  );
}
