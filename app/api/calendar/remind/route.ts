import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { sendPushToAllSubscribers } from "@/lib/push-notification";

export const runtime = "nodejs";

/**
 * POST /api/calendar/remind
 * 내일 일정(D-1)에 대한 푸시 알림 발송.
 * Vercel Cron 또는 외부 스케줄러에서 매일 오전 9시 호출.
 * Authorization: Bearer {CRON_SECRET} 헤더로 보호.
 */
export async function POST(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const admin = createAdminClient();

  // 내일 날짜 계산 (KST 기준)
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().slice(0, 10);

  // 내일 시작하는 일정 조회 (remind_sent = false)
  const { data: events, error } = await admin
    .from("calendar_events")
    .select("id, title, event_type, start_date, start_time, location, description")
    .eq("start_date", tomorrowStr)
    .eq("remind_sent", false);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!events || events.length === 0) {
    return NextResponse.json({ sent: 0, message: "내일 일정 없음" });
  }

  const typeLabel: Record<string, string> = {
    schedule: "일정",
    appointment: "약속",
    anniversary: "기념일",
  };

  let totalSent = 0;
  const sentIds: string[] = [];

  for (const event of events) {
    const label = typeLabel[event.event_type as string] ?? "일정";
    const timeStr = event.start_time ? ` ${String(event.start_time).slice(0, 5)}` : "";
    const locationStr = event.location ? ` · ${event.location}` : "";
    const body = `내일${timeStr}${locationStr}`;

    const result = await sendPushToAllSubscribers({
      title: `📅 [D-1] ${label}: ${event.title}`,
      body,
      url: "/",
    });

    totalSent += result.sent;
    if (result.sent > 0 || result.failed === 0) {
      sentIds.push(event.id as string);
    }
  }

  // remind_sent 플래그 업데이트
  if (sentIds.length > 0) {
    await admin
      .from("calendar_events")
      .update({ remind_sent: true })
      .in("id", sentIds);
  }

  return NextResponse.json({ sent: totalSent, eventsProcessed: events.length });
}
