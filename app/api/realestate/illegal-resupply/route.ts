import { NextResponse } from "next/server";

export interface IllegalResupplyItem {
  id: string;
  name: string;
  region: string;
  houseManageNo: string;
  pblancNo: string;
  announcementDate: string;
  subscriptionStartDate: string;
  subscriptionEndDate: string;
  winnerAnnouncementDate: string;
  transferRestriction: string;
  detailUrl: string;
  supplyType: string;
  units: number;
}

// 불법행위 재공급 목록 · 동호수 선택 (분양권 전매제한 조회)
// HTML 구조: div.aptRow[data-pbno][data-hmno][data-honm] 카드형
// GET = 전체 최신 10건, POST with suplyAreaCode = 지역별 10건
const RESALE_LIST_URL = "https://www.applyhome.co.kr/rs/rsa/selectResaleListView.do";

// 실제 페이지에서 확인된 최근 항목 기반 mock
const MOCK_ILLEGAL_RESUPPLY: IllegalResupplyItem[] = [
  {
    id: "2026000101",
    name: "온천장 하늘채 엘리시움",
    region: "부산",
    houseManageNo: "2026000101",
    pblancNo: "2026000101",
    announcementDate: "2026-04-15",
    subscriptionStartDate: "2026-04-15",
    subscriptionEndDate: "2026-05-10",
    winnerAnnouncementDate: "2026-05-10",
    transferRestriction: "공고문 확인",
    detailUrl: RESALE_LIST_URL,
    supplyType: "불법행위 재공급",
    units: 1,
  },
  {
    id: "2026000094",
    name: "라클라체자이드파인",
    region: "서울",
    houseManageNo: "2026000094",
    pblancNo: "2026000094",
    announcementDate: "2026-04-10",
    subscriptionStartDate: "2026-04-10",
    subscriptionEndDate: "2026-05-08",
    winnerAnnouncementDate: "2026-05-08",
    transferRestriction: "특별공급 : 3년 / 일반공급 : 3년",
    detailUrl: RESALE_LIST_URL,
    supplyType: "불법행위 재공급",
    units: 1,
  },
  {
    id: "2026000069",
    name: "야목역 서희스타힐스 그랜드힐",
    region: "경기",
    houseManageNo: "2026000069",
    pblancNo: "2026000069",
    announcementDate: "2026-04-06",
    subscriptionStartDate: "2026-04-06",
    subscriptionEndDate: "2026-04-24",
    winnerAnnouncementDate: "2026-04-24",
    transferRestriction: "특별공급 : 6개월 / 일반공급 : 6개월",
    detailUrl: RESALE_LIST_URL,
    supplyType: "불법행위 재공급",
    units: 1,
  },
  {
    id: "lagrand-nowan-2026",
    name: "래미안 라그란데",
    region: "서울 노원구",
    houseManageNo: "",
    pblancNo: "",
    announcementDate: "2026-05-12",
    subscriptionStartDate: "2026-05-19",
    subscriptionEndDate: "2026-05-21",
    winnerAnnouncementDate: "2026-06-03",
    transferRestriction: "전매제한 10년",
    detailUrl: RESALE_LIST_URL,
    supplyType: "불법행위 재공급",
    units: 1,
  },
];

const FETCH_HEADERS: HeadersInit = {
  "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/124",
  "Referer": "https://www.applyhome.co.kr/",
  "Accept-Language": "ko-KR,ko;q=0.9",
  "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
};

