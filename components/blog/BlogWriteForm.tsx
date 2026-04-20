"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { Calendar, LoaderCircle, PenLine, Trash2, X } from "lucide-react";
import type { EditableBlogPost } from "@/lib/blog-shared";
import { BLOG_CATEGORIES } from "@/lib/blog-shared";

// 에디터는 클라이언트 전용 무거운 번들이므로 dynamic import로 분리
// → 글 작성 페이지의 초기 로드 속도 향상
const BlogEditor = dynamic(() => import("@/components/blog/BlogEditor"), {
  ssr: false,
  loading: () => (
    <div
      style={{
        minHeight: 380,
        borderRadius: "1.75rem",
        background: "var(--bg-input)",
        border: "1px solid var(--border)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "0.5rem",
        color: "var(--text-muted)",
        fontSize: "0.875rem",
      }}
    >
      <LoaderCircle size={16} style={{ animation: "spin 0.8s linear infinite" }} />
      에디터 로딩 중...
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  ),
});

const DEFAULT_HTML = "";

function combineDateWithTime(dateOnly: string, source?: string | null) {
  const sourceDate = source ? new Date(source) : new Date();
  const base = Number.isNaN(sourceDate.getTime()) ? new Date() : sourceDate;
  const [year, month, day] = dateOnly.split("-").map(Number);
  const combined = new Date(base);
  combined.setFullYear(year, (month || 1) - 1, day || 1);
  return combined.toISOString();
}

interface EditorValue {
  html: string;
  json: unknown;
}

