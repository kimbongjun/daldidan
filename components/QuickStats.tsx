"use client";

import { TrendingDown, TrendingUp } from "lucide-react";
import { MarketQuote } from "@/lib/data/types";
import { formatLargeWon, formatMoney } from "@/lib/data/format";
import { Transaction, WeatherData } from "@/store/useAppStore";

export default function QuickStats({
  stocks,
  weather,
  transactions,
}: {
  stocks: MarketQuote[];
  weather: WeatherData | null;
  transactions: Transaction[];
}) {
  const samsung = stocks.find((item) => item.symbol === "005930.KS");
  const apple = stocks.find((item) => item.symbol === "AAPL");
  const monthExpense = transactions
    .filter((item) => item.type === "expense" && item.date.startsWith("2026-04"))
    .reduce((sum, item) => sum + item.amount, 0);

  const stats = [
    {
      label: "삼성전자",
      value: samsung ? formatMoney(samsung.price, samsung.currency) : "-",
      sub: samsung ? `${samsung.changePct >= 0 ? "+" : ""}${samsung.changePct.toFixed(2)}%` : "",
      color: samsung && samsung.changePct >= 0 ? "#10B981" : "#F43F5E",
      up: samsung ? samsung.changePct >= 0 : true,
    },
    {
      label: "Apple",
      value: apple ? formatMoney(apple.price, apple.currency) : "-",
      sub: apple ? `${apple.changePct >= 0 ? "+" : ""}${apple.changePct.toFixed(2)}%` : "",
      color: apple && apple.changePct >= 0 ? "#10B981" : "#F43F5E",
      up: apple ? apple.changePct >= 0 : true,
    },
    {
      label: "서울 날씨",
      value: weather ? `${weather.temp}° ${weather.icon}` : "-",
      sub: weather?.condition ?? "",
      color: "#06B6D4",
      up: true,
    },
    {
      label: "4월 지출",
      value: formatLargeWon(monthExpense),
      sub: "이번 달",
      color: "#F59E0B",
      up: false,
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 mb-2 xl:grid-cols-4">
      {stats.map((item) => (
        <div key={item.label} className="bento-card p-4 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: item.color + "22" }}>
            {item.up ? <TrendingUp size={14} style={{ color: item.color }} /> : <TrendingDown size={14} style={{ color: item.color }} />}
          </div>
          <div>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>{item.label}</p>
            <p className="text-sm font-bold leading-tight" style={{ color: "var(--text-primary)" }}>{item.value}</p>
            {item.sub ? <p className="text-xs font-semibold" style={{ color: item.color }}>{item.sub}</p> : null}
          </div>
        </div>
      ))}
    </div>
  );
}
