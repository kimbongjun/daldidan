import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { sendPushToUserIds } from "@/lib/push-notification";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * GET·POST /api/calendar/remind
 * reminder_minutes 설정된 일정에 대한 푸시 알림 발송.
 *
 * Vercel Cron은 항상 GET으로 호출한다 — 과거 POST만 export해 매일 405로
 * 실패했으므로 GET을 크론 진입점으로 두고 POST는 수동 실행용으로 유지한다.
 * Authorization: Bearer {CRON_SECRET} 헤더로 보호.
 *
 * 발송 창: 현재 크론이 하루 1회(vercel.json `0 9 * * *` = KST 18:00)라서
 * 원래 설계(15분 주기, ±5분 창)로는 알림이 거의 발송되지 않는다.
 * 따라서 "알림 예정 시각이 지금부터 24시간 이내(또는 5분 이내 과거)"인 일정을
 * 하루 한 번 몰아서 발송한다. 크론을 15분 주기로 바꾸면(Pro 플랜)
 * LOOKAHEAD_MS를 15분으로 줄여 원래 정밀도로 복원할 것.
 */
async function handleRemind(request: NextRequest) {
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

  // 오늘 + 내일 범위 이벤트 조회 (24시간 look-ahead 대응)
  const todayKst = nowKst.toISOString().slice(0, 10);
  const dayAfterKst = new Date(nowKst.getTime() + 2 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  const { data: events, error } = await admin
    .from("calendar_events")
    .select("id, user_id, title, event_type, start_date, start_time, location, reminder_minutes")
    .not("reminder_minutes", "is", null)
    .eq("remind_sent", false)
    .gte("start_date", todayKst)
    .lte("start_date", dayAfterKst);

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

  const nowUtcMs = nowUtc.getTime();
  const PAST_GRACE_MS = 5 * 60 * 1000; // 이미 지난 알림 시각 허용 오차
  const LOOKAHEAD_MS = 24 * 60 * 60 * 1000; // 하루 1회 크론 기준 look-ahead

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

    // 알림 예정 시각이 [지금-5분, 지금+24시간) 범위일 때 발송
    if (alertUtcMs < nowUtcMs - PAST_GRACE_MS || alertUtcMs >= nowUtcMs + LOOKAHEAD_MS) continue;

    const label = typeLabel[event.event_type as string] ?? "일정";
    const locationStr = event.location ? ` · ${event.location}` : "";
    const body = `${event.start_date} ${timeStr}${locationStr}`;

    const result = await sendPushToUserIds([event.user_id as string], {
      title: `🔔 ${label} 알림: ${event.title}`,
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

export async function GET(request: NextRequest) {
  return handleRemind(request);
}

export async function POST(request: NextRequest) {
  return handleRemind(request);
}
