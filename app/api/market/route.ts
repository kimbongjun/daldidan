import { NextResponse } from "next/server";
import { getMarketSnapshot } from "@/lib/data/market";

export async function GET() {
  const snapshot = await getMarketSnapshot();
  return NextResponse.json(snapshot);
}
