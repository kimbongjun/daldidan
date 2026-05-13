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
  detailUrl: string;     // 네이버 부동산 검색 URL
}

/**
 * 실거래가 API — 서울 아파트 59형 · 매매 10억대 필터
 *
 * 실제 연동:
 *   - 국토교통부 아파트매매 실거래 상세 자료
 *     https://www.data.go.kr/data/15058747/openapi.do
 *     파라미터: DEAL_YMD(YYYYMM), LAWD_CD(법정동코드)
 *
 * 환경 변수:
 *   REALESTATE_API_KEY=<공공데이터포털 API키>
 *   REALESTATE_REGION_CODE=11110  (법정동코드, 생략 시 서울 10개 구 병렬 조회)
 */

// ── 서울 주요 구 법정동 코드 ──────────────────────────────────────────────────
const SEOUL_DISTRICTS = [
  { name: "강남구", code: "11680" },
  { name: "서초구", code: "11650" },
  { name: "송파구", code: "11710" },
  { name: "마포구", code: "11440" },
  { name: "강동구", code: "11740" },
  { name: "영등포구", code: "11560" },
  { name: "강서구", code: "11500" },
  { name: "노원구", code: "11350" },
  { name: "은평구", code: "11380" },
  { name: "성동구", code: "11200" },
];

// ── Mock 데이터 ───────────────────────────────────────────────────────────────
const today = new Date();
const fmt = (d: Date) => d.toISOString().slice(0, 10);
const subDays = (d: Date, n: number) => new Date(d.getTime() - n * 86400000);
const naverUrl = (name: string) =>
  `https://new.land.naver.com/complexes?q=${encodeURIComponent(name)}`;

const MOCK_TRANSACTIONS: TransactionItem[] = [
  {
    id: "tx-001",
    complexName: "래미안 대치팰리스",
    region: "서울 강남구 대치동",
    area: 59.9,
    floor: 7,
    price: 130000,
    prevPrice: 125000,
    tradeDate: fmt(subDays(today, 2)),
    tradeType: "매매",
    detailUrl: naverUrl("래미안 대치팰리스"),
  },
  {
    id: "tx-002",
    complexName: "아크로리버파크",
    region: "서울 서초구 반포동",
    area: 59.8,
    floor: 11,
    price: 125000,
    prevPrice: 128000,
    tradeDate: fmt(subDays(today, 4)),
    tradeType: "매매",
    detailUrl: naverUrl("아크로리버파크"),
  },
  {
    id: "tx-003",
    complexName: "헬리오시티",
    region: "서울 송파구 가락동",
    area: 59.9,
    floor: 14,
    price: 110000,
    prevPrice: 106000,
    tradeDate: fmt(subDays(today, 6)),
    tradeType: "매매",
    detailUrl: naverUrl("헬리오시티"),
  },
  {
    id: "tx-004",
    complexName: "마포 래미안 푸르지오",
    region: "서울 마포구 아현동",
    area: 58.9,
    floor: 5,
    price: 95000,
    prevPrice: 92000,
    tradeDate: fmt(subDays(today, 8)),
    tradeType: "매매",
    detailUrl: naverUrl("마포 래미안 푸르지오"),
  },
  {
    id: "tx-005",
    complexName: "강동 힐스테이트",
    region: "서울 강동구 성내동",
    area: 59.7,
    floor: 9,
    price: 85000,
    prevPrice: 88000,
    tradeDate: fmt(subDays(today, 9)),
    tradeType: "매매",
    detailUrl: naverUrl("강동 힐스테이트"),
  },
  {
    id: "tx-006",
    complexName: "영등포 자이",
    region: "서울 영등포구 당산동",
    area: 58.8,
    floor: 6,
    price: 90000,
    prevPrice: 87000,
    tradeDate: fmt(subDays(today, 11)),
    tradeType: "매매",
    detailUrl: naverUrl("영등포 자이"),
  },
  {
    id: "tx-007",
    complexName: "노원 롯데캐슬",
    region: "서울 노원구 월계동",
    area: 59.5,
    floor: 3,
    price: 80000,
    prevPrice: 82000,
    tradeDate: fmt(subDays(today, 13)),
    tradeType: "매매",
    detailUrl: naverUrl("노원 롯데캐슬"),
  },
  {
    id: "tx-008",
    complexName: "은평 뉴타운 래미안",
    region: "서울 은평구 녹번동",
    area: 59.6,
    floor: 8,
    price: 82000,
    prevPrice: 80000,
    tradeDate: fmt(subDays(today, 15)),
    tradeType: "매매",
    detailUrl: naverUrl("은평 뉴타운 래미안"),
  },
  {
    id: "tx-009",
    complexName: "구로 에코자이",
    region: "서울 구로구 개봉동",
    area: 58.7,
    floor: 12,
    price: 83000,
    prevPrice: 85000,
    tradeDate: fmt(subDays(today, 17)),
    tradeType: "매매",
    detailUrl: naverUrl("구로 에코자이"),
  },
  {
    id: "tx-010",
    complexName: "길음 래미안",
    region: "서울 성북구 길음동",
    area: 59.4,
    floor: 4,
    price: 88000,
    prevPrice: 86000,
    tradeDate: fmt(subDays(today, 19)),
    tradeType: "매매",
    detailUrl: naverUrl("길음 래미안"),
  },
];
// ─────────────────────────────────────────────────────────────────────────────

