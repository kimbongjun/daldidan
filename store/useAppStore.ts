import { create } from "zustand";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Stock {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePct: number;
  market: "KR" | "US";
  volume?: string;
  marketCap?: string;
  high52w?: number;
  low52w?: number;
  per?: number;
  eps?: number;
  sparkline?: number[];
}

export interface MarketIndex {
  name: string;
  value: number;
  change: number;
  changePct: number;
  region: "KR" | "US" | "JP" | "CN";
}

export interface WeatherData {
  city: string;
  country: string;
  region?: string;
  temp: number;
  feelsLike: number;
  condition: string;
  humidity: number;
  wind: number;
  icon: string;
  uv?: number;
  visibility?: number;
  forecast: { day: string; date: string; high: number; low: number; icon: string; condition: string; rainPct: number }[];
  monthly?: { month: string; avgHigh: number; avgLow: number; rainyDays: number }[];
}

export interface Deal {
  id: string;
  title: string;
  store: string;
  originalPrice: number;
  salePrice: number;
  discountPct: number;
  category: string;
  expiresAt: string;
  purchaseUrl: string;
  description?: string;
  rating?: number;
  reviewCount?: number;
  image?: string;
}

export interface Event {
  id: string;
  title: string;
  type: "movie" | "concert" | "exhibition";
  venue: string;
  date: string;
  rating?: number;
  tag?: string;
}

export interface TravelSpot {
  id: string;
  name: string;
  location: string;
  category: string;
  rating: number;
  price: string;
  tag?: string;
}

export interface Transaction {
  id: string;
  type: "income" | "expense";
  category: string;
  amount: number;
  note: string;
  date: string;
}

// ─── Mock Data ────────────────────────────────────────────────────────────────

const MOCK_INDICES: MarketIndex[] = [
  { name: "KOSPI",   value: 2687.44, change: 18.52,  changePct: 0.69,  region: "KR" },
  { name: "KOSDAQ",  value: 879.31,  change: -3.21,  changePct: -0.36, region: "KR" },
  { name: "S&P 500", value: 5204.34, change: 42.03,  changePct: 0.81,  region: "US" },
  { name: "NASDAQ",  value: 16399.2, change: 169.3,  changePct: 1.04,  region: "US" },
  { name: "DOW",     value: 38996.4, change: -34.2,  changePct: -0.09, region: "US" },
  { name: "닛케이",  value: 39523.5, change: 284.1,  changePct: 0.72,  region: "JP" },
  { name: "항셍",    value: 17284.5, change: -126.8, changePct: -0.73, region: "CN" },
];

