export type BangkokCategory =
  | "관광지"
  | "음식"
  | "쇼핑"
  | "마켓"
  | "술집"
  | "마사지샵"
  | "환율"
  | "호텔";

export interface BangkokHotelLink {
  platform: "hotels.com" | "agoda";
  url: string;
}

export type BangkokFilter = BangkokCategory | "전체";

export interface BangkokItem {
  id: string;
  name: string;
  category: BangkokCategory;
  description: string;
  district?: string;
  price?: string;
  hours?: string;
  tips?: string;
  emoji: string;
  accentColor: string;
  url?: string;
  hotelLinks?: BangkokHotelLink[];
}

export interface BangkokFeatured {
  id: string;
  name: string;
  description: string;
  district?: string;
  emoji: string;
  bg: string;
  url?: string;
}

export interface BangkokExchangeRate {
  krwThb: number;   // ₩1 당 ฿
  krwUsd: number;   // ₩1 당 $
  date: string;
  source: "live" | "fallback";
}

export const BANGKOK_CATEGORIES: BangkokCategory[] = [
  "관광지",
  "음식",
  "쇼핑",
  "마켓",
  "술집",
  "마사지샵",
  "환율",
  "호텔",
];

export const BANGKOK_FEATURED: BangkokFeatured[] = [
  {
    id: "feat1",
    name: "왓 프라깨우",
    description: "에메랄드 불상이 모셔진 태국의 심장, 왕실 사원",
    district: "라따나꼬씬 (왕궁 지구)",
    emoji: "⛩️",
    bg: "linear-gradient(135deg, rgba(212,160,23,0.72), rgba(139,90,43,0.72))",
    url: "https://www.royalgrandpalace.th/",
  },
  {
    id: "feat2",
    name: "짜뚜짝 주말 마켓",
    description: "15,000개 상점의 세계 최대 야외 시장 — 토·일만 오픈",
    district: "모칫 (짜뚜짝)",
    emoji: "🛒",
    bg: "linear-gradient(135deg, rgba(244,63,94,0.72), rgba(100,0,50,0.72))",
    url: "https://www.google.com/maps/search/?api=1&query=Chatuchak+Weekend+Market+Bangkok",
  },
  {
    id: "feat3",
    name: "팟타이 길거리 음식",
    description: "태국 대표 볶음 쌀국수, 한 접시 ฿50부터",
    district: "방콕 전역",
    emoji: "🍜",
    bg: "linear-gradient(135deg, rgba(245,158,11,0.72), rgba(180,83,9,0.72))",
    url: "https://www.google.com/maps/search/?api=1&query=Pad+Thai+Bangkok",
  },
  {
    id: "feat4",
    name: "아이콘 씨암",
    description: "짜오프라야 강변 럭셔리 복합 쇼핑몰",
    district: "짜오프라야 강변",
    emoji: "🏬",
    bg: "linear-gradient(135deg, rgba(99,102,241,0.72), rgba(49,46,129,0.72))",
    url: "https://www.iconsiam.com/",
  },
  {
    id: "feat5",
    name: "카오산 로드 야경",
    description: "배낭여행자의 성지, 방콕 최고의 나이트라이프",
    district: "방랍 (카오산)",
    emoji: "🌃",
    bg: "linear-gradient(135deg, rgba(16,185,129,0.72), rgba(5,100,70,0.72))",
    url: "https://www.google.com/maps/search/?api=1&query=Khao+San+Road+Bangkok",
  },
];

