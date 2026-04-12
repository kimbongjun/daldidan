import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import PageHeader from "@/components/PageHeader";
import { canEditBlogPost, getBlogPostBySlug } from "@/lib/blog";
import { formatBlogDate } from "@/lib/blog-shared";

const ACCENT = "#EA580C";

export default async function BlogDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const decodedSlug = (() => {
    try {
      return decodeURIComponent(slug);
    } catch {
      return slug;
    }
  })();
  const [post, editable] = await Promise.all([
    getBlogPostBySlug(decodedSlug),
    canEditBlogPost(decodedSlug),
  ]);

  if (!post) {
    notFound();
  }

  return (
    <div className="min-h-screen" style={{ background: "var(--bg-base)" }}>
      <div className="max-w-[1100px] mx-auto px-4 sm:px-6 pb-12">
        <PageHeader title={post.title} subtitle={`${formatBlogDate(post.publishedAt)} · ${post.authorName}`} accentColor={ACCENT} />

        <article className="grid lg:grid-cols-[minmax(0,1fr)_280px] gap-6">
          <section className="bento-card overflow-hidden">
            {post.thumbnailUrl ? (
              <div className="relative aspect-[16/9]" style={{ background: "var(--border)" }}>
                <Image src={post.thumbnailUrl} alt={post.title} fill sizes="(max-width:1024px) 100vw, 70vw" className="object-cover" unoptimized />
              </div>
            ) : null}
            <div className="p-6 sm:p-8 flex flex-col gap-6">
              <div>
                <p className="text-sm leading-relaxed" style={{ color: "var(--text-muted)" }}>{post.description}</p>
              </div>
              <div className="blog-prose" dangerouslySetInnerHTML={{ __html: post.contentHtml }} />
            </div>
          </section>

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
