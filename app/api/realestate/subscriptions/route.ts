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

/**
 * 청약 일정 API
 *
 * 실제 연동:
 *   - 청약홈 분양정보 API (https://www.applyhome.co.kr)
 *   - 한국토지주택공사 청약 API
 *   - 공공데이터포털: "아파트분양정보서비스" (serviceKey 필요)
 *     https://www.data.go.kr/data/15056785/openapi.do
 *
 * 환경 변수 설정 후 아래 주석 해제:
 *   REALESTATE_API_KEY=<공공데이터포털 API키>
 */

const today = new Date();
const fmt = (d: Date) => d.toISOString().slice(0, 10);
const addDays = (d: Date, n: number) => new Date(d.getTime() + n * 86400000);

// ── Mock 데이터 (실제 API 연동 전 사용) ─────────────────────────────────────
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
    detailUrl: "https://www.applyhome.co.kr",
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
    detailUrl: "https://www.applyhome.co.kr",
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
    detailUrl: "https://www.applyhome.co.kr",
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
    detailUrl: "https://www.applyhome.co.kr",
  },
];
// ────────────────────────────────────────────────────────────────────────────

function getDday(dateStr: string): number {
  const target = new Date(dateStr);
  target.setHours(0, 0, 0, 0);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return Math.ceil((target.getTime() - now.getTime()) / 86400000);
}

export const revalidate = 3600; // 1시간 캐시

// 아파트 분양정보 API 응답 아이템
interface AptItem {
  HOUSE_NM?: string;       // 단지명
  SUBSCRPT_AREA_CODE_NM?: string; // 공급지역명
  HOUSE_SECD_NM?: string;  // 주택구분 (민영/공공)
  TOT_SUPLY_HSHLDCO?: string; // 총 공급세대수
  RCRIT_PBLANC_DE?: string;   // 청약 공고일 (YYYYMMDD)
  SUBSCRPT_RCEPT_BGNDE?: string; // 청약 시작일
  SUBSCRPT_RCEPT_ENDDE?: string; // 청약 종료일
  PRZWNER_PRESNATN_DE?: string;  // 당첨자 발표일
  HSSPLY_ADRES?: string;   // 공급위치 주소
  PBLANC_NO?: string;      // 공고번호 (URL 구성용)
}

function parseDateStr(s?: string): string {
  if (!s || s.length < 8) return fmt(today);
  return `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`;
}

async function fetchRealSubscriptions(apiKey: string): Promise<SubscriptionItem[]> {
  const encoded = encodeURIComponent(apiKey);
  const url =
    `https://apis.data.go.kr/1613000/AptSmplSearchService/getAptSmplSearchList` +
    `?serviceKey=${encoded}&pageNo=1&numOfRows=20&_type=json`;

  const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
  if (!res.ok) throw new Error(`청약 API ${res.status}`);

  const json = await res.json() as {
    response: {
      header: { resultCode: string };
      body: { items: { item: AptItem | AptItem[] }; totalCount: number };
    };
  };

  if (json.response.header.resultCode !== "00") throw new Error("청약 API 오류");

  const rawItems = json.response.body.items?.item ?? [];
  const items: AptItem[] = Array.isArray(rawItems) ? rawItems : [rawItems];

  return items.slice(0, 10).map((item, i) => {
    const startDate = parseDateStr(item.SUBSCRPT_RCEPT_BGNDE);
    const endDate = parseDateStr(item.SUBSCRPT_RCEPT_ENDDE);
    const announceDate = parseDateStr(item.PRZWNER_PRESNATN_DE);
    return {
      id: `sub-live-${i}`,
      name: item.HOUSE_NM ?? "아파트",
      region: item.SUBSCRPT_AREA_CODE_NM ?? item.HSSPLY_ADRES?.slice(0, 10) ?? "",
      type: item.HOUSE_SECD_NM?.includes("공공") ? "공공" : "민영",
      totalUnits: parseInt(item.TOT_SUPLY_HSHLDCO ?? "0", 10) || 0,
      startDate,
      endDate,
      announceDate,
      minPrice: 0,
      maxPrice: 0,
      detailUrl: item.PBLANC_NO
        ? `https://www.applyhome.co.kr/ai/aia/selectAPTLttotPblancDetail.do?houseManageNo=${item.PBLANC_NO}&pblancNo=${item.PBLANC_NO}`
        : "https://www.applyhome.co.kr",
    };
  });
}

export async function GET() {
  const apiKey = process.env.REALESTATE_API_KEY?.trim();

  let subscriptions: SubscriptionItem[] = MOCK_SUBSCRIPTIONS;

  if (apiKey) {
    try {
      subscriptions = await fetchRealSubscriptions(apiKey);
    } catch {
      // 실 API 실패 시 Mock으로 폴백
      subscriptions = MOCK_SUBSCRIPTIONS;
    }
  }

  const items = subscriptions.map((s) => ({
    ...s,
    dday: getDday(s.startDate),
  }));

  return NextResponse.json({ subscriptions: items });
}
