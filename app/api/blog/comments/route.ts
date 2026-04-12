import { NextRequest, NextResponse } from "next/server";
import { createAdminClient, createPublicClient } from "@/lib/supabase/server";
import { hashPassword } from "@/lib/password";

export async function GET(request: NextRequest) {
  const postId = request.nextUrl.searchParams.get("post_id");
  if (!postId) {
    return NextResponse.json({ error: "post_id가 필요합니다." }, { status: 400 });
  }

  const supabase = createPublicClient();
  const { data, error } = await supabase
    .from("blog_comments")
    .select("id, author_name, content, created_at, updated_at")
    .eq("post_id", postId)
    .order("created_at", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data ?? []);
}

export async function POST(request: NextRequest) {
  const body = await request.json() as {
    post_id?: string;
    author_name?: string;
    password?: string;
    content?: string;
  };

  const postId = body.post_id?.trim() ?? "";
  const authorName = body.author_name?.trim() ?? "";
  const password = body.password ?? "";
  const content = body.content?.trim() ?? "";

  if (!postId || !authorName || !password || !content) {
    return NextResponse.json({ error: "모든 항목을 입력해주세요." }, { status: 400 });
  }

  if (password.length < 4) {
    return NextResponse.json({ error: "비밀번호는 4자 이상이어야 합니다." }, { status: 400 });
  }

  if (content.length > 1000) {
    return NextResponse.json({ error: "댓글은 1000자 이하로 작성해주세요." }, { status: 400 });
  }

  const passwordHash = hashPassword(password);

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("blog_comments")
    .insert({ post_id: postId, author_name: authorName, password_hash: passwordHash, content })
    .select("id, author_name, content, created_at, updated_at")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}
