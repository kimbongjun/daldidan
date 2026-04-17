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

export async function GET() {
  // TODO: 실제 공공데이터포털 API 연동 시 아래 코드 활성화
  // const apiKey = process.env.REALESTATE_API_KEY?.trim();
  // if (apiKey) {
  //   const res = await fetch(
  //     `https://apis.data.go.kr/1613000/AptSmallLoanInfoService/getSmallLoanInfo?serviceKey=${apiKey}&pageNo=1&numOfRows=20&resultType=json`,
  //     { next: { revalidate: 3600 }, signal: AbortSignal.timeout(8000) }
  //   );
  //   if (res.ok) { const data = await res.json(); ... }
  // }

  const items = MOCK_SUBSCRIPTIONS.map((s) => ({
    ...s,
    dday: getDday(s.startDate),
  }));

  return NextResponse.json({ subscriptions: items });
}