export const revalidate = 3600;
export const dynamic = "force-dynamic";

// ── 국토교통부 실거래가 응답 타입 ─────────────────────────────────────────────
interface MltxItem {
  aptNm?: string;
  aptDong?: string;
  estateAgentSggNm?: string;
  umdNm?: string;
  excluUseAr?: number | string;
  floor?: number | string;
  dealAmount?: string;
  dealYear?: number | string;
  dealMonth?: number | string;
  dealDay?: number | string;
  sggCd?: number | string;
  // 구버전 XML 키
  아파트?: string;
  법정동?: string;
  전용면적?: string;
  층?: string;
  거래금액?: string;
  년?: string;
  월?: string;
  일?: string;
}

function parseLawd(regionCode: string): string {
  return regionCode.slice(0, 5).padEnd(5, "0");
}

async function fetchDistrictTransactions(
  apiKey: string,
  lawd: string,
  ym: string,
): Promise<TransactionItem[]> {
  const encoded = encodeURIComponent(apiKey);
  const url =
    `https://apis.data.go.kr/1613000/RTMSDataSvcAptTradeDev/getRTMSDataSvcAptTradeDev` +
    `?serviceKey=${encoded}&pageNo=1&numOfRows=30&LAWD_CD=${lawd}&DEAL_YMD=${ym}&_type=json`;

  const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
  if (!res.ok) throw new Error(`국토부 API ${res.status}`);

  const json = await res.json() as {
    response: {
      header: { resultCode: string };
      body: { items: { item: MltxItem | MltxItem[] }; totalCount: number };
    };
  };

  const code = json.response.header.resultCode;
  if (code !== "00" && code !== "000") throw new Error(`국토부 API 오류: ${code}`);

  const rawItems = json.response.body.items?.item ?? [];
  const items: MltxItem[] = Array.isArray(rawItems) ? rawItems : [rawItems];
  const now = new Date();

  return items
    .map((item, i): TransactionItem => {
      const rawPrice = item.dealAmount ?? item.거래금액 ?? "0";
      const price = parseInt(String(rawPrice).replace(/,/g, "").trim(), 10) || 0;
      const area = parseFloat(String(item.excluUseAr ?? item.전용면적 ?? "0")) || 0;
      const floor = parseInt(String(item.floor ?? item.층 ?? "0"), 10) || 0;
      const yr = String(item.dealYear ?? item.년 ?? now.getFullYear());
      const mo = String(item.dealMonth ?? item.월 ?? 1).padStart(2, "0");
      const dy = String(item.dealDay ?? item.일 ?? 1).padStart(2, "0");
      const regionName = item.estateAgentSggNm ?? item.umdNm ?? item.법정동 ?? "";
      const complexName = item.aptNm ?? item.아파트 ?? "아파트";
      return {
        id: `tx-live-${lawd}-${i}`,
        complexName,
        region: regionName.startsWith("서울") ? regionName : `서울 ${regionName}`,
        area,
        floor,
        price,
        prevPrice: null,
        tradeDate: `${yr}-${mo}-${dy}`,
        tradeType: "매매",
        detailUrl: naverUrl(complexName),
      };
    })
    .filter(
      (tx) =>
        tx.area >= 45 &&
        tx.area <= 75 &&
        tx.price >= 80000 &&
        tx.price <= 130000,
    );
}

async function fetchRealTransactions(
  apiKey: string,
  regionCode?: string,
): Promise<TransactionItem[]> {
  const now = new Date();
  const ym = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}`;

  // 단일 구 지정 시 기존 방식
  if (regionCode) {
    return fetchDistrictTransactions(apiKey, parseLawd(regionCode), ym);
  }

  // 서울 10개 구 병렬 조회
  const results = await Promise.allSettled(
    SEOUL_DISTRICTS.map((d) => fetchDistrictTransactions(apiKey, d.code, ym)),
  );

  const all: TransactionItem[] = [];
  for (const r of results) {
    if (r.status === "fulfilled") all.push(...r.value);
  }

  // 최신 거래일순 정렬, 최대 15개
  return all
    .sort((a, b) => b.tradeDate.localeCompare(a.tradeDate))
    .slice(0, 15);
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const region = searchParams.get("region") ?? "";

  const apiKey = process.env.REALESTATE_API_KEY?.trim();
  const regionCode = process.env.REALESTATE_REGION_CODE?.trim();

  let transactions: TransactionItem[] = MOCK_TRANSACTIONS;
  let isMock = true;

  if (apiKey) {
    try {
      transactions = await fetchRealTransactions(apiKey, regionCode);
      isMock = false;
    } catch {
      transactions = MOCK_TRANSACTIONS;
      isMock = true;
    }
  }

  if (region) {
    transactions = transactions.filter(
      (t) => t.region.includes(region) || t.complexName.includes(region),
    );
  }

  return NextResponse.json({
    transactions,
    isMock,
    region: region || "서울",
  });
}
