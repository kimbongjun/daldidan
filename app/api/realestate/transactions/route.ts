import { NextRequest, NextResponse } from "next/server";

export interface TransactionItem {
  id: string;
  complexName: string;   // 단지명
  region: string;        // 지역 (구/동)
  area: number;          // 전용면적 (㎡)
  floor: number;         // 층
  price: number;         // 거래가 (만원)
  prevPrice: number | null; // 이전 거래가 (비교용, 만원)
  tradeDate: string;     // 계약일 (YYYY-MM-DD)
  tradeType: "매매" | "전세" | "월세";
}

export interface MarketIndex {
  label: string;         // "매수우위지수"
  value: number;         // 0~200 (100 기준: 균형)
  trend: "up" | "down" | "neutral";
  description: string;
  updatedAt: string;
}

/**
 * 실거래가 + 시장 지표 API
 *
 * 실제 연동:
 *   - 국토교통부 아파트매매 실거래 상세 자료
 *     https://www.data.go.kr/data/15058747/openapi.do
 *     파라미터: DEAL_YMD(YYYYMM), LAWD_CD(법정동코드)
 *
 *   - KB부동산 시세 (비공개 API, 크롤링 또는 제휴 필요)
 *   - 한국부동산원 R-ONE 통계 API
 *     https://www.reb.or.kr/r-one/openapi/SttsApiTblData.do
 *
 * 환경 변수:
 *   REALESTATE_API_KEY=<공공데이터포털 API키>
 *   REALESTATE_REGION_CODE=11110  (법정동코드, 기본: 종로구)
 *
 * 쿼리 파라미터:
 *   ?region=강남구  (지역명, 선택)
 */

// ── Mock 데이터 ───────────────────────────────────────────────────────────────
const today = new Date();
const fmt = (d: Date) => d.toISOString().slice(0, 10);
const subDays = (d: Date, n: number) => new Date(d.getTime() - n * 86400000);

const MOCK_TRANSACTIONS: TransactionItem[] = [
  {
    id: "tx-001",
    complexName: "래미안 퍼스티지",
    region: "서울 서초구 반포동",
    area: 84.9,
    floor: 12,
    price: 390000,
    prevPrice: 375000,
    tradeDate: fmt(subDays(today, 3)),
    tradeType: "매매",
  },
  {
    id: "tx-002",
    complexName: "아크로리버파크",
    region: "서울 서초구 반포동",
    area: 59.9,
    floor: 8,
    price: 285000,
    prevPrice: 292000,
    tradeDate: fmt(subDays(today, 5)),
    tradeType: "매매",
  },
  {
    id: "tx-003",
    complexName: "헬리오시티",
    region: "서울 송파구 가락동",
    area: 99.9,
    floor: 21,
    price: 235000,
    prevPrice: 228000,
    tradeDate: fmt(subDays(today, 7)),
    tradeType: "매매",
  },
  {
    id: "tx-004",
    complexName: "마포 래미안 푸르지오",
    region: "서울 마포구 아현동",
    area: 84.9,
    floor: 5,
    price: 170000,
    prevPrice: 165000,
    tradeDate: fmt(subDays(today, 10)),
    tradeType: "매매",
  },
  {
    id: "tx-005",
    complexName: "광교 자연앤힐스테이트",
    region: "경기 수원시 영통구",
    area: 84.9,
    floor: 15,
    price: 89000,
    prevPrice: 92000,
    tradeDate: fmt(subDays(today, 12)),
    tradeType: "매매",
  },
];

const MOCK_MARKET_INDEX: MarketIndex[] = [
  {
    label: "매수우위지수",
    value: 112,
    trend: "up",
    description: "매수자 우위 (100 초과: 매수 우위, 이하: 매도 우위)",
    updatedAt: "2026-04-14",
  },
  {
    label: "전세수급지수",
    value: 95,
    trend: "down",
    description: "전세 수요 대비 공급 부족 완화 중",
    updatedAt: "2026-04-14",
  },
];
// ─────────────────────────────────────────────────────────────────────────────

export const revalidate = 3600;

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const region = searchParams.get("region") ?? "";

  // TODO: 실제 국토교통부 API 연동 시 활성화
  const apiKey = process.env.REALESTATE_API_KEY?.trim();
  const regionCode = process.env.REALESTATE_REGION_CODE?.trim() ?? "11110";
  // if (apiKey) { ... }

  const transactions = region
    ? MOCK_TRANSACTIONS.filter((t) =>
        t.region.includes(region) || t.complexName.includes(region),
      )
    : MOCK_TRANSACTIONS;

  return NextResponse.json({
    transactions,
    marketIndex: MOCK_MARKET_INDEX,
    region: region || "전국",
  });
}
