"use client";
import { useAppStore } from "@/store/useAppStore";
import { TrendingUp, TrendingDown } from "lucide-react";

export default function QuickStats() {
  const stocks = useAppStore((s) => s.stocks);
  const weather = useAppStore((s) => s.weather);
  const transactions = useAppStore((s) => s.transactions);

  const kospi = stocks.find((s) => s.symbol === "005930");
  const nasdaq = stocks.find((s) => s.symbol === "AAPL");
  const monthExpense = transactions
    .filter((t) => t.type === "expense" && t.date.startsWith("2026-04"))
    .reduce((a, t) => a + t.amount, 0);

  const stats = [
    {
      label: "삼성전자",
      value: kospi ? kospi.price.toLocaleString() + "원" : "-",
      sub: kospi ? `${kospi.changePct > 0 ? "+" : ""}${kospi.changePct.toFixed(2)}%` : "",
      color: kospi && kospi.changePct >= 0 ? "#10B981" : "#F43F5E",
      up: kospi ? kospi.changePct >= 0 : true,
    },
    {
      label: "Apple",
      value: nasdaq ? "$" + nasdaq.price.toFixed(2) : "-",
      sub: nasdaq ? `${nasdaq.changePct > 0 ? "+" : ""}${nasdaq.changePct.toFixed(2)}%` : "",
      color: nasdaq && nasdaq.changePct >= 0 ? "#10B981" : "#F43F5E",
      up: nasdaq ? nasdaq.changePct >= 0 : true,
    },
    {
      label: "서울 날씨",
      value: weather ? `${weather.temp}° ${weather.icon}` : "-",
      sub: weather ? weather.condition : "",
      color: "#06B6D4",
      up: true,
    },
    {
      label: "4월 지출",
      value: (monthExpense / 10000).toFixed(0) + "만원",
      sub: "이번 달",
      color: "#F59E0B",
      up: false,
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-2">
      {stats.map((s) => (
        <div key={s.label} className="bento-card p-4 flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
            style={{ background: s.color + "22" }}
          >
            {s.up
              ? <TrendingUp size={14} style={{ color: s.color }} />
              : <TrendingDown size={14} style={{ color: s.color }} />
            }
          </div>
          <div>
            <p className="text-xs" style={{ color: "#8B8BA7" }}>{s.label}</p>
            <p className="text-sm font-bold text-white leading-tight">{s.value}</p>
            {s.sub && <p className="text-xs font-semibold" style={{ color: s.color }}>{s.sub}</p>}
          </div>
        </div>
      ))}
    </div>
  );
}
