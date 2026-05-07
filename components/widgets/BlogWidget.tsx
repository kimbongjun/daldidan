"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, BookOpenText, Calendar, Lock, MessageCircle, PenLine, User } from "lucide-react";
import type { BlogPostSummary } from "@/lib/blog-shared";
import { formatBlogDateTime, getBlogActivityTimestamp } from "@/lib/blog-shared";
import { fetchWithTimeout } from "@/lib/fetch-with-timeout";
import { createClient } from "@/lib/supabase/client";
import { queryKeys } from "@/lib/queryKeys";
import type { AuthUser } from "@supabase/supabase-js";

const ACCENT = "#F7A35C";
const NEW_COMMENT_THRESHOLD_DAYS = 7;

function WidgetThumbnail({ src, alt, slug }: { src: string | null; alt: string; slug: string }) {
  const [errored, setErrored] = useState(false);
  const fallbackSrc = `https://picsum.photos/seed/${slug.replace(/[^a-z0-9]/gi, "").slice(0, 24) || "blog"}/96/96`;

  if (!src || errored) {
    return (
      <Image
        src={fallbackSrc}
        alt={alt}
        fill
        sizes="96px"
        className="object-cover"
        unoptimized
      />
    );
  }

  return (
    <Image
      src={src}
      alt={alt}
      fill
      sizes="96px"
      className="object-cover"
      unoptimized
      onError={() => setErrored(true)}
    />
  );
}

function isNewComment(latestCommentAt: string | null): boolean {
  if (!latestCommentAt) return false;
  const diff = Date.now() - new Date(latestCommentAt).getTime();
  return diff < NEW_COMMENT_THRESHOLD_DAYS * 24 * 60 * 60 * 1000;
}

type BlogWidgetProps = {
  initialPosts?: BlogPostSummary[];
};

export default function BlogWidget({ initialPosts }: BlogWidgetProps) {
  const [user, setUser] = useState<AuthUser | null | undefined>(undefined);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => setUser(data.user ?? null));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  const { data: posts = initialPosts ?? [], isLoading: loading } = useQuery({
    queryKey: queryKeys.blog.posts(3),
    queryFn: async ({ signal }) => {
      const res = await fetchWithTimeout("/api/blog/posts?limit=3", { signal }, 7000);
      const data = await res.json() as unknown;
      return Array.isArray(data) ? (data as BlogPostSummary[]) : [];
    },
    enabled: !!user && initialPosts === undefined,
    initialData: initialPosts,
    staleTime: 5 * 60 * 1000,
  });

  // ── 비로그인 상태 ──────────────────────────────────
  if (user === null) {
    return (
      <div className="bento-card h-full flex flex-col p-5 gap-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: ACCENT }}>블로그</p>
            <h2 className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>최신 아티클</h2>
          </div>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center"
            style={{ background: "rgba(247,163,92,0.12)", color: ACCENT }}
          >
            <Lock size={24} />
          </div>
          <div>
            <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>로그인 후 이용 가능합니다</p>
            <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>블로그 열람 및 글쓰기는 로그인이 필요해요.</p>
          </div>
          <Link
            href="/login"
            className="px-5 py-2 rounded-xl text-sm font-bold transition-opacity hover:opacity-80"
            style={{ background: ACCENT, color: "#fff" }}
          >
            로그인하기
          </Link>
        </div>
      </div>
    );
  }

  // ── 로그인 상태 ──────────────────────────────────
  return (
    <div className="bento-card h-full flex flex-col p-5 gap-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: ACCENT }}>블로그</p>
          <h2 className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>최신 아티클</h2>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Link
            href="/blog/write"
            className="pressable flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg transition-opacity hover:opacity-70"
            style={{ background: ACCENT, color: "#fff" }}
          >
            글쓰기 <PenLine size={11} />
          </Link>
          <Link
            href="/blog"
            className="pressable flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg transition-opacity hover:opacity-70"
            style={{ background: "#F7A35C22", color: ACCENT }}
          >
            상세보기 <ArrowRight size={11} />
          </Link>
        </div>
      </div>

      <div className="flex flex-col gap-3 flex-1 overflow-auto scrollbar-hide">
        {loading || user === undefined ? (
          <div className="flex flex-col gap-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="rounded-2xl p-2 flex gap-3" style={{ background: "rgba(255,255,255,0.04)" }}>
                <div className="w-16 h-16 rounded-xl skeleton-shimmer shrink-0" />
                <div className="flex flex-col gap-1.5 flex-1 min-w-0 pt-0.5">
                  <div className="h-3.5 w-3/4 rounded skeleton-shimmer" />
                  <div className="h-3 w-1/2 rounded skeleton-shimmer" />
                  <div className="h-2.5 w-2/5 rounded skeleton-shimmer mt-1" />
                </div>
              </div>
            ))}
          </div>
        ) : posts.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center">
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center"
              style={{ background: "rgba(247,163,92,0.14)", color: ACCENT }}
            >
              <BookOpenText size={22} />
            </div>
            <div>
              <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>아직 공개된 글이 없습니다.</p>
              <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>첫 글을 작성하면 이 공간에 최신 포스트가 표시됩니다.</p>
            </div>
            <Link href="/blog" className="text-xs font-semibold" style={{ color: ACCENT }}>
              블로그 보러 가기
            </Link>
          </div>
        ) : (
          posts.map((post) => (
            <Link
              key={post.id}
              href={`/blog/${encodeURIComponent(post.slug)}`}
              className="pressable rounded-2xl overflow-hidden flex gap-3 p-2 transition-opacity hover:opacity-80"
              style={{ background: "rgba(255,255,255,0.04)" }}
            >
              <div className="relative w-24 shrink-0 rounded-xl overflow-hidden" style={{ background: "var(--border)", aspectRatio: "1 / 1" }}>
                <WidgetThumbnail src={post.thumbnailUrl} alt={post.title} slug={post.slug} />
              </div>
              <div className="min-w-0 flex-1 flex flex-col justify-between py-1">
                <p className="text-sm font-semibold clamp-2" style={{ color: "var(--text-primary)" }}>{post.title}</p>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2">
                  <span className="flex items-center gap-1 text-xs" style={{ color: "var(--text-muted)" }}>
                    <User size={11} />
                    {post.authorName}
                  </span>
                  <span className="flex items-center gap-1 text-xs" style={{ color: "var(--text-muted)" }}>
                    <Calendar size={11} />
                    {formatBlogDateTime(getBlogActivityTimestamp(post))}
                  </span>
                  <span className="relative flex items-center gap-1 text-xs" style={{ color: "var(--text-muted)" }}>
                    <span className="relative inline-flex items-center">
                      <MessageCircle size={11} />
                      {isNewComment(post.latestCommentAt) && (
                        <>
                          <span className="absolute -top-1 -right-1 w-1.5 h-1.5 rounded-full" style={{ background: ACCENT, boxShadow: "0 0 5px rgba(247,163,92,0.9)" }} />
                          <span className="absolute -top-1 -right-1 w-1.5 h-1.5 rounded-full animate-ping" style={{ background: ACCENT, opacity: 0.6 }} />
                        </>
                      )}
                    </span>
                    {post.commentCount.toLocaleString()}
                    {isNewComment(post.latestCommentAt) && (
                      <span className="px-1 py-px rounded text-xs font-bold" style={{ background: "rgba(247,163,92,0.18)", color: ACCENT, fontSize: "0.6rem" }}>NEW</span>
                    )}
                  </span>
                </div>
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
