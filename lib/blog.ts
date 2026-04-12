import { createClient, createPublicClient } from "@/lib/supabase/server";
import type { BlogPostDetail, BlogPostSummary, EditableBlogPost } from "@/lib/blog-shared";

function mapSummary(post: {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  thumbnail_url: string | null;
  content_html?: string | null;
  author_name: string | null;
  published_at: string | null;
  created_at: string;
}): BlogPostSummary {
  const fallbackThumbnail = extractFirstImageFromHtml(post.content_html ?? "");

  return {
    id: post.id,
    slug: post.slug,
    title: post.title,
    description: post.description ?? "",
    thumbnailUrl: post.thumbnail_url ?? fallbackThumbnail ?? "",
    authorName: post.author_name?.trim() || "달디단 에디터",
    publishedAt: post.published_at ?? post.created_at,
  };
}

export function extractFirstImageFromHtml(contentHtml: string) {
  const match = contentHtml.match(/<img[^>]+src=["']([^"']+)["'][^>]*>/i);
  return match?.[1]?.trim() || null;
}

function resolveSlugCandidates(slug: string) {
  const candidates = new Set([slug.trim()]);

  try {
    const decoded = decodeURIComponent(slug);
    if (decoded.trim()) {
      candidates.add(decoded.trim());
    }
  } catch {
    // 이미 디코딩된 값이거나 malformed encoding 이면 원본만 사용
  }

  return [...candidates].filter(Boolean);
}

export async function getPublishedBlogPosts(limit = 9) {
  const supabase = createPublicClient();
  const { data, error } = await supabase
    .from("blog_posts")
    .select("id, slug, title, description, thumbnail_url, content_html, author_name, published_at, created_at")
    .eq("is_published", true)
    .order("published_at", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error || !data) return [];
  return data.map(mapSummary);
}

export async function getBlogPostBySlug(slug: string) {
  const supabase = createPublicClient();
  const candidates = resolveSlugCandidates(slug);
  const { data, error } = await supabase
    .from("blog_posts")
    .select("id, slug, title, description, thumbnail_url, author_name, published_at, created_at, content_html")
    .in("slug", candidates)
    .eq("is_published", true)
    .limit(2);

  if (error || !data) return null;

  const matched = candidates
    .map((candidate) => data.find((post) => post.slug === candidate))
    .find(Boolean);

  if (!matched) return null;

  return {
    ...mapSummary(matched),
    contentHtml: matched.content_html ?? "",
  } satisfies BlogPostDetail;
}

export async function getEditableBlogPostBySlug(slug: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const candidates = resolveSlugCandidates(slug);

  const { data, error } = await supabase
    .from("blog_posts")
    .select("id, slug, title, description, thumbnail_url, author_name, published_at, created_at, content_html, content_json")
    .in("slug", candidates)
    .eq("author_id", user.id)
    .limit(2);

  if (error || !data) return null;

  const matched = candidates
    .map((candidate) => data.find((post) => post.slug === candidate))
    .find(Boolean);

  if (!matched) return null;

  return {
    ...mapSummary(matched),
    contentHtml: matched.content_html ?? "",
    contentJson: matched.content_json ?? null,
  } satisfies EditableBlogPost;
}

export async function canEditBlogPost(slug: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;
  const candidates = resolveSlugCandidates(slug);

  const { data } = await supabase
    .from("blog_posts")
    .select("id, slug")
    .in("slug", candidates)
    .eq("author_id", user.id)
    .limit(2);

  return candidates.some((candidate) => data?.some((post) => post.slug === candidate));
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