export default function BlogWriteForm({
  initialPost,
}: {
  initialPost?: EditableBlogPost | null;
}) {
  const router = useRouter();
  const isEditMode = Boolean(initialPost);
  const [title, setTitle] = useState(initialPost?.title ?? "");
  const [category, setCategory] = useState<string>(initialPost?.category ?? "");
  // 발행일: 기존 글이면 stored publishedAt, 신규 글이면 오늘 날짜 (YYYY-MM-DD)
  const [publishedDate, setPublishedDate] = useState<string>(() => {
    const toKstDate = (ms: number) => new Date(ms + 9 * 3600_000).toISOString().slice(0, 10);
    if (initialPost?.publishedAt) {
      return toKstDate(new Date(initialPost.publishedAt).getTime());
    }
    return toKstDate(Date.now());
  });
  const [content, setContent] = useState<EditorValue>({
    html: initialPost?.contentHtml ?? DEFAULT_HTML,
    json: null, // content_json은 저장하지 않음 (렌더링엔 html만 사용)
  });
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");
  const [showLeaveModal, setShowLeaveModal] = useState(false);

  // 초기값 대비 변경 여부 (에디터가 빈 상태를 <p></p> 로 반환하는 경우도 미변경으로 처리)
  const isDirty = useMemo(() => {
    const normalize = (h: string) => h.replace(/<p><\/p>/g, "").trim();
    const titleChanged = title.trim() !== (initialPost?.title ?? "").trim();
    const contentChanged = normalize(content.html) !== normalize(initialPost?.contentHtml ?? "");
    const categoryChanged = category !== (initialPost?.category ?? "");
    const toKstDate = (ms: number) => new Date(ms + 9 * 3600_000).toISOString().slice(0, 10);
    const initialDate = initialPost?.publishedAt
      ? toKstDate(new Date(initialPost.publishedAt).getTime())
      : toKstDate(Date.now());
    const dateChanged = publishedDate !== initialDate;
    return titleChanged || contentChanged || categoryChanged || dateChanged;
  }, [title, content.html, category, publishedDate, initialPost]);

  // 이벤트 핸들러 내 클로저에서 최신 isDirty를 읽기 위한 ref
  const isDirtyRef = useRef(isDirty);
  useEffect(() => {
    isDirtyRef.current = isDirty;
  }, [isDirty]);

  // 브라우저 새로고침/탭 닫기 방어
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (!isDirtyRef.current) return;
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, []);

  // 브라우저 뒤로가기 방어: 더미 state를 push 해서 popstate 를 가로챔
  useEffect(() => {
    window.history.pushState(null, "", window.location.href);
    const handlePop = () => {
      if (isDirtyRef.current) {
        window.history.pushState(null, "", window.location.href);
        setShowLeaveModal(true);
      }
    };
    window.addEventListener("popstate", handlePop);
    return () => window.removeEventListener("popstate", handlePop);
  }, []);

  const canSubmit = useMemo(() => {
    const plain = content.html.replace(/<[^>]+>/g, "").trim();
    return Boolean(title.trim() && plain.length > 0);
  }, [content.html, title]);

  const handleSubmit = async () => {
    if (!canSubmit || submitting) return;
    setSubmitting(true);
    setError("");

    try {
      const kstToday = new Date(Date.now() + 9 * 3600_000).toISOString().slice(0, 10);
      let resolvedPublishedAt: string;
      if (isEditMode && initialPost?.publishedAt) {
        const origKstDate = new Date(new Date(initialPost.publishedAt).getTime() + 9 * 3600_000).toISOString().slice(0, 10);
        resolvedPublishedAt = publishedDate === origKstDate
          ? initialPost.publishedAt
          : combineDateWithTime(publishedDate, initialPost.publishedAt);
      } else {
        resolvedPublishedAt = publishedDate === kstToday
          ? new Date().toISOString()
          : combineDateWithTime(publishedDate);
      }

      const response = await fetch("/api/blog/posts", {
        method: isEditMode ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: initialPost?.id,
          title,
          contentHtml: content.html,
          category: category || null,
          publishedAt: resolvedPublishedAt,
        }),
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error ?? "글을 저장하지 못했습니다.");
      }

      router.push(`/blog/${encodeURIComponent(payload.slug)}`);
      router.refresh();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "글을 저장하지 못했습니다.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!initialPost?.id || deleting) return;
    if (!confirm("정말 이 글을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.")) return;
    setDeleting(true);
    setError("");

    try {
      const response = await fetch("/api/blog/posts", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: initialPost.id }),
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error ?? "글을 삭제하지 못했습니다.");
      }

      router.push("/blog");
      router.refresh();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "글을 삭제하지 못했습니다.");
    } finally {
      setDeleting(false);
    }
  };

  const handleConfirmLeave = () => {
    setShowLeaveModal(false);
    router.push(isEditMode && initialPost?.slug ? `/blog/${initialPost.slug}` : "/blog");
  };

  const inputStyle: React.CSSProperties = {
    background: "var(--bg-input)",
    border: "1px solid var(--border)",
    borderRadius: "1rem",
    padding: "0.95rem 1rem",
    fontSize: "0.95rem",
    color: "var(--text-primary)",
    outline: "none",
    width: "100%",
  };

  return (
    <>
    {showLeaveModal && (
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        <div
          className="absolute inset-0"
          style={{ background: "rgba(0,0,0,0.65)", backdropFilter: "blur(4px)" }}
          onClick={() => setShowLeaveModal(false)}
        />
        <div
          className="relative bento-card p-6 flex flex-col gap-5 mx-4"
          style={{ width: 320, zIndex: 1 }}
        >
          <div className="flex flex-col gap-1.5">
            <p className="font-bold text-base" style={{ color: "var(--text-primary)" }}>
              글쓰기를 그만두겠습니까?
            </p>
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>
              작성 중인 내용이 저장되지 않습니다.
            </p>
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setShowLeaveModal(false)}
              className="pressable flex-1 py-2.5 rounded-2xl font-semibold text-sm"
              style={{
                background: "var(--bg-input)",
                color: "var(--text-primary)",
                border: "1px solid var(--border)",
              }}
            >
              계속 작성
            </button>
            <button
              type="button"
              onClick={handleConfirmLeave}
              className="pressable flex-1 py-2.5 rounded-2xl font-bold text-sm"
              style={{
                background: "rgba(244,63,94,0.15)",
                color: "#F43F5E",
                border: "1px solid rgba(244,63,94,0.3)",
              }}
            >
              나가기
            </button>
          </div>
        </div>
      </div>
    )}
    <div className="grid xl:grid-cols-[minmax(0,1fr)_320px] gap-6">
      <section className="bento-card p-5 sm:p-6 flex flex-col gap-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: "#EA580C" }}>블로그 작성</p>
            <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>요약과 썸네일은 본문에서 자동으로 추출됩니다.</p>
          </div>
          <div
            className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0"
            style={{ background: "rgba(234,88,12,0.14)", color: "#EA580C" }}
          >
            <PenLine size={18} />
          </div>
        </div>

        <input
          placeholder="글 제목"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          style={{ ...inputStyle, fontSize: "1.25rem", fontWeight: 800 }}
        />

        <BlogEditor value={content} onChange={setContent} />

        {error ? (
          <p className="text-sm font-medium" style={{ color: "#F43F5E" }}>{error}</p>
        ) : null}
      </section>

      <aside className="flex flex-col gap-4">
        {/* ── 카테고리 선택 ── */}
        <div className="bento-card p-5 flex flex-col gap-3">
          <p className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>카테고리</p>
          <div className="flex flex-wrap gap-2">
            {BLOG_CATEGORIES.map((cat) => {
              const active = category === cat;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategory(active ? "" : cat)}
                  className="pressable px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors"
                  style={{
                    background: active ? "rgba(234,88,12,0.18)" : "var(--bg-input)",
                    color: active ? "#EA580C" : "var(--text-muted)",
                    border: active ? "1px solid rgba(234,88,12,0.4)" : "1px solid var(--border)",
                  }}
                >
                  {cat}
                </button>
              );
            })}
          </div>
          {!category && (
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>선택하지 않으면 기타로 저장됩니다.</p>
          )}
        </div>

        {/* ── 발행일 설정 ── */}
        <div className="bento-card p-5 flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <Calendar size={14} style={{ color: "#EA580C" }} />
            <p className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>발행일</p>
          </div>
          <input
            type="date"
            value={publishedDate}
            onChange={(e) => setPublishedDate(e.target.value)}
            style={{
              background: "var(--bg-input)",
              border: "1px solid var(--border)",
              borderRadius: "0.75rem",
              padding: "0.6rem 0.75rem",
              fontSize: "0.875rem",
              color: "var(--text-primary)",
              outline: "none",
              width: "100%",
              colorScheme: "dark",
              overflow: "hidden",
            }}
          />
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            지정하지 않으면 오늘 날짜로 발행됩니다.
          </p>
        </div>

        <div className="bento-card p-5 flex flex-col gap-3">
          <p className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>발행 체크</p>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!canSubmit || submitting}
            className="pressable w-full py-3 rounded-2xl font-bold text-white transition-opacity disabled:opacity-45"
            style={{ background: "#EA580C" }}
          >
            {submitting ? (
              <span className="inline-flex items-center gap-2">
                <LoaderCircle size={16} className="animate-spin" />
                {isEditMode ? "저장 중" : "발행 중"}
              </span>
            ) : (
              isEditMode ? "수정 저장" : "게시하기"
            )}
          </button>
          <button
            type="button"
            onClick={() => {
              if (isDirty) {
                setShowLeaveModal(true);
              } else {
                handleConfirmLeave();
              }
            }}
            disabled={submitting || deleting}
            className="pressable w-full py-3 rounded-2xl font-bold transition-opacity disabled:opacity-45 flex items-center justify-center gap-2"
            style={{
              background: "var(--bg-input)",
              color: "var(--text-muted)",
              border: "1px solid var(--border)",
            }}
          >
            <X size={15} />
            취소하기
          </button>
          {isEditMode && (
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleting}
              className="pressable w-full py-3 rounded-2xl font-bold transition-opacity disabled:opacity-45 flex items-center justify-center gap-2"
              style={{ background: "rgba(244,63,94,0.12)", color: "#F43F5E", border: "1px solid rgba(244,63,94,0.25)" }}
            >
              {deleting ? (
                <><LoaderCircle size={16} className="animate-spin" />삭제 중</>
              ) : (
                <><Trash2 size={15} />글 삭제</>
              )}
            </button>
          )}
        </div>

      </aside>
    </div>
    </>
  );
}
