/** 주식 관련 순수 유틸리티 — 서버/클라이언트 양쪽에서 사용 가능 */

export function sanitizeSymbol(value: string): string | null {
  const symbol = value.trim().toUpperCase();
  return /^Q?\d{6}$/.test(symbol) || /^[A-Z0-9]{6}$/.test(symbol) ? symbol : null;
}

export function sanitizeIndexSymbol(value: string): string | null {
  const sym = value.trim().toUpperCase();
  return /^IDX_\d+$/.test(sym) ? sym : null;
}

export function formatPrice(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return "-";
  return value.toLocaleString();
}

export function formatVolume(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return "-";
  if (value >= 100_000_000) return `${(value / 100_000_000).toFixed(1)}억주`;
  if (value >= 10_000) return `${Math.round(value / 10_000).toLocaleString()}만주`;
  return `${value.toLocaleString()}주`;
}

export function formatTradingValue(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return "-";
  if (value >= 1_000_000_000_000) return `${(value / 1_000_000_000_000).toFixed(1)}조`;
  if (value >= 100_000_000) return `${Math.round(value / 100_000_000).toLocaleString()}억`;
  return `${Math.round(value / 10_000).toLocaleString()}만`;
}

export function changeColor(rise: string, fall: string, neutral: string, value: number): string {
  if (value > 0) return rise;
  if (value < 0) return fall;
  return neutral;
}
