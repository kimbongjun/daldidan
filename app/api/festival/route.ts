import { NextResponse } from "next/server";
import { getFestivalItems } from "@/lib/data/festival";

export const revalidate = 3600;

export async function GET() {
  const data = await getFestivalItems();
  return NextResponse.json(data);
}
