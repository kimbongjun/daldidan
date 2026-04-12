"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, BookOpenText } from "lucide-react";
import type { BlogPostSummary } from "@/lib/blog-shared";
import { formatBlogDate } from "@/lib/blog-shared";

export default function BlogWidget() {
  const [posts, setPosts] = useState<BlogPostSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/blog/posts?limit=3")
      .then((response) => response.json())
      .then((data) => setPosts(Array.isArray(data) ? data : []))
      .catch(() => setPosts([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="bento-card gradient-orange h-full flex flex-col p-5 gap-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: "#EA580C" }}>블로그</p>
          <h2 className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>최신 아티클</h2>
        </div>
        <Link
          href="/blog"
          className="flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg transition-opacity hover:opacity-70"
          style={{ background: "#EA580C22", color: "#EA580C" }}
        >
          상세보기 <ArrowRight size={11} />
        </Link>
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
              href={`/blog/${post.slug}`}
              className="rounded-2xl overflow-hidden flex gap-3 p-2 transition-opacity hover:opacity-80"
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
                <p className="text-xs mt-2" style={{ color: "var(--text-muted)" }}>{formatBlogDate(post.publishedAt)}</p>
              </div>
            </Link>
          ))
        )}
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
