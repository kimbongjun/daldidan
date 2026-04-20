export type FestivalStatus = "진행중" | "예정" | "종료";

export interface FestivalItem {
  id: string;
  title: string;
  region: string;
  areaCode: number;
  address: string;
  startDate: string; // YYYYMMDD
  endDate: string;   // YYYYMMDD
  dateLabel: string;
  thumbnail?: string;
  isFree: boolean | null; // null = 확인 필요
  detailUrl: string;
  status: FestivalStatus;
  source: "tourapi" | "seoul" | "fallback";
}

export interface FestivalResponse {
  items: FestivalItem[];
  source: string;
  fetchedAt: string;
}

// ── 지역코드 매핑 ────────────────────────────────────────────
export const AREA_CODE_MAP: Record<number, string> = {
  1: "서울", 2: "인천", 3: "대전", 4: "대구", 5: "광주",
  6: "부산", 7: "울산", 8: "세종", 31: "경기", 32: "강원",
  33: "충북", 34: "충남", 35: "경북", 36: "경남",
  37: "전북", 38: "전남", 39: "제주",
};

// 필터 UI에서 사용할 지역 그룹 (areaCode 배열)
export const REGION_GROUPS: { label: string; codes: number[] }[] = [
  { label: "전체", codes: [] },
  { label: "서울", codes: [1] },
  { label: "경기/인천", codes: [31, 2] },
  { label: "강원", codes: [32] },
  { label: "충청", codes: [3, 8, 33, 34] },
  { label: "경상", codes: [4, 6, 7, 35, 36] },
  { label: "전라", codes: [5, 37, 38] },
  { label: "제주", codes: [39] },
];

// ── 날짜 유틸 ────────────────────────────────────────────────
function yyyymmddToDate(s: string): Date {
  return new Date(`${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`);
}

function getStatus(start: string, end: string): FestivalStatus {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const s = yyyymmddToDate(start);
  const e = yyyymmddToDate(end);
  if (now < s) return "예정";
  if (now > e) return "종료";
  return "진행중";
}

function formatDateLabel(start: string, end: string): string {
  const fmt = (s: string) =>
    `${parseInt(s.slice(4, 6))}월 ${parseInt(s.slice(6, 8))}일`;
  if (start === end) return fmt(start);
  return `${fmt(start)} ~ ${fmt(end)}`;
}

// ── TourAPI 타입 (KorService2 기준) ──────────────────────────
type TourItem = {
  contentid?: string;
  title?: string;
  addr1?: string;
  addr2?: string;
  areacode?: string | number;       // KorService1 — 비어있을 수 있음
  lDongRegnCd?: string;             // KorService2 행정동 시도코드
  eventstartdate?: string;
  eventenddate?: string;
  firstimage?: string;
  firstimage2?: string;
};

// lDongRegnCd → 기존 areaCode 변환 (REGION_GROUPS 필터 호환)
const LDONG_TO_AREA_CODE: Record<string, number> = {
  "11": 1,  // 서울
  "26": 6,  // 부산
  "27": 4,  // 대구
  "28": 2,  // 인천
  "29": 5,  // 광주
  "30": 3,  // 대전
  "31": 7,  // 울산
  "36": 8,  // 세종
  "41": 31, // 경기
  "42": 32, // 강원
  "43": 33, // 충북
  "44": 34, // 충남
  "45": 37, // 전북
  "46": 38, // 전남
  "47": 35, // 경북
  "48": 36, // 경남
  "50": 39, // 제주
};

type TourResponse = {
  response?: {
    body?: {
      items?: { item?: TourItem | TourItem[] };
      totalCount?: number;
    };
  };
};

// ── 서울 열린데이터 타입 ─────────────────────────────────────
type SeoulFestival = {
  CODENAME?: string;
  GUNAME?: string;
  TITLE?: string;
  DATE?: string;
  PLACE?: string;
  ORG_LINK?: string;
  MAIN_IMG?: string;
  STRTDATE?: string;
  END_DATE?: string;
  IS_FREE?: string;
};

type SeoulFestivalResponse = {
  culturalEventInfo?: {
    row?: SeoulFestival[];
  };
};

