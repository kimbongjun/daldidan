import { create } from "zustand";

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
  forecast: Array<{
    day: string;
    date: string;
    high: number;
    low: number;
    icon: string;
    condition: string;
    rainPct: number;
  }>;
  monthly?: Array<{
    month: string;
    avgHigh: number;
    avgLow: number;
    rainyDays: number;
  }>;
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

export interface RoadSegment {
  id: string;
  name: string;
  type: "고속도로" | "국도" | "도시고속";
  from: string;
  to: string;
  status: "원활" | "서행" | "정체" | "사고";
  speed: number;
  travelTime: number;
  distance: number;
}

export interface TrafficCCTV {
  id: string;
  road: string;
  location: string;
  status: "원활" | "서행" | "정체" | "사고";
  direction: string;
  updatedAt: string;
}

export interface Transaction {
  id: string;
  type: "income" | "expense";
  category: string;
  amount: number;
  note: string;
  date: string;
}

const ROAD_SEGMENTS: RoadSegment[] = [
  { id: "r1", name: "경부고속도로", type: "고속도로", from: "서울", to: "수원", status: "서행", speed: 42, travelTime: 38, distance: 29 },
  { id: "r2", name: "서해안고속도로", type: "고속도로", from: "목포", to: "서울", status: "원활", speed: 98, travelTime: 14, distance: 22 },
  { id: "r3", name: "영동고속도로", type: "고속도로", from: "인천", to: "강릉", status: "정체", speed: 18, travelTime: 67, distance: 19 },
  { id: "r4", name: "중부내륙고속도로", type: "고속도로", from: "충주", to: "대구", status: "원활", speed: 107, travelTime: 9, distance: 16 },
  { id: "r5", name: "국도 1호선", type: "국도", from: "서울", to: "인천", status: "서행", speed: 35, travelTime: 45, distance: 26 },
  { id: "r6", name: "올림픽대로", type: "도시고속", from: "강서", to: "잠실", status: "사고", speed: 12, travelTime: 55, distance: 11 },
  { id: "r7", name: "강변북로", type: "도시고속", from: "가양", to: "한남", status: "서행", speed: 28, travelTime: 32, distance: 15 },
  { id: "r8", name: "남해고속도로", type: "고속도로", from: "부산", to: "순천", status: "원활", speed: 112, travelTime: 8, distance: 15 },
];

const TRAFFIC_CCTVS: TrafficCCTV[] = [
  { id: "c1", road: "경부고속도로", location: "한남대교 남단", status: "서행", direction: "부산 방향", updatedAt: "14:23" },
  { id: "c2", road: "올림픽대로", location: "여의도 진입로", status: "사고" as const, direction: "잠실 방향", updatedAt: "14:21" },
  { id: "c3", road: "영동고속도로", location: "판교 분기점", status: "정체", direction: "강릉 방향", updatedAt: "14:22" },
  { id: "c4", road: "강변북로", location: "성산대교 북단", status: "서행", direction: "한남 방향", updatedAt: "14:20" },
  { id: "c5", road: "서해안고속도로", location: "안산 IC", status: "원활", direction: "목포 방향", updatedAt: "14:23" },
  { id: "c6", road: "남해고속도로", location: "부산 기점", status: "원활", direction: "순천 방향", updatedAt: "14:19" },
];

const WEATHER_CITIES: WeatherData[] = [
  {
    city: "서울",
    country: "대한민국",
    region: "서울특별시",
    temp: 18,
    feelsLike: 16,
    condition: "맑음",
    humidity: 52,
    wind: 3.2,
    icon: "☀️",
    uv: 6,
    visibility: 15,
    forecast: [
      { day: "오늘", date: "4/10", high: 20, low: 10, icon: "☀️", condition: "맑음", rainPct: 5 },
      { day: "내일", date: "4/11", high: 20, low: 10, icon: "⛅", condition: "구름 조금", rainPct: 15 },
      { day: "목", date: "4/12", high: 17, low: 9, icon: "🌧️", condition: "비", rainPct: 80 },
      { day: "금", date: "4/13", high: 15, low: 8, icon: "🌦️", condition: "소나기", rainPct: 60 },
    ],
    monthly: [
      { month: "1월", avgHigh: 3, avgLow: -5, rainyDays: 5 },
      { month: "2월", avgHigh: 6, avgLow: -2, rainyDays: 6 },
      { month: "3월", avgHigh: 12, avgLow: 2, rainyDays: 8 },
      { month: "4월", avgHigh: 19, avgLow: 8, rainyDays: 9 },
      { month: "5월", avgHigh: 25, avgLow: 14, rainyDays: 10 },
      { month: "6월", avgHigh: 29, avgLow: 19, rainyDays: 12 },
    ],
  },
];

const TRAVEL_SPOTS: TravelSpot[] = [
  { id: "1", name: "제주 협재 해수욕장", location: "제주도", category: "해변", rating: 4.8, price: "항공 89,000원~", tag: "HOT" },
  { id: "2", name: "경주 불국사", location: "경상북도", category: "역사", rating: 4.6, price: "당일치기 가능", tag: "추천" },
  { id: "3", name: "일본 교토", location: "일본", category: "해외", rating: 4.9, price: "항공 199,000원~", tag: "벚꽃시즌" },
  { id: "4", name: "강릉 안목 해변", location: "강원도", category: "카페거리", rating: 4.5, price: "KTX 56,800원~" },
];

const TRANSACTIONS: Transaction[] = [
  { id: "1", type: "expense", category: "식비", amount: 12000, note: "점심", date: "2026-04-10" },
  { id: "2", type: "expense", category: "교통", amount: 1500, note: "지하철", date: "2026-04-10" },
  { id: "3", type: "income", category: "급여", amount: 3200000, note: "4월 급여", date: "2026-04-01" },
  { id: "4", type: "expense", category: "쇼핑", amount: 89000, note: "의류", date: "2026-04-08" },
  { id: "5", type: "expense", category: "문화", amount: 15000, note: "영화", date: "2026-04-07" },
  { id: "6", type: "expense", category: "식비", amount: 34000, note: "저녁 외식", date: "2026-04-06" },
];

interface AppState {
  weatherCities: WeatherData[];
  weather: WeatherData | null;
  travelSpots: TravelSpot[];
  transactions: Transaction[];
  roadSegments: RoadSegment[];
  trafficCCTVs: TrafficCCTV[];
  removeTransaction: (id: string) => void;
  updateTransaction: (id: string, patch: Omit<Transaction, "id">) => void;
}

export const useAppStore = create<AppState>((set) => ({
  weatherCities: WEATHER_CITIES,
  weather: WEATHER_CITIES[0],
  travelSpots: TRAVEL_SPOTS,
  transactions: TRANSACTIONS,
  roadSegments: ROAD_SEGMENTS,
  trafficCCTVs: TRAFFIC_CCTVS,

  removeTransaction: (id) =>
    set((state) => ({
      transactions: state.transactions.filter((item) => item.id !== id),
    })),

  updateTransaction: (id, patch) =>
    set((state) => ({
      transactions: state.transactions.map((item) => (item.id === id ? { ...patch, id } : item)),
    })),
}));
