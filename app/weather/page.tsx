import WeatherPageClient from "./WeatherPageClient";
import { fetchWeather, LiveWeather } from "@/lib/weather";

// 지원 도시 목록 (lat/lon 포함)
const CITIES = [
  { city: "서울",  country: "대한민국", region: "서울특별시",  lat: 37.5665, lon: 126.9780 },
  { city: "부산",  country: "대한민국", region: "부산광역시",  lat: 35.1796, lon: 129.0756 },
  { city: "도쿄",  country: "일본",     region: "관동 지방",   lat: 35.6762, lon: 139.6503 },
  { city: "뉴욕",  country: "미국",     region: "뉴욕 주",     lat: 40.7128, lon: -74.0060 },
  { city: "파리",  country: "프랑스",   region: "일드프랑스",  lat: 48.8566, lon: 2.3522  },
];

export const revalidate = 1800; // 30분마다 재생성
export const dynamic = "force-dynamic";

export default async function WeatherPage() {
  const weathers: LiveWeather[] = await Promise.all(
    CITIES.map((c) => fetchWeather(c.city, c.country, c.lat, c.lon))
  );

  return <WeatherPageClient weathers={weathers} />;
}
