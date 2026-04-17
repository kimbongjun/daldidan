import { NextResponse } from "next/server";

export interface PolicyRate {
  id: string;
  name: string;         // 대출 상품명
  institution: string;  // 취급 기관
  minRate: number;      // 최저 금리 (%)
  maxRate: number;      // 최고 금리 (%)
  maxAmount: number;    // 최대 대출 한도 (만원)
  target: string;       // 대상 설명
  updatedAt: string;    // 금리 기준일
  applyUrl: string;
}

/**
 * 정책 금융 금리 API
 *
 * 실제 연동:
 *   - 주택금융공사 금리 공시 API
 *     https://www.hf.go.kr/ko/sub01/sub01_02_01.do
 *   - 공공데이터포털: "주택도시기금 금리정보" (serviceKey 필요)
 *     https://www.data.go.kr/data/15125145/openapi.do
 *
 * 환경 변수:
 *   REALESTATE_API_KEY=<공공데이터포털 API키>
 *
 * 금리는 분기별 변동 → revalidate 86400 (1일) 권장
 */

// ── Mock 데이터 ───────────────────────────────────────────────────────────────
const MOCK_RATES: PolicyRate[] = [
  {
    id: "rate-001",
    name: "디딤돌 대출",
    institution: "주택도시기금",
    minRate: 2.35,
    maxRate: 3.95,
    maxAmount: 25000,
    target: "무주택 서민 (부부합산 연소득 6천만원 이하)",
    updatedAt: "2026-04-01",
    applyUrl: "https://nhuf.molit.go.kr/FP/FP05/FP0502/FP05020101.jsp",
  },
  {
    id: "rate-002",
    name: "버팀목 전세자금",
    institution: "주택도시기금",
    minRate: 2.10,
    maxRate: 3.30,
    maxAmount: 12200,
    target: "무주택 세대주 (부부합산 연소득 5천만원 이하)",
    updatedAt: "2026-04-01",
    applyUrl: "https://nhuf.molit.go.kr/FP/FP05/FP0503/FP05030101.jsp",
  },
  {
    id: "rate-003",
    name: "특례보금자리론",
    institution: "주택금융공사",
    minRate: 4.15,
    maxRate: 4.65,
    maxAmount: 50000,
    target: "주택 구입자 (소득·자산 무관, LTV 70%)",
    updatedAt: "2026-04-01",
    applyUrl: "https://www.hf.go.kr",
  },
  {
    id: "rate-004",
    name: "신생아 특례대출",
    institution: "주택도시기금",
    minRate: 1.60,
    maxRate: 3.30,
    maxAmount: 50000,
    target: "2년 내 출생아 가구 (연소득 1.3억 이하)",
    updatedAt: "2026-04-01",
    applyUrl: "https://nhuf.molit.go.kr",
  },
];
// ─────────────────────────────────────────────────────────────────────────────

export const revalidate = 86400; // 1일 캐시

export async function GET() {
  return NextResponse.json({ rates: MOCK_RATES });
}
