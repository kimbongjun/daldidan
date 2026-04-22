import { createAdminClient } from "@/lib/supabase/server";

const DHLOTTERY_URL = "https://www.dhlottery.co.kr/common.do?method=getLottoNumber&drwNo=";
const NAVER_SEARCH_URL = "https://search.naver.com/search.naver?where=nexearch&query=";
const DHLOTTERY_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  "Accept": "application/json, text/plain, */*",
  "Accept-Language": "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7",
  "Referer": "https://www.dhlottery.co.kr/gameResult.do?method=byWin",
};
const NAVER_HEADERS = {
  "User-Agent": DHLOTTERY_HEADERS["User-Agent"],
  "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7",
  "Referer": "https://search.naver.com/",
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

function toLottoResultRow(data: LottoData): LottoResultRow {
  return {
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
  };
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

function toNumber(value: string): number {
  return Number(value.replace(/[^\d]/g, ""));
}

function normalizeNaverDate(value: string): string {
  return value.replace(/\.$/, "").replace(/\./g, "-");
}

function parseNaverLottoHtml(html: string, expectedRound: number): LottoFetchResult {
  const roundMatch = html.match(/class="text _select_trigger _text"[^>]*>(\d+)회차 \((\d{4}\.\d{2}\.\d{2}\.)\)<\/a>/);
  if (!roundMatch) return { ok: false, reason: "네이버 로또 위젯을 찾지 못했습니다." };

  const round = Number(roundMatch[1]);
  if (round !== expectedRound) {
    return { ok: false, reason: `네이버 검색 결과 회차 불일치: 요청 ${expectedRound}회 / 응답 ${round}회` };
  }

  const winningBlockMatch = html.match(/<div class="winning_number">([\s\S]*?)<\/div>\s*<div class="bonus_number">\s*<span class="ball [^"]+">(\d+)<\/span>/);
  if (!winningBlockMatch) return { ok: false, reason: "네이버 당첨번호 영역 파싱 실패" };

  const winningNumbers = Array.from(
    winningBlockMatch[1].matchAll(/<span class="ball [^"]+">(\d+)<\/span>/g),
    (match) => Number(match[1]),
  );
  if (winningNumbers.length !== 6) {
    return { ok: false, reason: `네이버 당첨번호 개수 오류: ${winningNumbers.length}` };
  }

  const firstPrizeMatch = html.match(/<th scope="row" rowspan="4">1등<\/th>\s*<td class="sub_title">총 당첨금<\/td>\s*<td>([\d,]+)원<\/td>\s*<\/tr>\s*<tr>\s*<td class="sub_title">당첨 복권수<\/td>\s*<td>([\d,]+)개<\/td>\s*<\/tr>\s*<tr class="emphasis">\s*<td class="sub_title">1개당 당첨금<\/td>\s*<td>([\d,]+)원<\/td>/);
  if (!firstPrizeMatch) return { ok: false, reason: "네이버 1등 당첨금 영역 파싱 실패" };

  return {
    ok: true,
    data: {
      drwNo: round,
      drwNoDate: normalizeNaverDate(roundMatch[2]),
      drwtNo1: winningNumbers[0],
      drwtNo2: winningNumbers[1],
      drwtNo3: winningNumbers[2],
      drwtNo4: winningNumbers[3],
      drwtNo5: winningNumbers[4],
      drwtNo6: winningNumbers[5],
      bnusNo: Number(winningBlockMatch[2]),
      firstWinamnt: toNumber(firstPrizeMatch[3]),
      firstPrzwnerCo: toNumber(firstPrizeMatch[2]),
      firstAccumAmnt: toNumber(firstPrizeMatch[1]),
    },
  };
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
      return { ok: false, reason: isHtml ? "dhlottery IP 차단 또는 봇 차단 HTML 응답" : "dhlottery JSON 파싱 실패" };
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

export async function fetchFromNaverSearch(drwNo: number): Promise<LottoFetchResult> {
  try {
    const query = encodeURIComponent(`${drwNo}회 로또 당첨번호`);
    const res = await fetch(NAVER_SEARCH_URL + query, {
      signal: AbortSignal.timeout(10000),
      cache: "no-store",
      headers: NAVER_HEADERS,
    });
    if (!res.ok) return { ok: false, reason: `네이버 검색 HTTP ${res.status}` };

    const html = await res.text();
    return parseNaverLottoHtml(html, drwNo);
  } catch (e) {
    return { ok: false, reason: `네이버 검색 네트워크 오류: ${e instanceof Error ? e.message : String(e)}` };
  }
}

export async function fetchLotto(drwNo: number): Promise<LottoFetchResult> {
  const naver = await fetchFromNaverSearch(drwNo);
  if (naver.ok) return naver;
  const dhl = await fetchFromDhlottery(drwNo);
  if (dhl.ok) return dhl;
  return { ok: false, reason: `네이버 크롤링: ${naver.reason} / dhlottery: ${dhl.reason}` };
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

function hasSupabaseAdminConfig(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

async function persistFetchedResult(data: LottoData): Promise<string | null> {
  if (!hasSupabaseAdminConfig()) return null;

  try {
    const { error } = await upsertLottoResult(data);
    return error?.message ?? null;
  } catch (e) {
    return e instanceof Error ? e.message : String(e);
  }
}

export async function getLottoResultByRound(drwNo: number): Promise<{ data: LottoResultRow | null; error: string | null }> {
  let latestError: string | null = null;

  if (hasSupabaseAdminConfig()) {
    try {
      const supabase = createAdminClient();
      const { data, error } = await supabase
        .from("lotto_results")
        .select("drw_no, drw_no_date, drw_no1, drw_no2, drw_no3, drw_no4, drw_no5, drw_no6, drw_no_bonus_no, first_win_cnt, first_win_amnt, first_accum_prize_r")
        .eq("drw_no", drwNo)
        .maybeSingle();

      if (!error && data) {
        return { data: data as LottoResultRow, error: null };
      }

      latestError = error?.message ?? latestError;
    } catch (e) {
      latestError = e instanceof Error ? e.message : String(e);
    }
  }

  const fetched = await fetchLotto(drwNo);
  if (!fetched.ok) {
    return { data: null, error: latestError ? `${latestError} / ${fetched.reason}` : fetched.reason };
  }

  const persistError = await persistFetchedResult(fetched.data);
  return {
    data: toLottoResultRow(fetched.data),
    error: persistError ?? null,
  };
}

export async function getLatestLottoResult(): Promise<{ data: LottoResultRow | null; error: string | null }> {
  const latestRound = getLatestRound();
  let latestStored: LottoResultRow | null = null;
  let latestError: string | null = null;

  if (hasSupabaseAdminConfig()) {
    try {
      const supabase = createAdminClient();
      const { data: stored, error } = await supabase
        .from("lotto_results")
        .select("drw_no, drw_no_date, drw_no1, drw_no2, drw_no3, drw_no4, drw_no5, drw_no6, drw_no_bonus_no, first_win_cnt, first_win_amnt, first_accum_prize_r")
        .order("drw_no", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        latestError = error.message;
      } else {
        latestStored = stored as LottoResultRow | null;
      }
    } catch (e) {
      latestError = e instanceof Error ? e.message : String(e);
    }
  }

  if (latestStored && latestStored.drw_no >= latestRound) return { data: latestStored, error: null };

  const fetchRounds = latestStored
    ? [latestRound, latestRound - 1, latestRound - 2]
    : [latestRound, latestRound - 1, latestRound - 2, latestRound - 3];

  for (const round of fetchRounds) {
    if (round < 1) continue;
    const fetched = await getLottoResultByRound(round);
    if (fetched.data) return fetched;
    latestError = fetched.error ?? latestError;
  }

  if (latestStored) {
    return { data: latestStored, error: latestError };
  }

  return { data: null, error: latestError ?? "당첨 번호 데이터가 없습니다. 크롤러를 먼저 실행해 주세요." };
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
