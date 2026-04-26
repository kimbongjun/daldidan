import { NextResponse } from "next/server";

export function POST() {
  return NextResponse.json(
    { error: "네이버 지도는 URL 직접 붙여넣기로 삽입하세요." },
    { status: 410 },
  );
}