// ── fallback 데이터 ──────────────────────────────────────────
const FALLBACK: FestivalItem[] = [
  {
    id: "fb-1",
    title: "여의도 봄꽃 축제",
    region: "서울",
    areaCode: 1,
    address: "서울 영등포구 여의도 한강공원",
    startDate: "20260410",
    endDate: "20260420",
    dateLabel: "4월 10일 ~ 4월 20일",
    thumbnail: "https://images.unsplash.com/photo-1522383225653-ed111181a951?w=800&q=80",
    isFree: true,
    detailUrl: "https://www.visitseoul.net",
    status: "진행중",
    source: "fallback",
  },
  {
    id: "fb-2",
    title: "경주 벚꽃 축제",
    region: "경북",
    areaCode: 35,
    address: "경상북도 경주시 보문관광단지",
    startDate: "20260405",
    endDate: "20260415",
    dateLabel: "4월 5일 ~ 4월 15일",
    thumbnail: "https://images.unsplash.com/photo-1513407030348-c983a97b98d8?w=800&q=80",
    isFree: true,
    detailUrl: "https://www.gyeongju.go.kr",
    status: "진행중",
    source: "fallback",
  },
  {
    id: "fb-3",
    title: "순천만 국제정원박람회",
    region: "전남",
    areaCode: 38,
    address: "전라남도 순천시 국가정원1호길",
    startDate: "20260405",
    endDate: "20261031",
    dateLabel: "4월 5일 ~ 10월 31일",
    thumbnail: "https://images.unsplash.com/photo-1585320806297-9794b3e4eeae?w=800&q=80",
    isFree: false,
    detailUrl: "https://www.scgardenexpo.com",
    status: "진행중",
    source: "fallback",
  },
  {
    id: "fb-4",
    title: "제주 유채꽃 축제",
    region: "제주",
    areaCode: 39,
    address: "제주특별자치도 서귀포시 성산읍",
    startDate: "20260328",
    endDate: "20260410",
    dateLabel: "3월 28일 ~ 4월 10일",
    thumbnail: "https://images.unsplash.com/photo-1618765645366-a4dc9f8c5bc0?w=800&q=80",
    isFree: true,
    detailUrl: "https://www.visitjeju.net",
    status: "종료",
    source: "fallback",
  },
  {
    id: "fb-5",
    title: "보성 다향대축제",
    region: "전남",
    areaCode: 38,
    address: "전라남도 보성군 보성읍 녹차로",
    startDate: "20260502",
    endDate: "20260506",
    dateLabel: "5월 2일 ~ 5월 6일",
    thumbnail: "https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=800&q=80",
    isFree: false,
    detailUrl: "https://www.boseong.go.kr",
    status: "예정",
    source: "fallback",
  },
  {
    id: "fb-6",
    title: "강릉 단오제",
    region: "강원",
    areaCode: 32,
    address: "강원특별자치도 강릉시 남대천 단오장",
    startDate: "20260601",
    endDate: "20260607",
    dateLabel: "6월 1일 ~ 6월 7일",
    thumbnail: "https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=800&q=80",
    isFree: true,
    detailUrl: "https://www.gangneung-danoje.kr",
    status: "예정",
    source: "fallback",
  },
  {
    id: "fb-7",
    title: "자라섬 재즈 페스티벌",
    region: "경기",
    areaCode: 31,
    address: "경기도 가평군 자라섬",
    startDate: "20261003",
    endDate: "20261005",
    dateLabel: "10월 3일 ~ 10월 5일",
    thumbnail: "https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=800&q=80",
    isFree: false,
    detailUrl: "https://jarasumjazz.com",
    status: "예정",
    source: "fallback",
  },
  {
    id: "fb-8",
    title: "부산 불꽃 축제",
    region: "부산",
    areaCode: 6,
    address: "부산광역시 해운대구 광안리해수욕장",
    startDate: "20261025",
    endDate: "20261025",
    dateLabel: "10월 25일",
    thumbnail: "https://images.unsplash.com/photo-1498931299472-f7a63a5a1cfa?w=800&q=80",
    isFree: true,
    detailUrl: "https://www.visitbusan.net",
    status: "예정",
    source: "fallback",
  },
];

// ── 상세 링크 보정 ──────────────────────────────────────────
function resolveDetailUrl(primaryUrl: string, title: string, region: string): string {
  const trimmed = primaryUrl.trim();
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return trimmed;
  }

  return `https://search.naver.com/search.naver?query=${encodeURIComponent(`${title} ${region} 축제`)}`;
}

function resolveThumbnailUrl(thumbnail?: string): string | undefined {
  if (!thumbnail) return undefined;
  const trimmed = thumbnail.trim();
  if (!trimmed) return undefined;
  if (trimmed.startsWith("//")) return `https:${trimmed}`;
  if (trimmed.startsWith("http://")) return `https://${trimmed.slice("http://".length)}`;
  return trimmed;
}

