import Image from "next/image";
import Link from "next/link";
import type { BlogPostSummary } from "@/lib/blog-shared";
import { formatBlogDate } from "@/lib/blog-shared";

const ACCENT = "#EA580C";

const CATEGORY_COLORS: Record<string, { bg: string; color: string }> = {
  여행: { bg: "rgba(16,185,129,0.15)", color: "#10B981" },
  스윙: { bg: "rgba(99,102,241,0.15)", color: "#6366F1" },
  일상: { bg: "rgba(234,88,12,0.15)", color: "#EA580C" },
  육아: { bg: "rgba(244,63,94,0.15)", color: "#F43F5E" },
  재테크: { bg: "rgba(245,158,11,0.15)", color: "#F59E0B" },
  기타: { bg: "rgba(139,139,167,0.15)", color: "#8B8BA7" },
};

function groupByMonth(posts: BlogPostSummary[]) {
  const groups = new Map<string, { year: number; month: number; posts: BlogPostSummary[] }>();

  for (const post of posts) {
    const date = new Date(post.publishedAt);
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const key = `${year}-${String(month).padStart(2, "0")}`;

    if (!groups.has(key)) {
      groups.set(key, { year, month, posts: [] });
    }
    groups.get(key)!.posts.push(post);
  }

  return [...groups.values()].sort((a, b) => {
    if (a.year !== b.year) return b.year - a.year;
    return b.month - a.month;
  });
}

export default function BlogMonthlyView({ posts }: { posts: BlogPostSummary[] }) {
  const groups = groupByMonth(posts);

  if (groups.length === 0) return null;

  return (
    <div className="flex flex-col gap-10">
      {groups.map(({ year, month, posts: groupPosts }) => (
        <section key={`${year}-${month}`}>
          <div className="flex items-center gap-3 mb-5">
            <h2 className="text-lg font-black" style={{ color: "var(--text-primary)" }}>
              <span style={{ color: ACCENT }}>{year}년</span> {month}월
            </h2>
            <span className="text-xs" style={{ color: "var(--text-muted)" }}>
              {groupPosts.length}편
            </span>
            <div className="flex-1 h-px" style={{ background: "var(--border)" }} />
          </div>

          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
            {groupPosts.map((post) => {
              const catStyle = post.category ? CATEGORY_COLORS[post.category] : null;
              return (
                <Link
                  key={post.id}
                  href={`/blog/${encodeURIComponent(post.slug)}`}
                  className="pressable bento-card overflow-hidden hover:opacity-90 transition-opacity"
                >
                  <div
                    className="relative aspect-[16/10]"
                    style={{ background: "var(--border)" }}
                  >
                    {post.thumbnailUrl ? (
                      <Image
                        src={post.thumbnailUrl}
                        alt={post.title}
                        fill
                        sizes="(max-width:768px) 100vw, (max-width:1280px) 50vw, 33vw"
                        className="object-cover"
                        unoptimized
                      />
                    ) : (
                      <div
                        className="w-full h-full flex flex-col items-center justify-center gap-2"
                        style={{ background: "linear-gradient(135deg, rgba(234,88,12,0.1), rgba(234,88,12,0.03))" }}
                      >
                        <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="rgba(234,88,12,0.4)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" />
                          <polyline points="21 15 16 10 5 21" />
                        </svg>
                        <span style={{ fontSize: "0.7rem", color: "rgba(234,88,12,0.45)", fontWeight: 600 }}>이미지 없음</span>
                      </div>
                    )}
                    {post.category && catStyle && (
                      <span
                        className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded-lg text-xs font-bold"
                        style={{ background: catStyle.bg, color: catStyle.color, backdropFilter: "blur(4px)" }}
                      >
                        {post.category}
                      </span>
                    )}
                  </div>
                  <div className="p-4 flex flex-col gap-2">
                    <div className="flex items-center justify-between gap-3 text-xs" style={{ color: "var(--text-muted)" }}>
                      <span>{formatBlogDate(post.publishedAt)}</span>
                      <span>{post.authorName}</span>
                    </div>
                    <p className="text-base font-black leading-snug" style={{ color: "var(--text-primary)" }}>
                      {post.title}
                    </p>
                    <p className="text-sm leading-relaxed line-clamp-2" style={{ color: "var(--text-muted)" }}>
                      {post.description}
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
