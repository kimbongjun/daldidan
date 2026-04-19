"use client";

import React, { useEffect, useState, useCallback } from "react";
import { LoaderCircle, MessageCircle, Pencil, Trash2, X, Check, CornerDownRight, Image as ImageIcon } from "lucide-react";
import ImageLightbox from "@/components/blog/ImageLightbox";
import { formatBlogDate } from "@/lib/blog-shared";
import { createClient } from "@/lib/supabase/client";
import type { AuthUser } from "@supabase/supabase-js";

interface Comment {
  id: string;
  user_id: string | null;
  author_name: string;
  content: string;
  image_urls: string[];
  created_at: string;
  updated_at: string;
  parent_id: string | null;
}

const ACCENT = "#EA580C";

const inputStyle: React.CSSProperties = {
  background: "var(--bg-input)",
  border: "1px solid var(--border)",
  borderRadius: "0.75rem",
  padding: "0.65rem 0.875rem",
  fontSize: "0.9rem",
  color: "var(--text-primary)",
  outline: "none",
  width: "100%",
};

function getBrowserId(): string {
  if (typeof window === "undefined") return "";
  let id = localStorage.getItem("daldidan_browser_id");
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem("daldidan_browser_id", id);
  }
  return id;
}

// ─────────────────────────────────────────────────────────────
// 이미지 업로드 UI
// ─────────────────────────────────────────────────────────────
interface ImageUploadProps {
  images: string[];
  uploading: boolean;
  onUpload: (files: FileList | null) => void;
  onRemove: (index: number) => void;
}