// ── 메인 fetch 함수 ──────────────────────────────────────────
export async function getFestivalItems(): Promise<FestivalResponse> {
  const tourKey = process.env.TOUR_API_KEY;
  const seoulKey = process.env.SEOUL_OPEN_API_KEY;

  const items: FestivalItem[] = [];

  // 1) 한국관광공사 TourAPI (GW: KorService2)
  if (tourKey && tourKey !== "your_tour_api_key_here") {
    try {
      const today = new Date();
      // 1개월 전부터 조회해 진행 중인 행사도 포함
      today.setMonth(today.getMonth() - 1);
      const startYmd = today.toISOString().slice(0, 10).replace(/-/g, "");

      const url = new URL("https://apis.data.go.kr/B551011/KorService2/searchFestival2");
      url.searchParams.set("serviceKey", tourKey);
      url.searchParams.set("numOfRows", "30");
      url.searchParams.set("pageNo", "1");
      url.searchParams.set("MobileOS", "ETC");
      url.searchParams.set("MobileApp", "daldidan");
      url.searchParams.set("_type", "json");
      url.searchParams.set("eventStartDate", startYmd);
      url.searchParams.set("arrange", "A");

      const res = await fetch(url.toString(), { next: { revalidate: 3600 } });
      if (res.ok) {
        const data = (await res.json()) as TourResponse;
        const raw = data.response?.body?.items?.item;
        const list: TourItem[] = raw
          ? Array.isArray(raw)
            ? raw
            : [raw]
          : [];

        for (const it of list) {
          const ldong = String(it.lDongRegnCd ?? "");
          const legacyCode = parseInt(String(it.areacode ?? "0"), 10);
          const code = ldong ? (LDONG_TO_AREA_CODE[ldong] ?? legacyCode) : legacyCode;
          const region = AREA_CODE_MAP[code] ?? "기타";
          const start = it.eventstartdate ?? "";
          const end = it.eventenddate ?? start;
          if (!start || !it.title) continue;

          const status = getStatus(start, end);
          if (status === "종료") continue;

          items.push({
            id: `tour-${it.contentid}`,
            title: it.title,
            region,
            areaCode: code,
            address: [it.addr1, it.addr2].filter(Boolean).join(" "),
            startDate: start,
            endDate: end,
            dateLabel: formatDateLabel(start, end),
            thumbnail: it.firstimage || it.firstimage2 || undefined,
            isFree: null,
            detailUrl: `https://korean.visitkorea.or.kr/kfes/detail/fstvlDetail.do?cmsCntntsId=${it.contentid}`,
            status,
            source: "tourapi",
          });
        }
      }
    } catch {
      // 네트워크 또는 외부 API 실패 시 다른 소스와 fallback으로 계속 진행
    }
  }

  // 2) 서울 열린데이터 광장 — 축제 카테고리
  if (seoulKey) {
    try {
      const res = await fetch(
        `http://openapi.seoul.go.kr:8088/${seoulKey}/json/culturalEventInfo/1/15/축제`,
        { next: { revalidate: 3600 } },
      );
      if (res.ok) {
        const data = (await res.json()) as SeoulFestivalResponse;
        for (const ev of data.culturalEventInfo?.row ?? []) {
          if (!ev.TITLE) continue;
          const start = (ev.STRTDATE ?? "").replace(/-/g, "").slice(0, 8);
          const end = (ev.END_DATE ?? "").replace(/-/g, "").slice(0, 8);
          const sid = `seoul-fest-${encodeURIComponent(ev.TITLE)}`;

          if (items.some((i) => i.title === ev.TITLE)) continue;

          const seoulStatus = start ? getStatus(start, end || start) : "예정";
          if (seoulStatus === "종료") continue;

          items.push({
            id: sid,
            title: ev.TITLE,
            region: "서울",
            areaCode: 1,
            address: ev.PLACE ?? ev.GUNAME ?? "서울",
            startDate: start,
            endDate: end,
            dateLabel: start
              ? formatDateLabel(start, end || start)
              : (ev.DATE ?? "일정 확인"),
            thumbnail: ev.MAIN_IMG || undefined,
            isFree: ev.IS_FREE === "무료",
            detailUrl: ev.ORG_LINK ?? "https://www.visitseoul.net",
            status: seoulStatus,
            source: "seoul",
          });
        }
      }
    } catch {
      // 서울 API 실패 시 다른 소스와 fallback으로 계속 진행
    }
  }

  if (!items.length) {
    return {
      items: FALLBACK,
      source: "fallback",
      fetchedAt: new Date().toISOString(),
    };
  }

  const resolvedItems = items.map((item) => ({
    ...item,
    thumbnail: resolveThumbnailUrl(item.thumbnail),
    detailUrl: resolveDetailUrl(item.detailUrl, item.title, item.region),
  }));

  // 진행중 → 예정 → 시작일 오름차순 정렬
  const sorted = resolvedItems.sort((a, b) => {
    const statusOrder: Record<FestivalStatus, number> = {
      진행중: 0,
      예정: 1,
      종료: 2,
    };
    const so = statusOrder[a.status] - statusOrder[b.status];
    if (so !== 0) return so;
    return a.startDate.localeCompare(b.startDate);
  });

  return {
    items: sorted,
    source: resolvedItems[0]?.source === "fallback" ? "fallback" : "live",
    fetchedAt: new Date().toISOString(),
  };
}