function stripTags(html: string): string {
  return html.replace(/<[^>]+>/g, " ").replace(/&[a-zA-Z#\d]+;/g, " ").replace(/\s+/g, " ").trim();
}

function decodeAttr(value: string): string {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCharCode(Number(code)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex: string) => String.fromCharCode(parseInt(hex, 16)));
}

function normalizeDate(value: string): string {
  const digits = value.replace(/\D/g, "");
  if (digits.length === 8) {
    return `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6, 8)}`;
  }
  const iso = value.match(/(\d{4}[-./]\d{2}[-./]\d{2})/);
  if (iso) return iso[1].replace(/[./]/g, "-");
  return "";
}

// div.aptRow 카드 파싱 — 실제 HTML 구조:
//   <div class="aptRow" data-pbno="..." data-hmno="..." data-honm="단지명">
//     <div class="aptName"><a href="#a">단지명</a></div>
//     <div class="inqryDetail">
//       <table class="tbl_st"><tbody>
//         <tr><td>주택관리번호</td><td>...</td></tr>
//         <tr><td>공고일</td><td>2026.04.06</td></tr>
//         <tr><td>당첨자 발표일</td><td>2026.04.24</td></tr>
//         <tr><td>전매제한</td><td>특별공급 : 6개월 / 일반공급 : 6개월</td></tr>
//         <tr><td>동호수 선택</td><td>... (AJAX select) ...</td></tr>
//       </tbody></table>
//     </div>
//   </div>
function parseAptRows(html: string, region: string): IllegalResupplyItem[] {
  const items: IllegalResupplyItem[] = [];

  // aptRow 시작 태그 위치와 속성 수집
  const aptRowPattern = /<div[^>]+class="aptRow"([^>]*)>/g;
  const rowPositions: { attrs: string; blockStart: number; divStart: number }[] = [];
  let m: RegExpExecArray | null;

  while ((m = aptRowPattern.exec(html)) !== null) {
    rowPositions.push({
      attrs: m[1],
      blockStart: m.index + m[0].length,
      divStart: m.index,
    });
  }

  for (let i = 0; i < rowPositions.length; i++) {
    const { attrs, blockStart } = rowPositions[i];
    // 다음 aptRow의 시작까지를 이 카드의 블록으로 사용
    const blockEnd = i + 1 < rowPositions.length ? rowPositions[i + 1].divStart : html.length;
    const block = html.slice(blockStart, blockEnd);

    // data 속성에서 키값 추출
    const pbno = attrs.match(/data-pbno="([^"]+)"/)?.[1]?.trim() ?? "";
    const hmno = attrs.match(/data-hmno="([^"]+)"/)?.[1]?.trim() ?? "";
    const rawName = attrs.match(/data-honm="([^"]+)"/)?.[1] ?? "";
    const name = decodeAttr(rawName).trim();

    if (!name || name.length < 2) continue;

    // tbl_st 내 key-value tr 파싱
    const kvPairs: Record<string, string> = {};
    const trPattern = /<tr[^>]*>([\s\S]*?)<\/tr>/g;
    let trMatch: RegExpExecArray | null;

    while ((trMatch = trPattern.exec(block)) !== null) {
      const tdMatches = [...trMatch[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)];
      if (tdMatches.length >= 2) {
        const key = stripTags(tdMatches[0][1]).trim();
        const rawVal = stripTags(tdMatches[1][1]).trim();
        // 동호수 선택 행은 제외 (select element 포함, "선택" 텍스트 존재)
        if (key && rawVal && key !== "동호수 선택" && !rawVal.startsWith("동 선택")) {
          kvPairs[key] = rawVal;
        }
      }
    }

    // aptName div에서 이름 재확인 (data-honm이 없는 경우 fallback)
    const aptNameMatch = block.match(/<div[^>]+class="aptName"[^>]*>[\s\S]*?<a[^>]*>([\s\S]*?)<\/a>/);
    const nameFromDiv = aptNameMatch ? stripTags(aptNameMatch[1]).trim() : "";
    const finalName = name || nameFromDiv;
    if (!finalName || finalName.length < 2) continue;

    const announcementDate = normalizeDate(kvPairs["공고일"] ?? "");
    const winnerDate = normalizeDate(kvPairs["당첨자 발표일"] ?? "");
    const transferRestriction = kvPairs["전매제한"] ?? "공고문 확인";

    if (!announcementDate) continue;

    items.push({
      id: hmno || pbno || `illegal-row-${i}`,
      name: finalName,
      region,
      houseManageNo: hmno,
      pblancNo: pbno,
      announcementDate,
      subscriptionStartDate: announcementDate,
      subscriptionEndDate: winnerDate || announcementDate,
      winnerAnnouncementDate: winnerDate,
      transferRestriction,
      detailUrl: RESALE_LIST_URL,
      supplyType: "불법행위 재공급",
      units: 0,
    });
  }

  return items;
}

