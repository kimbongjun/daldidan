import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

function isMissingColumnError(error: { message?: string } | null, column: string) {
  const msg = error?.message ?? "";
  return (
    msg.includes(`column calendar_events.${column} does not exist`) ||
    msg.includes(`Could not find the '${column}' column of 'calendar_events'`)
  );
}

type CalendarEventRow = {
  id: string;
  user_id: string;
  title: string;
  event_type: string;
  start_date: string;
  start_time: string | null;
  end_date: string | null;
  end_time: string | null;
  location: string;
  description: string;
  is_recurring: boolean;
  recurrence: string | null;
  is_shared?: boolean;
  reminder_minutes?: number | null;
  created_at: string;
};

/** GET /api/calendar?year=YYYY&month=MM — 해당 월 일정 조회 (공유) */
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const year = searchParams.get("year");
  const month = searchParams.get("month");

  const buildQuery = (includeIsShared: boolean) => {
    const select = [
      "id",
      "user_id",
      "title",
      "event_type",
      "start_date",
      "start_time",
      "end_date",
      "end_time",
      "location",
      "description",
      "is_recurring",
      "recurrence",
      includeIsShared ? "is_shared" : null,
      "reminder_minutes",
      "created_at",
    ].filter(Boolean).join(", ");

    let query = supabase
      .from("calendar_events")
      .select(select)
      .order("start_date", { ascending: true })
      .order("start_time", { ascending: true, nullsFirst: true });

    if (year && month) {
      const y = parseInt(year, 10);
      const m = parseInt(month, 10);
      const startDate = `${y}-${String(m).padStart(2, "0")}-01`;
      const lastDay = new Date(y, m, 0).getDate();
      const endDate = `${y}-${String(m).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
      query = query.gte("start_date", startDate).lte("start_date", endDate);
    }

    return query;
  };

  let { data, error } = await buildQuery(true);
  let supportsIsShared = true;

  if (isMissingColumnError(error, "is_shared")) {
    supportsIsShared = false;
    const fallback = await buildQuery(false);
    data = fallback.data;
    error = fallback.error;
  }

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const rows = (data ?? []) as unknown as CalendarEventRow[];

  // display_name 조회
  const userIds = [...new Set(rows.map((e) => e.user_id).filter(Boolean))] as string[];
  const nameMap: Record<string, string> = {};
  if (userIds.length > 0) {
    const admin = createAdminClient();
    const { data: profiles } = await admin
      .from("profiles")
      .select("id, display_name")
      .in("id", userIds);

    for (const p of profiles ?? []) {
      nameMap[p.id] = p.display_name ?? "익명";
    }
  }

  const events = rows.map((e) => ({
    ...e,
    author_name: nameMap[e.user_id] ?? "익명",
    is_mine: e.user_id === user.id,
    is_shared: supportsIsShared ? (e.is_shared ?? false) : false,
  }));

  return NextResponse.json(events);
}

/** POST /api/calendar — 일정 등록 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json() as {
    title?: string;
    event_type?: string;
    start_date?: string;
    start_time?: string;
    end_date?: string;
    end_time?: string;
    location?: string;
    description?: string;
    is_recurring?: boolean;
    recurrence?: string;
    is_shared?: boolean;
    reminder_minutes?: number | null;
  };

  const title = body.title?.trim();
  if (!title) return NextResponse.json({ error: "제목을 입력해주세요." }, { status: 400 });

  const start_date = body.start_date?.trim();
  if (!start_date || !/^\d{4}-\d{2}-\d{2}$/.test(start_date)) {
    return NextResponse.json({ error: "날짜 형식이 올바르지 않습니다." }, { status: 400 });
  }

  const validTypes = ["schedule", "appointment", "anniversary"];
  const event_type = validTypes.includes(body.event_type ?? "") ? body.event_type : "schedule";

  const validRecurrences = ["daily", "weekly", "monthly", "yearly"];
  const recurrence = validRecurrences.includes(body.recurrence ?? "") ? body.recurrence : null;

  const insertPayload = {
    user_id: user.id,
    title,
    event_type,
    start_date,
    start_time: body.start_time?.trim() || null,
    end_date: body.end_date?.trim() || null,
    end_time: body.end_time?.trim() || null,
    location: body.location?.trim() ?? "",
    description: body.description?.trim() ?? "",
    is_recurring: body.is_recurring ?? false,
    recurrence,
    is_shared: body.is_shared ?? false,
    reminder_minutes: body.reminder_minutes ?? null,
  };

  let { data, error } = await supabase
    .from("calendar_events")
    .insert(insertPayload)
    .select()
    .single();

  if (isMissingColumnError(error, "is_shared")) {
    const fallback = await supabase
      .from("calendar_events")
      .insert({
        user_id: insertPayload.user_id,
        title: insertPayload.title,
        event_type: insertPayload.event_type,
        start_date: insertPayload.start_date,
        start_time: insertPayload.start_time,
        end_date: insertPayload.end_date,
        end_time: insertPayload.end_time,
        location: insertPayload.location,
        description: insertPayload.description,
        is_recurring: insertPayload.is_recurring,
        recurrence: insertPayload.recurrence,
        reminder_minutes: insertPayload.reminder_minutes,
      })
      .select()
      .single();

    data = fallback.data ? { ...fallback.data, is_shared: false } : fallback.data;
    error = fallback.error;
  }

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
