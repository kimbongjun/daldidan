// Open-Meteo: 무료, API키 불필요
// https://open-meteo.com/

export interface LiveWeather {
  city: string;
  country: string;
  lat: number;
  lon: number;
  temp: number;
  feelsLike: number;
  condition: string;
  icon: string;
  humidity: number;
  wind: number;
  uv: number;
  visibility: number;
  forecast: LiveForecastDay[];
  monthly: MonthlyClimate[];
  fetchedAt: number;
}

export interface LiveForecastDay {
  day: string;
  date: string;
  high: number;
  low: number;
  icon: string;
  condition: string;
  rainPct: number;
}

export interface MonthlyClimate {
  month: string;
  avgHigh: number;
  avgLow: number;
  rainyDays: number;
}

// WMO weather code → 한국어 + 이모지
function wmoToLabel(code: number): { condition: string; icon: string } {
  if (code === 0)               return { condition: "맑음",      icon: "☀️"  };
  if (code <= 2)                return { condition: "구름 조금", icon: "⛅"  };
  if (code === 3)               return { condition: "흐림",      icon: "☁️"  };
  if (code <= 49)               return { condition: "안개",      icon: "🌫️" };
  if (code <= 57)               return { condition: "이슬비",    icon: "🌦️" };
  if (code <= 65)               return { condition: "비",        icon: "🌧️" };
  if (code <= 77)               return { condition: "눈",        icon: "❄️"  };
  if (code <= 82)               return { condition: "소나기",    icon: "🌦️" };
  if (code <= 86)               return { condition: "눈 소나기", icon: "🌨️" };
  if (code <= 99)               return { condition: "뇌우",      icon: "⛈️"  };
  return { condition: "알 수 없음", icon: "🌡️" };
}

const DAY_KO = ["일", "월", "화", "수", "목", "금", "토"];

export async function fetchWeather(
  city: string,
  country: string,
  lat: number,
  lon: number
): Promise<LiveWeather> {
  try {
    const url =
      `https://api.open-meteo.com/v1/forecast` +
      `?latitude=${lat}&longitude=${lon}` +
      `&current=temperature_2m,apparent_temperature,weathercode,relative_humidity_2m,windspeed_10m,uv_index,visibility` +
      `&daily=weathercode,temperature_2m_max,temperature_2m_min,precipitation_probability_max` +
      `&timezone=auto&forecast_days=7`;

    const res = await fetch(url, { next: { revalidate: 1800 } });
    if (!res.ok) throw new Error(`Open-Meteo error: ${res.status}`);

    const data = await res.json();
    const cur = data.current;
    const daily = data.daily;

    const { condition, icon } = wmoToLabel(cur.weathercode);

    const forecast: LiveForecastDay[] = (daily.time as string[]).map((dateStr, i) => {
      const d = new Date(dateStr);
      const { condition: dc, icon: di } = wmoToLabel(daily.weathercode[i]);
      return {
        day: i === 0 ? "오늘" : i === 1 ? "내일" : DAY_KO[d.getDay()],
        date: `${d.getMonth() + 1}/${d.getDate()}`,
        high: Math.round(daily.temperature_2m_max[i]),
        low: Math.round(daily.temperature_2m_min[i]),
        icon: di,
        condition: dc,
        rainPct: daily.precipitation_probability_max[i] ?? 0,
      };
    });

    return {
      city, country, lat, lon,
      temp: Math.round(cur.temperature_2m),
      feelsLike: Math.round(cur.apparent_temperature),
      condition, icon,
      humidity: cur.relative_humidity_2m,
      wind: parseFloat((cur.windspeed_10m / 3.6).toFixed(1)),
      uv: Math.round(cur.uv_index ?? 0),
      visibility: Math.round((cur.visibility ?? 10000) / 1000),
      forecast,
      monthly: MONTHLY_CLIMATE[city] ?? [],
      fetchedAt: Date.now(),
    };
  } catch {
    return {
      city, country, lat, lon,
      temp: 0,
      feelsLike: 0,
      condition: "정보 없음",
      icon: "❓",
      humidity: 0,
      wind: 0,
      uv: 0,
      visibility: 0,
      forecast: [],
      monthly: MONTHLY_CLIMATE[city] ?? [],
      fetchedAt: 0,
    };
  }
}

