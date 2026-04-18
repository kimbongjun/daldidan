import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

/** GET /api/calendar?year=YYYY&month=MM — 해당 월 일정 조회 (공유) */
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const year = searchParams.get("year");
  const month = searchParams.get("month");

  let query = supabase
    .from("calendar_events")
    .select("id, user_id, title, event_type, start_date, start_time, end_date, end_time, location, description, is_recurring, recurrence, created_at")
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

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // display_name 조회
  const userIds = [...new Set((data ?? []).map((e) => e.user_id).filter(Boolean))] as string[];
  const admin = createAdminClient();
  const { data: profiles } = await admin
    .from("profiles")
    .select("id, display_name")
    .in("id", userIds);

  const nameMap: Record<string, string> = {};
  for (const p of profiles ?? []) {
    nameMap[p.id] = p.display_name ?? "익명";
  }

  const events = (data ?? []).map((e) => ({
    ...e,
    author_name: nameMap[e.user_id] ?? "익명",
    is_mine: e.user_id === user.id,
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

  const { data, error } = await supabase
    .from("calendar_events")
    .insert({
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
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
