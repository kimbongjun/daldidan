import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { sendPushToUserIds } from "@/lib/push-notification";

export const runtime = "nodejs";

/**
 * POST /api/calendar/remind
 * reminder_minutes 설정된 일정에 대한 푸시 알림 발송.
 * Vercel Cron 또는 외부 스케줄러에서 15분마다 호출.
 * Authorization: Bearer {CRON_SECRET} 헤더로 보호.
 *
 * 로직: (start_date + start_time) - reminder_minutes분 이 현재 시각 기준 ±5분 이내인 이벤트에 발송
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

  // 현재 KST 시각
  const nowUtc = new Date();
  const kstOffset = 9 * 60 * 60 * 1000;
  const nowKst = new Date(nowUtc.getTime() + kstOffset);

  // 앞으로 15분 + 뒤로 5분 범위의 일정을 조회 (최대 reminder_minutes = 720분 = 12시간)
  // 실제 필터링은 JS에서 수행 (reminder_minutes 값이 각기 다르므로)
  // 오늘 + 내일 범위 이벤트 조회 (12시간 전 알림 대응)
  const todayKst = nowKst.toISOString().slice(0, 10);
  const tomorrowKst = new Date(nowKst.getTime() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  const { data: events, error } = await admin
    .from("calendar_events")
    .select("id, user_id, title, event_type, start_date, start_time, location, reminder_minutes")
    .not("reminder_minutes", "is", null)
    .eq("remind_sent", false)
    .gte("start_date", todayKst)
    .lte("start_date", tomorrowKst);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!events || events.length === 0) {
    return NextResponse.json({ sent: 0, message: "알림 대상 일정 없음" });
  }

  const typeLabel: Record<string, string> = {
    schedule: "일정",
    appointment: "약속",
    anniversary: "기념일",
  };

  const reminderLabel: Record<number, string> = {
    15: "15분",
    30: "30분",
    60: "1시간",
    720: "12시간",
  };

  const nowUtcMs = nowUtc.getTime();
  const WINDOW_MS = 5 * 60 * 1000; // ±5분 허용 오차

  let totalSent = 0;
  const sentIds: string[] = [];

  for (const event of events) {
    if (!event.user_id || !event.reminder_minutes) continue;

    // 이벤트 시작 시각을 KST ms로 계산
    const timeStr = event.start_time
      ? String(event.start_time).slice(0, 5)
      : "00:00";
    const [hours, minutes] = timeStr.split(":").map(Number);
    const [year, month, day] = String(event.start_date).split("-").map(Number);

    // KST → UTC 변환: Date.UTC에 hours-9 적용하여 UTC epoch 획득
    const eventUtcMs = Date.UTC(year, month - 1, day, hours - 9, minutes);
    // 알림 발송 예정 시각 (이벤트 시작 UTC - reminder_minutes분)
    const alertUtcMs = eventUtcMs - (event.reminder_minutes as number) * 60 * 1000;

    // 현재 UTC와 알림 예정 UTC 비교 (±5분 이내)
    if (Math.abs(nowUtcMs - alertUtcMs) > WINDOW_MS) continue;

    const label = typeLabel[event.event_type as string] ?? "일정";
    const beforeLabel = reminderLabel[event.reminder_minutes as number] ?? `${event.reminder_minutes}분`;
    const locationStr = event.location ? ` · ${event.location}` : "";
    const body = `${event.start_date} ${timeStr}${locationStr}`;

    const result = await sendPushToUserIds([event.user_id as string], {
      title: `🔔 [${beforeLabel} 전] ${label}: ${event.title}`,
      body,
      url: "/",
    }, "all");

    totalSent += result.sent;
    if (result.sent > 0 || result.failed === 0) {
      sentIds.push(event.id as string);
    }
  }

  if (sentIds.length > 0) {
    await admin
      .from("calendar_events")
      .update({ remind_sent: true })
      .in("id", sentIds);
  }

  return NextResponse.json({ sent: totalSent, eventsProcessed: events.length });
}