const MOCK_STOCKS: Stock[] = [
  {
    symbol: "005930", name: "삼성전자", price: 74200, change: 1100, changePct: 1.5, market: "KR",
    volume: "12,847,320", marketCap: "442.8조", high52w: 88000, low52w: 62400,
    per: 18.3, eps: 4053, sparkline: [68000, 70000, 71500, 69800, 72000, 73100, 74200],
  },
  {
    symbol: "000660", name: "SK하이닉스", price: 185500, change: -2300, changePct: -1.23, market: "KR",
    volume: "3,421,980", marketCap: "134.9조", high52w: 238000, low52w: 130500,
    per: 22.4, eps: 8281, sparkline: [195000, 192000, 188000, 190000, 187000, 186000, 185500],
  },
  {
    symbol: "035420", name: "NAVER", price: 192000, change: 4500, changePct: 2.4, market: "KR",
    volume: "892,450", marketCap: "31.4조", high52w: 232000, low52w: 155000,
    per: 31.2, eps: 6154, sparkline: [175000, 180000, 183000, 186000, 188000, 190000, 192000],
  },
  {
    symbol: "051910", name: "LG화학", price: 298000, change: -4500, changePct: -1.49, market: "KR",
    volume: "312,870", marketCap: "21.1조", high52w: 412000, low52w: 280000,
    per: 14.8, eps: 20135, sparkline: [320000, 312000, 308000, 305000, 300000, 299000, 298000],
  },
  {
    symbol: "005380", name: "현대차", price: 241500, change: 3200, changePct: 1.34, market: "KR",
    volume: "1,234,560", marketCap: "51.5조", high52w: 284000, low52w: 195000,
    per: 6.2, eps: 38952, sparkline: [228000, 232000, 235000, 238000, 239000, 240000, 241500],
  },
  {
    symbol: "AAPL", name: "Apple", price: 213.07, change: 2.15, changePct: 1.02, market: "US",
    volume: "58.3M", marketCap: "$3.28T", high52w: 237.23, low52w: 164.08,
    per: 33.2, eps: 6.42, sparkline: [195, 200, 205, 208, 210, 212, 213.07],
  },
  {
    symbol: "NVDA", name: "NVIDIA", price: 875.4, change: -12.3, changePct: -1.39, market: "US",
    volume: "42.1M", marketCap: "$2.16T", high52w: 974.0, low52w: 455.87,
    per: 68.4, eps: 12.80, sparkline: [920, 910, 900, 890, 882, 878, 875.4],
  },
  {
    symbol: "TSLA", name: "Tesla", price: 172.63, change: 5.4, changePct: 3.22, market: "US",
    volume: "89.4M", marketCap: "$549.8B", high52w: 278.98, low52w: 138.80,
    per: 41.2, eps: 4.19, sparkline: [155, 160, 163, 167, 169, 171, 172.63],
  },
  {
    symbol: "MSFT", name: "Microsoft", price: 415.2, change: 3.8, changePct: 0.92, market: "US",
    volume: "21.2M", marketCap: "$3.09T", high52w: 468.35, low52w: 309.45,
    per: 36.8, eps: 11.28, sparkline: [400, 405, 408, 410, 412, 414, 415.2],
  },
  {
    symbol: "GOOGL", name: "Alphabet", price: 165.54, change: 1.23, changePct: 0.75, market: "US",
    volume: "24.8M", marketCap: "$2.04T", high52w: 193.31, low52w: 120.21,
    per: 25.4, eps: 6.52, sparkline: [158, 160, 162, 163, 164, 165, 165.54],
  },
];

