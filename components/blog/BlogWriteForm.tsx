"use client";

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { LoaderCircle, PenLine, Trash2 } from "lucide-react";
import { sendNativeNotification } from "@/lib/notifications";
import type { EditableBlogPost } from "@/lib/blog-shared";

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
  const [content, setContent] = useState<EditorValue>({
    html: initialPost?.contentHtml ?? DEFAULT_HTML,
    json: null, // content_json은 저장하지 않음 (렌더링엔 html만 사용)
  });
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  const canSubmit = useMemo(() => {
    const plain = content.html.replace(/<[^>]+>/g, "").trim();
    return Boolean(title.trim() && plain.length > 0);
  }, [content.html, title]);

  const handleSubmit = async () => {
    if (!canSubmit || submitting) return;
    setSubmitting(true);
    setError("");

    try {
      const response = await fetch("/api/blog/posts", {
        method: isEditMode ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        // content_json 제외 — payload 크기 최소화
        body: JSON.stringify({
          id: initialPost?.id,
          title,
          contentHtml: content.html,
        }),
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error ?? "글을 저장하지 못했습니다.");
      }

      sendNativeNotification(
        isEditMode ? "블로그 글이 수정되었어요" : "블로그 글이 발행되었어요",
        isEditMode
          ? `${title.trim()} 글 수정이 완료되었습니다.`
          : `${title.trim()} 글이 성공적으로 공개되었습니다.`,
      );
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
  );
}
