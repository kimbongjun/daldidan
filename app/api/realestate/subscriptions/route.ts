import { NextResponse } from "next/server";

export interface SubscriptionItem {
  id: string;
  name: string;          // 단지명
  region: string;        // 지역 (시/구)
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

const today = new Date();
const fmt = (d: Date) => d.toISOString().slice(0, 10);
const addDays = (d: Date, n: number) => new Date(d.getTime() + n * 86400000);

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

// ── Mock 데이터 ───────────────────────────────────────────────────────────────

function applyHomeSearchUrl(name: string): string {
  const q = encodeURIComponent(name.trim());
  return `https://www.applyhome.co.kr/ai/aia/selectAPTLttotPblancListView.do?searchKeyword=${q}`;
}

function applyHomeDetailUrl(hmno: string, pbno: string): string {
  return `https://www.applyhome.co.kr/ai/aia/selectAPTLttotPblancDetail.do?houseManageNo=${hmno}&pblancNo=${pbno}`;
}

const MOCK_SUBSCRIPTIONS: SubscriptionItem[] = [
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

// ── 청약홈 HTML 파싱 ──────────────────────────────────────────────────────────
//
// 청약홈(applyhome.co.kr)은 공개 API/RSS를 제공하지 않습니다.
// /ai/aia/selectAPTLttotPblancListView.do 페이지 HTML을 파싱해 실제 공고 목록을 가져옵니다.
//
// 파싱 구조:
//   <tbody> → <tr> 당 1개 공고
//   td[0] 지역 | td[1] 주택구분 | td[3] 단지명 | td[6] 모집공고일
//   td[7] 청약기간 (YYYY-MM-DD ~ YYYY-MM-DD) | td[8] 당첨자발표일
//   data-hmno / data-pbno 속성 → 상세 URL 구성

async function fetchSubscriptionsFromHtml(): Promise<SubscriptionItem[]> {
  const url = "https://www.applyhome.co.kr/ai/aia/selectAPTLttotPblancListView.do";
  const res = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/124",
      "Referer": "https://www.applyhome.co.kr/",
      "Accept-Language": "ko-KR,ko;q=0.9",
    },
    signal: AbortSignal.timeout(10000),
  });

  if (!res.ok) throw new Error(`청약홈 HTTP ${res.status}`);
  const html = await res.text();

  // hmno / pbno 속성 배열 (순서가 tr 순서와 일치)
  const hmnoMatches = [...html.matchAll(/data-hmno="([^"]+)"/g)].map((m) => m[1]);
  const pbnoMatches = [...html.matchAll(/data-pbno="([^"]+)"/g)].map((m) => m[1]);

  // tbody 내 tr 파싱
  const tbodyMatch = html.match(/<tbody[^>]*>([\s\S]*?)<\/tbody>/);
  if (!tbodyMatch) throw new Error("tbody 없음");

  const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/g;
  const items: SubscriptionItem[] = [];
  let rowIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = rowRegex.exec(tbodyMatch[1])) !== null) {
    const row = match[1];
    const tds = [...row.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map((m) =>
      stripTags(m[1]).replace(/[☎]/g, "").trim(),
    );

    if (tds.length < 8) { rowIndex++; continue; }

    const region   = tds[0] ?? "";
    const houseType = tds[1] ?? ""; // 국민/민영/공공
    const name     = tds[3] ?? tds[2] ?? "";
    const periodRaw = tds[7] ?? ""; // "YYYY-MM-DD ~ YYYY-MM-DD"
    const announceDateRaw = tds[8] ?? "";

    if (!name || name.length < 2) { rowIndex++; continue; }

    // 청약기간 파싱
    const periodDates = periodRaw.match(/(\d{4}-\d{2}-\d{2})/g) ?? [];
    const startDate  = periodDates[0] ?? fmt(today);
    const endDate    = periodDates[1] ?? startDate;

    // 당첨자 발표일
    const announceDates = announceDateRaw.match(/(\d{4}-\d{2}-\d{2})/g) ?? [];
    const announceDate = announceDates[0] ?? "";

    // 주택구분 → 민영/공공
    const type = houseType.includes("국민") || houseType.includes("공공") ? "공공" : "민영";

    // 상세 URL (hmno/pbno 인덱스가 row 인덱스와 동일)
    const hmno = hmnoMatches[rowIndex] ?? "";
    const pbno = pbnoMatches[rowIndex] ?? "";
    const detailUrl = hmno && pbno
      ? applyHomeDetailUrl(hmno, pbno)
      : applyHomeSearchUrl(name);

    items.push({
      id: `sub-live-${rowIndex}`,
      name,
      region,
      type,
      totalUnits: 0,
      startDate,
      endDate,
      announceDate,
      minPrice: 0,
      maxPrice: 0,
      detailUrl,
    });

    rowIndex++;
  }

  if (items.length === 0) throw new Error("파싱 결과 없음");
  return items;
}

// ── Route Handler ─────────────────────────────────────────────────────────────

export const revalidate = 3600; // 1시간 캐시

export async function GET() {
  let subscriptions: SubscriptionItem[] = MOCK_SUBSCRIPTIONS;
  let isMock = true;
  let apiError: string | null = null;

  try {
    const live = await fetchSubscriptionsFromHtml();
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