const MOCK_WEATHER_CITIES: WeatherData[] = [
  {
    city: "서울", country: "대한민국", region: "서울특별시",
    temp: 18, feelsLike: 16, condition: "맑음", humidity: 52, wind: 3.2, icon: "☀️", uv: 6, visibility: 15,
    forecast: [
      { day: "오늘", date: "4/10", high: 20, low: 10, icon: "☀️", condition: "맑음", rainPct: 5 },
      { day: "내일", date: "4/11", high: 20, low: 10, icon: "⛅", condition: "구름 조금", rainPct: 15 },
      { day: "목",   date: "4/12", high: 17, low: 9,  icon: "🌧️", condition: "비",      rainPct: 80 },
      { day: "금",   date: "4/13", high: 15, low: 8,  icon: "🌦️", condition: "소나기",  rainPct: 60 },
      { day: "토",   date: "4/14", high: 22, low: 12, icon: "☀️", condition: "맑음",    rainPct: 5 },
      { day: "일",   date: "4/15", high: 23, low: 13, icon: "☀️", condition: "맑음",    rainPct: 0 },
      { day: "월",   date: "4/16", high: 19, low: 11, icon: "⛅", condition: "흐림",    rainPct: 30 },
    ],
    monthly: [
      { month: "1월", avgHigh: 3,  avgLow: -5, rainyDays: 5  },
      { month: "2월", avgHigh: 6,  avgLow: -2, rainyDays: 6  },
      { month: "3월", avgHigh: 12, avgLow: 2,  rainyDays: 8  },
      { month: "4월", avgHigh: 19, avgLow: 8,  rainyDays: 9  },
      { month: "5월", avgHigh: 25, avgLow: 14, rainyDays: 10 },
      { month: "6월", avgHigh: 29, avgLow: 19, rainyDays: 12 },
      { month: "7월", avgHigh: 31, avgLow: 23, rainyDays: 18 },
      { month: "8월", avgHigh: 32, avgLow: 23, rainyDays: 15 },
      { month: "9월", avgHigh: 27, avgLow: 17, rainyDays: 10 },
      { month: "10월",avgHigh: 21, avgLow: 10, rainyDays: 7  },
      { month: "11월",avgHigh: 12, avgLow: 3,  rainyDays: 7  },
      { month: "12월",avgHigh: 5,  avgLow: -3, rainyDays: 6  },
    ],
  },
  {
    city: "부산", country: "대한민국", region: "부산광역시",
    temp: 20, feelsLike: 18, condition: "흐림", humidity: 68, wind: 5.1, icon: "⛅", uv: 4, visibility: 12,
    forecast: [
      { day: "오늘", date: "4/10", high: 21, low: 13, icon: "⛅", condition: "구름 많음", rainPct: 30 },
      { day: "내일", date: "4/11", high: 19, low: 12, icon: "🌧️", condition: "비",       rainPct: 75 },
      { day: "목",   date: "4/12", high: 18, low: 11, icon: "🌧️", condition: "비",       rainPct: 85 },
      { day: "금",   date: "4/13", high: 20, low: 12, icon: "🌦️", condition: "소나기",   rainPct: 50 },
      { day: "토",   date: "4/14", high: 23, low: 14, icon: "☀️", condition: "맑음",     rainPct: 10 },
      { day: "일",   date: "4/15", high: 24, low: 15, icon: "☀️", condition: "맑음",     rainPct: 5  },
      { day: "월",   date: "4/16", high: 21, low: 13, icon: "⛅", condition: "구름 조금",rainPct: 20 },
    ],
    monthly: [
      { month: "1월", avgHigh: 7,  avgLow: 0,  rainyDays: 5 },
      { month: "2월", avgHigh: 9,  avgLow: 2,  rainyDays: 6 },
      { month: "3월", avgHigh: 14, avgLow: 6,  rainyDays: 8 },
      { month: "4월", avgHigh: 19, avgLow: 11, rainyDays: 9 },
      { month: "5월", avgHigh: 24, avgLow: 16, rainyDays: 10},
      { month: "6월", avgHigh: 27, avgLow: 20, rainyDays: 12},
      { month: "7월", avgHigh: 29, avgLow: 23, rainyDays: 16},
      { month: "8월", avgHigh: 30, avgLow: 24, rainyDays: 13},
      { month: "9월", avgHigh: 27, avgLow: 19, rainyDays: 9 },
      { month: "10월",avgHigh: 22, avgLow: 13, rainyDays: 6 },
      { month: "11월",avgHigh: 15, avgLow: 6,  rainyDays: 6 },
      { month: "12월",avgHigh: 9,  avgLow: 1,  rainyDays: 5 },
    ],
  },
  {
    city: "도쿄", country: "일본", region: "관동 지방",
    temp: 22, feelsLike: 20, condition: "맑음", humidity: 58, wind: 4.0, icon: "☀️", uv: 7, visibility: 18,
    forecast: [
      { day: "오늘", date: "4/10", high: 23, low: 14, icon: "☀️", condition: "맑음",    rainPct: 5  },
      { day: "내일", date: "4/11", high: 22, low: 13, icon: "⛅", condition: "구름 조금",rainPct: 20 },
      { day: "목",   date: "4/12", high: 20, low: 12, icon: "🌧️", condition: "비",      rainPct: 70 },
      { day: "금",   date: "4/13", high: 19, low: 11, icon: "🌦️", condition: "소나기",  rainPct: 55 },
      { day: "토",   date: "4/14", high: 21, low: 13, icon: "⛅", condition: "흐림",    rainPct: 35 },
      { day: "일",   date: "4/15", high: 24, low: 14, icon: "☀️", condition: "맑음",    rainPct: 10 },
      { day: "월",   date: "4/16", high: 25, low: 15, icon: "☀️", condition: "맑음",    rainPct: 5  },
    ],
    monthly: [
      { month: "1월", avgHigh: 10, avgLow: 3,  rainyDays: 6 },
      { month: "2월", avgHigh: 11, avgLow: 3,  rainyDays: 6 },
      { month: "3월", avgHigh: 15, avgLow: 6,  rainyDays: 10},
      { month: "4월", avgHigh: 21, avgLow: 12, rainyDays: 11},
      { month: "5월", avgHigh: 26, avgLow: 17, rainyDays: 12},
      { month: "6월", avgHigh: 29, avgLow: 21, rainyDays: 14},
      { month: "7월", avgHigh: 33, avgLow: 25, rainyDays: 14},
      { month: "8월", avgHigh: 34, avgLow: 26, rainyDays: 10},
      { month: "9월", avgHigh: 30, avgLow: 22, rainyDays: 14},
      { month: "10월",avgHigh: 24, avgLow: 15, rainyDays: 11},
      { month: "11월",avgHigh: 17, avgLow: 9,  rainyDays: 8 },
      { month: "12월",avgHigh: 12, avgLow: 4,  rainyDays: 6 },
    ],
  },
  {
    city: "뉴욕", country: "미국", region: "뉴욕 주",
    temp: 15, feelsLike: 12, condition: "구름 많음", humidity: 72, wind: 6.8, icon: "⛅", uv: 3, visibility: 10,
    forecast: [
      { day: "오늘", date: "4/10", high: 16, low: 8,  icon: "⛅", condition: "구름 많음",rainPct: 40 },
      { day: "내일", date: "4/11", high: 14, low: 7,  icon: "🌧️", condition: "비",       rainPct: 80 },
      { day: "목",   date: "4/12", high: 13, low: 5,  icon: "🌧️", condition: "비",       rainPct: 75 },
      { day: "금",   date: "4/13", high: 17, low: 8,  icon: "🌦️", condition: "소나기",   rainPct: 45 },
      { day: "토",   date: "4/14", high: 20, low: 10, icon: "☀️", condition: "맑음",     rainPct: 10 },
      { day: "일",   date: "4/15", high: 22, low: 12, icon: "☀️", condition: "맑음",     rainPct: 5  },
      { day: "월",   date: "4/16", high: 18, low: 9,  icon: "⛅", condition: "흐림",     rainPct: 30 },
    ],
    monthly: [
      { month: "1월", avgHigh: 4,  avgLow: -3, rainyDays: 10},
      { month: "2월", avgHigh: 6,  avgLow: -2, rainyDays: 9 },
      { month: "3월", avgHigh: 11, avgLow: 3,  rainyDays: 11},
      { month: "4월", avgHigh: 17, avgLow: 8,  rainyDays: 11},
      { month: "5월", avgHigh: 23, avgLow: 13, rainyDays: 11},
      { month: "6월", avgHigh: 28, avgLow: 18, rainyDays: 10},
      { month: "7월", avgHigh: 30, avgLow: 21, rainyDays: 10},
      { month: "8월", avgHigh: 29, avgLow: 20, rainyDays: 10},
      { month: "9월", avgHigh: 25, avgLow: 16, rainyDays: 9 },
      { month: "10월",avgHigh: 19, avgLow: 10, rainyDays: 9 },
      { month: "11월",avgHigh: 12, avgLow: 4,  rainyDays: 9 },
      { month: "12월",avgHigh: 6,  avgLow: -1, rainyDays: 10},
    ],
  },
  {
    city: "파리", country: "프랑스", region: "일드프랑스",
    temp: 14, feelsLike: 11, condition: "흐림", humidity: 78, wind: 5.5, icon: "🌥️", uv: 3, visibility: 8,
    forecast: [
      { day: "오늘", date: "4/10", high: 15, low: 7,  icon: "🌥️", condition: "흐림",    rainPct: 45 },
      { day: "내일", date: "4/11", high: 16, low: 8,  icon: "🌧️", condition: "비",      rainPct: 70 },
      { day: "목",   date: "4/12", high: 13, low: 6,  icon: "🌧️", condition: "비",      rainPct: 65 },
      { day: "금",   date: "4/13", high: 15, low: 7,  icon: "⛅", condition: "구름 조금",rainPct: 30 },
      { day: "토",   date: "4/14", high: 17, low: 9,  icon: "☀️", condition: "맑음",    rainPct: 15 },
      { day: "일",   date: "4/15", high: 18, low: 10, icon: "☀️", condition: "맑음",    rainPct: 10 },
      { day: "월",   date: "4/16", high: 16, low: 8,  icon: "⛅", condition: "구름 많음",rainPct: 35 },
    ],
    monthly: [
      { month: "1월", avgHigh: 7,  avgLow: 3,  rainyDays: 10},
      { month: "2월", avgHigh: 8,  avgLow: 3,  rainyDays: 8 },
      { month: "3월", avgHigh: 12, avgLow: 5,  rainyDays: 9 },
      { month: "4월", avgHigh: 16, avgLow: 7,  rainyDays: 9 },
      { month: "5월", avgHigh: 20, avgLow: 11, rainyDays: 9 },
      { month: "6월", avgHigh: 24, avgLow: 14, rainyDays: 8 },
      { month: "7월", avgHigh: 27, avgLow: 16, rainyDays: 7 },
      { month: "8월", avgHigh: 27, avgLow: 16, rainyDays: 7 },
      { month: "9월", avgHigh: 22, avgLow: 12, rainyDays: 8 },
      { month: "10월",avgHigh: 16, avgLow: 8,  rainyDays: 9 },
      { month: "11월",avgHigh: 10, avgLow: 5,  rainyDays: 10},
      { month: "12월",avgHigh: 7,  avgLow: 3,  rainyDays: 10},
    ],
  },
];

