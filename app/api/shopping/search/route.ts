import { NextRequest, NextResponse } from "next/server";
import { searchShopping } from "@/lib/data/shopping";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const keyword = searchParams.get("q")?.trim();

  if (!keyword) {
    return NextResponse.json({ error: "검색어를 입력해 주세요." }, { status: 400 });
  }

  const result = await searchShopping(keyword);
  return NextResponse.json(result);
}