// GET: 전체 최신 목록 (지역 없음)
async function fetchAll(signal: AbortSignal): Promise<IllegalResupplyItem[]> {
  const res = await fetch(RESALE_LIST_URL, {
    headers: FETCH_HEADERS,
    signal,
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`GET ${res.status}`);
  const html = await res.text();
  return parseAptRows(html, "");
}

// POST: 특정 시도(suplyAreaCode)별 목록
async function fetchByRegion(suplyAreaCode: string, signal: AbortSignal): Promise<IllegalResupplyItem[]> {
  const body = new URLSearchParams({
    suplyAreaCode,
    siggList: "",
    houseNm: "",
    pageIndex: "1",
    recordCountPerPage: "10",
  });
  const res = await fetch(RESALE_LIST_URL, {
    method: "POST",
    headers: { ...FETCH_HEADERS, "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8" },
    body: body.toString(),
    signal,
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`POST ${suplyAreaCode} ${res.status}`);
  const html = await res.text();
  return parseAptRows(html, suplyAreaCode);
}

const MAJOR_REGIONS = ["서울", "경기", "인천", "부산", "대구", "경남"];

async function fetchIllegalResupplyItems(): Promise<IllegalResupplyItem[]> {
  const signal = AbortSignal.timeout(14_000);

  // GET(전체) + POST(주요 시도) 병렬 요청 — 일부 실패해도 계속
  const [allResult, ...regionResults] = await Promise.allSettled([
    fetchAll(signal),
    ...MAJOR_REGIONS.map((r) => fetchByRegion(r, signal)),
  ]);

  // 지역별 요청에서 hmno → region 매핑 수집
  const hmnoToRegion = new Map<string, string>();
  for (const result of regionResults) {
    if (result.status === "fulfilled") {
      for (const item of result.value) {
        if (item.houseManageNo && !hmnoToRegion.has(item.houseManageNo)) {
          hmnoToRegion.set(item.houseManageNo, item.region);
        }
      }
    }
  }

  const seenIds = new Set<string>();
  const items: IllegalResupplyItem[] = [];

  // 지역 태그가 있는 항목 먼저 추가
  for (const result of regionResults) {
    if (result.status === "fulfilled") {
      for (const item of result.value) {
        const key = item.houseManageNo || item.id;
        if (!seenIds.has(key)) {
          seenIds.add(key);
          items.push(item);
        }
      }
    }
  }

  // 전체 조회 결과에서 미포함 항목 추가 (지역은 hmnoToRegion에서 보완, 없으면 "기타 지역")
  if (allResult.status === "fulfilled") {
    for (const item of allResult.value) {
      const key = item.houseManageNo || item.id;
      if (!seenIds.has(key)) {
        seenIds.add(key);
        const region = item.houseManageNo
          ? (hmnoToRegion.get(item.houseManageNo) ?? "기타 지역")
          : "기타 지역";
        items.push({ ...item, region });
      }
    }
  }

  if (items.length === 0) throw new Error("파싱 결과 없음 — HTML 구조 확인 필요");

  // 공고일 내림차순 정렬 (최신 항목 먼저)
  return items.sort((a, b) => b.announcementDate.localeCompare(a.announcementDate));
}

export const revalidate = 1800;
export const dynamic = "force-dynamic";

export async function GET() {
  let items: IllegalResupplyItem[] = [];
  let isMock = false;
  let apiError: string | null = null;

  try {
    items = await fetchIllegalResupplyItems();
  } catch (error) {
    apiError = error instanceof Error ? error.message : "불법행위 재공급 조회 실패";
    console.error("[illegal-resupply] 파싱 실패, mock 반환:", apiError);
    items = MOCK_ILLEGAL_RESUPPLY;
    isMock = true;
  }

  return NextResponse.json({
    items,
    isMock,
    sourceUrl: RESALE_LIST_URL,
    ...(apiError ? { apiError } : {}),
  });
}