const MOCK_DEALS: Deal[] = [
  {
    id: "1", title: "다이슨 에어랩 컴플리트 롱", store: "쿠팡", category: "가전",
    originalPrice: 699000, salePrice: 499000, discountPct: 29, expiresAt: "D-2",
    purchaseUrl: "https://www.coupang.com",
    description: "다이슨 에어랩 컴플리트 롱 — 손상 없이 스타일링. 배럴 6종 포함.",
    rating: 4.7, reviewCount: 12483,
  },
  {
    id: "2", title: "나이키 에어맥스 270 블랙", store: "무신사", category: "패션",
    originalPrice: 189000, salePrice: 119000, discountPct: 37, expiresAt: "D-1",
    purchaseUrl: "https://www.musinsa.com",
    description: "나이키 에어맥스 270 — 최대 에어 유닛으로 하루 종일 편안함.",
    rating: 4.5, reviewCount: 8721,
  },
  {
    id: "3", title: "스타벅스 아메리카노 10잔 e-쿠폰", store: "11번가", category: "식품",
    originalPrice: 55000, salePrice: 38500, discountPct: 30, expiresAt: "D-5",
    purchaseUrl: "https://www.11st.co.kr",
    description: "스타벅스 아메리카노 Tall 사이즈 10잔 e-쿠폰. 유효기간 3개월.",
    rating: 4.9, reviewCount: 34120,
  },
  {
    id: "4", title: "애플워치 SE 2세대 GPS 40mm", store: "네이버쇼핑", category: "가전",
    originalPrice: 329000, salePrice: 279000, discountPct: 15, expiresAt: "D-3",
    purchaseUrl: "https://shopping.naver.com",
    description: "애플워치 SE 2세대 — 충돌 감지, 수영 방수, 심박수 알림 지원.",
    rating: 4.6, reviewCount: 5832,
  },
  {
    id: "5", title: "설화수 윤조에센스 60ml", store: "올리브영", category: "뷰티",
    originalPrice: 85000, salePrice: 59500, discountPct: 30, expiresAt: "D-4",
    purchaseUrl: "https://www.oliveyoung.co.kr",
    description: "설화수 대표 에센스. 보습·탄력·광채를 한 번에.",
    rating: 4.8, reviewCount: 22100,
  },
  {
    id: "6", title: "뉴발란스 990v6 Made in USA", store: "무신사", category: "패션",
    originalPrice: 329000, salePrice: 249000, discountPct: 24, expiresAt: "D-7",
    purchaseUrl: "https://www.musinsa.com",
    description: "미국 플리머스 공장 직생산. 최고급 소재와 쿠셔닝.",
    rating: 4.9, reviewCount: 3400,
  },
  {
    id: "7", title: "LG 스탠바이미 Go 27인치", store: "LG전자몰", category: "가전",
    originalPrice: 1099000, salePrice: 879000, discountPct: 20, expiresAt: "D-10",
    purchaseUrl: "https://www.lge.co.kr",
    description: "27인치 터치 포터블 스크린. 배터리 내장, 어디서나 사용 가능.",
    rating: 4.4, reviewCount: 2890,
  },
  {
    id: "8", title: "나이키 드라이핏 러닝 티셔츠", store: "나이키공홈", category: "스포츠",
    originalPrice: 59000, salePrice: 39000, discountPct: 34, expiresAt: "D-2",
    purchaseUrl: "https://www.nike.com/kr",
    description: "땀 흡수·속건 기능성 소재. 반사 디테일 적용.",
    rating: 4.6, reviewCount: 6710,
  },
  {
    id: "9", title: "쿠쿠 IH압력밥솥 6인용", store: "쿠팡", category: "가전",
    originalPrice: 249000, salePrice: 169000, discountPct: 32, expiresAt: "D-6",
    purchaseUrl: "https://www.coupang.com",
    description: "IH 인덕션 가열 방식. 8단 압력 조절, AI 맞춤 취사 기능.",
    rating: 4.7, reviewCount: 18320,
  },
  {
    id: "10", title: "제주 감귤 5kg 선물세트", store: "마켓컬리", category: "식품",
    originalPrice: 38000, salePrice: 24000, discountPct: 37, expiresAt: "D-3",
    purchaseUrl: "https://www.kurly.com",
    description: "제주 직송 노지 감귤. 당도 보증 선별 포장.",
    rating: 4.8, reviewCount: 9870,
  },
];

