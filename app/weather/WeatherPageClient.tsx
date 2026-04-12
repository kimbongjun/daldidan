"use client";
import { useState } from "react";
import { LiveWeather } from "@/lib/weather";
import PageHeader from "@/components/PageHeader";
import { MapPin, Droplets, Wind, Eye, Thermometer, Search, Sun, CalendarDays, Calendar, RefreshCw } from "lucide-react";

const ACCENT = "#06B6D4";
type TabKey = "current" | "weekly" | "monthly";

export default function WeatherPageClient({ weathers }: { weathers: LiveWeather[] }) {
  const [selected, setSelected] = useState<LiveWeather>(weathers[0]);
  const [tab, setTab] = useState<TabKey>("current");
  const [search, setSearch] = useState("");

  const filtered = weathers.filter(
    (c) => c.city.includes(search) || c.country.includes(search)
  );

  return (
    <div className="min-h-screen" style={{ background: "var(--bg-base)" }}>
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 pb-12">
        <PageHeader title="날씨" subtitle="Open-Meteo 실시간 날씨 데이터" accentColor={ACCENT} />

        <div className="grid lg:grid-cols-[260px_1fr] gap-6">
          {/* ── 도시 목록 ── */}
          <div className="flex flex-col gap-3">
            <div
              className="flex items-center gap-2 rounded-xl px-3 py-2.5"
              style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
            >
              <Search size={14} style={{ color: "var(--text-muted)" }} />
              <input
                className="flex-1 bg-transparent text-sm outline-none"
                style={{ color: "var(--text-primary)" }}
                placeholder="도시 검색"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            {filtered.map((city) => (
              <button
                key={city.city}
                onClick={() => { setSelected(city); setTab("current"); }}
                className="bento-card p-3 flex items-center gap-3 text-left transition-all hover:opacity-80"
                style={{ borderColor: selected.city === city.city ? ACCENT + "88" : undefined }}
              >
                <span className="text-2xl">{city.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>{city.city}</p>
                  <div className="flex items-center gap-1">
                    <MapPin size={10} style={{ color: "var(--text-muted)" }} />
                    <p className="text-xs truncate" style={{ color: "var(--text-muted)" }}>{city.country}</p>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-lg font-black" style={{ color: "var(--text-primary)" }}>{city.temp}°</p>
                  <p className="text-xs" style={{ color: ACCENT }}>{city.condition}</p>
                </div>
              </button>
            ))}

            {/* 데이터 출처 */}
            <p className="text-xs text-center mt-1" style={{ color: "var(--text-muted)" }}>
              📡 Open-Meteo · 30분마다 갱신
            </p>
          </div>

          {/* ── 상세 ── */}
          <div className="flex flex-col gap-4">
            {/* 탭 */}
            <div className="flex gap-2 flex-wrap">
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
                    background: tab === t.key ? ACCENT : "var(--bg-card)",
                    color: tab === t.key ? "#fff" : "var(--text-muted)",
                    border: "1px solid",
                    borderColor: tab === t.key ? ACCENT : "var(--border)",
                  }}
                >
                  {t.icon}{t.label}
                </button>
              ))}

              {selected.fetchedAt > 0 && (
                <div className="flex items-center gap-1 ml-auto" style={{ color: "var(--text-muted)" }}>
                  <RefreshCw size={11} />
                  <span className="text-xs">
                    {new Date(selected.fetchedAt).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })} 기준
                  </span>
                </div>
              )}
            </div>

            {tab === "current" && <CurrentWeather city={selected} />}
            {tab === "weekly"  && <WeeklyForecast city={selected} />}
            {tab === "monthly" && <MonthlyClimate city={selected} />}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Current ─────────────────────────────────────────────────────────────────

