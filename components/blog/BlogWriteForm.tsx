"use client";

import Image from "next/image";
import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ImagePlus, LoaderCircle, PenLine, Trash2 } from "lucide-react";
import BlogEditor, { DEFAULT_EDITOR_HTML } from "@/components/blog/BlogEditor";
import { filesToDataUrls } from "@/lib/image-upload";
import { sendNativeNotification } from "@/lib/notifications";
import type { EditableBlogPost } from "@/lib/blog-shared";

interface EditorValue {
  html: string;
  json: unknown;
}

const EMPTY_CONTENT: EditorValue = {
  html: DEFAULT_EDITOR_HTML,
  json: null,
};

export default function BlogWriteForm({
  initialPost,
}: {
  initialPost?: EditableBlogPost | null;
}) {
  const router = useRouter();
  const isEditMode = Boolean(initialPost);
  const [title, setTitle] = useState(initialPost?.title ?? "");
  const [description, setDescription] = useState(initialPost?.description ?? "");
  const [thumbnailUrl, setThumbnailUrl] = useState(initialPost?.thumbnailUrl ?? "");
  const [content, setContent] = useState<EditorValue>(
    initialPost
      ? { html: initialPost.contentHtml, json: initialPost.contentJson }
      : EMPTY_CONTENT,
  );
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [thumbnailUploading, setThumbnailUploading] = useState(false);
  const [error, setError] = useState("");
  const thumbnailInputRef = useRef<HTMLInputElement | null>(null);

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
        method: isEditMode ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: initialPost?.id,
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

  const handleThumbnailUpload = async (files: FileList | null) => {
    if (!files?.length) return;

    setThumbnailUploading(true);
    setError("");

    try {
      const [firstImage] = await filesToDataUrls([files[0]]);
      if (!firstImage) {
        throw new Error("썸네일 이미지를 읽지 못했습니다.");
      }
      setThumbnailUrl(firstImage.src);
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "썸네일 업로드에 실패했습니다.");
    } finally {
      setThumbnailUploading(false);
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
          placeholder="글 요약 내용"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          rows={3}
          style={{ ...inputStyle, resize: "vertical" }}
        />

        <div className="flex flex-col gap-3">
          <input
            placeholder="썸네일 이미지 URL"
            value={thumbnailUrl}
            onChange={(event) => setThumbnailUrl(event.target.value)}
            style={inputStyle}
          />
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => thumbnailInputRef.current?.click()}
              className="pressable inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl text-sm font-semibold"
              style={{ background: "rgba(234,88,12,0.12)", color: "#EA580C", border: "1px solid rgba(234,88,12,0.2)" }}
            >
              <ImagePlus size={15} />
              {thumbnailUploading ? "업로드 중..." : "썸네일 업로드"}
            </button>
            <input
              ref={thumbnailInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={async (event) => {
                await handleThumbnailUpload(event.target.files);
                event.target.value = "";
              }}
            />
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>
              파일 업로드 또는 URL 입력 중 하나를 사용할 수 있습니다.
            </p>
          </div>
          {thumbnailUrl ? (
            <div
              className="relative overflow-hidden rounded-[1.25rem]"
              style={{ border: "1px solid var(--border)", background: "var(--bg-input)", aspectRatio: "16 / 9" }}
            >
              <Image src={thumbnailUrl} alt="썸네일 미리보기" fill sizes="(max-width: 1200px) 100vw, 720px" className="object-cover" unoptimized />
            </div>
          ) : null}
        </div>

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
