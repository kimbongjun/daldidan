"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, BookOpenText, MessageCircle, PenLine, User } from "lucide-react";
import type { BlogPostSummary } from "@/lib/blog-shared";
import { formatBlogDate } from "@/lib/blog-shared";

const NEW_COMMENT_THRESHOLD_DAYS = 7;

function isNewComment(latestCommentAt: string | null): boolean {
  if (!latestCommentAt) return false;
  const diff = Date.now() - new Date(latestCommentAt).getTime();
  return diff < NEW_COMMENT_THRESHOLD_DAYS * 24 * 60 * 60 * 1000;
}

type BlogWidgetProps = {
  initialPosts?: BlogPostSummary[];
};

export default function BlogWidget({ initialPosts }: BlogWidgetProps) {
  const [posts, setPosts] = useState<BlogPostSummary[]>(initialPosts ?? []);
  const [loading, setLoading] = useState(initialPosts === undefined);

  useEffect(() => {
    if (initialPosts !== undefined) {
      return;
    }

    let active = true;
    const controller = new AbortController();

    fetch("/api/blog/posts?limit=3", { signal: controller.signal })
      .then((response) => response.json())
      .then((data) => {
        if (!active) return;
        setPosts(Array.isArray(data) ? data : []);
      })
      .catch(() => {
        if (!active) return;
        setPosts([]);
      })
      .finally(() => {
        if (!active) return;
        setLoading(false);
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, [initialPosts]);

  return (
    <div className="bento-card gradient-orange h-full flex flex-col p-5 gap-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: "#EA580C" }}>블로그</p>
          <h2 className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>최신 아티클</h2>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Link
            href="/blog/write"
            className="pressable flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg transition-opacity hover:opacity-70"
            style={{ background: "#EA580C", color: "#fff" }}
          >
            글쓰기 <PenLine size={11} />
          </Link>
          <Link
            href="/blog"
            className="pressable flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg transition-opacity hover:opacity-70"
            style={{ background: "#EA580C22", color: "#EA580C" }}
          >
            상세보기 <ArrowRight size={11} />
          </Link>
        </div>
      </div>

      <div className="flex flex-col gap-3 flex-1 overflow-auto scrollbar-hide">
        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <div style={{ width: 20, height: 20, borderRadius: "50%", border: "2px solid #EA580C", borderTopColor: "transparent", animation: "spin 0.8s linear infinite" }} />
          </div>
        ) : posts.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center">
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center"
              style={{ background: "rgba(234,88,12,0.14)", color: "#EA580C" }}
            >
              <BookOpenText size={22} />
            </div>
            <div>
              <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>아직 공개된 글이 없습니다.</p>
              <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>첫 글을 작성하면 이 공간에 최신 포스트가 표시됩니다.</p>
            </div>
            <Link href="/blog" className="text-xs font-semibold" style={{ color: "#EA580C" }}>
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
                {post.thumbnailUrl ? (
                  <Image src={post.thumbnailUrl} alt={post.title} fill sizes="96px" className="object-cover" unoptimized />
                ) : (
                  <div className="w-full h-full flex items-center justify-center" style={{ color: "#EA580C", background: "rgba(234,88,12,0.12)" }}>
                    <BookOpenText size={18} />
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1 flex flex-col justify-between py-1">
                <p className="text-sm font-semibold clamp-2" style={{ color: "var(--text-primary)" }}>{post.title}</p>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2">
                  <span className="flex items-center gap-1 text-xs" style={{ color: "var(--text-muted)" }}>
                    <User size={11} />
                    {post.authorName}
                  </span>
                  <span className="relative flex items-center gap-1 text-xs" style={{ color: "var(--text-muted)" }}>
                    <span className="relative inline-flex items-center">
                      <MessageCircle size={11} />
                      {isNewComment(post.latestCommentAt) && (
                        <>
                          <span
                            className="absolute -top-1 -right-1 w-1.5 h-1.5 rounded-full"
                            style={{ background: "#EA580C", boxShadow: "0 0 5px rgba(234,88,12,0.9)" }}
                          />
                          <span
                            className="absolute -top-1 -right-1 w-1.5 h-1.5 rounded-full animate-ping"
                            style={{ background: "#EA580C", opacity: 0.6 }}
                          />
                        </>
                      )}
                    </span>
                    {post.commentCount.toLocaleString()}
                    {isNewComment(post.latestCommentAt) && (
                      <span className="px-1 py-px rounded text-xs font-bold" style={{ background: "rgba(234,88,12,0.18)", color: "#EA580C", fontSize: "0.6rem" }}>
                        NEW
                      </span>
                    )}
                  </span>
                </div>
              </div>
            </Link>
          ))
        )}
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
