"use client";
import { useState } from "react";
import { useAppStore, WeatherData } from "@/store/useAppStore";
import PageHeader from "@/components/PageHeader";
import { MapPin, Droplets, Wind, Eye, Thermometer, Search, Sun, CalendarDays, Calendar } from "lucide-react";
import clsx from "clsx";

const ACCENT = "#06B6D4";
type TabKey = "current" | "weekly" | "monthly";

export default function WeatherPage() {
  const { weatherCities } = useAppStore();
  const [selectedCity, setSelectedCity] = useState<WeatherData>(weatherCities[0]);
  const [tab, setTab] = useState<TabKey>("current");
  const [search, setSearch] = useState("");

  const filteredCities = weatherCities.filter(
    (c) => c.city.includes(search) || c.country.includes(search)
  );

  return (
    <div className="min-h-screen" style={{ background: "var(--bg-base)" }}>
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 pb-12">
        <PageHeader title="날씨" subtitle="국내·해외 지역별 날씨 정보" accentColor={ACCENT} />

        <div className="grid lg:grid-cols-[260px_1fr] gap-6">
          {/* ── 왼쪽: 도시 목록 ── */}
          <div className="flex flex-col gap-3">
            <div
              className="flex items-center gap-2 rounded-xl px-3 py-2.5"
              style={{ background: "#16161F", border: "1px solid #2A2A3A" }}
            >
              <Search size={14} style={{ color: "#8B8BA7" }} />
              <input
                className="flex-1 bg-transparent text-sm text-white outline-none placeholder:text-[#8B8BA7]"
                placeholder="도시 검색"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <div className="flex flex-col gap-2">
              {filteredCities.map((city) => (
                <button
                  key={city.city}
                  onClick={() => { setSelectedCity(city); setTab("current"); }}
                  className="bento-card p-3 flex items-center gap-3 text-left transition-all hover:opacity-80"
                  style={{ borderColor: selectedCity.city === city.city ? ACCENT + "88" : "" }}
                >
                  <span className="text-2xl">{city.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-white">{city.city}</p>
                    <div className="flex items-center gap-1">
                      <MapPin size={10} style={{ color: "#8B8BA7" }} />
                      <p className="text-xs truncate" style={{ color: "#8B8BA7" }}>{city.country}</p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-lg font-black text-white">{city.temp}°</p>
                    <p className="text-xs" style={{ color: ACCENT }}>{city.condition}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* ── 오른쪽: 상세 ── */}
          <div className="flex flex-col gap-4">
            {/* 탭 */}
            <div className="flex gap-2">
              {([
                { key: "current", label: "현재 날씨", icon: <Sun size={13} /> },
                { key: "weekly",  label: "주간 예보", icon: <CalendarDays size={13} /> },
                { key: "monthly", label: "월간 기후", icon: <Calendar size={13} /> },
              ] as { key: TabKey; label: string; icon: React.ReactNode }[]).map((t) => (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold transition-colors"
                  style={{
                    background: tab === t.key ? ACCENT : "#16161F",
                    color: tab === t.key ? "#fff" : "#8B8BA7",
                    border: "1px solid",
                    borderColor: tab === t.key ? ACCENT : "#2A2A3A",
                  }}
                >
                  {t.icon}{t.label}
                </button>
              ))}
            </div>

            {tab === "current" && <CurrentWeather city={selectedCity} />}
            {tab === "weekly"  && <WeeklyForecast city={selectedCity} />}
            {tab === "monthly" && <MonthlyClimate city={selectedCity} />}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Current ─────────────────────────────────────────────────────────────────

function CurrentWeather({ city: c }: { city: WeatherData }) {
  return (
    <div className="flex flex-col gap-4">
      {/* Hero */}
      <div className="bento-card gradient-cyan p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="flex items-center gap-1.5 mb-1">
              <MapPin size={13} style={{ color: ACCENT }} />
              <span className="text-sm font-semibold" style={{ color: ACCENT }}>{c.country} · {c.region ?? c.city}</span>
            </div>
            <h2 className="text-3xl font-black text-white">{c.city}</h2>
          </div>
          <span className="text-7xl">{c.icon}</span>
        </div>
        <p className="text-6xl font-black text-white mb-1">{c.temp}°C</p>
        <p className="text-lg" style={{ color: "#8B8BA7" }}>{c.condition} · 체감 {c.feelsLike}°C</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { icon: <Droplets size={18} style={{ color: ACCENT }} />,     label: "습도",     value: c.humidity + "%" },
          { icon: <Wind size={18} style={{ color: ACCENT }} />,         label: "풍속",     value: c.wind + " m/s" },
          { icon: <Eye size={18} style={{ color: ACCENT }} />,          label: "가시거리", value: (c.visibility ?? 10) + " km" },
          { icon: <Thermometer size={18} style={{ color: ACCENT }} />,  label: "자외선 지수", value: String(c.uv ?? 5) },
        ].map((item) => (
          <div key={item.label} className="bento-card p-4 flex flex-col items-center gap-2 text-center">
            {item.icon}
            <p className="text-xs" style={{ color: "#8B8BA7" }}>{item.label}</p>
            <p className="text-lg font-black text-white">{item.value}</p>
          </div>
        ))}
      </div>

      {/* Today's hourly summary (오늘 시간대별 — 단순화) */}
      <div className="bento-card p-5">
        <p className="text-sm font-semibold mb-3 text-white">오늘 예보</p>
        <div className="grid grid-cols-4 gap-2">
          {(c.forecast[0]
            ? [
                { time: "오전", icon: "☀️", temp: c.forecast[0].low + 2 },
                { time: "낮",   icon: c.forecast[0].icon, temp: c.forecast[0].high },
                { time: "저녁", icon: "🌆", temp: c.forecast[0].high - 4 },
                { time: "밤",   icon: "🌙", temp: c.forecast[0].low },
              ]
            : []
          ).map((h) => (
            <div key={h.time} className="rounded-xl p-3 text-center" style={{ background: "rgba(6,182,212,0.06)" }}>
              <p className="text-xs mb-1" style={{ color: "#8B8BA7" }}>{h.time}</p>
              <p className="text-xl">{h.icon}</p>
              <p className="text-sm font-bold text-white mt-1">{h.temp}°</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Weekly ───────────────────────────────────────────────────────────────────

function WeeklyForecast({ city: c }: { city: WeatherData }) {
  const maxHigh = Math.max(...c.forecast.map((f) => f.high));
  const minLow  = Math.min(...c.forecast.map((f) => f.low));

  return (
    <div className="bento-card p-5 flex flex-col gap-4">
      <h2 className="text-lg font-bold text-white">7일 예보 — {c.city}</h2>
      <div className="flex flex-col gap-3">
        {c.forecast.map((f, i) => (
          <div key={f.day} className="flex items-center gap-4">
            {/* 요일 */}
            <div className="w-16 shrink-0">
              <p className="text-sm font-bold text-white">{f.day}</p>
              <p className="text-xs" style={{ color: "#8B8BA7" }}>{f.date}</p>
            </div>
            {/* 아이콘 + 상태 */}
            <div className="flex items-center gap-2 w-28 shrink-0">
              <span className="text-xl">{f.icon}</span>
              <span className="text-xs truncate" style={{ color: "#8B8BA7" }}>{f.condition}</span>
            </div>
            {/* 온도 범위 바 */}
            <div className="flex-1 flex items-center gap-2">
              <span className="text-xs font-semibold w-8 text-right" style={{ color: "#8B8BA7" }}>{f.low}°</span>
              <div className="flex-1 relative h-2 rounded-full" style={{ background: "#2A2A3A" }}>
                <div
                  className="absolute top-0 h-full rounded-full"
                  style={{
                    left: `${((f.low - minLow) / (maxHigh - minLow)) * 100}%`,
                    width: `${((f.high - f.low) / (maxHigh - minLow)) * 100}%`,
                    background: i === 0 ? `linear-gradient(90deg, ${ACCENT}, #7C3AED)` : `linear-gradient(90deg, #06B6D488, #7C3AED88)`,
                  }}
                />
              </div>
              <span className="text-xs font-semibold w-8" style={{ color: "#F1F1F5" }}>{f.high}°</span>
            </div>
            {/* 강수 확률 */}
            <div className="w-12 text-right shrink-0">
              <p className="text-xs font-semibold" style={{ color: f.rainPct >= 50 ? "#6366F1" : "#8B8BA7" }}>
                💧{f.rainPct}%
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Monthly ──────────────────────────────────────────────────────────────────

function MonthlyClimate({ city: c }: { city: WeatherData }) {
  if (!c.monthly) return <p style={{ color: "#8B8BA7" }}>월간 데이터 없음</p>;
  const maxHigh = Math.max(...c.monthly.map((m) => m.avgHigh));

  return (
    <div className="bento-card p-5 flex flex-col gap-5">
      <h2 className="text-lg font-bold text-white">월간 기후 — {c.city}</h2>

      {/* Bar chart */}
      <div>
        <p className="text-xs mb-3 font-semibold" style={{ color: "#8B8BA7" }}>평균 기온 (고온 / 저온)</p>
        <div className="flex items-end gap-1.5 h-36">
          {c.monthly.map((m) => (
            <div key={m.month} className="flex-1 flex flex-col items-center gap-1">
              {/* High bar */}
              <div className="w-full flex flex-col justify-end gap-0.5" style={{ height: "100px" }}>
                <div
                  className="w-full rounded-t"
                  style={{
                    height: `${(m.avgHigh / maxHigh) * 90}px`,
                    background: `linear-gradient(180deg, ${ACCENT}, #06B6D466)`,
                    minHeight: 4,
                  }}
                />
              </div>
              <p className="text-xs font-bold" style={{ color: "#F1F1F5" }}>{m.avgHigh}°</p>
              <p className="text-xs" style={{ color: "#8B8BA7" }}>{m.avgLow}°</p>
              <p className="text-xs" style={{ color: "#8B8BA7" }}>{m.month.replace("월", "")}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Rainy days */}
      <div>
        <p className="text-xs mb-3 font-semibold" style={{ color: "#8B8BA7" }}>월별 강수일</p>
        <div className="flex gap-1.5">
          {c.monthly.map((m) => (
            <div key={m.month} className="flex-1 flex flex-col items-center gap-1">
              <div
                className="w-full rounded"
                style={{
                  height: `${(m.rainyDays / 20) * 48}px`,
                  background: "#6366F155",
                  minHeight: 4,
                }}
              />
              <p className="text-xs" style={{ color: "#6366F1" }}>{m.rainyDays}</p>
            </div>
          ))}
        </div>
      </div>

      {/* 월별 테이블 */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr style={{ color: "#8B8BA7" }}>
              <th className="text-left py-1.5 font-semibold">월</th>
              <th className="text-right py-1.5 font-semibold">최고</th>
              <th className="text-right py-1.5 font-semibold">최저</th>
              <th className="text-right py-1.5 font-semibold">강수일</th>
            </tr>
          </thead>
          <tbody>
            {c.monthly.map((m, i) => (
              <tr key={m.month} style={{ borderTop: i > 0 ? "1px solid #2A2A3A" : "none" }}>
                <td className="py-1.5 font-semibold text-white">{m.month}</td>
                <td className="py-1.5 text-right font-semibold" style={{ color: ACCENT }}>{m.avgHigh}°</td>
                <td className="py-1.5 text-right" style={{ color: "#8B8BA7" }}>{m.avgLow}°</td>
                <td className="py-1.5 text-right" style={{ color: "#6366F1" }}>{m.rainyDays}일</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
