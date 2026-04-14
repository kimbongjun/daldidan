import { NextRequest, NextResponse } from "next/server";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import { verifyPassword } from "@/lib/password";

async function resolveComment(id: string) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("blog_comments")
    .select("id, user_id, password_hash, author_name, content")
    .eq("id", id)
    .maybeSingle();
  if (error || !data) return null;
  return data;
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = await request.json() as { password?: string; content?: string };

  const content = body.content?.trim() ?? "";

  if (!content) {
    return NextResponse.json({ error: "수정 내용을 입력해주세요." }, { status: 400 });
  }

  if (content.length > 1000) {
    return NextResponse.json({ error: "댓글은 1000자 이하로 작성해주세요." }, { status: 400 });
  }

  const comment = await resolveComment(id);
  if (!comment) {
    return NextResponse.json({ error: "댓글을 찾을 수 없습니다." }, { status: 404 });
  }

  // 로그인 유저 확인
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (comment.user_id) {
    // 로그인 유저가 작성한 댓글 → user_id 일치 여부로 권한 확인
    if (!user || user.id !== comment.user_id) {
      return NextResponse.json({ error: "수정 권한이 없습니다." }, { status: 403 });
    }
  } else {
    // 비로그인(익명) 댓글 → 비밀번호 확인
    const password = body.password ?? "";
    if (!password) {
      return NextResponse.json({ error: "비밀번호를 입력해주세요." }, { status: 400 });
    }
    if (!verifyPassword(password, comment.password_hash ?? "")) {
      return NextResponse.json({ error: "비밀번호가 올바르지 않습니다." }, { status: 403 });
    }
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("blog_comments")
    .update({ content, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select("id, user_id, author_name, content, created_at, updated_at")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const comment = await resolveComment(id);
  if (!comment) {
    return NextResponse.json({ error: "댓글을 찾을 수 없습니다." }, { status: 404 });
  }

  // 로그인 유저 확인
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (comment.user_id) {
    // 로그인 유저가 작성한 댓글 → user_id 일치 여부로 권한 확인
    if (!user || user.id !== comment.user_id) {
      return NextResponse.json({ error: "삭제 권한이 없습니다." }, { status: 403 });
    }
  } else {
    // 비로그인(익명) 댓글 → 비밀번호 확인
    let body: { password?: string } = {};
    try {
      body = await request.json() as { password?: string };
    } catch {
      // body 없는 경우 무시
    }
    const password = body.password ?? "";
    if (!password) {
      return NextResponse.json({ error: "비밀번호를 입력해주세요." }, { status: 400 });
    }
    if (!verifyPassword(password, comment.password_hash ?? "")) {
      return NextResponse.json({ error: "비밀번호가 올바르지 않습니다." }, { status: 403 });
    }
  }

  const admin = createAdminClient();
  const { error } = await admin.from("blog_comments").delete().eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
