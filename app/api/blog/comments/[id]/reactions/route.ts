import { NextRequest, NextResponse } from "next/server";
import { createAdminClient, createClient } from "@/lib/supabase/server";

type ReactionType = "like" | "sad" | "best" | "check";
const VALID_REACTIONS: ReactionType[] = ["like", "sad", "best", "check"];

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: commentId } = await params;
  const body = await request.json() as { reaction?: string; browser_id?: string };
  const reaction = body.reaction;
  const browserId = body.browser_id?.trim() || null;

  if (!reaction || !VALID_REACTIONS.includes(reaction as ReactionType)) {
    return NextResponse.json({ error: "유효하지 않은 공감 타입입니다." }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const admin = createAdminClient();

  if (user) {
    const { data: existing } = await admin
      .from("blog_comment_reactions")
      .select("id")
      .eq("comment_id", commentId)
      .eq("user_id", user.id)
      .eq("reaction", reaction)
      .maybeSingle();

    if (existing) {
      await admin.from("blog_comment_reactions").delete().eq("id", existing.id);
      return NextResponse.json({ action: "removed" });
    }

    await admin.from("blog_comment_reactions").insert({
      comment_id: commentId,
      user_id: user.id,
      reaction: reaction as ReactionType,
    });
    return NextResponse.json({ action: "added" });
  }

  // 비로그인: browser_id 필요
  if (!browserId) {
    return NextResponse.json({ error: "browser_id가 필요합니다." }, { status: 400 });
  }

  const { data: existing } = await admin
    .from("blog_comment_reactions")
    .select("id")
    .eq("comment_id", commentId)
    .eq("browser_id", browserId)
    .eq("reaction", reaction)
    .maybeSingle();

  if (existing) {
    await admin.from("blog_comment_reactions").delete().eq("id", existing.id);
    return NextResponse.json({ action: "removed" });
  }

  await admin.from("blog_comment_reactions").insert({
    comment_id: commentId,
    browser_id: browserId,
    reaction: reaction as ReactionType,
  });
  return NextResponse.json({ action: "added" });
}
