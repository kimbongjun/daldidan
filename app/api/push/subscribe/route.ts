import { NextRequest, NextResponse } from "next/server";
import { createAdminClient, createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

/** POST /api/push/subscribe — FCM 토큰 등록 */
export async function POST(request: NextRequest) {
  const body = await request.json() as { token?: string; deviceType?: string; installationId?: string };
  const token = body.token?.trim();

  if (!token) {
    return NextResponse.json({ error: "토큰이 없습니다." }, { status: 400 });
  }

  const deviceType = (body.deviceType ?? "web") as "web" | "ios" | "android";
  const userAgent = (request.headers.get("user-agent") ?? "").slice(0, 500);
  const installationId = body.installationId?.trim().slice(0, 120) ?? "";
  const installationTag = installationId ? ` [iid:${installationId}]` : "";
  const storedUserAgent = `${userAgent}${installationTag}`.slice(0, 500);

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

  if (installationId) {
    const { data: existingSubscriptions } = await admin
      .from("push_subscriptions")
      .select("fcm_token, user_agent")
      .like("user_agent", `%[iid:${installationId}]%`);

    const staleTokens = (existingSubscriptions ?? [])
      .filter((item) => item.fcm_token !== token)
      .map((item) => item.fcm_token);

    if (staleTokens.length > 0) {
      await admin
        .from("push_subscriptions")
        .delete()
        .in("fcm_token", staleTokens);
    }
  }

  const { error } = await admin.from("push_subscriptions").upsert(
    {
      fcm_token: token,
      user_id: userId,
      device_type: deviceType,
      user_agent: storedUserAgent,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "fcm_token" },
  );

  if (error) {
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
