import { NextRequest, NextResponse } from "next/server";
import { canEditBlogPost, getBlogPostBySlug } from "@/lib/blog";
import { sendPushToAllSubscribers } from "@/lib/push-notification";

export const runtime = "nodejs";

function summarizeBody(input: string) {
  const normalized = input.replace(/\s+/g, " ").trim();
  if (normalized.length <= 90) return normalized;
  return `${normalized.slice(0, 87)}...`;
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ slug: string }> },
) {
  const { slug } = await context.params;
  const editable = await canEditBlogPost(slug);

  if (!editable) {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }

  const post = await getBlogPostBySlug(slug);
  if (!post) {
    return NextResponse.json({ error: "글을 찾지 못했습니다." }, { status: 404 });
  }

  const result = await sendPushToAllSubscribers({
    title: post.title,
    body: summarizeBody(post.description || "새 글을 확인해보세요."),
    url: `/blog/${encodeURIComponent(post.slug)}`,
    icon: post.thumbnailUrl ?? undefined,
    origin: request.nextUrl.origin,
  });

  return NextResponse.json({ ok: true, result }, { status: 200 });
}
