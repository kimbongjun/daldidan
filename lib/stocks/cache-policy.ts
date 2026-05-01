const KRX_TIME_ZONE = "Asia/Seoul";
const MARKET_OPEN_MINUTES = 9 * 60;
const MARKET_CLOSE_MINUTES = 15 * 60 + 30;
const HALF_HOUR_MINUTES = 30;
const DAY_MS = 24 * 60 * 60 * 1000;

type KstParts = {
  year: number;
  month: number;
  day: number;
  weekday: string;
  hour: number;
  minute: number;
};

export type KrxMarketWindow = {
  open: boolean;
  label: "장중" | "마감";
  dateKey: string;
  bucketKey: string | null;
  mostRecentTradingDay: string;
  nextRefreshAt: string;
  nextRefreshInMs: number;
  cacheTtlMs: number;
  cacheTtlSeconds: number;
};

function getKstParts(now: Date): KstParts {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: KRX_TIME_ZONE,
    weekday: "short",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(now);

  const read = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? "";

  return {
    year: Number(read("year")),
    month: Number(read("month")),
    day: Number(read("day")),
    weekday: read("weekday"),
    hour: Number(read("hour")),
    minute: Number(read("minute")),
  };
}

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

function formatDateKey(parts: Pick<KstParts, "year" | "month" | "day">): string {
  return `${parts.year}-${pad(parts.month)}-${pad(parts.day)}`;
}

function makeKstDate(dateKey: string, hour: number, minute: number): Date {
  return new Date(`${dateKey}T${pad(hour)}:${pad(minute)}:00+09:00`);
}

function weekdayFromDate(date: Date): string {
  return new Intl.DateTimeFormat("en-US", { timeZone: KRX_TIME_ZONE, weekday: "short" }).format(date);
}

function isTradingWeekday(weekday: string): boolean {
  return weekday !== "Sat" && weekday !== "Sun";
}

function isTradingDate(date: Date): boolean {
  return isTradingWeekday(weekdayFromDate(date));
}

function formatKstDate(date: Date): string {
  const parts = getKstParts(date);
  return formatDateKey(parts);
}

function getPreviousTradingDay(now: Date): string {
  let cursor = new Date(now.getTime() - DAY_MS);
  while (!isTradingDate(cursor)) cursor = new Date(cursor.getTime() - DAY_MS);
  return formatKstDate(cursor);
}

function getMostRecentTradingDay(now: Date, open: boolean, totalMinutes: number, dateKey: string): string {
  const weekday = weekdayFromDate(now);
  if (open || (isTradingWeekday(weekday) && totalMinutes >= MARKET_OPEN_MINUTES)) return dateKey;
  return getPreviousTradingDay(now);
}

function getNextTradingOpen(now: Date, dateKey: string, totalMinutes: number): Date {
  const weekday = weekdayFromDate(now);
  if (isTradingWeekday(weekday) && totalMinutes < MARKET_OPEN_MINUTES) {
    return makeKstDate(dateKey, 9, 0);
  }

  let cursor = makeKstDate(dateKey, 9, 0);
  do {
    cursor = new Date(cursor.getTime() + DAY_MS);
  } while (!isTradingDate(cursor));
  return cursor;
}

export function getKrxMarketWindow(now = new Date()): KrxMarketWindow {
  const parts = getKstParts(now);
  const dateKey = formatDateKey(parts);
  const totalMinutes = parts.hour * 60 + parts.minute;
  const weekdayOpen = isTradingWeekday(parts.weekday);
  const open = weekdayOpen && totalMinutes >= MARKET_OPEN_MINUTES && totalMinutes < MARKET_CLOSE_MINUTES;

  const nextRefreshDate = open
    ? (() => {
        const offset = totalMinutes - MARKET_OPEN_MINUTES;
        const bucketStartMinutes = MARKET_OPEN_MINUTES + Math.floor(offset / HALF_HOUR_MINUTES) * HALF_HOUR_MINUTES;
        const bucketEndMinutes = Math.min(bucketStartMinutes + HALF_HOUR_MINUTES, MARKET_CLOSE_MINUTES);
        return makeKstDate(dateKey, Math.floor(bucketEndMinutes / 60), bucketEndMinutes % 60);
      })()
    : getNextTradingOpen(now, dateKey, totalMinutes);

  const bucketKey = open
    ? (() => {
        const offset = totalMinutes - MARKET_OPEN_MINUTES;
        const bucketStartMinutes = MARKET_OPEN_MINUTES + Math.floor(offset / HALF_HOUR_MINUTES) * HALF_HOUR_MINUTES;
        return `${dateKey}:${bucketStartMinutes}`;
      })()
    : null;

  const nextRefreshInMs = Math.max(nextRefreshDate.getTime() - now.getTime(), 1_000);
  const cacheTtlMs = nextRefreshInMs;

  return {
    open,
    label: open ? "장중" : "마감",
    dateKey,
    bucketKey,
    mostRecentTradingDay: getMostRecentTradingDay(now, open, totalMinutes, dateKey),
    nextRefreshAt: nextRefreshDate.toISOString(),
    nextRefreshInMs,
    cacheTtlMs,
    cacheTtlSeconds: Math.max(Math.ceil(cacheTtlMs / 1_000), 1),
  };
}