const MOCK_EVENTS: Event[] = [
  { id: "1", title: "파묘",              type: "movie",      venue: "CGV 강남",   date: "상영중",    rating: 7.8, tag: "공포/미스터리" },
  { id: "2", title: "IU 콘서트 2025",    type: "concert",    venue: "KSPO DOME",  date: "5월 17-18일",           tag: "K-POP" },
  { id: "3", title: "베르사이유 특별전",  type: "exhibition", venue: "예술의전당", date: "~6월 30일",             tag: "전시" },
  { id: "4", title: "인사이드 아웃 2",   type: "movie",      venue: "롯데시네마", date: "상영중",    rating: 8.2, tag: "애니메이션" },
];

const MOCK_TRAVEL: TravelSpot[] = [
  { id: "1", name: "제주 협재 해수욕장", location: "제주도",   category: "해변",    rating: 4.8, price: "항공 89,000원~",  tag: "HOT" },
  { id: "2", name: "경주 불국사",        location: "경상북도", category: "역사",    rating: 4.6, price: "당일치기 가능",   tag: "추천" },
  { id: "3", name: "일본 교토",          location: "일본",     category: "해외",    rating: 4.9, price: "항공 199,000원~", tag: "벚꽃시즌" },
  { id: "4", name: "강릉 안목 해변",     location: "강원도",   category: "카페거리",rating: 4.5, price: "KTX 56,800원~" },
];

