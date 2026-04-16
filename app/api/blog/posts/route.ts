import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { ensureUniqueBlogSlug, extractFirstImageFromHtml, getPublishedBlogPosts } from "@/lib/blog";
import { extractDescriptionFromHtml } from "@/lib/blog-shared";
import { createClient } from "@/lib/supabase/server";
import { sendBlogPublishNotification } from "@/lib/resend";
import { sendPushToAllSubscribers } from "@/lib/push-notification";

export async function GET(request: NextRequest) {
  const limitParam = Number(request.nextUrl.searchParams.get("limit") ?? "9");
  const limit = Number.isFinite(limitParam) ? Math.min(Math.max(limitParam, 1), 20) : 9;
  const posts = await getPublishedBlogPosts(limit);
  return NextResponse.json(posts);
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const body = await request.json() as {
    title?: string;
    contentHtml?: string;
    category?: string;
    publishedAt?: string;
  };

  const title = body.title?.trim() ?? "";
  const contentHtml = body.contentHtml?.trim() ?? "";
  const category = body.category?.trim() || null;
  const description = extractDescriptionFromHtml(contentHtml);
  const resolvedThumbnail = extractFirstImageFromHtml(contentHtml);

  if (!title || !contentHtml) {
    return NextResponse.json({ error: "제목과 본문을 입력해주세요." }, { status: 400 });
  }

  const slug = await ensureUniqueBlogSlug(title);

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("id", user.id)
    .maybeSingle();

  const authorName = profile?.display_name?.trim() || user.email?.split("@")[0] || "달디단 에디터";
  // 클라이언트에서 발행일을 지정하면 사용, 없으면 현재 시각
  const candidateDate = body.publishedAt ? new Date(body.publishedAt) : null;
  const publishedAt = (candidateDate && !isNaN(candidateDate.getTime()))
    ? candidateDate.toISOString()
    : new Date().toISOString();

  const { error } = await supabase
    .from("blog_posts")
    .insert({
      author_id: user.id,
      author_name: authorName,
      slug,
      title,
      description,
      thumbnail_url: resolvedThumbnail || null,
      content_html: contentHtml,
      is_published: true,
      published_at: publishedAt,
      category,
    });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  revalidatePath("/");
  revalidatePath("/blog");
  revalidatePath(`/blog/${slug}`);

  // 이메일 알림 발송 (비동기 — 응답 지연 없음)
  sendBlogPublishNotification({
    title,
    description,
    slug,
    authorName,
    thumbnailUrl: resolvedThumbnail,
  }).catch(() => {
    // 이메일 발송 실패는 글 발행 결과에 영향을 주지 않음
  });

  // FCM 푸시 알림 발송 (비동기 — 응답 지연 없음)
  sendPushToAllSubscribers({
    title: "달디단 — 새 글이 등록되었습니다",
    body: title,
    url: `/blog/${encodeURIComponent(slug)}`,
    icon: resolvedThumbnail ?? undefined,
    origin: request.nextUrl.origin,
  }).catch(() => {
    // 푸시 발송 실패는 글 발행 결과에 영향을 주지 않음
  });

  return NextResponse.json({ slug }, { status: 201 });
}

export async function PATCH(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const body = await request.json() as {
    id?: string;
    title?: string;
    contentHtml?: string;
    category?: string;
    publishedAt?: string;
  };

  const id = body.id?.trim() ?? "";
  const title = body.title?.trim() ?? "";
  const contentHtml = body.contentHtml?.trim() ?? "";
  const category = body.category?.trim() || null;
  const candidateDate = body.publishedAt ? new Date(body.publishedAt) : null;
  const publishedAt = (candidateDate && !isNaN(candidateDate.getTime()))
    ? candidateDate.toISOString()
    : null;
  const description = extractDescriptionFromHtml(contentHtml);
  const resolvedThumbnail = extractFirstImageFromHtml(contentHtml);

  if (!id || !title || !contentHtml) {
    return NextResponse.json({ error: "수정에 필요한 정보가 부족합니다." }, { status: 400 });
  }

  const { data: existing, error: fetchError } = await supabase
    .from("blog_posts")
    .select("id, slug, title")
    .eq("id", id)
    .eq("author_id", user.id)
    .maybeSingle();

  if (fetchError || !existing) {
    return NextResponse.json({ error: "수정할 글을 찾지 못했습니다." }, { status: 404 });
  }

  const slug = existing.title === title ? existing.slug : await ensureUniqueBlogSlug(title);

  const { error } = await supabase
    .from("blog_posts")
    .update({
      slug,
      title,
      description,
      thumbnail_url: resolvedThumbnail || null,
      content_html: contentHtml,
      category,
      ...(publishedAt ? { published_at: publishedAt } : {}),
    })
    .eq("id", id)
    .eq("author_id", user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  revalidatePath("/");
  revalidatePath("/blog");
  revalidatePath(`/blog/${existing.slug}`);
  revalidatePath(`/blog/${slug}`);

  return NextResponse.json({ slug }, { status: 200 });
}

export async function DELETE(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const { id } = await request.json() as { id?: string };

  if (!id?.trim()) {
    return NextResponse.json({ error: "삭제할 글의 ID가 필요합니다." }, { status: 400 });
  }

  const { data: existing, error: fetchError } = await supabase
    .from("blog_posts")
    .select("id, slug")
    .eq("id", id)
    .eq("author_id", user.id)
    .maybeSingle();

  if (fetchError || !existing) {
    return NextResponse.json({ error: "삭제할 글을 찾지 못했습니다." }, { status: 404 });
  }

  const { error } = await supabase
    .from("blog_posts")
    .delete()
    .eq("id", id)
    .eq("author_id", user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  revalidatePath("/");
  revalidatePath("/blog");
  revalidatePath(`/blog/${existing.slug}`);

  return NextResponse.json({ ok: true }, { status: 200 });
}
