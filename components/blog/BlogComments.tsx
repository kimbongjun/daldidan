"use client";

import { useEffect, useState } from "react";
import { LoaderCircle, MessageCircle, Pencil, Trash2, X, Check } from "lucide-react";
import { formatBlogDate } from "@/lib/blog-shared";

interface Comment {
  id: string;
  author_name: string;
  content: string;
  created_at: string;
  updated_at: string;
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

export default function BlogComments({ postId }: { postId: string }) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);

  // 작성 폼
  const [authorName, setAuthorName] = useState("");
  const [password, setPassword] = useState("");
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  // 수정/삭제 모달 상태
  const [actionTarget, setActionTarget] = useState<{ id: string; type: "edit" | "delete"; content?: string } | null>(null);
  const [actionPassword, setActionPassword] = useState("");
  const [editContent, setEditContent] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState("");

  const fetchComments = async () => {
    const res = await fetch(`/api/blog/comments?post_id=${encodeURIComponent(postId)}`);
    const data = await res.json();
    setComments(Array.isArray(data) ? data : []);
    setLoading(false);
  };

  useEffect(() => {
    fetchComments();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [postId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authorName.trim() || !password || !content.trim()) return;
    setSubmitting(true);
    setSubmitError("");
    try {
      const res = await fetch("/api/blog/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ post_id: postId, author_name: authorName, password, content }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "댓글 작성에 실패했습니다.");
      setComments((prev) => [...prev, data]);
      setAuthorName("");
      setPassword("");
      setContent("");
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "댓글 작성에 실패했습니다.");
    } finally {
      setSubmitting(false);
    }
  };

  const openEdit = (comment: Comment) => {
    setActionTarget({ id: comment.id, type: "edit", content: comment.content });
    setEditContent(comment.content);
    setActionPassword("");
    setActionError("");
  };

  const openDelete = (comment: Comment) => {
    setActionTarget({ id: comment.id, type: "delete" });
    setActionPassword("");
    setActionError("");
  };

  const closeAction = () => {
    setActionTarget(null);
    setActionPassword("");
    setEditContent("");
    setActionError("");
  };

  const handleEdit = async () => {
    if (!actionTarget || actionLoading) return;
    setActionLoading(true);
    setActionError("");
    try {
      const res = await fetch(`/api/blog/comments/${actionTarget.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: actionPassword, content: editContent }),
      });
      const data = await res.json();
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
    setActionLoading(true);
    setActionError("");
    try {
      const res = await fetch(`/api/blog/comments/${actionTarget.id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: actionPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "삭제에 실패했습니다.");
      setComments((prev) => prev.filter((c) => c.id !== actionTarget.id));
      closeAction();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "삭제에 실패했습니다.");
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* 헤더 */}
      <div className="flex items-center gap-2">
        <MessageCircle size={18} style={{ color: ACCENT }} />
        <h3 className="text-base font-bold" style={{ color: "var(--text-primary)" }}>
          댓글 {comments.length > 0 ? `(${comments.length})` : ""}
        </h3>
      </div>

      {/* 댓글 목록 */}
      {loading ? (
        <div className="flex items-center justify-center py-8">
          <LoaderCircle size={20} className="animate-spin" style={{ color: ACCENT }} />
        </div>
      ) : comments.length === 0 ? (
        <p className="text-sm py-4 text-center" style={{ color: "var(--text-muted)" }}>
          첫 댓글을 남겨보세요.
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {comments.map((comment) => (
            <div
              key={comment.id}
              className="rounded-2xl p-4 flex flex-col gap-2"
              style={{ background: "var(--bg-input)", border: "1px solid var(--border)" }}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span
                    className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                    style={{ background: "rgba(234,88,12,0.14)", color: ACCENT }}
                  >
                    {comment.author_name.slice(0, 1)}
                  </span>
                  <span className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>{comment.author_name}</span>
                  <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                    {formatBlogDate(comment.updated_at !== comment.created_at ? comment.updated_at : comment.created_at)}
                    {comment.updated_at !== comment.created_at ? " (수정됨)" : ""}
                  </span>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => openEdit(comment)}
                    className="pressable p-1.5 rounded-lg"
                    style={{ color: "var(--text-muted)" }}
                    title="수정"
                  >
                    <Pencil size={13} />
                  </button>
                  <button
                    onClick={() => openDelete(comment)}
                    className="pressable p-1.5 rounded-lg"
                    style={{ color: "var(--text-muted)" }}
                    title="삭제"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
              <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: "var(--text-primary)", paddingLeft: "2.25rem" }}>
                {comment.content}
              </p>
            </div>
          ))}
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
              <textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                rows={4}
                placeholder="수정할 내용을 입력해주세요."
                style={{ ...inputStyle, resize: "vertical" }}
              />
            )}

            <input
              type="password"
              placeholder="작성 시 입력한 비밀번호"
              value={actionPassword}
              onChange={(e) => setActionPassword(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  actionTarget.type === "edit" ? handleEdit() : handleDelete();
                }
              }}
              style={inputStyle}
            />

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
                disabled={actionLoading || !actionPassword || (actionTarget.type === "edit" && !editContent.trim())}
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

      {/* 댓글 작성 폼 */}
      <form
        onSubmit={handleSubmit}
        className="bento-card p-5 flex flex-col gap-3"
      >
        <p className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>댓글 작성</p>

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

        <textarea
          placeholder="댓글을 입력해주세요. (최대 1000자)"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={3}
          maxLength={1000}
          style={{ ...inputStyle, resize: "vertical" }}
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
            disabled={submitting || !authorName.trim() || !password || !content.trim()}
            className="pressable px-5 py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-45 flex items-center gap-1.5"
            style={{ background: ACCENT }}
          >
            {submitting ? <LoaderCircle size={14} className="animate-spin" /> : null}
            {submitting ? "작성 중..." : "댓글 등록"}
          </button>
        </div>
      </form>
    </div>
  );
}
