import { NextRequest, NextResponse } from "next/server";
import { createAdminClient, createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });

  const searchParams = request.nextUrl.searchParams;
  const page = Math.max(1, Number(searchParams.get("page") ?? "1"));
  const limit = Math.min(50, Math.max(1, Number(searchParams.get("limit") ?? "20")));
  const type = searchParams.get("type") ?? "";
  const from = (page - 1) * limit;

  const admin = createAdminClient();
  let query = admin
    .from("push_logs")
    .select("id, created_at, notification_type, title, body, target_url, sent_count, failed_count, os_summary", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, from + limit - 1);

  if (type) query = query.eq("notification_type", type);

  const { data, error, count } = await query;

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    logs: data ?? [],
    total: count ?? 0,
    page,
    limit,
  });
}

export async function DELETE(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });

  const { id } = await request.json() as { id?: string };
  if (!id) return NextResponse.json({ error: "id가 필요합니다." }, { status: 400 });

  const admin = createAdminClient();
  const { error } = await admin.from("push_logs").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
