import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { ensureUniqueBlogSlug, getPublishedBlogPosts } from "@/lib/blog";
import { createClient } from "@/lib/supabase/server";

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
    description?: string;
    thumbnailUrl?: string;
    contentHtml?: string;
    contentJson?: unknown;
  };

  const title = body.title?.trim() ?? "";
  const description = body.description?.trim() ?? "";
  const contentHtml = body.contentHtml?.trim() ?? "";

  if (!title || !description || !contentHtml) {
    return NextResponse.json({ error: "제목, 설명, 본문을 모두 입력해주세요." }, { status: 400 });
  }

  const slug = await ensureUniqueBlogSlug(title);

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("id", user.id)
    .maybeSingle();

  const authorName = profile?.display_name?.trim() || user.email?.split("@")[0] || "달디단 에디터";
  const publishedAt = new Date().toISOString();

  const { error } = await supabase
    .from("blog_posts")
    .insert({
      author_id: user.id,
      author_name: authorName,
      slug,
      title,
      description,
      thumbnail_url: body.thumbnailUrl?.trim() || null,
      content_html: contentHtml,
      content_json: body.contentJson ?? null,
      is_published: true,
      published_at: publishedAt,
    });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  revalidatePath("/");
  revalidatePath("/blog");
  revalidatePath(`/blog/${slug}`);

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
    description?: string;
    thumbnailUrl?: string;
    contentHtml?: string;
    contentJson?: unknown;
  };

  const id = body.id?.trim() ?? "";
  const title = body.title?.trim() ?? "";
  const description = body.description?.trim() ?? "";
  const contentHtml = body.contentHtml?.trim() ?? "";

  if (!id || !title || !description || !contentHtml) {
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
      thumbnail_url: body.thumbnailUrl?.trim() || null,
      content_html: contentHtml,
      content_json: body.contentJson ?? null,
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
