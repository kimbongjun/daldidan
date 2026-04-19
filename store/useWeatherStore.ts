import { create } from "zustand";

export type WeatherCondition =
  | "clear" | "cloudy" | "rain" | "snow"
  | "hot" | "cold" | "windy" | "storm" | "foggy";

interface WeatherData {
  temp: number;
  feelsLike: number;
  humidity: number;
  description: string;
  icon: string;
  weatherMain: string;
  windSpeed: number;
}

interface WeatherState {
  condition: WeatherCondition | null;
  temp: number | null;
  feelsLike: number | null;
  description: string;
  icon: string;
  isLoading: boolean;
  error: string | null;
  fetchWeather: () => Promise<void>;
}

const CACHE_KEY = "daldidan-weather-cache";
const CACHE_TTL_MS = 60 * 60 * 1000; // 1시간

function classifyCondition(data: WeatherData): WeatherCondition {
  const { weatherMain, windSpeed, feelsLike } = data;
  if (weatherMain === "Thunderstorm") return "storm";
  if (weatherMain === "Snow") return "snow";
  if (weatherMain === "Rain" || weatherMain === "Drizzle") return "rain";
  if (["Mist", "Fog", "Haze", "Dust", "Sand", "Smoke", "Ash"].includes(weatherMain)) return "foggy";
  if (windSpeed > 8) return "windy";
  if (feelsLike > 30) return "hot";
  if (feelsLike < 5) return "cold";
  if (weatherMain === "Clouds") return "cloudy";
  return "clear";
}

function applyWeatherTheme(condition: WeatherCondition) {
  if (typeof document !== "undefined") {
    document.documentElement.setAttribute("data-weather", condition);
  }
}

function getPosition(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (typeof navigator === "undefined" || !("geolocation" in navigator)) {
      reject(new Error("위치 서비스를 지원하지 않는 환경입니다."));
      return;
    }
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      timeout: 10000,
      maximumAge: 3600000,
    });
  });
}

export const useWeatherStore = create<WeatherState>((set) => ({
  condition: null,
  temp: null,
  feelsLike: null,
  description: "",
  icon: "",
  isLoading: false,
  error: null,

  fetchWeather: async () => {
    // 캐시 확인
    try {
      const raw = localStorage.getItem(CACHE_KEY);
      if (raw) {
        const cached = JSON.parse(raw) as {
          timestamp: number;
          condition: WeatherCondition;
          temp: number;
          feelsLike: number;
          description: string;
          icon: string;
        };
        if (Date.now() - cached.timestamp < CACHE_TTL_MS) {
          set({
            condition: cached.condition,
            temp: cached.temp,
            feelsLike: cached.feelsLike,
            description: cached.description,
            icon: cached.icon,
          });
          applyWeatherTheme(cached.condition);
          return;
        }
      }
    } catch { /* 캐시 오류 무시 */ }

    set({ isLoading: true, error: null });

    try {
      const pos = await getPosition();
      const { latitude: lat, longitude: lon } = pos.coords;
      const res = await fetch(`/api/weather?lat=${lat}&lon=${lon}`);
      if (!res.ok) {
        const err = await res.json() as { error?: string };
        throw new Error(err.error ?? "날씨 조회 실패");
      }
      const data = await res.json() as WeatherData;
      const condition = classifyCondition(data);
      applyWeatherTheme(condition);

      const cacheEntry = {
        timestamp: Date.now(),
        condition,
        temp: data.temp,
        feelsLike: data.feelsLike,
        description: data.description,
        icon: data.icon,
      };
      try { localStorage.setItem(CACHE_KEY, JSON.stringify(cacheEntry)); } catch { /* ignore */ }

      set({
        condition,
        temp: data.temp,
        feelsLike: data.feelsLike,
        description: data.description,
        icon: data.icon,
        isLoading: false,
        error: null,
      });
    } catch (err) {
      set({
        isLoading: false,
        error: err instanceof Error ? err.message : "날씨를 불러올 수 없습니다.",
      });
    }
  },
}));
