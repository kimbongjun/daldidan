import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { MessageCircle } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import BlogCategoryFilter from "@/components/blog/BlogCategoryFilter";
import BlogViewToggle from "@/components/blog/BlogViewToggle";
import BlogWeeklyView from "@/components/blog/BlogWeeklyView";
import BlogMonthlyView from "@/components/blog/BlogMonthlyView";
import { getPublishedBlogPosts, getBlogPostCount } from "@/lib/blog";
import Pagination from "@/components/Pagination";
import { formatBlogDateTime, getBlogActivityTimestamp } from "@/lib/blog-shared";
import type { BlogViewType } from "@/components/blog/BlogViewToggle";
import AiSummarySubtitle from "@/components/AiSummarySubtitle";

const NEW_COMMENT_THRESHOLD_DAYS = 7;

function isNewComment(latestCommentAt: string | null): boolean {
  if (!latestCommentAt) return false;
  const diff = Date.now() - new Date(latestCommentAt).getTime();
  return diff < NEW_COMMENT_THRESHOLD_DAYS * 24 * 60 * 60 * 1000;
}

const ACCENT = "#EA580C";

export const revalidate = 300;

const CATEGORY_COLORS: Record<string, { bg: string; color: string }> = {
  여행: { bg: "rgba(16,185,129,0.15)", color: "#10B981" },
  스윙: { bg: "rgba(99,102,241,0.15)", color: "#6366F1" },
  일상: { bg: "rgba(234,88,12,0.15)", color: "#EA580C" },
  육아: { bg: "rgba(244,63,94,0.15)", color: "#F43F5E" },
  재테크: { bg: "rgba(245,158,11,0.15)", color: "#F59E0B" },
  기타: { bg: "rgba(139,139,167,0.15)", color: "#8B8BA7" },
};

function isValidView(v: string | undefined): v is BlogViewType {
  return v === "list" || v === "weekly" || v === "monthly";
}

const ITEMS_PER_PAGE = 9;

export default async function BlogPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; view?: string; page?: string }>;
}) {
  const { category, view: viewParam, page: pageParam } = await searchParams;
  const activeCategory = category ?? "";
  const activeView: BlogViewType = isValidView(viewParam) ? viewParam : "list";
  const pageNum = Math.max(1, parseInt(pageParam ?? "1", 10) || 1);

  let posts: Awaited<ReturnType<typeof getPublishedBlogPosts>>;
  let totalPages = 1;

  if (activeView === "list") {
    const offset = (pageNum - 1) * ITEMS_PER_PAGE;
    const [fetchedPosts, totalCount] = await Promise.all([
      getPublishedBlogPosts(ITEMS_PER_PAGE, activeCategory || undefined, offset),
      getBlogPostCount(activeCategory || undefined),
    ]);
    posts = fetchedPosts;
    totalPages = Math.max(1, Math.ceil(totalCount / ITEMS_PER_PAGE));
  } else {
    posts = await getPublishedBlogPosts(200, activeCategory || undefined);
  }

  return (
    <div className="min-h-screen" style={{ background: "var(--bg-base)" }}>
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 pb-12">
        <PageHeader
          title="블로그"
          subtitle={
            <AiSummarySubtitle
              target="blog"
              items={posts.map((p) => p.title)}
              fallback="달디단의 인생스토리"
              accentColor={ACCENT}
            />
          }
          accentColor={ACCENT}
          actions={
            <Link
              href="/blog/write"
              className="pressable px-4 py-2 rounded-xl text-sm font-semibold transition-opacity hover:opacity-80"
              style={{ background: ACCENT, color: "#fff" }}
            >
              글쓰기
            </Link>
          }
        />

        <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
          <Suspense fallback={<div />}>
            <BlogCategoryFilter activeCategory={activeCategory} />
          </Suspense>
          <Suspense fallback={<div />}>
            <BlogViewToggle activeView={activeView} />
          </Suspense>
        </div>

        {posts.length === 0 ? (
          <div className="bento-card p-8 text-center">
            <p className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>
              {activeCategory ? `'${activeCategory}' 카테고리 글이 없습니다.` : "아직 공개된 글이 없습니다."}
            </p>
            <p className="text-sm mt-2" style={{ color: "var(--text-muted)" }}>
              {activeCategory ? "다른 카테고리를 선택하거나 전체 글을 확인해 보세요." : "첫 글을 발행하면 이 공간에 카드로 노출됩니다."}
            </p>
          </div>
        ) : activeView === "weekly" ? (
          <BlogWeeklyView posts={posts} />
        ) : activeView === "monthly" ? (
          <BlogMonthlyView posts={posts} />
        ) : (
          <>
            <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
              {posts.map((post) => {
                const catStyle = post.category ? CATEGORY_COLORS[post.category] : null;
                return (
                  <Link key={post.id} href={`/blog/${encodeURIComponent(post.slug)}`} className="pressable bento-card overflow-hidden hover:opacity-90 transition-opacity">
                    <div className="relative aspect-[16/10]" style={{ background: "var(--border)" }}>
                      {post.thumbnailUrl ? (
                        <Image src={post.thumbnailUrl} alt={post.title} fill sizes="(max-width:768px) 100vw, (max-width:1280px) 50vw, 33vw" className="object-cover" unoptimized />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center gap-2"
                          style={{ background: "linear-gradient(135deg, rgba(234,88,12,0.1), rgba(234,88,12,0.03))" }}>
                          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="rgba(234,88,12,0.4)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/>
                            <polyline points="21 15 16 10 5 21"/>
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
                    <div className="p-4 flex flex-col gap-3">
                      <div className="flex items-center justify-between gap-3 text-xs" style={{ color: "var(--text-muted)" }}>
                        <span>{formatBlogDateTime(getBlogActivityTimestamp(post))}</span>
                        <span>{post.authorName}</span>
                      </div>
                      <p className="text-lg font-black leading-snug" style={{ color: "var(--text-primary)" }}>{post.title}</p>
                      <p className="text-sm leading-relaxed" style={{ color: "var(--text-muted)" }}>{post.description}</p>
                      <div className="flex items-center gap-1.5 text-xs" style={{ color: "var(--text-muted)" }}>
                        <span className="relative flex items-center gap-1">
                          <MessageCircle size={13} />
                          {isNewComment(post.latestCommentAt) && (
                            <span
                              className="absolute -top-1 -right-1 w-2 h-2 rounded-full"
                              style={{ background: "#EA580C", boxShadow: "0 0 6px rgba(234,88,12,0.8)" }}
                            />
                          )}
                        </span>
                        <span>{post.commentCount.toLocaleString()}</span>
                        {isNewComment(post.latestCommentAt) && (
                          <span className="px-1.5 py-0.5 rounded-md text-xs font-bold" style={{ background: "rgba(234,88,12,0.15)", color: "#EA580C" }}>
                            NEW
                          </span>
                        )}
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
            <Pagination
              currentPage={pageNum}
              totalPages={totalPages}
              hrefTemplate={
                activeCategory
                  ? `/blog?category=${encodeURIComponent(activeCategory)}&page={page}`
                  : `/blog?page={page}`
              }
              accentColor={ACCENT}
            />
          </>
        )}
      </div>
    </div>
  );
}
