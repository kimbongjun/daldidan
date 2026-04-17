import { NextRequest, NextResponse } from "next/server";
import { createAdminClient, createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const postId = request.nextUrl.searchParams.get("post_id");
  const browserId = request.nextUrl.searchParams.get("browser_id") ?? "";

  if (!postId) {
    return NextResponse.json({ error: "post_id가 필요합니다." }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const admin = createAdminClient();

  // 해당 포스트의 댓글 ID 목록
  const { data: commentRows } = await admin
    .from("blog_comments")
    .select("id")
    .eq("post_id", postId);

  if (!commentRows || commentRows.length === 0) {
    return NextResponse.json([]);
  }

  const ids = commentRows.map((c) => c.id);

  const { data: reactions } = await admin
    .from("blog_comment_reactions")
    .select("comment_id, reaction, user_id, browser_id")
    .in("comment_id", ids);

  if (!reactions || reactions.length === 0) return NextResponse.json([]);

  type ReactionSummary = {
    comment_id: string;
    counts: Record<string, number>;
    mine: string[];
  };

  const map = new Map<string, ReactionSummary>();

  for (const r of reactions) {
    if (!map.has(r.comment_id)) {
      map.set(r.comment_id, { comment_id: r.comment_id, counts: {}, mine: [] });
    }
    const entry = map.get(r.comment_id)!;
    entry.counts[r.reaction] = (entry.counts[r.reaction] ?? 0) + 1;

    const isMe = user ? r.user_id === user.id : (browserId && r.browser_id === browserId);
    if (isMe) entry.mine.push(r.reaction);
  }

  return NextResponse.json([...map.values()]);
}
