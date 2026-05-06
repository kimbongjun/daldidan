import { NextResponse } from "next/server";

export interface SubscriptionItem {
  id: string;
  name: string;          // 단지명
  region: string;        // 지역 (시/구)
  houseManageNo?: string;
  pblancNo?: string;
  type: string;          // "민영" | "공공"
  totalUnits: number;    // 총 공급 세대수
  startDate: string;     // 청약 시작일 (YYYY-MM-DD)
  endDate: string;       // 청약 종료일 (YYYY-MM-DD)
  announceDate: string;  // 당첨자 발표일 (YYYY-MM-DD)
  minPrice: number;      // 최저 분양가 (만원)
  maxPrice: number;      // 최고 분양가 (만원)
  detailUrl: string;
}

// ── 유틸 ─────────────────────────────────────────────────────────────────────

function fmt(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function addDays(d: Date, n: number): Date {
  return new Date(d.getTime() + n * 86400000);
}

function getDday(dateStr: string): number {
  const target = new Date(dateStr);
  target.setHours(0, 0, 0, 0);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return Math.ceil((target.getTime() - now.getTime()) / 86400000);
}

function stripTags(html: string): string {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

// ── URL 생성 ──────────────────────────────────────────────────────────────────

function applyHomeSearchUrl(name: string): string {
  const q = encodeURIComponent(name.trim());
  return `https://www.applyhome.co.kr/ai/aia/selectAPTLttotPblancListView.do?searchKeyword=${q}`;
}

function applyHomeDetailUrl(hmno: string, pbno: string): string {
  return `https://www.applyhome.co.kr/ai/aia/selectAPTLttotPblancDetail.do?houseManageNo=${hmno}&pblancNo=${pbno}`;
}

// ── Mock 데이터 ───────────────────────────────────────────────────────────────

function getMockSubscriptions(): SubscriptionItem[] {
  const today = new Date();
  return [
    {
      id: "sub-001",
      name: "마포 더 클래스 그랑종로",
      region: "서울 마포구",
      type: "민영",
      totalUnits: 312,
      startDate: fmt(addDays(today, 3)),
      endDate: fmt(addDays(today, 6)),
      announceDate: fmt(addDays(today, 14)),
      minPrice: 75000,
      maxPrice: 140000,
      detailUrl: applyHomeSearchUrl("마포 더 클래스 그랑종로"),
    },
    {
      id: "sub-002",
      name: "힐스테이트 광교중앙역",
      region: "경기 수원시",
      type: "민영",
      totalUnits: 520,
      startDate: fmt(addDays(today, 8)),
      endDate: fmt(addDays(today, 11)),
      announceDate: fmt(addDays(today, 21)),
      minPrice: 55000,
      maxPrice: 98000,
      detailUrl: applyHomeSearchUrl("힐스테이트 광교중앙역"),
    },
    {
      id: "sub-003",
      name: "래미안 강동 팰리스",
      region: "서울 강동구",
      type: "민영",
      totalUnits: 248,
      startDate: fmt(addDays(today, 15)),
      endDate: fmt(addDays(today, 18)),
      announceDate: fmt(addDays(today, 28)),
      minPrice: 95000,
      maxPrice: 160000,
      detailUrl: applyHomeSearchUrl("래미안 강동 팰리스"),
    },
    {
      id: "sub-004",
      name: "검단 한신더휴 퍼스트",
      region: "인천 서구",
      type: "공공",
      totalUnits: 890,
      startDate: fmt(addDays(today, 20)),
      endDate: fmt(addDays(today, 23)),
      announceDate: fmt(addDays(today, 35)),
      minPrice: 38000,
      maxPrice: 62000,
      detailUrl: applyHomeSearchUrl("검단 한신더휴 퍼스트"),
    },
  ];
}

// ── 청약홈 HTML 파싱 ──────────────────────────────────────────────────────────
//
// 파싱 전략:
//   1. 모든 <tbody> 수집 → tr 개수가 가장 많은 tbody 선택 (헤더/푸터 tbody 제외)
//   2. 각 <tr> opening tag에서 data-hmno / data-pbno 직접 추출 (인덱스 불일치 방지)
//   3. YYYY-MM-DD, YYYY.MM.DD 날짜 형식 모두 처리
//   4. td[0] 지역 | td[1] 주택구분 | td[3] 단지명 | td[4] 세대수
//      td[7] 청약기간 | td[8] 당첨자발표일

const BASE_URL = "https://www.applyhome.co.kr/ai/aia/selectAPTLttotPblancListView.do";

const COMMON_HEADERS: Record<string, string> = {
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "ko-KR,ko;q=0.9,en-US;q=0.8",
  "Cache-Control": "no-cache",
};

function parseHtmlToItems(html: string, idPrefix: string): SubscriptionItem[] {
  const items: SubscriptionItem[] = [];
  const seen = new Set<string>();

  // 모든 tbody 수집
  const tbodies: string[] = [];
  const tbodyRegex = /<tbody[^>]*>([\s\S]*?)<\/tbody>/g;
  let tbodyMatch: RegExpExecArray | null;
  while ((tbodyMatch = tbodyRegex.exec(html)) !== null) {
    tbodies.push(tbodyMatch[1]);
  }
  if (tbodies.length === 0) return items;

  // tr 개수가 가장 많은 tbody를 데이터 tbody로 선택
  const tbody = tbodies.reduce((a, b) => {
    const countA = (a.match(/<tr/gi) ?? []).length;
    const countB = (b.match(/<tr/gi) ?? []).length;
    return countB > countA ? b : a;
  });

  const trRegex = /(<tr[^>]*>)([\s\S]*?)<\/tr>/gi;
  let trMatch: RegExpExecArray | null;
  let rowIndex = 0;

  while ((trMatch = trRegex.exec(tbody)) !== null) {
    const trTag = trMatch[1];
    const rowContent = trMatch[2];

    // tr 태그에서 data-hmno / data-pbno 추출
    const hmno = trTag.match(/data-hmno="([^"]*)"/)?.[1] ?? "";
    const pbno = trTag.match(/data-pbno="([^"]*)"/)?.[1] ?? "";

    const tds = [...rowContent.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map((m) =>
      stripTags(m[1]).replace(/[ ☎]/g, "").trim(),
    );

    if (tds.length < 7) { rowIndex++; continue; }

    const region    = tds[0] ?? "";
    const houseType = tds[1] ?? "";
    const name      = tds[3] ?? tds[2] ?? "";
    const unitsRaw  = tds[4] ?? "";
    const totalUnits = parseInt(unitsRaw.replace(/[^0-9]/g, ""), 10) || 0;
    // 청약기간은 td[7], 당첨자발표일은 td[8] — 열 수에 따라 td[6]/[7] 폴백
    const periodRaw   = tds.length >= 9 ? (tds[7] ?? "") : (tds[6] ?? "");
    const announceRaw = tds.length >= 9 ? (tds[8] ?? "") : (tds[7] ?? "");

    if (!name || name.length < 2) { rowIndex++; continue; }

    // YYYY-MM-DD 또는 YYYY.MM.DD 모두 파싱
    const datePattern = /(\d{4})[.\-](\d{2})[.\-](\d{2})/g;
    const periodDates = [...periodRaw.matchAll(datePattern)].map(
      (m) => `${m[1]}-${m[2]}-${m[3]}`,
    );
    const announceDates = [...announceRaw.matchAll(datePattern)].map(
      (m) => `${m[1]}-${m[2]}-${m[3]}`,
    );

    const startDate   = periodDates[0] ?? "";
    const endDate     = periodDates[1] ?? startDate;
    const announceDate = announceDates[0] ?? "";

    if (!startDate) { rowIndex++; continue; }

    const type = houseType.includes("국민") || houseType.includes("공공") ? "공공" : "민영";
    const detailUrl =
      hmno && pbno ? applyHomeDetailUrl(hmno, pbno) : applyHomeSearchUrl(name);

    // 단지명 또는 houseManageNo 기준 중복 제거
    const key = hmno || name;
    if (seen.has(key)) { rowIndex++; continue; }
    seen.add(key);

    items.push({
      id: `sub-${idPrefix}-${rowIndex}`,
      name,
      region,
      houseManageNo: hmno,
      pblancNo: pbno,
      type,
      totalUnits,
      startDate,
      endDate,
      announceDate,
      minPrice: 0,
      maxPrice: 0,
      detailUrl,
    });

    rowIndex++;
  }

  return items;
}

// POST 방식으로 특정 페이지 조회 (청약홈 페이지네이션)
async function fetchSubscriptionsPage(page: number): Promise<SubscriptionItem[]> {
  const body = new URLSearchParams({
    pageIndex: String(page),
    recordCountPerPage: "10",
    houseSecdCd: "",       // 전체 (민영 + 공공)
    houseNm: "",           // 단지명 미지정
    subscrptAreaCode: "",  // 지역 미지정 (전국)
  });

  const res = await fetch(BASE_URL, {
    method: "POST",
    headers: {
      ...COMMON_HEADERS,
      "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
      "Referer": BASE_URL,
      "Origin": "https://www.applyhome.co.kr",
    },
    body: body.toString(),
    signal: AbortSignal.timeout(10000),
  });

  if (!res.ok) throw new Error(`POST p${page} HTTP ${res.status}`);
  return parseHtmlToItems(await res.text(), `p${page}`);
}

// GET 방식 폴백
async function fetchSubscriptionsFromGet(): Promise<SubscriptionItem[]> {
  const res = await fetch(BASE_URL, {
    method: "GET",
    headers: { ...COMMON_HEADERS, "Referer": "https://www.applyhome.co.kr/" },
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) throw new Error(`GET HTTP ${res.status}`);
  return parseHtmlToItems(await res.text(), "g1");
}

// 3페이지 병렬 조회 → 실패 시 GET 폴백
async function fetchAllSubscriptions(): Promise<SubscriptionItem[]> {
  const seen = new Set<string>();
  const merged: SubscriptionItem[] = [];

  const results = await Promise.allSettled([1, 2, 3].map((p) => fetchSubscriptionsPage(p)));

  for (const result of results) {
    if (result.status === "fulfilled") {
      for (const item of result.value) {
        const key = item.houseManageNo || item.name;
        if (!seen.has(key)) {
          seen.add(key);
          merged.push(item);
        }
      }
    }
  }

  // POST로 아무것도 못 가져왔으면 GET 폴백
  if (merged.length === 0) {
    const getItems = await fetchSubscriptionsFromGet();
    for (const item of getItems) {
      const key = item.houseManageNo || item.name;
      if (!seen.has(key)) {
        seen.add(key);
        merged.push(item);
      }
    }
  }

  if (merged.length === 0) throw new Error("청약 공고 파싱 결과 없음");
  return merged;
}

// ── Route Handler ─────────────────────────────────────────────────────────────

export const revalidate = 1800; // 30분 캐시
export const dynamic = "force-dynamic";

export async function GET() {
  let subscriptions: SubscriptionItem[] = getMockSubscriptions();
  let isMock = true;
  let apiError: string | null = null;

  try {
    const live = await fetchAllSubscriptions();
    if (live.length > 0) {
      subscriptions = live;
      isMock = false;
    }
  } catch (e) {
    apiError = e instanceof Error ? e.message : "청약 데이터 로드 실패";
  }

  const items = subscriptions.map((s) => ({
    ...s,
    dday: getDday(s.startDate),
  }));

  return NextResponse.json({
    subscriptions: items,
    isMock,
    ...(apiError ? { apiError } : {}),
  });
}
