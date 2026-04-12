import { createClient } from "@/lib/supabase/server";
import type { BlogPostDetail, BlogPostSummary, EditableBlogPost } from "@/lib/blog-shared";

function mapSummary(post: {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  thumbnail_url: string | null;
  author_name: string | null;
  published_at: string | null;
  created_at: string;
}): BlogPostSummary {
  return {
    id: post.id,
    slug: post.slug,
    title: post.title,
    description: post.description ?? "",
    thumbnailUrl: post.thumbnail_url ?? "",
    authorName: post.author_name?.trim() || "달디단 에디터",
    publishedAt: post.published_at ?? post.created_at,
  };
}

export async function getPublishedBlogPosts(limit = 9) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("blog_posts")
    .select("id, slug, title, description, thumbnail_url, author_name, published_at, created_at")
    .eq("is_published", true)
    .order("published_at", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error || !data) return [];
  return data.map(mapSummary);
}

export async function getBlogPostBySlug(slug: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("blog_posts")
    .select("id, slug, title, description, thumbnail_url, author_name, published_at, created_at, content_html")
    .eq("slug", slug)
    .eq("is_published", true)
    .maybeSingle();

  if (error || !data) return null;

  return {
    ...mapSummary(data),
    contentHtml: data.content_html ?? "",
  } satisfies BlogPostDetail;
}

export async function getEditableBlogPostBySlug(slug: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("blog_posts")
    .select("id, slug, title, description, thumbnail_url, author_name, published_at, created_at, content_html, content_json")
    .eq("slug", slug)
    .eq("author_id", user.id)
    .maybeSingle();

  if (error || !data) return null;

  return {
    ...mapSummary(data),
    contentHtml: data.content_html ?? "",
    contentJson: data.content_json ?? null,
  } satisfies EditableBlogPost;
}

export async function canEditBlogPost(slug: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  const { data } = await supabase
    .from("blog_posts")
    .select("id")
    .eq("slug", slug)
    .eq("author_id", user.id)
    .maybeSingle();

  return Boolean(data);
}

export function slugifyBlogTitle(input: string) {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9가-힣\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60) || "blog-post";
}

export async function ensureUniqueBlogSlug(title: string) {
  const supabase = await createClient();
  const base = slugifyBlogTitle(title);
  let candidate = base;

  for (let index = 0; index < 10; index += 1) {
    const { data } = await supabase
      .from("blog_posts")
      .select("slug")
      .eq("slug", candidate)
      .maybeSingle();

    if (!data) return candidate;
    candidate = `${base}-${Math.random().toString(36).slice(2, 6)}`;
  }

  return `${base}-${Date.now().toString(36)}`;
}