// 월간 기후 평년값 (정적 데이터 — API 없음)
const MONTHLY_CLIMATE: Record<string, MonthlyClimate[]> = {
  서울: [
    { month:"1월",avgHigh:3,  avgLow:-5,rainyDays:5  },{ month:"2월",avgHigh:6,  avgLow:-2,rainyDays:6  },
    { month:"3월",avgHigh:12, avgLow:2, rainyDays:8  },{ month:"4월",avgHigh:19, avgLow:8, rainyDays:9  },
    { month:"5월",avgHigh:25, avgLow:14,rainyDays:10 },{ month:"6월",avgHigh:29, avgLow:19,rainyDays:12 },
    { month:"7월",avgHigh:31, avgLow:23,rainyDays:18 },{ month:"8월",avgHigh:32, avgLow:23,rainyDays:15 },
    { month:"9월",avgHigh:27, avgLow:17,rainyDays:10 },{ month:"10월",avgHigh:21,avgLow:10,rainyDays:7  },
    { month:"11월",avgHigh:12,avgLow:3, rainyDays:7  },{ month:"12월",avgHigh:5, avgLow:-3,rainyDays:6  },
  ],
  부산: [
    { month:"1월",avgHigh:7,  avgLow:0, rainyDays:5  },{ month:"2월",avgHigh:9,  avgLow:2, rainyDays:6  },
    { month:"3월",avgHigh:14, avgLow:6, rainyDays:8  },{ month:"4월",avgHigh:19, avgLow:11,rainyDays:9  },
    { month:"5월",avgHigh:24, avgLow:16,rainyDays:10 },{ month:"6월",avgHigh:27, avgLow:20,rainyDays:12 },
    { month:"7월",avgHigh:29, avgLow:23,rainyDays:16 },{ month:"8월",avgHigh:30, avgLow:24,rainyDays:13 },
    { month:"9월",avgHigh:27, avgLow:19,rainyDays:9  },{ month:"10월",avgHigh:22,avgLow:13,rainyDays:6  },
    { month:"11월",avgHigh:15,avgLow:6, rainyDays:6  },{ month:"12월",avgHigh:9, avgLow:1, rainyDays:5  },
  ],
  도쿄: [
    { month:"1월",avgHigh:10, avgLow:3, rainyDays:6  },{ month:"2월",avgHigh:11, avgLow:3, rainyDays:6  },
    { month:"3월",avgHigh:15, avgLow:6, rainyDays:10 },{ month:"4월",avgHigh:21, avgLow:12,rainyDays:11 },
    { month:"5월",avgHigh:26, avgLow:17,rainyDays:12 },{ month:"6월",avgHigh:29, avgLow:21,rainyDays:14 },
    { month:"7월",avgHigh:33, avgLow:25,rainyDays:14 },{ month:"8월",avgHigh:34, avgLow:26,rainyDays:10 },
    { month:"9월",avgHigh:30, avgLow:22,rainyDays:14 },{ month:"10월",avgHigh:24,avgLow:15,rainyDays:11 },
    { month:"11월",avgHigh:17,avgLow:9, rainyDays:8  },{ month:"12월",avgHigh:12,avgLow:4, rainyDays:6  },
  ],
  뉴욕: [
    { month:"1월",avgHigh:4,  avgLow:-3,rainyDays:10 },{ month:"2월",avgHigh:6,  avgLow:-2,rainyDays:9  },
    { month:"3월",avgHigh:11, avgLow:3, rainyDays:11 },{ month:"4월",avgHigh:17, avgLow:8, rainyDays:11 },
    { month:"5월",avgHigh:23, avgLow:13,rainyDays:11 },{ month:"6월",avgHigh:28, avgLow:18,rainyDays:10 },
    { month:"7월",avgHigh:30, avgLow:21,rainyDays:10 },{ month:"8월",avgHigh:29, avgLow:20,rainyDays:10 },
    { month:"9월",avgHigh:25, avgLow:16,rainyDays:9  },{ month:"10월",avgHigh:19,avgLow:10,rainyDays:9  },
    { month:"11월",avgHigh:12,avgLow:4, rainyDays:9  },{ month:"12월",avgHigh:6, avgLow:-1,rainyDays:10 },
  ],
  파리: [
    { month:"1월",avgHigh:7,  avgLow:3, rainyDays:10 },{ month:"2월",avgHigh:8,  avgLow:3, rainyDays:8  },
    { month:"3월",avgHigh:12, avgLow:5, rainyDays:9  },{ month:"4월",avgHigh:16, avgLow:7, rainyDays:9  },
    { month:"5월",avgHigh:20, avgLow:11,rainyDays:9  },{ month:"6월",avgHigh:24, avgLow:14,rainyDays:8  },
    { month:"7월",avgHigh:27, avgLow:16,rainyDays:7  },{ month:"8월",avgHigh:27, avgLow:16,rainyDays:7  },
    { month:"9월",avgHigh:22, avgLow:12,rainyDays:8  },{ month:"10월",avgHigh:16,avgLow:8, rainyDays:9  },
    { month:"11월",avgHigh:10,avgLow:5, rainyDays:10 },{ month:"12월",avgHigh:7, avgLow:3, rainyDays:10 },
  ],
};
