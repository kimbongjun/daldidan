import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

/** DELETE /api/calendar/[id] — 자신 일정 삭제 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const { error } = await supabase
    .from("calendar_events")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

/** PATCH /api/calendar/[id] — 자신 일정 수정 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await request.json() as Record<string, unknown>;

  const { data: existing, error: fetchError } = await supabase
    .from("calendar_events")
    .select("id, start_date, start_time, reminder_minutes")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (fetchError || !existing) {
    return NextResponse.json({ error: "수정할 일정을 찾지 못했습니다." }, { status: 404 });
  }

  const allowed = ["title", "event_type", "start_date", "start_time", "end_date", "end_time", "location", "description", "is_recurring", "recurrence", "reminder_minutes"];
  const patch: Record<string, unknown> = {};
  for (const key of allowed) {
    if (key in body) patch[key] = body[key];
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "변경할 필드가 없습니다." }, { status: 400 });
  }

  const nextStartDate = typeof patch.start_date === "string" ? patch.start_date : existing.start_date;
  const nextStartTime =
    typeof patch.start_time === "string"
      ? (patch.start_time || null)
      : existing.start_time;

  const reminderChanged = "reminder_minutes" in body;
  if (nextStartDate !== existing.start_date || nextStartTime !== existing.start_time || reminderChanged) {
    patch.remind_sent = false;
  }

  const { data, error } = await supabase
    .from("calendar_events")
    .update(patch)
    .eq("id", id)
    .eq("user_id", user.id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
