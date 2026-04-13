import { NextRequest, NextResponse } from "next/server";
import { createPublicClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

// POST /api/blog/views  { post_id: string }
// view_count 컬럼이 존재하는 경우 1씩 증가합니다.
// 컬럼이 없으면 에러를 무시하고 200을 반환합니다.
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({})) as { post_id?: string };
  const postId = body.post_id?.trim();
  if (!postId) {
    return NextResponse.json({ error: "post_id가 필요합니다." }, { status: 400 });
  }

  const supabase = createPublicClient();

  // view_count 증가 (RPC increment_view_count 혹은 단순 update)
  const { error } = await supabase.rpc("increment_view_count", { post_id: postId });

  // view_count 컬럼이나 RPC 함수가 아직 없으면 조용히 무시
  if (error && !error.message.includes("increment_view_count")) {
    console.error("[views] increment error:", error.message);
  }

  return NextResponse.json({ ok: true });
}
