import { NextRequest, NextResponse } from "next/server";
import { createAdminClient, createClient } from "@/lib/supabase/server";

export const revalidate = 0;

// 기본값 (site_settings 테이블이 없거나 비어있을 때 사용)
const DEFAULTS: Record<string, string> = {
  meta_title: "달디단 — 일상의 편리함",
  meta_description: "날씨, 쇼핑, 영화, 여행, 가계부를 한 곳에서",
  meta_og_image: "",
  logo_url: "",
  custom_greeting: "",
  pwa_icon_url: "",
  pwa_splash_url: "",
};

export async function GET() {
  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("site_settings")
      .select("key, value");

    if (error) {
      // 테이블이 없으면 기본값 반환
      return NextResponse.json(DEFAULTS);
    }

    const settings = { ...DEFAULTS };
    for (const row of data ?? []) {
      settings[row.key] = row.value;
    }
    return NextResponse.json(settings);
  } catch {
    return NextResponse.json(DEFAULTS);
  }
}

export async function PATCH(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const body = await req.json() as Record<string, string>;
  const allowedKeys = Object.keys(DEFAULTS);
  const entries = Object.entries(body).filter(([k]) => allowedKeys.includes(k));

  if (!entries.length) {
    return NextResponse.json({ error: "유효한 키가 없습니다." }, { status: 400 });
  }

  const admin = createAdminClient();
  for (const [key, value] of entries) {
    await admin
      .from("site_settings")
      .upsert({ key, value }, { onConflict: "key" });
  }

  return NextResponse.json({ ok: true });
}
