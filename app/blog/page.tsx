import Image from "next/image";
import Link from "next/link";
import PageHeader from "@/components/PageHeader";
import { getPublishedBlogPosts } from "@/lib/blog";
import { formatBlogDate } from "@/lib/blog-shared";

const ACCENT = "#EA580C";

export const revalidate = 300;

export default async function BlogPage() {
  const posts = await getPublishedBlogPosts(9);

  return (
    <div className="min-h-screen" style={{ background: "var(--bg-base)" }}>
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 pb-12">
        <PageHeader title="블로그" subtitle="달디단의 인생스토리" accentColor={ACCENT} />

        <div className="flex items-center justify-between gap-3 mb-5">          
          <Link
            href="/blog/write"
            className="pressable px-4 py-2 rounded-xl text-sm ml-auto font-semibold transition-opacity hover:opacity-80"
            style={{ background: ACCENT, color: "#fff" }}
          >
            글쓰기
          </Link>
        </div>

        {posts.length === 0 ? (
          <div className="bento-card p-8 text-center">
            <p className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>아직 공개된 글이 없습니다.</p>
            <p className="text-sm mt-2" style={{ color: "var(--text-muted)" }}>첫 글을 발행하면 이 공간에 3x3 카드로 노출됩니다.</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
            {posts.map((post) => (
              <Link key={post.id} href={`/blog/${encodeURIComponent(post.slug)}`} className="pressable bento-card overflow-hidden hover:opacity-90 transition-opacity">
                <div className="relative aspect-[16/10]" style={{ background: "var(--border)" }}>
                  {post.thumbnailUrl ? (
                    <Image src={post.thumbnailUrl} alt={post.title} fill sizes="(max-width:768px) 100vw, (max-width:1280px) 50vw, 33vw" className="object-cover" unoptimized />
                  ) : (
                    <div className="w-full h-full" style={{ background: "linear-gradient(135deg, rgba(234,88,12,0.18), rgba(234,88,12,0.04))" }} />
                  )}
                </div>
                <div className="p-4 flex flex-col gap-3">
                  <div className="flex items-center justify-between gap-3 text-xs" style={{ color: "var(--text-muted)" }}>
                    <span>{formatBlogDate(post.publishedAt)}</span>
                    <span>{post.authorName}</span>
                  </div>
                  <p className="text-lg font-black leading-snug" style={{ color: "var(--text-primary)" }}>{post.title}</p>
                  <p className="text-sm leading-relaxed" style={{ color: "var(--text-muted)" }}>{post.description}</p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
