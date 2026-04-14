import { NextResponse } from "next/server";
import type { BangkokExchangeRate } from "@/lib/data/bangkok";

export const revalidate = 3600; // 1시간 캐시

const FALLBACK: BangkokExchangeRate = {
  krwThb: 0.026,
  krwUsd: 0.00073,
  date: new Date().toISOString().slice(0, 10),
  source: "fallback",
};

export async function GET() {
  try {
    const res = await fetch(
      "https://api.frankfurter.app/latest?from=KRW&to=THB,USD",
      { next: { revalidate: 3600 } }
    );

    if (!res.ok) {
      return NextResponse.json(FALLBACK);
    }

    const json = await res.json();
    const rates = json?.rates as Record<string, number> | undefined;

    if (!rates?.THB || !rates?.USD) {
      return NextResponse.json(FALLBACK);
    }

    const data: BangkokExchangeRate = {
      krwThb: rates.THB,
      krwUsd: rates.USD,
      date: json.date ?? new Date().toISOString().slice(0, 10),
      source: "live",
    };

    return NextResponse.json(data);
  } catch {
    return NextResponse.json(FALLBACK);
  }
}
