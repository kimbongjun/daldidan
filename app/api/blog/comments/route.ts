import { NextRequest, NextResponse } from "next/server";
import { createAdminClient, createClient, createPublicClient } from "@/lib/supabase/server";
import { hashPassword } from "@/lib/password";

export async function GET(request: NextRequest) {
  const postId = request.nextUrl.searchParams.get("post_id");
  if (!postId) {
    return NextResponse.json({ error: "post_id가 필요합니다." }, { status: 400 });
  }

  const supabase = createPublicClient();
  const { data, error } = await supabase
    .from("blog_comments")
    .select("id, user_id, author_name, content, created_at, updated_at, parent_id")
    .eq("post_id", postId)
    .order("created_at", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data ?? []);
}

export async function POST(request: NextRequest) {
  // 로그인 유저 확인
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const body = await request.json() as {
    post_id?: string;
    author_name?: string;
    password?: string;
    content?: string;
    parent_id?: string;
  };

  const postId = body.post_id?.trim() ?? "";
  const content = body.content?.trim() ?? "";
  const parentId = body.parent_id?.trim() || null;

  if (!postId || !content) {
    return NextResponse.json({ error: "post_id와 내용을 입력해주세요." }, { status: 400 });
  }

  if (content.length > 1000) {
    return NextResponse.json({ error: "댓글은 1000자 이하로 작성해주세요." }, { status: 400 });
  }

  const admin = createAdminClient();

  if (user) {
    // 로그인 유저: 닉네임 사용, 비밀번호 불필요
    const { data: profile } = await admin
      .from("profiles")
      .select("display_name")
      .eq("id", user.id)
      .maybeSingle();

    const authorName =
      profile?.display_name?.trim() ||
      user.email?.split("@")[0] ||
      "달디단 유저";

    const { data, error } = await admin
      .from("blog_comments")
      .insert({ post_id: postId, user_id: user.id, author_name: authorName, content, parent_id: parentId })
      .select("id, user_id, author_name, content, created_at, updated_at, parent_id")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data, { status: 201 });
  }

  // 비로그인 유저: 이름 + 비밀번호 필요
  const authorName = body.author_name?.trim() ?? "";
  const password = body.password ?? "";

  if (!authorName || !password) {
    return NextResponse.json({ error: "이름과 비밀번호를 입력해주세요." }, { status: 400 });
  }

  if (password.length < 4) {
    return NextResponse.json({ error: "비밀번호는 4자 이상이어야 합니다." }, { status: 400 });
  }

  const passwordHash = hashPassword(password);

  const { data, error } = await admin
    .from("blog_comments")
    .insert({ post_id: postId, author_name: authorName, password_hash: passwordHash, content, parent_id: parentId })
    .select("id, user_id, author_name, content, created_at, updated_at, parent_id")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}
