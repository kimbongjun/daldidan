import { createAdminClient } from "@/lib/supabase/server";

const DHLOTTERY_URL = "https://www.dhlottery.co.kr/common.do?method=getLottoNumber&drwNo=";
const DHLOTTERY_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  "Accept": "application/json, text/plain, */*",
  "Accept-Language": "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7",
  "Referer": "https://www.dhlottery.co.kr/gameResult.do?method=byWin",
};

export interface LottoData {
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

export type LottoFetchResult =
  | { ok: true; data: LottoData }
  | { ok: false; reason: string };

export function getLatestRound(now = new Date()): number {
  const firstDrawMs = new Date("2002-12-07T20:45:00+09:00").getTime();
  const elapsed = now.getTime() - firstDrawMs;
  if (elapsed < 0) return 1;
  return Math.floor(elapsed / (7 * 24 * 60 * 60 * 1000)) + 1;
}

export async function fetchFromPublicApi(drwNo: number): Promise<LottoFetchResult> {
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

export async function fetchFromDhlottery(drwNo: number): Promise<LottoFetchResult> {
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

export async function fetchLotto(drwNo: number): Promise<LottoFetchResult> {
  const pub = await fetchFromPublicApi(drwNo);
  if (pub.ok) return pub;
  const dhl = await fetchFromDhlottery(drwNo);
  if (dhl.ok) return dhl;
  return { ok: false, reason: `공공데이터: ${pub.reason} / dhlottery: ${dhl.reason}` };
}

export async function upsertLottoResult(data: LottoData) {
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

export interface LottoResultRow {
  drw_no: number;
  drw_no_date: string;
  drw_no1: number;
  drw_no2: number;
  drw_no3: number;
  drw_no4: number;
  drw_no5: number;
  drw_no6: number;
  drw_no_bonus_no: number;
  first_win_cnt: number;
  first_win_amnt: number | null;
  first_accum_prize_r: number;
}

export async function getLatestLottoResult(): Promise<{ data: LottoResultRow | null; error: string | null }> {
  const supabase = createAdminClient();
  const latestRound = getLatestRound();

  const { data: stored, error } = await supabase
    .from("lotto_results")
    .select("drw_no, drw_no_date, drw_no1, drw_no2, drw_no3, drw_no4, drw_no5, drw_no6, drw_no_bonus_no, first_win_cnt, first_win_amnt, first_accum_prize_r")
    .order("drw_no", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) return { data: null, error: error.message };
  const latestStored = stored as LottoResultRow | null;
  if (latestStored && latestStored.drw_no >= latestRound) return { data: latestStored, error: null };

  const fetchRounds = latestStored ? [latestRound, latestRound - 1] : [latestRound, latestRound - 1, latestRound - 2];

  for (const round of fetchRounds) {
    if (round < 1) continue;
    const fetched = await fetchLotto(round);
    if (!fetched.ok) continue;

    const { error: upsertError } = await upsertLottoResult(fetched.data);
    if (upsertError) return { data: null, error: upsertError.message };

    return {
      data: {
        drw_no: fetched.data.drwNo,
        drw_no_date: fetched.data.drwNoDate,
        drw_no1: fetched.data.drwtNo1,
        drw_no2: fetched.data.drwtNo2,
        drw_no3: fetched.data.drwtNo3,
        drw_no4: fetched.data.drwtNo4,
        drw_no5: fetched.data.drwtNo5,
        drw_no6: fetched.data.drwtNo6,
        drw_no_bonus_no: fetched.data.bnusNo,
        first_win_cnt: fetched.data.firstPrzwnerCo,
        first_win_amnt: fetched.data.firstWinamnt,
        first_accum_prize_r: fetched.data.firstAccumAmnt,
      },
      error: null,
    };
  }

  return { data: latestStored ?? null, error: latestStored ? null : "당첨 번호 데이터가 없습니다. 크롤러를 먼저 실행해 주세요." };
}

export interface ParsedQrTicket {
  drwNo: number;
  games: number[][];
  sourceUrl: string | null;
  raw: string;
}

function normalizeQrPayload(payload: string): string {
  const trimmed = payload.trim();
  if (!trimmed) return "";

  try {
    const url = new URL(trimmed);
    const v = url.searchParams.get("v");
    return v?.trim() || trimmed;
  } catch {
    const match = trimmed.match(/[?&]v=([^&\s]+)/i);
    if (!match) return trimmed;
    try {
      return decodeURIComponent(match[1]).trim();
    } catch {
      return match[1].trim();
    }
  }
}

export function parseLottoQr(payload: string): ParsedQrTicket | null {
  const normalized = normalizeQrPayload(payload);
  if (!normalized) return null;

  const roundMatch = normalized.match(/^(\d{3,4})/);
  if (!roundMatch) return null;

  const games = Array.from(normalized.matchAll(/m(\d{12})/g))
    .map(([, encoded]) => encoded.match(/.{1,2}/g)?.map((chunk) => Number(chunk)) ?? [])
    .filter((numbers) => numbers.length === 6 && numbers.every((n) => Number.isInteger(n) && n >= 1 && n <= 45));

  if (games.length === 0) return null;

  let sourceUrl: string | null = null;
  try {
    const url = new URL(payload.trim());
    sourceUrl = url.toString();
  } catch {
    sourceUrl = null;
  }

  return {
    drwNo: Number(roundMatch[1]),
    games,
    sourceUrl,
    raw: payload,
  };
}
