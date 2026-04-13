import Image from "next/image";
import Link from "next/link";
import { getWeekOfMonth } from "date-fns";
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

function getWeekGroupKey(dateStr: string) {
  const date = new Date(dateStr);
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const week = getWeekOfMonth(date, { weekStartsOn: 1 });
  return { key: `${year}-${month}-${week}`, year, month, week };
}

function groupByWeek(posts: BlogPostSummary[]) {
  const groups = new Map<string, { year: number; month: number; week: number; posts: BlogPostSummary[] }>();

  for (const post of posts) {
    const { key, year, month, week } = getWeekGroupKey(post.publishedAt);
    if (!groups.has(key)) {
      groups.set(key, { year, month, week, posts: [] });
    }
    groups.get(key)!.posts.push(post);
  }

  return [...groups.values()].sort((a, b) => {
    if (a.year !== b.year) return b.year - a.year;
    if (a.month !== b.month) return b.month - a.month;
    return b.week - a.week;
  });
}

export default function BlogWeeklyView({ posts }: { posts: BlogPostSummary[] }) {
  const groups = groupByWeek(posts);

  if (groups.length === 0) return null;

  return (
    <div className="flex flex-col gap-10">
      {groups.map(({ year, month, week, posts: groupPosts }) => (
        <section key={`${year}-${month}-${week}`}>
          <div className="flex items-center gap-3 mb-4">
            <span
              className="text-xs font-bold px-2.5 py-1 rounded-lg"
              style={{ background: "rgba(234,88,12,0.15)", color: ACCENT }}
            >
              {year}년 {month}월
            </span>
            <h2 className="text-base font-black" style={{ color: "var(--text-primary)" }}>
              {week}주차
            </h2>
            <span className="text-xs" style={{ color: "var(--text-muted)" }}>
              {groupPosts.length}편
            </span>
            <div className="flex-1 h-px" style={{ background: "var(--border)" }} />
          </div>

          <div className="flex flex-col gap-3">
            {groupPosts.map((post) => {
              const catStyle = post.category ? CATEGORY_COLORS[post.category] : null;
              return (
                <Link
                  key={post.id}
                  href={`/blog/${encodeURIComponent(post.slug)}`}
                  className="pressable bento-card flex gap-4 p-3 hover:opacity-90 transition-opacity overflow-hidden"
                >
                  <div
                    className="relative shrink-0 rounded-lg overflow-hidden"
                    style={{ width: 80, height: 60, background: "var(--border)" }}
                  >
                    {post.thumbnailUrl ? (
                      <Image
                        src={post.thumbnailUrl}
                        alt={post.title}
                        fill
                        sizes="80px"
                        className="object-cover"
                        unoptimized
                      />
                    ) : (
                      <div
                        className="w-full h-full flex items-center justify-center"
                        style={{ background: "linear-gradient(135deg, rgba(234,88,12,0.1), rgba(234,88,12,0.03))" }}
                      >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="rgba(234,88,12,0.4)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" />
                          <polyline points="21 15 16 10 5 21" />
                        </svg>
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0 flex flex-col justify-center gap-1">
                    <div className="flex items-center gap-2">
                      {post.category && catStyle && (
                        <span
                          className="shrink-0 px-1.5 py-0.5 rounded text-xs font-bold"
                          style={{ background: catStyle.bg, color: catStyle.color }}
                        >
                          {post.category}
                        </span>
                      )}
                      <p
                        className="text-sm font-black truncate"
                        style={{ color: "var(--text-primary)" }}
                      >
                        {post.title}
                      </p>
                    </div>
                    <p
                      className="text-xs truncate"
                      style={{ color: "var(--text-muted)" }}
                    >
                      {post.description}
                    </p>
                    <div className="flex items-center gap-2 text-xs" style={{ color: "var(--text-muted)" }}>
                      <span>{formatBlogDate(post.publishedAt)}</span>
                      <span>·</span>
                      <span>{post.authorName}</span>
                    </div>
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