export const BANGKOK_ITEMS: BangkokItem[] = [
  // ── 관광지 ────────────────────────────────────────────────────────────────
  {
    id: "at1",
    name: "왓 프라깨우",
    category: "관광지",
    description: "에메랄드 불상·그랜드 팰리스 포함 왕실 사원",
    district: "라따나꼬씬 (왕궁 지구)",
    price: "฿500",
    hours: "08:30–15:30",
    tips: "복장 규정 엄격 (긴팔·긴바지)",
    emoji: "⛩️",
    accentColor: "rgba(212,160,23,0.10)",
    url: "https://www.royalgrandpalace.th/",
  },
  {
    id: "at2",
    name: "왓 아룬",
    category: "관광지",
    description: "짜오프라야 강변의 새벽 사원, 야경 명소",
    district: "짜오프라야 강변",
    price: "฿100",
    hours: "08:00–18:00",
    emoji: "🌅",
    accentColor: "rgba(244,63,94,0.10)",
    url: "https://www.google.com/maps/search/?api=1&query=Wat+Arun+Bangkok",
  },
  {
    id: "at3",
    name: "왓 포",
    category: "관광지",
    description: "와불상 안치·타이 마사지 발상지",
    district: "라따나꼬씬",
    price: "฿200",
    hours: "08:00–18:00",
    emoji: "🛕",
    accentColor: "rgba(16,185,129,0.10)",
    url: "http://www.watpho.com/",
  },
  {
    id: "at4",
    name: "아시아티크",
    category: "관광지",
    description: "강변 야시장·관람차·레스토랑 복합 단지",
    district: "짜오프라야 강변",
    price: "무료 입장",
    hours: "17:00–24:00",
    emoji: "🎡",
    accentColor: "rgba(99,102,241,0.10)",
    url: "https://www.asiatiquethailand.com/",
  },
  {
    id: "at5",
    name: "룸피니 공원",
    category: "관광지",
    description: "도심 속 녹색 오아시스, 이구아나 서식",
    district: "씰롬",
    price: "무료",
    hours: "04:30–21:00",
    emoji: "🌳",
    accentColor: "rgba(16,185,129,0.10)",
    url: "https://www.google.com/maps/search/?api=1&query=Lumpini+Park+Bangkok",
  },
  {
    id: "at6",
    name: "씨암 오션 월드",
    category: "관광지",
    description: "씨암 파라곤 지하 대형 수족관",
    district: "씨암",
    price: "฿990",
    hours: "10:00–21:00",
    emoji: "🦈",
    accentColor: "rgba(6,182,212,0.10)",
    url: "https://www.sealifebangkok.com/",
  },

  // ── 음식 ──────────────────────────────────────────────────────────────────
  {
    id: "fd1",
    name: "팟타이",
    category: "음식",
    description: "새우·두부·숙주 볶음 쌀국수, 태국 국민 음식",
    district: "방콕 전역",
    price: "฿50–120",
    tips: "딸랏 롯 파이 야시장 추천",
    emoji: "🍜",
    accentColor: "rgba(245,158,11,0.10)",
    url: "https://www.google.com/maps/search/?api=1&query=Best+Pad+Thai+Bangkok",
  },
  {
    id: "fd2",
    name: "톰얌꿍",
    category: "음식",
    description: "새콤달콤 얼큰한 새우탕, 코코넛 버전은 톰카",
    district: "방콕 전역",
    price: "฿80–200",
    emoji: "🍲",
    accentColor: "rgba(244,63,94,0.10)",
    url: "https://www.google.com/maps/search/?api=1&query=Tom+Yum+Kung+Bangkok",
  },
  {
    id: "fd3",
    name: "카오만 가이",
    category: "음식",
    description: "닭육수 쌀밥 + 수육, 24시간 영업 식당 다수",
    district: "방콕 전역",
    price: "฿50–80",
    emoji: "🍚",
    accentColor: "rgba(16,185,129,0.10)",
    url: "https://www.google.com/maps/search/?api=1&query=Khao+Man+Gai+Bangkok",
  },
  {
    id: "fd4",
    name: "쏨땀",
    category: "음식",
    description: "그린 파파야 샐러드, 매콤함 조절 가능",
    district: "방콕 전역",
    price: "฿40–80",
    emoji: "🥗",
    accentColor: "rgba(16,185,129,0.10)",
    url: "https://www.google.com/maps/search/?api=1&query=Som+Tum+Bangkok",
  },
  {
    id: "fd5",
    name: "망고 찹쌀밥",
    category: "음식",
    description: "코코넛 밀크 찹쌀 + 생망고, 4–6월 제철",
    district: "방콕 전역",
    price: "฿60–120",
    emoji: "🥭",
    accentColor: "rgba(245,158,11,0.10)",
    url: "https://www.google.com/maps/search/?api=1&query=Mango+Sticky+Rice+Bangkok",
  },
  {
    id: "fd6",
    name: "뿌팟퐁 커리",
    category: "음식",
    description: "게살 노른자 커리, 고급 해산물 요리",
    district: "방콕 전역",
    price: "฿350–600",
    tips: "소어 야 구이 레스토랑 유명",
    emoji: "🦀",
    accentColor: "rgba(244,63,94,0.10)",
    url: "https://www.sorndaeng.com/",
  },

  // ── 쇼핑 ──────────────────────────────────────────────────────────────────
  {
    id: "sh1",
    name: "씨암 파라곤",
    category: "쇼핑",
    description: "럭셔리 브랜드·수족관·푸드홀",
    district: "씨암",
    price: "무료 입장",
    hours: "10:00–22:00",
    emoji: "🛍️",
    accentColor: "rgba(99,102,241,0.10)",
    url: "https://www.siamparagon.co.th/",
  },
  {
    id: "sh2",
    name: "터미널 21",
    category: "쇼핑",
    description: "층마다 다른 나라 테마, 가성비 푸드코트",
    district: "아속 (수쿰빗)",
    price: "무료 입장",
    hours: "10:00–22:00",
    emoji: "✈️",
    accentColor: "rgba(6,182,212,0.10)",
    url: "https://www.terminal21.co.th/",
  },
  {
    id: "sh3",
    name: "플라티넘 패션몰",
    category: "쇼핑",
    description: "의류 도매·소매 5층 빌딩, 현금 거래",
    district: "쁘라뚜남",
    price: "무료 입장",
    hours: "09:00–20:00",
    emoji: "👗",
    accentColor: "rgba(244,63,94,0.10)",
    url: "https://www.google.com/maps/search/?api=1&query=Platinum+Fashion+Mall+Bangkok",
  },
  {
    id: "sh4",
    name: "엠쿼티어",
    category: "쇼핑",
    description: "트렌디 복합몰·루프탑 가든",
    district: "프롬퐁 (수쿰빗)",
    price: "무료 입장",
    hours: "10:00–22:00",
    emoji: "🏙️",
    accentColor: "rgba(16,185,129,0.10)",
    url: "https://www.emquartier.co.th/",
  },
  {
    id: "sh5",
    name: "아이콘 씨암",
    category: "쇼핑",
    description: "강변 최대 쇼핑몰·내부 수상시장",
    district: "짜오프라야 강변",
    price: "무료 입장",
    hours: "10:00–22:00",
    emoji: "🌊",
    accentColor: "rgba(6,182,212,0.10)",
    url: "https://www.iconsiam.com/",
  },
  {
    id: "sh6",
    name: "쎈트럴 월드",
    category: "쇼핑",
    description: "태국 최대 쇼핑몰 중 하나, 씨암 중심가",
    district: "씨암",
    price: "무료 입장",
    hours: "10:00–22:00",
    emoji: "🏢",
    accentColor: "rgba(245,158,11,0.10)",
    url: "https://www.centralworld.co.th/",
  },

  // ── 마켓 ──────────────────────────────────────────────────────────────────
  {
    id: "mk1",
    name: "짜뚜짝 마켓",
    category: "마켓",
    description: "세계 최대 야외 마켓, 15,000개 이상 상점",
    district: "모칫 (짜뚜짝)",
    price: "무료 입장",
    hours: "토·일 09:00–18:00",
    tips: "오전 일찍 방문 권장",
    emoji: "🛒",
    accentColor: "rgba(244,63,94,0.10)",
    url: "https://www.google.com/maps/search/?api=1&query=Chatuchak+Weekend+Market+Bangkok",
  },
  {
    id: "mk2",
    name: "아시아티크 나이트",
    category: "마켓",
    description: "강변 야시장, 관람차·공연·레스토랑",
    district: "짜오프라야 강변",
    price: "무료 입장",
    hours: "17:00–24:00",
    emoji: "🎡",
    accentColor: "rgba(99,102,241,0.10)",
    url: "https://www.asiatiquethailand.com/",
  },
  {
    id: "mk3",
    name: "딸랏 롯 파이",
    category: "마켓",
    description: "빈티지 쇼핑·길거리 음식의 성지",
    district: "라차다",
    price: "무료 입장",
    hours: "목~일 17:00–01:00",
    emoji: "🚂",
    accentColor: "rgba(245,158,11,0.10)",
    url: "https://www.google.com/maps/search/?api=1&query=Talad+Rot+Fai+Ratchada+Bangkok",
  },
  {
    id: "mk4",
    name: "오르오르 마켓",
    category: "마켓",
    description: "신선 식재료·열대 과일 천국",
    district: "모칫",
    price: "무료 입장",
    hours: "06:00–18:00",
    emoji: "🥝",
    accentColor: "rgba(16,185,129,0.10)",
    url: "https://www.google.com/maps/search/?api=1&query=Or+Tor+Kor+Market+Bangkok",
  },
  {
    id: "mk5",
    name: "암파와 수상 마켓",
    category: "마켓",
    description: "전통 수상시장·반딧불 투어 (방콕 근교)",
    district: "방콕 근교",
    price: "무료 입장",
    hours: "금·토·일 12:00–20:00",
    emoji: "⛵",
    accentColor: "rgba(6,182,212,0.10)",
    url: "https://www.google.com/maps/search/?api=1&query=Amphawa+Floating+Market",
  },
  {
    id: "mk6",
    name: "빠뚜남 마켓",
    category: "마켓",
    description: "저렴한 의류·액세서리 대거",
    district: "쁘라뚜남",
    price: "무료 입장",
    hours: "10:00–21:00",
    emoji: "👒",
    accentColor: "rgba(244,63,94,0.10)",
    url: "https://www.google.com/maps/search/?api=1&query=Pratunam+Market+Bangkok",
  },

  // ── 술집 ──────────────────────────────────────────────────────────────────
  {
    id: "br1",
    name: "씨로코 스카이바",
    category: "술집",
    description: "영화 행오버2 촬영지, 63층 루프탑 바",
    district: "씰롬 (방랍)",
    price: "฿600–1,500",
    hours: "18:00–01:00",
    tips: "드레스코드: 스마트 캐주얼",
    emoji: "🌆",
    accentColor: "rgba(99,102,241,0.10)",
    url: "https://www.lebua.com/restaurants-bars/sirocco/",
  },
  {
    id: "br2",
    name: "옥테이브 루프탑",
    category: "술집",
    description: "방콕 파노라마 뷰, 메리어트 45층",
    district: "아속 (수쿰빗)",
    price: "฿400–800",
    hours: "17:00–02:00",
    emoji: "🌃",
    accentColor: "rgba(124,58,237,0.10)",
    url: "https://www.google.com/maps/search/?api=1&query=Octave+Rooftop+Lounge+Bar+Bangkok+Marriott",
  },
  {
    id: "br3",
    name: "카오산 로드",
    category: "술집",
    description: "배낭여행자 성지, 24시간 파티 거리",
    district: "방랍 (카오산)",
    price: "฿80–200",
    hours: "24시간",
    emoji: "🍺",
    accentColor: "rgba(244,63,94,0.10)",
    url: "https://www.google.com/maps/search/?api=1&query=Khao+San+Road+Bangkok",
  },
  {
    id: "br4",
    name: "RCA 클럽가",
    category: "술집",
    description: "태국 최대 클럽 밀집 지역",
    district: "람캄행",
    price: "฿200–500",
    hours: "21:00–04:00",
    emoji: "🎵",
    accentColor: "rgba(244,63,94,0.10)",
    url: "https://www.google.com/maps/search/?api=1&query=RCA+Royal+City+Avenue+Bangkok",
  },
  {
    id: "br5",
    name: "씰롬 쏘이 4",
    category: "술집",
    description: "LGBT 친화 바 거리, 활기찬 분위기",
    district: "씰롬",
    price: "฿150–400",
    hours: "20:00–03:00",
    emoji: "🌈",
    accentColor: "rgba(16,185,129,0.10)",
    url: "https://www.google.com/maps/search/?api=1&query=Silom+Soi+4+Bangkok",
  },
  {
    id: "br6",
    name: "색소폰 재즈 바",
    category: "술집",
    description: "방콕 대표 라이브 재즈 펍",
    district: "빅토리 모뉴먼트",
    price: "฿200–500",
    hours: "18:00–02:00",
    emoji: "🎷",
    accentColor: "rgba(245,158,11,0.10)",
    url: "https://www.google.com/maps/search/?api=1&query=Saxophone+Pub+Bangkok",
  },

  // ── 마사지샵 ──────────────────────────────────────────────────────────────
  {
    id: "ms1",
    name: "왓 포 마사지 스쿨",
    category: "마사지샵",
    description: "태국 전통 마사지 본산, 왓 포 사원 내",
    district: "라따나꼬씬 (왓 포)",
    price: "฿420/hr",
    hours: "09:00–17:00",
    tips: "예약 필수, 정통 타이 마사지",
    emoji: "🧘",
    accentColor: "rgba(16,185,129,0.10)",
    url: "https://www.watpomassage.com/",
  },
  {
    id: "ms2",
    name: "헬스 랜드 스파",
    category: "마사지샵",
    description: "방콕 전역 지점, 청결하고 합리적",
    district: "방콕 전역",
    price: "฿550/hr~",
    hours: "09:00–23:00",
    emoji: "💆",
    accentColor: "rgba(6,182,212,0.10)",
    url: "https://www.healthlandspa.com/",
  },
  {
    id: "ms3",
    name: "렛츠 릴랙스",
    category: "마사지샵",
    description: "공항·몰 입점, 편리한 예약 시스템",
    district: "방콕 전역",
    price: "฿650–900/hr",
    hours: "10:00–23:00",
    tips: "앱 예약 시 할인",
    emoji: "🛁",
    accentColor: "rgba(99,102,241,0.10)",
    url: "https://www.letsrelaxspa.com/",
  },
  {
    id: "ms4",
    name: "디바나 스파",
    category: "마사지샵",
    description: "럭셔리 아로마 스파, 커플 패키지 인기",
    district: "수쿰빗",
    price: "฿1,500–3,000",
    hours: "11:00–23:00",
    emoji: "🌸",
    accentColor: "rgba(244,63,94,0.10)",
    url: "https://www.divanaspa.com/",
  },
  {
    id: "ms5",
    name: "아시아 허브 어소시에이션",
    category: "마사지샵",
    description: "허브볼 마사지 전문, 치료 효과",
    district: "수쿰빗",
    price: "฿700–1,200/hr",
    hours: "09:00–24:00",
    emoji: "🌿",
    accentColor: "rgba(16,185,129,0.10)",
    url: "https://www.google.com/maps/search/?api=1&query=Asia+Herb+Association+Bangkok",
  },
  {
    id: "ms6",
    name: "오리엔탈 스파",
    category: "마사지샵",
    description: "만다린 오리엔탈 호텔 최고급 스파",
    district: "짜오프라야 강변",
    price: "฿3,500+",
    hours: "10:00–22:00",
    emoji: "✨",
    accentColor: "rgba(245,158,11,0.10)",
    url: "https://www.mandarinoriental.com/en/bangkok/chao-phraya-river/experiences/the-oriental-spa",
  },

  // ── 호텔 ──────────────────────────────────────────────────────────────────
  {
    id: "ht1",
    name: "만다린 오리엔탈",
    category: "호텔",
    description: "1876년 개장, 짜오프라야 강변 전설적 명소",
    district: "짜오프라야 강변",
    price: "฿15,000~",
    hours: "체크인 15:00",
    tips: "강 전망 룸 추천",
    emoji: "🏨",
    accentColor: "rgba(245,158,11,0.10)",
    hotelLinks: [
      { platform: "hotels.com", url: "https://www.hotels.com/ho113714/" },
      { platform: "agoda", url: "https://www.agoda.com/mandarin-oriental-bangkok/hotel/bangkok-th.html" },
    ],
  },
  {
    id: "ht2",
    name: "카펠라 방콕",
    category: "호텔",
    description: "짜오프라야 강변 럭셔리 리조트, 현대적 설계",
    district: "짜오프라야 강변",
    price: "฿20,000~",
    hours: "체크인 15:00",
    tips: "인피니티 풀 전망 최고",
    emoji: "🌊",
    accentColor: "rgba(6,182,212,0.10)",
    hotelLinks: [
      { platform: "hotels.com", url: "https://www.hotels.com/ho1560226541/" },
      { platform: "agoda", url: "https://www.agoda.com/capella-bangkok/hotel/bangkok-th.html" },
    ],
  },
  {
    id: "ht3",
    name: "씨암 켐핀스키",
    category: "호텔",
    description: "씨암 지구 중심 5성급, 쇼핑몰 직결",
    district: "씨암",
    price: "฿8,000~",
    hours: "체크인 14:00",
    tips: "씨암 파라곤 바로 연결",
    emoji: "✨",
    accentColor: "rgba(99,102,241,0.10)",
    hotelLinks: [
      { platform: "hotels.com", url: "https://www.hotels.com/ho230219/" },
      { platform: "agoda", url: "https://www.agoda.com/kempinski-hotel-bangkok-siam/hotel/bangkok-th.html" },
    ],
  },
  {
    id: "ht4",
    name: "방콕 메리어트 수쿰빗",
    category: "호텔",
    description: "BTS 아속역 인근, 루프탑 바 옥테이브",
    district: "아속 (수쿰빗)",
    price: "฿5,500~",
    hours: "체크인 15:00",
    tips: "45층 루프탑 바 내부",
    emoji: "🏙️",
    accentColor: "rgba(124,58,237,0.10)",
    hotelLinks: [
      { platform: "hotels.com", url: "https://www.hotels.com/ho491697/" },
      { platform: "agoda", url: "https://www.agoda.com/bangkok-marriott-hotel-sukhumvit/hotel/bangkok-th.html" },
    ],
  },
  {
    id: "ht5",
    name: "르 메르디앙 방콕",
    category: "호텔",
    description: "씰롬·수완나품 공항 셔틀 운영 5성급",
    district: "씰롬",
    price: "฿4,500~",
    hours: "체크인 15:00",
    emoji: "🌸",
    accentColor: "rgba(244,63,94,0.10)",
    hotelLinks: [
      { platform: "hotels.com", url: "https://www.hotels.com/ho272636/" },
      { platform: "agoda", url: "https://www.agoda.com/le-meridien-bangkok/hotel/bangkok-th.html" },
    ],
  },
  {
    id: "ht6",
    name: "호텔 무세 방콕",
    category: "호텔",
    description: "씰롬 아트 호텔, 개성 있는 인테리어",
    district: "씰롬",
    price: "฿3,000~",
    hours: "체크인 14:00",
    tips: "가성비 5성급",
    emoji: "🎨",
    accentColor: "rgba(16,185,129,0.10)",
    hotelLinks: [
      { platform: "hotels.com", url: "https://www.hotels.com/ho1193688/" },
      { platform: "agoda", url: "https://www.agoda.com/hotel-muse-bangkok/hotel/bangkok-th.html" },
    ],
  },

  // ── 환율 ──────────────────────────────────────────────────────────────────
  {
    id: "ex1",
    name: "KRW → THB",
    category: "환율",
    description: "실시간 환율 로딩 중...",
    district: "슈퍼리치 환전소",
    price: "실시간 연동",
    tips: "슈퍼리치 환전소 이용 추천",
    emoji: "💱",
    accentColor: "rgba(245,158,11,0.10)",
    url: "https://www.superrich1965.com/",
  },
  {
    id: "ex2",
    name: "USD → THB",
    category: "환율",
    description: "실시간 환율 로딩 중...",
    district: "씨암·아속 환전소",
    price: "실시간 연동",
    emoji: "💵",
    accentColor: "rgba(16,185,129,0.10)",
    url: "https://www.xe.com/currencyconverter/convert/?Amount=1&From=USD&To=THB",
  },
  {
    id: "ex3",
    name: "공항 vs 시내",
    category: "환율",
    description: "시내 환전소가 공항보다 유리",
    district: "수완나품 공항",
    tips: "슈퍼리치·SuperRich Thailand 이용",
    emoji: "✈️",
    accentColor: "rgba(6,182,212,0.10)",
    url: "https://www.superrichthailand.com/",
  },
  {
    id: "ex4",
    name: "ATM 수수료",
    category: "환율",
    description: "태국 ATM 수수료 ฿220/회",
    district: "방콕 전역 ATM",
    tips: "현금 환전 후 사용 권장",
    emoji: "🏧",
    accentColor: "rgba(244,63,94,0.10)",
    url: "https://www.google.com/maps/search/?api=1&query=Currency+Exchange+Bangkok",
  },
  {
    id: "ex5",
    name: "환전소 위치",
    category: "환율",
    description: "씨암·아속·씰롬역 주변 밀집",
    district: "씨암·아속·씰롬",
    tips: "여권 지참 필수",
    emoji: "📍",
    accentColor: "rgba(99,102,241,0.10)",
    url: "https://www.google.com/maps/search/?api=1&query=Super+Rich+Exchange+Bangkok",
  },
  {
    id: "ex6",
    name: "카드 결제",
    category: "환율",
    description: "백화점·몰 카드 가능, 시장은 현금",
    district: "방콕 전역",
    tips: "해외 결제 수수료 확인 필수",
    emoji: "💳",
    accentColor: "rgba(124,58,237,0.10)",
    url: "https://www.xe.com/currencyconverter/convert/?Amount=1&From=KRW&To=THB",
  },
];

export function getBangkokGrid(category: BangkokFilter): BangkokItem[] {
  if (category === "전체") {
    const result: BangkokItem[] = [];
    for (const cat of BANGKOK_CATEGORIES) {
      const items = BANGKOK_ITEMS.filter((i) => i.category === cat);
      if (items[0]) result.push(items[0]);
    }
    const atExtra = BANGKOK_ITEMS.filter((i) => i.category === "관광지")[1];
    const fdExtra = BANGKOK_ITEMS.filter((i) => i.category === "음식")[1];
    if (atExtra) result.push(atExtra);
    if (fdExtra) result.push(fdExtra);
    return result.slice(0, 9);
  }
  return BANGKOK_ITEMS.filter((i) => i.category === category).slice(0, 9);
}
