import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { extractFirstImageFromHtml, extractFirstVideoThumbnailFromHtml } from "@/lib/blog";
import { generateAutoThumbnail } from "@/lib/blog-thumbnail";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { count, error } = await supabase
    .from("blog_posts")
    .select("id", { count: "exact", head: true })
    .eq("is_published", true)
    .or("thumbnail_url.is.null,thumbnail_url.eq.");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ remaining: count ?? 0 });
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => ({})) as { batchSize?: number };
  const batchSize = Math.min(Math.max(Number(body.batchSize ?? 3), 1), 5);

  const { data: posts, error } = await supabase
    .from("blog_posts")
    .select("id, slug, title, description, content_html, category")
    .eq("is_published", true)
    .or("thumbnail_url.is.null,thumbnail_url.eq.")
    .limit(batchSize);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!posts || posts.length === 0) return NextResponse.json({ processed: [], failed: 0, remaining: 0 });

  const adminClient = createAdminClient();
  const processed: string[] = [];
  let failed = 0;

  await Promise.all(
    posts.map(async (post) => {
      try {
        const fromContent =
          extractFirstVideoThumbnailFromHtml(post.content_html ?? "") ??
          extractFirstImageFromHtml(post.content_html ?? "");

        if (fromContent) {
          // 본문에서 추출한 이미지: thumbnail_url만 설정
          await adminClient
            .from("blog_posts")
            .update({
              thumbnail_url: fromContent,
              thumbnail_source: "content_image",
            })
            .eq("id", post.id);
          revalidatePath("/blog");
          revalidatePath(`/blog/${post.slug}`);
          processed.push(post.slug);
          return;
        }

        // 본문에 이미지 없음 → 자동 생성
        const result = await generateAutoThumbnail(
          post.title,
          post.content_html ?? "",
          post.slug,
          post.category,
          { summary: post.description ?? null },
        );

        await adminClient
          .from("blog_posts")
          .update({
            thumbnail_url: result.url,
            thumbnail_prompt: result.prompt,
            thumbnail_source: result.source,
          })
          .eq("id", post.id);

        revalidatePath("/blog");
        revalidatePath(`/blog/${post.slug}`);
        processed.push(post.slug);
      } catch {
        failed++;
      }
    }),
  );

  const { count } = await supabase
    .from("blog_posts")
    .select("id", { count: "exact", head: true })
    .eq("is_published", true)
    .or("thumbnail_url.is.null,thumbnail_url.eq.");

  return NextResponse.json({ processed, failed, remaining: count ?? 0 });
}
