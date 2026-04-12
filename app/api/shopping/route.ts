import { NextResponse } from "next/server";
import { getShoppingDeals } from "@/lib/data/shopping";

export async function GET() {
  const snapshot = await getShoppingDeals();
  return NextResponse.json(snapshot);
}
