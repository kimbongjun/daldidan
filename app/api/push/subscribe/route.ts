import { NextRequest, NextResponse } from "next/server";
import { createAdminClient, createClient } from "@/lib/supabase/server";

/** POST /api/push/subscribe — FCM 토큰 등록 */
export async function POST(request: NextRequest) {
  const body = await request.json() as { token?: string; deviceType?: string };
  const token = body.token?.trim();

  if (!token) {
    return NextResponse.json({ error: "토큰이 없습니다." }, { status: 400 });
  }

  const deviceType = (body.deviceType ?? "web") as "web" | "ios" | "android";
  const userAgent = (request.headers.get("user-agent") ?? "").slice(0, 500);

  // 로그인 여부와 무관하게 구독 가능 — user_id는 선택
  let userId: string | null = null;
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    userId = user?.id ?? null;
  } catch {
    // 비로그인 상태이면 null 유지
  }

  const admin = createAdminClient();
  const { error } = await admin.from("push_subscriptions").upsert(
    {
      fcm_token: token,
      user_id: userId,
      device_type: deviceType,
      user_agent: userAgent,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "fcm_token" },
  );

  if (error) {
    console.error("[push/subscribe] DB error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true }, { status: 200 });
}

/** DELETE /api/push/subscribe — FCM 토큰 삭제 (구독 해지) */
export async function DELETE(request: NextRequest) {
  const body = await request.json() as { token?: string };
  const token = body.token?.trim();

  if (!token) {
    return NextResponse.json({ error: "토큰이 없습니다." }, { status: 400 });
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("push_subscriptions")
    .delete()
    .eq("fcm_token", token);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true }, { status: 200 });
}
