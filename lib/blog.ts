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
  updated_at?: string | null;
  created_at: string;
  view_count?: number | null;
  blog_comments?: { created_at: string }[] | null;
  category?: string | null;
}): BlogPostSummary {
  // DB에 thumbnail_url이 있으면 HTML 파싱 생략 (성능)
  const fallbackThumbnail = post.thumbnail_url ? null : extractFirstImageFromHtml(post.content_html ?? "");
  const comments = post.blog_comments ?? [];
  const latestCommentAt = comments.length > 0
    ? comments.reduce((latest, c) => c.created_at > latest ? c.created_at : latest, comments[0].created_at)
    : null;

  const createdAt = post.created_at;
  const publishedAt = post.published_at ?? post.created_at;
  const updatedAt = post.updated_at ?? null;
  const isModified = updatedAt
    ? Math.abs(new Date(updatedAt).getTime() - new Date(createdAt).getTime()) > 60_000
    : false;

  return {
    id: post.id,
    slug: post.slug,
    title: post.title,
    description: post.description ?? "",
    thumbnailUrl: post.thumbnail_url ?? fallbackThumbnail ?? "",
    authorName: post.author_name?.trim() || "달디단 에디터",
    createdAt,
    publishedAt,
    updatedAt: isModified ? updatedAt : null,
    viewCount: post.view_count ?? 0,
    commentCount: comments.length,
    latestCommentAt,
    category: post.category ?? null,
  };
}

export function extractFirstImageFromHtml(contentHtml: string) {
  // base64 data URL은 thumbnail_url 컬럼 패턴 제약 위반이므로 http(s):// URL만 반환
  const allMatches = [...contentHtml.matchAll(/<img[^>]+src=["']([^"']+)["'][^>]*/gi)];
  for (const match of allMatches) {
    const src = match[1]?.trim();
    if (src && /^https?:\/\//i.test(src)) return src;
  }
  return null;
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

export async function getBlogPostCount(category?: string | null): Promise<number> {
  const supabase = createPublicClient();
  const nowIso = new Date().toISOString();
  let query = supabase
    .from("blog_posts")
    .select("id", { count: "exact", head: true })
    .eq("is_published", true)
    .or(`published_at.is.null,published_at.lte.${nowIso}`);

  if (category) query = query.eq("category", category);

  const { count } = await query;
  return count ?? 0;
}

export async function getPublishedBlogPosts(limit = 9, category?: string | null, offset = 0) {
  const supabase = createPublicClient();
  const nowIso = new Date().toISOString();
  let query = supabase
    .from("blog_posts")
    .select("id, slug, title, description, thumbnail_url, content_html, author_name, published_at, updated_at, created_at, view_count, category, blog_comments(created_at)")
    .eq("is_published", true)
    .or(`published_at.is.null,published_at.lte.${nowIso}`);

  if (category) {
    query = query.eq("category", category);
  }

  const { data, error } = await query
    .order("published_at", { ascending: false })
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error || !data) return [];
  return data.map(mapSummary);
}

export async function getBlogPostBySlug(slug: string) {
  const supabase = createPublicClient();
  const candidates = resolveSlugCandidates(slug);
  const nowIso = new Date().toISOString();
  const { data, error } = await supabase
    .from("blog_posts")
    .select("id, slug, title, description, thumbnail_url, author_name, published_at, updated_at, created_at, content_html, view_count, category, blog_comments(created_at)")
    .in("slug", candidates)
    .eq("is_published", true)
    .or(`published_at.is.null,published_at.lte.${nowIso}`)
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
    .select("id, slug, title, description, thumbnail_url, author_name, published_at, updated_at, created_at, content_html, content_json, category")
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
