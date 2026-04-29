import { NextResponse } from "next/server";
import { createAdminClient, createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export type PushDevice = {
  id: string;
  device_type: "web" | "ios" | "android";
  user_agent: string | null;
  notify_new_post: boolean;
  notify_comment: boolean;
  created_at: string;
  user_id: string | null;
};

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });

  const admin = createAdminClient();
  const { data, error, count } = await admin
    .from("push_subscriptions")
    .select("id, device_type, user_agent, notify_new_post, notify_comment, created_at, user_id", { count: "exact" })
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    devices: (data ?? []) as PushDevice[],
    total: count ?? 0,
  });
}
