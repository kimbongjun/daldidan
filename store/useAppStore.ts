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

interface AppState {
  weatherCities: WeatherData[];
  weather: WeatherData | null;
}

export const useAppStore = create<AppState>(() => ({
  weatherCities: WEATHER_CITIES,
  weather: WEATHER_CITIES[0],
}));