function ImageUploadArea({ images, uploading, onUpload, onRemove }: ImageUploadProps) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      {images.map((url, i) => (
        <div
          key={url}
          className="relative w-16 h-16 rounded-xl overflow-hidden shrink-0"
          style={{ border: "1px solid var(--border)" }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={url} alt={`첨부 이미지 ${i + 1}`} className="w-full h-full object-cover" />
          <button
            type="button"
            onClick={() => onRemove(i)}
            className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full flex items-center justify-center text-white"
            style={{ background: "rgba(0,0,0,0.7)", fontSize: "10px", lineHeight: 1 }}
          >
            ×
          </button>
        </div>
      ))}
      {images.length < 3 && (
        <label
          className="pressable w-16 h-16 rounded-xl flex flex-col items-center justify-center cursor-pointer gap-1 shrink-0"
          style={{ border: "1px dashed var(--border)", color: "var(--text-muted)" }}
        >
          {uploading ? (
            <LoaderCircle size={16} className="animate-spin" />
          ) : (
            <>
              <ImageIcon size={16} />
              <span style={{ fontSize: "10px" }}>사진</span>
            </>
          )}
          <input
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            disabled={uploading}
            onChange={(e) => onUpload(e.target.files)}
          />
        </label>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// 댓글 카드
// ─────────────────────────────────────────────────────────────
interface CommentCardProps {
  comment: Comment;
  isReply?: boolean;
  canManage: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onReply?: () => void;
  replyCount?: number;
  onImageClick: (urls: string[], index: number) => void;
}

function CommentCard({
  comment,
  isReply,
  canManage,
  onEdit,
  onDelete,
  onReply,
  replyCount,
  onImageClick,
}: CommentCardProps) {
  return (
    <div
      className="rounded-2xl p-4 flex flex-col gap-2"
      style={{ background: "var(--bg-input)", border: "1px solid var(--border)" }}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          {isReply && (
            <CornerDownRight size={13} style={{ color: ACCENT, flexShrink: 0 }} />
          )}
          <span
            className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
            style={{ background: "rgba(234,88,12,0.14)", color: ACCENT }}
          >
            {comment.author_name.slice(0, 1)}
          </span>
          <span className="text-sm font-semibold truncate" style={{ color: "var(--text-primary)" }}>
            {comment.author_name}
          </span>
          <span className="text-xs shrink-0" style={{ color: "var(--text-muted)" }}>
            {formatBlogDate(comment.updated_at !== comment.created_at ? comment.updated_at : comment.created_at)}
            {comment.updated_at !== comment.created_at ? " (수정됨)" : ""}
          </span>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {!isReply && onReply && (
            <button
              onClick={onReply}
              className="pressable px-2 py-1 rounded-lg text-xs font-semibold flex items-center gap-1"
              style={{ color: ACCENT, background: "rgba(234,88,12,0.1)" }}
            >
              <CornerDownRight size={11} />
              답글
              {replyCount ? ` (${replyCount})` : ""}
            </button>
          )}
          {canManage && (
            <>
              <button
                onClick={onEdit}
                className="pressable p-1.5 rounded-lg"
                style={{ color: "var(--text-muted)" }}
                title="수정"
              >
                <Pencil size={13} />
              </button>
              <button
                onClick={onDelete}
                className="pressable p-1.5 rounded-lg"
                style={{ color: "var(--text-muted)" }}
                title="삭제"
              >
                <Trash2 size={13} />
              </button>
            </>
          )}
        </div>
      </div>

      <p
        className="text-sm leading-relaxed whitespace-pre-wrap"
        style={{ color: "var(--text-primary)", paddingLeft: "2.25rem" }}
      >
        {comment.content}
      </p>

      {/* 첨부 이미지 */}
      {comment.image_urls && comment.image_urls.length > 0 && (
        <div className="flex flex-wrap gap-2" style={{ paddingLeft: "2.25rem" }}>
          {comment.image_urls.map((url, i) => (
            <button
              key={url}
              type="button"
              onClick={() => onImageClick(comment.image_urls, i)}
              className="w-20 h-20 rounded-xl overflow-hidden block pressable"
              style={{ border: "1px solid var(--border)", padding: 0 }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={url}
                alt={`이미지 ${i + 1}`}
                className="w-full h-full object-cover hover:opacity-80 transition-opacity"
              />
            </button>
          ))}
        </div>
      )}

    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// 메인 컴포넌트
// ─────────────────────────────────────────────────────────────
export default function BlogComments({ postId }: { postId: string }) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);

  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [authChecked, setAuthChecked] = useState(false);

  // ─── 본댓글 작성 폼 ───
  const [authorName, setAuthorName] = useState("");
  const [password, setPassword] = useState("");
  const [content, setContent] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [imageUploading, setImageUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  // ─── 대댓글 작성 폼 ───
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyAuthorName, setReplyAuthorName] = useState("");
  const [replyPassword, setReplyPassword] = useState("");
  const [replyContent, setReplyContent] = useState("");
  const [replyImages, setReplyImages] = useState<string[]>([]);
  const [replyImageUploading, setReplyImageUploading] = useState(false);
  const [replySubmitting, setReplySubmitting] = useState(false);
  const [replyError, setReplyError] = useState("");

  // ─── 이미지 라이트박스 ───
  const [lightbox, setLightbox] = useState<{ urls: string[]; index: number } | null>(null);
  const openLightbox = useCallback((urls: string[], index: number) => setLightbox({ urls, index }), []);
  const closeLightbox = useCallback(() => setLightbox(null), []);
  const lightboxPrev = useCallback(() => setLightbox((prev) => prev ? { ...prev, index: (prev.index - 1 + prev.urls.length) % prev.urls.length } : prev), []);
  const lightboxNext = useCallback(() => setLightbox((prev) => prev ? { ...prev, index: (prev.index + 1) % prev.urls.length } : prev), []);

  // ─── 수정/삭제 모달 ───
  const [actionTarget, setActionTarget] = useState<{
    id: string;
    type: "edit" | "delete";
    isLoginComment: boolean;
  } | null>(null);
  const [actionPassword, setActionPassword] = useState("");
  const [editContent, setEditContent] = useState("");
  const [editImages, setEditImages] = useState<string[]>([]);
  const [editImageUploading, setEditImageUploading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState("");

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      setCurrentUser(data.user ?? null);
      setAuthChecked(true);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setCurrentUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  const fetchComments = async () => {
    try {
      const res = await fetch(`/api/blog/comments?post_id=${encodeURIComponent(postId)}`);
      const data = await res.json();
      if (!res.ok) throw new Error((data as { error?: string }).error ?? "댓글을 불러오지 못했습니다.");
      setComments(Array.isArray(data) ? data : []);
    } catch {
      setComments([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchComments();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [postId]);

  const canManage = (comment: Comment): boolean => {
    if (comment.user_id && currentUser) return comment.user_id === currentUser.id;
    if (!comment.user_id && !currentUser) return true;
    return false;
  };

  // ─── 이미지 업로드 핸들러 ───
  const uploadImages = async (
    files: FileList | null,
    currentImages: string[],
    setImgUrls: React.Dispatch<React.SetStateAction<string[]>>,
    setUploading: React.Dispatch<React.SetStateAction<boolean>>,
  ) => {
    if (!files || files.length === 0) return;
    if (currentImages.length >= 3) return;
    setUploading(true);
    try {
      const remaining = 3 - currentImages.length;
      const toUpload = Array.from(files).slice(0, remaining);
      const uploaded: string[] = [];
      for (const file of toUpload) {
        const formData = new FormData();
        formData.append("file", file);
        const res = await fetch("/api/blog/comments/upload", { method: "POST", body: formData });
        const data = await res.json() as { url?: string; error?: string };
        if (res.ok && data.url) uploaded.push(data.url);
      }
      setImgUrls((prev) => [...prev, ...uploaded].slice(0, 3));
    } finally {
      setUploading(false);
    }
  };

  // ─── 본댓글 제출 ───
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;
    if (!currentUser && (!authorName.trim() || !password)) return;

    setSubmitting(true);
    setSubmitError("");
    try {
      const body: Record<string, unknown> = { post_id: postId, content, image_urls: images };
      if (!currentUser) { body.author_name = authorName; body.password = password; }

      const res = await fetch("/api/blog/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json() as Comment & { error?: string };
      if (!res.ok) throw new Error(data.error ?? "댓글 작성에 실패했습니다.");
      setComments((prev) => [...prev, data]);
      setContent(""); setAuthorName(""); setPassword(""); setImages([]);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "댓글 작성에 실패했습니다.");
    } finally {
      setSubmitting(false);
    }
  };

  // ─── 대댓글 제출 ───
  const handleReplySubmit = async (parentId: string) => {
    if (!replyContent.trim()) return;
    if (!currentUser && (!replyAuthorName.trim() || !replyPassword)) return;

    setReplySubmitting(true);
    setReplyError("");
    try {
      const body: Record<string, unknown> = { post_id: postId, content: replyContent, parent_id: parentId, image_urls: replyImages };
      if (!currentUser) { body.author_name = replyAuthorName; body.password = replyPassword; }

      const res = await fetch("/api/blog/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json() as Comment & { error?: string };
      if (!res.ok) throw new Error(data.error ?? "답글 작성에 실패했습니다.");
      setComments((prev) => [...prev, data]);
      setReplyingTo(null);
      setReplyContent(""); setReplyAuthorName(""); setReplyPassword(""); setReplyImages([]);
    } catch (err) {
      setReplyError(err instanceof Error ? err.message : "답글 작성에 실패했습니다.");
    } finally {
      setReplySubmitting(false);
    }
  };

  const openEdit = (comment: Comment) => {
    setActionTarget({ id: comment.id, type: "edit", isLoginComment: !!comment.user_id });
    setEditContent(comment.content);
    setEditImages(comment.image_urls ?? []);
    setActionPassword(""); setActionError("");
  };
  const openDelete = (comment: Comment) => {
    setActionTarget({ id: comment.id, type: "delete", isLoginComment: !!comment.user_id });
    setActionPassword(""); setActionError("");
  };
  const closeAction = () => {
    setActionTarget(null); setActionPassword(""); setEditContent(""); setEditImages([]); setActionError("");
  };

  const handleEdit = async () => {
    if (!actionTarget || actionLoading) return;
    setActionLoading(true); setActionError("");
    try {
      const body: Record<string, unknown> = { content: editContent, image_urls: editImages };
      if (!actionTarget.isLoginComment) body.password = actionPassword;
      const res = await fetch(`/api/blog/comments/${actionTarget.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json() as Comment & { error?: string };
      if (!res.ok) throw new Error(data.error ?? "수정에 실패했습니다.");
      setComments((prev) => prev.map((c) => (c.id === actionTarget.id ? data : c)));
      closeAction();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "수정에 실패했습니다.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!actionTarget || actionLoading) return;
    setActionLoading(true); setActionError("");
    try {
      const body: Record<string, unknown> = {};
      if (!actionTarget.isLoginComment) body.password = actionPassword;
      const res = await fetch(`/api/blog/comments/${actionTarget.id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json() as { ok?: boolean; error?: string };
      if (!res.ok) throw new Error(data.error ?? "삭제에 실패했습니다.");
      setComments((prev) => prev.filter((c) => c.id !== actionTarget.id && c.parent_id !== actionTarget.id));
      closeAction();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "삭제에 실패했습니다.");
    } finally {
      setActionLoading(false);
    }
  };

  const actionButtonDisabled = () => {
    if (actionLoading) return true;
    if (actionTarget?.type === "edit" && !editContent.trim()) return true;
    if (actionTarget && !actionTarget.isLoginComment && !actionPassword) return true;
    return false;
  };

  // ─── 스레드 구조 계산 ───
  const topLevel = comments.filter((c) => !c.parent_id);
  const repliesMap = comments.reduce<Record<string, Comment[]>>((acc, c) => {
    if (c.parent_id) {
      if (!acc[c.parent_id]) acc[c.parent_id] = [];
      acc[c.parent_id].push(c);
    }
    return acc;
  }, {});

  const totalCount = comments.length;

  return (
    <div className="flex flex-col gap-6">
      {/* 헤더 */}
      <div className="flex items-center gap-2">
        <MessageCircle size={18} style={{ color: ACCENT }} />
        <h3 className="text-base font-bold" style={{ color: "var(--text-primary)" }}>
          댓글 {totalCount > 0 ? `(${totalCount})` : ""}
        </h3>
      </div>

      {/* 댓글 목록 */}
      {loading ? (
        <div className="flex items-center justify-center py-8">
          <LoaderCircle size={20} className="animate-spin" style={{ color: ACCENT }} />
        </div>
      ) : topLevel.length === 0 ? (
        <p className="text-sm py-4 text-center" style={{ color: "var(--text-muted)" }}>
          첫 댓글을 남겨보세요.
        </p>
      ) : (
        <div className="flex flex-col gap-4">
          {topLevel.map((comment) => {
            const replies = repliesMap[comment.id] ?? [];
            const isReplying = replyingTo === comment.id;
            return (
              <div key={comment.id} className="flex flex-col gap-2">
                {/* 본댓글 */}
                <CommentCard
                  comment={comment}
                  canManage={canManage(comment)}
                  onEdit={() => openEdit(comment)}
                  onDelete={() => openDelete(comment)}
                  onReply={() => {
                    if (isReplying) {
                      setReplyingTo(null);
                    } else {
                      setReplyingTo(comment.id);
                      setReplyContent(""); setReplyAuthorName(""); setReplyPassword(""); setReplyImages([]); setReplyError("");
                    }
                  }}
                  replyCount={replies.length}
                  onImageClick={openLightbox}
                />

                {/* 대댓글 목록 */}
                {replies.length > 0 && (
                  <div className="flex flex-col gap-2 ml-6 pl-3" style={{ borderLeft: `2px solid rgba(234,88,12,0.2)` }}>
                    {replies.map((reply) => (
                      <CommentCard
                        key={reply.id}
                        comment={reply}
                        isReply
                        canManage={canManage(reply)}
                        onEdit={() => openEdit(reply)}
                        onDelete={() => openDelete(reply)}
                        onImageClick={openLightbox}
                      />
                    ))}
                  </div>
                )}

                {/* 대댓글 작성 폼 */}
                {authChecked && isReplying && (
                  <div className="ml-6 pl-3" style={{ borderLeft: `2px solid rgba(234,88,12,0.2)` }}>
                    <div className="bento-card p-4 flex flex-col gap-3">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-bold flex items-center gap-1.5" style={{ color: "var(--text-primary)" }}>
                          <CornerDownRight size={14} style={{ color: ACCENT }} />
                          <span style={{ color: ACCENT }}>{comment.author_name}</span>님에게 답글
                        </p>
                        <button
                          onClick={() => setReplyingTo(null)}
                          className="pressable p-1 rounded-lg"
                          style={{ color: "var(--text-muted)" }}
                        >
                          <X size={14} />
                        </button>
                      </div>

                      {!currentUser && (
                        <div className="grid grid-cols-2 gap-2">
                          <input
                            placeholder="이름"
                            value={replyAuthorName}
                            onChange={(e) => setReplyAuthorName(e.target.value)}
                            maxLength={30}
                            style={inputStyle}
                          />
                          <input
                            type="password"
                            placeholder="비밀번호 (4자 이상)"
                            value={replyPassword}
                            onChange={(e) => setReplyPassword(e.target.value)}
                            style={inputStyle}
                          />
                        </div>
                      )}

                      <textarea
                        placeholder="답글을 입력해주세요. (최대 1000자)"
                        value={replyContent}
                        onChange={(e) => setReplyContent(e.target.value)}
                        rows={2}
                        maxLength={1000}
                        style={{ ...inputStyle, resize: "vertical" }}
                      />

                      <ImageUploadArea
                        images={replyImages}
                        uploading={replyImageUploading}
                        onUpload={(files) => uploadImages(files, replyImages, setReplyImages, setReplyImageUploading)}
                        onRemove={(i) => setReplyImages((prev) => prev.filter((_, idx) => idx !== i))}
                      />

                      {replyError && (
                        <p className="text-sm" style={{ color: "#F43F5E" }}>{replyError}</p>
                      )}

                      <div className="flex items-center justify-between gap-3">
                        <p className="text-xs" style={{ color: "var(--text-muted)" }}>{replyContent.length} / 1000</p>
                        <button
                          onClick={() => handleReplySubmit(comment.id)}
                          disabled={
                            replySubmitting ||
                            !replyContent.trim() ||
                            (!currentUser && (!replyAuthorName.trim() || !replyPassword))
                          }
                          className="pressable px-4 py-2 rounded-xl text-sm font-bold text-white disabled:opacity-45 flex items-center gap-1.5"
                          style={{ background: ACCENT }}
                        >
                          {replySubmitting ? <LoaderCircle size={13} className="animate-spin" /> : <CornerDownRight size={13} />}
                          {replySubmitting ? "작성 중..." : "답글 등록"}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* 수정/삭제 모달 */}
      {actionTarget && (
        <div
          style={{
            position: "fixed", inset: 0, zIndex: 50,
            background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)",
            display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem",
          }}
          onClick={(e) => { if (e.target === e.currentTarget) closeAction(); }}
        >
          <div
            className="bento-card"
            style={{ width: "100%", maxWidth: 420, padding: "1.5rem", display: "flex", flexDirection: "column", gap: "1rem" }}
          >
            <div className="flex items-center justify-between">
              <p className="font-bold" style={{ color: "var(--text-primary)" }}>
                {actionTarget.type === "edit" ? "댓글 수정" : "댓글 삭제"}
              </p>
              <button onClick={closeAction} className="pressable p-1.5 rounded-lg" style={{ color: "var(--text-muted)" }}>
                <X size={16} />
              </button>
            </div>

            {actionTarget.type === "edit" && (
              <>
                <textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  rows={4}
                  placeholder="수정할 내용을 입력해주세요."
                  style={{ ...inputStyle, resize: "vertical" }}
                />
                <ImageUploadArea
                  images={editImages}
                  uploading={editImageUploading}
                  onUpload={(files) => uploadImages(files, editImages, setEditImages, setEditImageUploading)}
                  onRemove={(i) => setEditImages((prev) => prev.filter((_, idx) => idx !== i))}
                />
              </>
            )}

            {!actionTarget.isLoginComment && (
              <input
                type="password"
                placeholder="작성 시 입력한 비밀번호"
                value={actionPassword}
                onChange={(e) => setActionPassword(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    if (actionTarget.type === "edit") { handleEdit(); } else { handleDelete(); }
                  }
                }}
                style={inputStyle}
              />
            )}

            {actionError && (
              <p className="text-sm" style={{ color: "#F43F5E" }}>{actionError}</p>
            )}

            <div className="flex gap-2">
              <button
                onClick={closeAction}
                className="pressable flex-1 py-2.5 rounded-xl text-sm font-semibold"
                style={{ background: "rgba(255,255,255,0.05)", color: "var(--text-muted)" }}
              >
                취소
              </button>
              <button
                onClick={actionTarget.type === "edit" ? handleEdit : handleDelete}
                disabled={actionButtonDisabled()}
                className="pressable flex-1 py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-1.5 disabled:opacity-45"
                style={
                  actionTarget.type === "delete"
                    ? { background: "rgba(244,63,94,0.15)", color: "#F43F5E" }
                    : { background: ACCENT, color: "#fff" }
                }
              >
                {actionLoading ? (
                  <LoaderCircle size={14} className="animate-spin" />
                ) : actionTarget.type === "edit" ? (
                  <><Check size={14} />수정 완료</>
                ) : (
                  <><Trash2 size={14} />삭제 확인</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 본댓글 작성 폼 */}
      {authChecked && (
        <form onSubmit={handleSubmit} className="bento-card p-5 flex flex-col gap-3">
          <p className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>댓글 작성</p>

          {currentUser ? (
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>
              로그인 계정으로 댓글이 등록됩니다.
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              <input
                placeholder="이름"
                value={authorName}
                onChange={(e) => setAuthorName(e.target.value)}
                maxLength={30}
                style={inputStyle}
              />
              <input
                type="password"
                placeholder="비밀번호 (4자 이상)"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={inputStyle}
              />
            </div>
          )}

          <textarea
            placeholder="댓글을 입력해주세요. (최대 1000자)"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={3}
            maxLength={1000}
            style={{ ...inputStyle, resize: "vertical" }}
          />

          <ImageUploadArea
            images={images}
            uploading={imageUploading}
            onUpload={(files) => uploadImages(files, images, setImages, setImageUploading)}
            onRemove={(i) => setImages((prev) => prev.filter((_, idx) => idx !== i))}
          />

          {submitError && (
            <p className="text-sm" style={{ color: "#F43F5E" }}>{submitError}</p>
          )}

          <div className="flex items-center justify-between gap-3">
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>
              {content.length} / 1000
            </p>
            <button
              type="submit"
              disabled={
                submitting ||
                !content.trim() ||
                (!currentUser && (!authorName.trim() || !password))
              }
              className="pressable px-5 py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-45 flex items-center gap-1.5"
              style={{ background: ACCENT }}
            >
              {submitting ? <LoaderCircle size={14} className="animate-spin" /> : null}
              {submitting ? "작성 중..." : "댓글 등록"}
            </button>
          </div>
        </form>
      )}

      {/* 이미지 라이트박스 */}
      {lightbox && (
        <ImageLightbox
          urls={lightbox.urls}
          index={lightbox.index}
          onClose={closeLightbox}
          onPrev={lightboxPrev}
          onNext={lightboxNext}
        />
      )}
    </div>
  );
}
