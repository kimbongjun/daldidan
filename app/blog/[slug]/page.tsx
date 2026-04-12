import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import PageHeader from "@/components/PageHeader";
import BlogComments from "@/components/blog/BlogComments";
import { canEditBlogPost, getBlogPostBySlug } from "@/lib/blog";
import { formatBlogDate } from "@/lib/blog-shared";

const ACCENT = "#EA580C";

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
      <div className="max-w-[1100px] mx-auto px-4 sm:px-6 pb-12">
        <PageHeader title={post.title} subtitle={`${formatBlogDate(post.publishedAt)} · ${post.authorName}`} accentColor={ACCENT} />

        <article className="grid lg:grid-cols-[minmax(0,1fr)_280px] gap-6">
          <div className="flex flex-col gap-6">
            <section className="bento-card overflow-hidden">
              <div className="relative aspect-[16/9]" style={{ background: "var(--border)" }}>
                {post.thumbnailUrl ? (
                  <Image src={post.thumbnailUrl} alt={post.title} fill sizes="(max-width:1024px) 100vw, 70vw" className="object-cover" unoptimized />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center gap-3"
                    style={{ background: "linear-gradient(135deg, rgba(234,88,12,0.08), rgba(234,88,12,0.02))" }}>
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="rgba(234,88,12,0.3)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/>
                      <polyline points="21 15 16 10 5 21"/>
                    </svg>
                    <span style={{ fontSize: "0.8rem", color: "rgba(234,88,12,0.4)", fontWeight: 600 }}>썸네일 이미지 없음</span>
                    <span style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>본문에 이미지를 추가하면 자동으로 썸네일이 설정됩니다</span>
                  </div>
                )}
              </div>
              <div className="p-6 sm:p-8">
                <div className="blog-prose" dangerouslySetInnerHTML={{ __html: post.contentHtml }} />
              </div>
            </section>

            {/* 댓글 */}
            <BlogComments postId={post.id} />
          </div>

          <aside className="flex flex-col gap-4">
            <div className="bento-card p-5 flex flex-col gap-2">
              <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: ACCENT }}>Article Meta</p>
              <p className="text-sm" style={{ color: "var(--text-primary)" }}>작성자: {post.authorName}</p>
              <p className="text-sm" style={{ color: "var(--text-primary)" }}>발행일: {formatBlogDate(post.publishedAt)}</p>
            </div>

            <div className="bento-card p-5 flex flex-col gap-3">
              {editable ? (
                <Link
                  href={`/blog/${encodeURIComponent(post.slug)}/edit`}
                  className="w-full py-3 rounded-xl text-center font-semibold"
                  style={{ background: "rgba(234,88,12,0.12)", color: ACCENT }}
                >
                  글 편집
                </Link>
              ) : null}
              <Link
                href="/blog"
                className="w-full py-3 rounded-xl text-center font-semibold"
                style={{ background: editable ? "rgba(255,255,255,0.05)" : "rgba(234,88,12,0.12)", color: editable ? "var(--text-primary)" : ACCENT }}
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
