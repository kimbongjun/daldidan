"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { Bell, BellOff, LoaderCircle, MessageSquare, PenLine, Smartphone, Trash2, X } from "lucide-react";
import { enableNativeNotifications, getNativeNotificationPermission, sendNativeNotification, supportsNativeNotifications } from "@/lib/notifications";
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
  const [content, setContent] = useState<EditorValue>({
    html: initialPost?.contentHtml ?? DEFAULT_HTML,
    json: null, // content_json은 저장하지 않음 (렌더링엔 html만 사용)
  });
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");
  const [showLeaveModal, setShowLeaveModal] = useState(false);

  // 발행 알림 옵션
  const [alarmNativePush, setAlarmNativePush] = useState(false);
  const [alarmKakao, setAlarmKakao] = useState(false);
  const [kakaoPhone, setKakaoPhone] = useState("");
  const [nativePermission, setNativePermission] = useState<string>("default");
  const [requestingPermission, setRequestingPermission] = useState(false);

  // 초기값 대비 변경 여부 (에디터가 빈 상태를 <p></p> 로 반환하는 경우도 미변경으로 처리)
  const isDirty = useMemo(() => {
    const normalize = (h: string) => h.replace(/<p><\/p>/g, "").trim();
    const titleChanged = title.trim() !== (initialPost?.title ?? "").trim();
    const contentChanged = normalize(content.html) !== normalize(initialPost?.contentHtml ?? "");
    const categoryChanged = category !== (initialPost?.category ?? "");
    return titleChanged || contentChanged || categoryChanged;
  }, [title, content.html, category, initialPost]);

  // 이벤트 핸들러 내 클로저에서 최신 isDirty를 읽기 위한 ref
  const isDirtyRef = useRef(isDirty);
  useEffect(() => {
    isDirtyRef.current = isDirty;
  }, [isDirty]);

  // 초기 알림 권한 상태 읽기
  useEffect(() => {
    setNativePermission(getNativeNotificationPermission());
  }, []);

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
      const response = await fetch("/api/blog/posts", {
        method: isEditMode ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        // content_json 제외 — payload 크기 최소화
        body: JSON.stringify({
          id: initialPost?.id,
          title,
          contentHtml: content.html,
          category: category || null,
        }),
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error ?? "글을 저장하지 못했습니다.");
      }

      // 네이티브 push 알림 (작성자 본인)
      if (alarmNativePush) {
        sendNativeNotification(
          isEditMode ? "블로그 글이 수정되었어요" : "블로그 글이 발행되었어요",
          isEditMode
            ? `${title.trim()} 글 수정이 완료되었습니다.`
            : `${title.trim()} 글이 성공적으로 공개되었습니다.`,
        );
      }

      // 카카오 알림톡
      if (alarmKakao && kakaoPhone.trim()) {
        await fetch("/api/blog/alarm", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            phone: kakaoPhone.trim(),
            title: title.trim(),
            slug: payload.slug,
            type: isEditMode ? "update" : "publish",
          }),
        }).catch(() => {
          // 알림톡 실패는 글 발행에 영향 없이 조용히 처리
        });
      }

      router.push(`/blog/${encodeURIComponent(payload.slug)}`);
      router.refresh();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "글을 저장하지 못했습니다.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleRequestPushPermission = async () => {
    setRequestingPermission(true);
    const result = await enableNativeNotifications();
    setNativePermission(getNativeNotificationPermission());
    if (result.ok) setAlarmNativePush(true);
    setRequestingPermission(false);
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

        {/* ── 발행 알림 설정 ── */}
        <div className="bento-card p-5 flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <Bell size={14} style={{ color: "#EA580C" }} />
            <p className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>발행 알림</p>
          </div>

          {/* 네이티브 Push */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Smartphone size={13} style={{ color: "var(--text-muted)" }} />
                <span className="text-xs font-medium" style={{ color: "var(--text-primary)" }}>네이티브 Push</span>
              </div>
              {!supportsNativeNotifications() ? (
                <span className="text-xs" style={{ color: "var(--text-muted)" }}>미지원</span>
              ) : nativePermission === "granted" ? (
                <button
                  type="button"
                  onClick={() => setAlarmNativePush((v) => !v)}
                  className="relative w-10 h-5 rounded-full transition-colors"
                  style={{ background: alarmNativePush ? "#EA580C" : "var(--border)" }}
                  aria-label="네이티브 Push 알림 토글"
                >
                  <span
                    className="absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform"
                    style={{ transform: alarmNativePush ? "translateX(20px)" : "translateX(0)" }}
                  />
                </button>
              ) : nativePermission === "denied" ? (
                <span className="text-xs" style={{ color: "#F43F5E" }}>차단됨</span>
              ) : (
                <button
                  type="button"
                  onClick={handleRequestPushPermission}
                  disabled={requestingPermission}
                  className="text-xs font-semibold px-2.5 py-1 rounded-lg disabled:opacity-50"
                  style={{ background: "rgba(234,88,12,0.14)", color: "#EA580C" }}
                >
                  {requestingPermission ? "요청 중…" : "권한 허용"}
                </button>
              )}
            </div>
            {alarmNativePush && nativePermission === "granted" && (
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                발행 후 브라우저 알림으로 알려드립니다.
              </p>
            )}
          </div>

          {/* 카카오 알림톡 */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <MessageSquare size={13} style={{ color: "var(--text-muted)" }} />
                <span className="text-xs font-medium" style={{ color: "var(--text-primary)" }}>카카오 알림톡</span>
              </div>
              <button
                type="button"
                onClick={() => setAlarmKakao((v) => !v)}
                className="relative w-10 h-5 rounded-full transition-colors"
                style={{ background: alarmKakao ? "#FEE500" : "var(--border)" }}
                aria-label="카카오 알림톡 토글"
              >
                <span
                  className="absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform"
                  style={{ transform: alarmKakao ? "translateX(20px)" : "translateX(0)" }}
                />
              </button>
            </div>
            {alarmKakao && (
              <input
                type="tel"
                placeholder="수신 번호 (01012345678)"
                value={kakaoPhone}
                onChange={(e) => setKakaoPhone(e.target.value)}
                className="w-full text-xs"
                style={{
                  background: "var(--bg-input)",
                  border: "1px solid var(--border)",
                  borderRadius: "0.75rem",
                  padding: "0.55rem 0.75rem",
                  color: "var(--text-primary)",
                  outline: "none",
                }}
              />
            )}
            {alarmKakao && (
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                발행 후 카카오 알림톡으로 알려드립니다. (서버 API 키 설정 필요)
              </p>
            )}
          </div>

          {!alarmNativePush && !alarmKakao && (
            <div className="flex items-center gap-1.5 text-xs" style={{ color: "var(--text-muted)" }}>
              <BellOff size={12} />
              <span>알림 없이 발행됩니다.</span>
            </div>
          )}
        </div>
      </aside>
    </div>
    </>
  );
}
