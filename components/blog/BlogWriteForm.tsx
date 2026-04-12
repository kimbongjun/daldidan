"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle, PenLine } from "lucide-react";
import BlogEditor, { DEFAULT_EDITOR_HTML } from "@/components/blog/BlogEditor";
import { sendNativeNotification } from "@/lib/notifications";

interface EditorValue {
  html: string;
  json: unknown;
}

const EMPTY_CONTENT: EditorValue = {
  html: DEFAULT_EDITOR_HTML,
  json: null,
};

export default function BlogWriteForm() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [thumbnailUrl, setThumbnailUrl] = useState("");
  const [content, setContent] = useState<EditorValue>(EMPTY_CONTENT);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const canSubmit = useMemo(() => {
    const plain = content.html.replace(/<[^>]+>/g, "").trim();
    return Boolean(title.trim() && description.trim() && plain.length > 0);
  }, [content.html, description, title]);

  const handleSubmit = async () => {
    if (!canSubmit || submitting) return;

    setSubmitting(true);
    setError("");

    try {
      const response = await fetch("/api/blog/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description,
          thumbnailUrl,
          contentHtml: content.html,
          contentJson: content.json,
        }),
      });

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error ?? "글을 저장하지 못했습니다.");
      }

      sendNativeNotification(
        "블로그 글이 발행되었어요",
        `${title.trim()} 글이 성공적으로 공개되었습니다.`,
      );
      router.push(`/blog/${payload.slug}`);
      router.refresh();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "글을 저장하지 못했습니다.");
    } finally {
      setSubmitting(false);
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
            <h2 className="text-2xl font-black leading-tight" style={{ color: "var(--text-primary)" }}>생각을 문서처럼 정리하는 에디터</h2>
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
          onChange={(event) => setTitle(event.target.value)}
          style={{ ...inputStyle, fontSize: "1.25rem", fontWeight: 800 }}
        />

        <textarea
          placeholder="리스트 카드와 위젯에 보여줄 짧은 설명"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          rows={3}
          style={{ ...inputStyle, resize: "vertical" }}
        />

        <input
          placeholder="썸네일 이미지 URL"
          value={thumbnailUrl}
          onChange={(event) => setThumbnailUrl(event.target.value)}
          style={inputStyle}
        />

        <BlogEditor value={content} onChange={setContent} />

        {error ? (
          <p className="text-sm font-medium" style={{ color: "#F43F5E" }}>{error}</p>
        ) : null}
      </section>

      <aside className="flex flex-col gap-4">
        <div className="bento-card p-5 flex flex-col gap-3">
          <p className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>발행 체크</p>
          <p className="text-sm leading-relaxed" style={{ color: "var(--text-muted)" }}>
            제목, 설명, 본문이 모두 채워지면 즉시 공개 글로 발행됩니다. 썸네일은 비워도 저장할 수 있습니다.
          </p>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!canSubmit || submitting}
            className="w-full py-3 rounded-2xl font-bold text-white transition-opacity disabled:opacity-45"
            style={{ background: "#EA580C" }}
          >
            {submitting ? (
              <span className="inline-flex items-center gap-2">
                <LoaderCircle size={16} className="animate-spin" />
                발행 중
              </span>
            ) : (
              "게시하기"
            )}
          </button>
        </div>

        <div className="bento-card p-5 flex flex-col gap-3">
          <p className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>작성 팁</p>
          <p className="text-sm leading-relaxed" style={{ color: "var(--text-muted)" }}>
            첫 문단은 문제 정의, 중간은 정리된 섹션, 마지막은 한 줄 결론으로 구성하면 읽기 흐름이 좋아집니다.
          </p>
        </div>
      </aside>
    </div>
  );
}