const MOCK_TRANSACTIONS: Transaction[] = [
  { id: "1", type: "expense", category: "식비",  amount: 12000,   note: "점심",      date: "2026-04-10" },
  { id: "2", type: "expense", category: "교통",  amount: 1500,    note: "지하철",    date: "2026-04-10" },
  { id: "3", type: "income",  category: "급여",  amount: 3200000, note: "4월 급여",  date: "2026-04-01" },
  { id: "4", type: "expense", category: "쇼핑",  amount: 89000,   note: "의류",      date: "2026-04-08" },
  { id: "5", type: "expense", category: "문화",  amount: 15000,   note: "영화",      date: "2026-04-07" },
  { id: "6", type: "expense", category: "식비",  amount: 34000,   note: "저녁 외식", date: "2026-04-06" },
];

// ─── Store ────────────────────────────────────────────────────────────────────

interface AppState {
  indices: MarketIndex[];
  stocks: Stock[];
  weatherCities: WeatherData[];
  weather: WeatherData | null;
  deals: Deal[];
  events: Event[];
  travelSpots: TravelSpot[];
  transactions: Transaction[];
  addTransaction: (tx: Omit<Transaction, "id">) => void;
  removeTransaction: (id: string) => void;
}

export const useAppStore = create<AppState>((set) => ({
  indices:      MOCK_INDICES,
  stocks:       MOCK_STOCKS,
  weatherCities: MOCK_WEATHER_CITIES,
  weather:      MOCK_WEATHER_CITIES[0],
  deals:        MOCK_DEALS,
  events:       MOCK_EVENTS,
  travelSpots:  MOCK_TRAVEL,
  transactions: MOCK_TRANSACTIONS,

  addTransaction: (tx) =>
    set((s) => ({
      transactions: [{ ...tx, id: crypto.randomUUID() }, ...s.transactions],
    })),

  removeTransaction: (id) =>
    set((s) => ({
      transactions: s.transactions.filter((t) => t.id !== id),
    })),
}));