function CurrentWeather({ city: c }: { city: LiveWeather }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="bento-card gradient-cyan p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="flex items-center gap-1.5 mb-1">
              <MapPin size={13} style={{ color: ACCENT }} />
              <span className="text-sm font-semibold" style={{ color: ACCENT }}>{c.country}</span>
            </div>
            <h2 className="text-3xl font-black" style={{ color: "var(--text-primary)" }}>{c.city}</h2>
          </div>
          <span className="text-7xl">{c.icon}</span>
        </div>
        <p className="text-6xl font-black mb-1" style={{ color: "var(--text-primary)" }}>{c.temp}°C</p>
        <p className="text-lg" style={{ color: "var(--text-muted)" }}>{c.condition} · 체감 {c.feelsLike}°C</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { icon: <Droplets size={18} style={{ color: ACCENT }} />,    label: "습도",      value: c.humidity + "%" },
          { icon: <Wind size={18} style={{ color: ACCENT }} />,        label: "풍속",      value: c.wind + " m/s" },
          { icon: <Eye size={18} style={{ color: ACCENT }} />,         label: "가시거리",  value: c.visibility + " km" },
          { icon: <Thermometer size={18} style={{ color: ACCENT }} />, label: "자외선 지수", value: String(c.uv) },
        ].map((item) => (
          <div key={item.label} className="bento-card p-4 flex flex-col items-center gap-2 text-center">
            {item.icon}
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>{item.label}</p>
            <p className="text-lg font-black" style={{ color: "var(--text-primary)" }}>{item.value}</p>
          </div>
        ))}
      </div>

      {c.forecast[0] && (
        <div className="bento-card p-5">
          <p className="text-sm font-semibold mb-3" style={{ color: "var(--text-primary)" }}>오늘 예보</p>
          <div className="grid grid-cols-4 gap-2">
            {[
              { time: "오전", icon: "🌅", temp: c.forecast[0].low + 2 },
              { time: "낮",   icon: c.forecast[0].icon, temp: c.forecast[0].high },
              { time: "저녁", icon: "🌆", temp: c.forecast[0].high - 4 },
              { time: "밤",   icon: "🌙", temp: c.forecast[0].low },
            ].map((h) => (
              <div key={h.time} className="rounded-xl p-3 text-center" style={{ background: "rgba(6,182,212,0.06)" }}>
                <p className="text-xs mb-1" style={{ color: "var(--text-muted)" }}>{h.time}</p>
                <p className="text-xl">{h.icon}</p>
                <p className="text-sm font-bold mt-1" style={{ color: "var(--text-primary)" }}>{h.temp}°</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Weekly ───────────────────────────────────────────────────────────────────

function WeeklyForecast({ city: c }: { city: LiveWeather }) {
  if (!c.forecast.length) return <p style={{ color: "var(--text-muted)" }}>예보 데이터 없음</p>;
  const maxHigh = Math.max(...c.forecast.map((f) => f.high));
  const minLow  = Math.min(...c.forecast.map((f) => f.low));

  return (
    <div className="bento-card p-5 flex flex-col gap-4">
      <h2 className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>7일 예보 — {c.city}</h2>
      <div className="flex flex-col gap-3">
        {c.forecast.map((f) => (
          <div key={f.day} className="flex items-center gap-4">
            <div className="w-16 shrink-0">
              <p className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>{f.day}</p>
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>{f.date}</p>
            </div>
            <div className="flex items-center gap-2 w-28 shrink-0">
              <span className="text-xl">{f.icon}</span>
              <span className="text-xs truncate" style={{ color: "var(--text-muted)" }}>{f.condition}</span>
            </div>
            <div className="flex-1 flex items-center gap-2 min-w-0">
              <span className="text-xs font-semibold w-8 text-right shrink-0" style={{ color: "var(--text-muted)" }}>{f.low}°</span>
              <div className="flex-1 relative h-2 rounded-full" style={{ background: "var(--border)" }}>
                <div
                  className="absolute top-0 h-full rounded-full"
                  style={{
                    left: `${((f.low - minLow) / Math.max(maxHigh - minLow, 1)) * 100}%`,
                    width: `${((f.high - f.low) / Math.max(maxHigh - minLow, 1)) * 100}%`,
                    background: `linear-gradient(90deg, ${ACCENT}, #7C3AED)`,
                    minWidth: 4,
                  }}
                />
              </div>
              <span className="text-xs font-semibold w-8 shrink-0" style={{ color: "var(--text-primary)" }}>{f.high}°</span>
            </div>
            <div className="w-12 text-right shrink-0">
              <p className="text-xs font-semibold" style={{ color: f.rainPct >= 50 ? "#6366F1" : "var(--text-muted)" }}>
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

function MonthlyClimate({ city: c }: { city: LiveWeather }) {
  if (!c.monthly?.length) return <p style={{ color: "var(--text-muted)" }}>월간 데이터 없음</p>;
  const maxHigh = Math.max(...c.monthly.map((m) => m.avgHigh));

  return (
    <div className="bento-card p-5 flex flex-col gap-5">
      <h2 className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>월간 기후 — {c.city}</h2>

      <div>
        <p className="text-xs mb-3 font-semibold" style={{ color: "var(--text-muted)" }}>평균 기온 (고온 / 저온)</p>
        <div className="flex items-end gap-1.5 h-36">
          {c.monthly.map((m) => (
            <div key={m.month} className="flex-1 flex flex-col items-center gap-1">
              <div className="w-full flex flex-col justify-end gap-0.5" style={{ height: "100px" }}>
                <div
                  className="w-full rounded-t"
                  style={{ height: `${(m.avgHigh / maxHigh) * 90}px`, background: `linear-gradient(180deg, ${ACCENT}, ${ACCENT}44)`, minHeight: 4 }}
                />
              </div>
              <p className="text-xs font-bold" style={{ color: "var(--text-primary)" }}>{m.avgHigh}°</p>
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>{m.avgLow}°</p>
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>{m.month.replace("월", "")}</p>
            </div>
          ))}
        </div>
      </div>

      <div>
        <p className="text-xs mb-3 font-semibold" style={{ color: "var(--text-muted)" }}>월별 강수일</p>
        <div className="flex gap-1.5">
          {c.monthly.map((m) => (
            <div key={m.month} className="flex-1 flex flex-col items-center gap-1">
              <div className="w-full rounded" style={{ height: `${(m.rainyDays / 20) * 48}px`, background: "#6366F144", minHeight: 4 }} />
              <p className="text-xs" style={{ color: "#6366F1" }}>{m.rainyDays}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr style={{ color: "var(--text-muted)" }}>
              <th className="text-left py-1.5 font-semibold">월</th>
              <th className="text-right py-1.5 font-semibold">최고</th>
              <th className="text-right py-1.5 font-semibold">최저</th>
              <th className="text-right py-1.5 font-semibold">강수일</th>
            </tr>
          </thead>
          <tbody>
            {c.monthly.map((m, i) => (
              <tr key={m.month} style={{ borderTop: i > 0 ? "1px solid var(--border)" : "none" }}>
                <td className="py-1.5 font-semibold" style={{ color: "var(--text-primary)" }}>{m.month}</td>
                <td className="py-1.5 text-right font-semibold" style={{ color: ACCENT }}>{m.avgHigh}°</td>
                <td className="py-1.5 text-right" style={{ color: "var(--text-muted)" }}>{m.avgLow}°</td>
                <td className="py-1.5 text-right" style={{ color: "#6366F1" }}>{m.rainyDays}일</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
