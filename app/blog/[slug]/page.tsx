import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import PageHeader from "@/components/PageHeader";
import BlogComments from "@/components/blog/BlogComments";
import BlogNotifyButton from "@/components/blog/BlogNotifyButton";
import BlogShareBar from "@/components/blog/BlogShareBar";
import BlogViewCounter from "@/components/blog/BlogViewCounter";
import { canEditBlogPost, getBlogPostBySlug } from "@/lib/blog";
import { formatBlogDate } from "@/lib/blog-shared";

const ACCENT = "#EA580C";

async function fetchDefaultOgImage(): Promise<string | undefined> {
  try {
    const { createAdminClient } = await import("@/lib/supabase/server");
    const admin = createAdminClient();
    const { data } = await admin
      .from("site_settings")
      .select("value")
      .eq("key", "meta_og_image")
      .maybeSingle();
    return data?.value || undefined;
  } catch {
    return undefined;
  }
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const post = await getBlogPostBySlug(slug);

  if (!post) return {};

  const title = post.title;
  const description = post.description;
  // thumbnailUrl은 lib/blog.ts mapSummary에서 본문 첫 이미지를 fallback으로 자동 설정함
  const ogImage = post.thumbnailUrl || (await fetchDefaultOgImage());

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      ...(ogImage ? { images: [{ url: ogImage }] } : {}),
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      ...(ogImage ? { images: [ogImage] } : {}),
    },
  };
}

export default async function BlogDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [post, editable] = await Promise.all([
    getBlogPostBySlug(slug),
    canEditBlogPost(slug),
  ]);

  if (!post) {
    notFound();
  }

  return (
    <div className="min-h-screen" style={{ background: "var(--bg-base)" }}>
      <BlogViewCounter postId={post.id} />
      <div className="max-w-[1100px] mx-auto px-4 sm:px-6 pb-12">
        <PageHeader
          title={post.title}
          subtitle={`${formatBlogDate(post.publishedAt)} · ${post.authorName}`}
          accentColor={ACCENT}
          actions={
            editable ? (
              <Link
                href={`/blog/${encodeURIComponent(post.slug)}/edit`}
                className="px-4 py-2 rounded-xl text-sm font-semibold transition-opacity hover:opacity-80"
                style={{ background: "rgba(234,88,12,0.12)", color: ACCENT }}
              >
                글 편집
              </Link>
            ) : undefined
          }
        />

        <article className="grid lg:grid-cols-[minmax(0,1fr)_280px] gap-6">
          <div className="flex flex-col gap-6">
            <section className="bento-card overflow-hidden">              
              <div className="p-6 sm:p-8">
                <div className="blog-prose" dangerouslySetInnerHTML={{ __html: post.contentHtml }} />
              </div>
            </section>

            {/* 본문 하단 공유 */}
            <BlogShareBar title={post.title} />

            {/* 댓글 */}
            <BlogComments postId={post.id} />
          </div>

          <aside className="flex flex-col gap-4">
            <div className="bento-card p-5 flex flex-col gap-2">
              <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: ACCENT }}>Article Meta</p>
              {post.category && (
                <div className="flex items-center gap-2">
                  <span className="text-sm" style={{ color: "var(--text-muted)" }}>카테고리:</span>
                  <span
                    className="px-2 py-0.5 rounded-lg text-xs font-bold"
                    style={{ background: "rgba(234,88,12,0.15)", color: ACCENT }}
                  >
                    {post.category}
                  </span>
                </div>
              )}
              <p className="text-sm" style={{ color: "var(--text-primary)" }}>작성자: {post.authorName}</p>
              <p className="text-sm" style={{ color: "var(--text-primary)" }}>발행일: {formatBlogDate(post.publishedAt)}</p>
              {post.updatedAt && (
                <p className="text-sm" style={{ color: "var(--text-muted)" }}>수정일: {formatBlogDate(post.updatedAt)}</p>
              )}
            </div>

            <div className="bento-card p-5 flex flex-col gap-3">
              {editable ? <BlogNotifyButton slug={post.slug} /> : null}
              <Link
                href="/blog"
                className="w-full py-3 rounded-xl text-center font-semibold"
                style={{ background: "rgba(234,88,12,0.12)", color: ACCENT }}
              >
                목록으로 돌아가기
              </Link>
              {!editable ? (
                <Link
                  href="/blog/write"
                  className="w-full py-3 rounded-xl text-center font-semibold"
                  style={{ background: ACCENT, color: "#fff" }}
                >
                  새 글 작성
                </Link>
              ) : null}
            </div>
          </aside>
        </article>
      </div>
    </div>
  );
}
