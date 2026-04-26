// 지도 삽입 기능이 제거되어 이 엔드포인트는 더 이상 사용되지 않습니다.
import { NextResponse } from "next/server";

export function POST() {
  return NextResponse.json({ error: "이 기능은 사용 중단되었습니다." }, { status: 410 });
}
