import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { extractFirstImageFromHtml } from "@/lib/blog";
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
    .is("thumbnail_url", null);

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
    .select("id, slug, title, content_html")
    .eq("is_published", true)
    .is("thumbnail_url", null)
    .limit(batchSize);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!posts || posts.length === 0) return NextResponse.json({ processed: [], failed: 0, remaining: 0 });

  const adminClient = createAdminClient();
  const processed: string[] = [];
  let failed = 0;

  await Promise.all(
    posts.map(async (post) => {
      try {
        const fromContent = extractFirstImageFromHtml(post.content_html ?? "");
        const thumbUrl = fromContent ?? await generateAutoThumbnail(post.title, post.content_html ?? "", post.slug);

        if (thumbUrl) {
          await adminClient
            .from("blog_posts")
            .update({ thumbnail_url: thumbUrl })
            .eq("id", post.id);
          revalidatePath("/blog");
          revalidatePath(`/blog/${post.slug}`);
          processed.push(post.slug);
        } else {
          failed++;
        }
      } catch {
        failed++;
      }
    }),
  );

  const { count } = await supabase
    .from("blog_posts")
    .select("id", { count: "exact", head: true })
    .eq("is_published", true)
    .is("thumbnail_url", null);

  return NextResponse.json({ processed, failed, remaining: count ?? 0 });
}
