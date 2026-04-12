export function formatMoney(value: number, currency: string) {
  if (currency === "KRW") {
    return `${Math.round(value).toLocaleString()}원`;
  }

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency || "USD",
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatLargeWon(value: number) {
  return `${(value / 10000).toFixed(0)}만원`;
}

export function formatNumber(value?: number) {
  if (typeof value !== "number" || Number.isNaN(value)) return "-";
  return value.toLocaleString();
}

export function typeLabel(type: "movie" | "concert" | "exhibition") {
  if (type === "movie") return "영화";
  if (type === "concert") return "공연";
  return "전시";
}
