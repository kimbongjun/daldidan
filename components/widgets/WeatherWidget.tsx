"use client";
import { useAppStore } from "@/store/useAppStore";
import { Droplets, Wind, Thermometer } from "lucide-react";

export default function WeatherWidget() {
  const w = useAppStore((s) => s.weather);
  if (!w) return null;

  return (
    <div className="bento-card gradient-cyan h-full flex flex-col p-5 gap-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: "#06B6D4" }}>날씨</p>
          <h2 className="text-lg font-bold text-white">{w.city}</h2>
        </div>
        <span className="tag" style={{ background: "#06B6D422", color: "#06B6D4" }}>오늘</span>
      </div>

      {/* Main temp */}
      <div className="flex items-center gap-4">
        <span className="text-6xl">{w.icon}</span>
        <div>
          <p className="text-5xl font-black text-white leading-none">{w.temp}°</p>
          <p className="text-sm mt-1" style={{ color: "#8B8BA7" }}>{w.condition}</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { icon: <Thermometer size={14} />, label: "체감", value: `${w.feelsLike}°` },
          { icon: <Droplets size={14} />, label: "습도", value: `${w.humidity}%` },
          { icon: <Wind size={14} />, label: "바람", value: `${w.wind}m/s` },
        ].map((item) => (
          <div key={item.label} className="rounded-xl p-2.5 text-center" style={{ background: "rgba(6,182,212,0.08)" }}>
            <div className="flex justify-center mb-1" style={{ color: "#06B6D4" }}>{item.icon}</div>
            <p className="text-xs" style={{ color: "#8B8BA7" }}>{item.label}</p>
            <p className="text-sm font-bold text-white">{item.value}</p>
          </div>
        ))}
      </div>

      {/* Forecast */}
      <div className="flex gap-2 mt-auto">
        {w.forecast.map((f) => (
          <div key={f.day} className="flex-1 rounded-xl p-2 text-center" style={{ background: "rgba(255,255,255,0.03)" }}>
            <p className="text-xs mb-1" style={{ color: "#8B8BA7" }}>{f.day}</p>
            <p className="text-xl">{f.icon}</p>
            <p className="text-xs font-semibold text-white">{f.high}°</p>
            <p className="text-xs" style={{ color: "#8B8BA7" }}>{f.low}°</p>
          </div>
        ))}
      </div>
    </div>
  );
}
