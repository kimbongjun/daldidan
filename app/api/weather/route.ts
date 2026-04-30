import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

interface OWMResponse {
  main: { temp: number; feels_like: number; humidity: number };
  weather: { main: string; description: string; icon: string }[];
  wind: { speed: number };
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const lat = searchParams.get("lat");
  const lon = searchParams.get("lon");

  if (!lat || !lon) {
    return NextResponse.json({ error: "위도·경도가 필요합니다." }, { status: 400 });
  }

  const apiKey = process.env.OPENWEATHER_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "API 키가 설정되지 않았습니다." }, { status: 500 });
  }

  try {
    const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=metric&appid=${apiKey}&lang=ko`;
    const res = await fetch(url, { next: { revalidate: 300 }, signal: AbortSignal.timeout(8_000) });
    if (!res.ok) {
      return NextResponse.json({ error: "날씨 데이터를 가져오지 못했습니다." }, { status: 502 });
    }
    const data = await res.json() as OWMResponse;
    return NextResponse.json({
      temp: Number(data.main.temp.toFixed(1)),
      feelsLike: Number(data.main.feels_like.toFixed(1)),
      humidity: data.main.humidity,
      description: data.weather[0]?.description ?? "",
      icon: data.weather[0]?.icon ?? "",
      weatherMain: data.weather[0]?.main ?? "",
      windSpeed: data.wind.speed,
    });
  } catch {
    return NextResponse.json({ error: "네트워크 오류가 발생했습니다." }, { status: 503 });
  }
}
