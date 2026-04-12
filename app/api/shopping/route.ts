import { NextResponse } from "next/server";
import { getShoppingDeals } from "@/lib/data/shopping";

export const revalidate = 1800; // 30분 캐시

export async function GET() {
  const snapshot = await getShoppingDeals();
  return NextResponse.json(snapshot);
}
