import { NextResponse } from "next/server";
import { getCultureItems } from "@/lib/data/culture";

export async function GET() {
  const snapshot = await getCultureItems();
  return NextResponse.json(snapshot);
}
