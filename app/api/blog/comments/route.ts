import { after, NextRequest, NextResponse } from "next/server";
import { createAdminClient, createClient, createPublicClient } from "@/lib/supabase/server";
import { hashPassword } from "@/lib/password";
import { sendPushToUserIds } from "@/lib/push-notification";

type CommentRow = {
  id: string;
  user_id: string | null;
  author_name: string;
  content: string;
  image_urls: string[];
  created_at: string;
  updated_at: string;
  parent_id: string | null;
};

async function attachCommentAvatars(admin: ReturnType<typeof createAdminClient> | ReturnType<typeof createPublicClient>, comments: CommentRow[]) {
  const userIds = [...new Set(comments.map((comment) => comment.user_id).filter(Boolean))] as string[];
  const avatarMap: Record<string, string | null> = {};

  if (userIds.length > 0) {
    let { data: profiles, error } = await admin
      .from("profiles")
      .select("id, avatar_url")
      .in("id", userIds);

    if (error?.message?.includes("avatar_url")) {
      const fallback = await admin
        .from("profiles")
        .select("id")
        .in("id", userIds);
      profiles = fallback.data?.map((profile) => ({ ...profile, avatar_url: null })) ?? [];
      error = fallback.error;
    }

    if (!error) {
      for (const profile of profiles ?? []) {
        avatarMap[profile.id] = profile.avatar_url ?? null;
      }
    }
  }

  return comments.map((comment) => ({
    ...comment,
    avatar_url: comment.user_id ? (avatarMap[comment.user_id] ?? null) : null,
  }));
}

export async function GET(request: NextRequest) {
  const postId = request.nextUrl.searchParams.get("post_id");
  if (!postId) {
    return NextResponse.json({ error: "post_id가 필요합니다." }, { status: 400 });
  }

  const publicSupabase = createPublicClient();
  const { data, error } = await publicSupabase
    .from("blog_comments")
    .select("id, user_id, author_name, content, image_urls, created_at, updated_at, parent_id")
    .eq("post_id", postId)
    .order("created_at", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const comments = await attachCommentAvatars(createAdminClient(), (data ?? []) as CommentRow[]);
  return NextResponse.json(comments);
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
    image_urls?: string[];
  };

  const postId = body.post_id?.trim() ?? "";
  const content = body.content?.trim() ?? "";
  const parentId = body.parent_id?.trim() || null;
  const imageUrls = Array.isArray(body.image_urls) ? body.image_urls.filter((u) => typeof u === "string").slice(0, 3) : [];

  if (!postId || !content) {
    return NextResponse.json({ error: "post_id와 내용을 입력해주세요." }, { status: 400 });
  }

  if (content.length > 1000) {
    return NextResponse.json({ error: "댓글은 1000자 이하로 작성해주세요." }, { status: 400 });
  }

  const admin = createAdminClient();

  if (parentId) {
    const { data: parentComment, error: parentError } = await admin
      .from("blog_comments")
      .select("id, post_id")
      .eq("id", parentId)
      .maybeSingle();

    if (parentError) {
      return NextResponse.json({ error: parentError.message }, { status: 500 });
    }

    if (!parentComment || parentComment.post_id !== postId) {
      return NextResponse.json({ error: "대댓글 대상 댓글이 올바르지 않습니다." }, { status: 400 });
    }
  }

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
      .insert({ post_id: postId, user_id: user.id, author_name: authorName, content, image_urls: imageUrls, parent_id: parentId })
      .select("id, user_id, author_name, content, image_urls, created_at, updated_at, parent_id")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // 비동기 알림 발송 (응답 지연 없이 백그라운드 처리)
    after(async () => {
      try {
        await dispatchCommentNotification({
          admin,
          postId,
          parentId,
          commentAuthorName: authorName,
          commenterId: user.id,
          content,
          origin: process.env.NEXT_PUBLIC_SITE_URL ?? "",
        });
      } catch { /* 알림 실패는 무시 */ }
    });

    const [commentWithAvatar] = await attachCommentAvatars(admin, [data as CommentRow]);
    return NextResponse.json(commentWithAvatar, { status: 201 });
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
    .insert({ post_id: postId, author_name: authorName, password_hash: passwordHash, content, image_urls: imageUrls, parent_id: parentId })
    .select("id, user_id, author_name, content, image_urls, created_at, updated_at, parent_id")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // 비로그인 댓글: 게시글 작성자에게만 알림 (자기 글에 댓글 온 경우)
  after(async () => {
    try {
      await dispatchCommentNotification({
        admin,
        postId,
        parentId,
        commentAuthorName: authorName,
        commenterId: null,
        content,
        origin: process.env.NEXT_PUBLIC_SITE_URL ?? "",
      });
    } catch { /* 알림 실패는 무시 */ }
  });

  return NextResponse.json({ ...(data as CommentRow), avatar_url: null }, { status: 201 });
}

// ── 알림 발송 헬퍼 ──────────────────────────────────────────────
async function dispatchCommentNotification({
  admin,
  postId,
  parentId,
  commentAuthorName,
  commenterId,
  content,
  origin,
}: {
  admin: ReturnType<typeof createAdminClient>;
  postId: string;
  parentId: string | null;
  commentAuthorName: string;
  commenterId: string | null;
  content: string;
  origin: string;
}) {
  // 게시글 정보 조회
  const { data: post } = await admin
    .from("blog_posts")
    .select("author_id, slug")
    .eq("id", postId)
    .maybeSingle();

  if (!post) return;

  const baseUrl = origin.replace(/\/$/, "");
  const targetUrl = post.slug ? `/blog/${post.slug}` : "/blog";
  const isReply = !!parentId;

  // 대댓글인 경우: 글쓴이와 부모 댓글 작성자에게 각각 다른 메시지 발송
  if (isReply) {
    const { data: parentComment } = await admin
      .from("blog_comments")
      .select("user_id, post_id")
      .eq("id", parentId)
      .maybeSingle();

    if (!parentComment || parentComment.post_id !== postId) return;

    const parentAuthorId = parentComment?.user_id ?? null;

    // 부모 댓글 작성자에게 알림 (본인 제외)
    if (parentAuthorId && parentAuthorId !== commenterId) {
      await sendPushToUserIds(
        [parentAuthorId],
        {
          title: `${commentAuthorName}님이 내 댓글에 대댓글을 남겼습니다`,
          body: content.slice(0, 100),
          url: targetUrl,
          origin: baseUrl,
        },
        "comment",
      );
    }

    // 글쓴이에게 알림 (본인 제외, 부모 댓글 작성자와 다른 경우에만 — 중복 방지)
    if (
      post.author_id &&
      post.author_id !== commenterId &&
      post.author_id !== parentAuthorId
    ) {
      await sendPushToUserIds(
        [post.author_id],
        {
          title: `${commentAuthorName}님이 대댓글을 남겼습니다`,
          body: content.slice(0, 100),
          url: targetUrl,
          origin: baseUrl,
        },
        "comment",
      );
    }

    return;
  }

  // 일반 댓글인 경우: 글쓴이에게 알림
  if (!post.author_id || post.author_id === commenterId) return;

  await sendPushToUserIds(
    [post.author_id],
    {
      title: `${commentAuthorName}님이 댓글을 남겼습니다`,
      body: content.slice(0, 100),
      url: targetUrl,
      origin: baseUrl,
    },
    "comment",
  );
}
