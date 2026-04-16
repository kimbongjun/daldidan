"use client";

import { useEffect, useState, useCallback } from "react";
import { Bell, X, Share, Plus, CheckCircle, AlertCircle, LoaderCircle } from "lucide-react";
import { getFirebaseMessaging } from "@/lib/firebase-client";
import { getToken } from "firebase/messaging";

// ── 상수 ──────────────────────────────────────────────────────
const STORAGE_KEY = "daldidan-push";
const DISMISSAL_TTL_DAYS = 7; // 거절 후 재표시 간격

type PushStatus = { status: "subscribed" | "dismissed"; dismissedAt?: number; token?: string };
type ModalView = "hidden" | "main" | "ios-guide" | "loading" | "success" | "error";

// ── 유틸 ──────────────────────────────────────────────────────
function isIOS() {
  if (typeof window === "undefined") return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as { MSStream?: unknown }).MSStream;
}

function isStandalone() {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as { standalone?: boolean }).standalone === true
  );
}

function detectDeviceType(): "ios" | "android" | "web" {
  if (isIOS()) return "ios";
  if (typeof navigator !== "undefined" && /Android/.test(navigator.userAgent)) return "android";
  return "web";
}

function loadPushStatus(): PushStatus | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as PushStatus) : null;
  } catch {
    return null;
  }
}

function savePushStatus(data: PushStatus) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch { /* ignore */ }
}

// ── 컴포넌트 ──────────────────────────────────────────────────
export default function PushSubscriptionModal() {
  const [view, setView] = useState<ModalView>("hidden");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (typeof window === "undefined") return;
    // Firebase 미설정이면 모달 표시 안 함
    if (!process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID) return;
    // 알림 미지원 브라우저
    if (!("Notification" in window)) return;
    // 이미 거절됨
    if (Notification.permission === "denied") return;

    const stored = loadPushStatus();
    if (stored) {
      if (stored.status === "subscribed") return;
      if (stored.status === "dismissed" && stored.dismissedAt) {
        const days = (Date.now() - stored.dismissedAt) / 86_400_000;
        if (days < DISMISSAL_TTL_DAYS) return;
      }
    }

    // 이미 권한이 허용된 경우 → 조용히 토큰만 갱신
    if (Notification.permission === "granted") {
      silentSubscribe();
      return;
    }

    const timer = setTimeout(() => setView("main"), 2500);
    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 이미 권한 허용 상태에서 토큰만 갱신
  const silentSubscribe = useCallback(async () => {
    try {
      const messaging = await getFirebaseMessaging();
      if (!messaging || !process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY) return;
      const swReg = await navigator.serviceWorker.register("/firebase-messaging-sw.js", { scope: "/" });
      const token = await getToken(messaging, {
        vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
        serviceWorkerRegistration: swReg,
      });
      if (!token) return;
      await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, deviceType: detectDeviceType() }),
      });
      savePushStatus({ status: "subscribed", token });
    } catch { /* silent */ }
  }, []);

  const handleSubscribe = useCallback(async () => {
    // iOS Safari + 브라우저 모드 → 홈 화면 추가 안내
    if (isIOS() && !isStandalone()) {
      setView("ios-guide");
      return;
    }

    setView("loading");

    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        savePushStatus({ status: "dismissed", dismissedAt: Date.now() });
        setView("hidden");
        return;
      }

      const messaging = await getFirebaseMessaging();
      if (!messaging || !process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY) {
        setErrorMsg("Firebase가 설정되지 않았습니다.");
        setView("error");
        return;
      }

      const swReg = await navigator.serviceWorker.register("/firebase-messaging-sw.js", { scope: "/" });
      const token = await getToken(messaging, {
        vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
        serviceWorkerRegistration: swReg,
      });

      if (!token) {
        setErrorMsg("토큰 생성에 실패했습니다. 잠시 후 다시 시도해주세요.");
        setView("error");
        return;
      }

      const res = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, deviceType: detectDeviceType() }),
      });

      if (!res.ok) {
        setErrorMsg("서버 저장 중 오류가 발생했습니다.");
        setView("error");
        return;
      }

      savePushStatus({ status: "subscribed", token });
      setView("success");
      setTimeout(() => setView("hidden"), 2500);
    } catch (err) {
      console.error("[push] subscribe error:", err);
      setErrorMsg("알림 설정 중 오류가 발생했습니다.");
      setView("error");
    }
  }, []);

  const handleDismiss = useCallback(() => {
    savePushStatus({ status: "dismissed", dismissedAt: Date.now() });
    setView("hidden");
  }, []);

  if (view === "hidden") return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "center",
        padding: "0 0 env(safe-area-inset-bottom, 0)",
        background: "rgba(0,0,0,0.45)",
        backdropFilter: "blur(4px)",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) handleDismiss();
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 480,
          margin: "0 12px 20px",
          background: "var(--bg-card)",
          border: "1px solid var(--border)",
          borderRadius: "1.5rem",
          padding: "28px 24px 24px",
          boxShadow: "0 -4px 40px rgba(0,0,0,0.6)",
          animation: "slideUp 0.3s cubic-bezier(0.16,1,0.3,1)",
        }}
      >
        <style>{`@keyframes slideUp{from{transform:translateY(100%);opacity:0}to{transform:translateY(0);opacity:1}}`}</style>

        {/* ── 메인 뷰 ── */}
        {view === "main" && (
          <>
            <button
              onClick={handleDismiss}
              style={{
                position: "absolute",
                top: 16,
                right: 16,
                background: "transparent",
                border: "none",
                cursor: "pointer",
                color: "var(--text-muted)",
                padding: 4,
              }}
              aria-label="닫기"
            >
              <X size={18} />
            </button>

            <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 16 }}>
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: "50%",
                  background: "linear-gradient(135deg,#6366F1,#7C3AED)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <Bell size={22} color="#fff" />
              </div>
              <div>
                <p style={{ margin: 0, fontWeight: 700, fontSize: "1rem", color: "var(--text-primary)" }}>
                  새 글 알림 구독
                </p>
                <p style={{ margin: "3px 0 0", fontSize: "0.8rem", color: "var(--text-muted)" }}>
                  새 블로그 글이 등록되면 바로 알려드릴게요
                </p>
              </div>
            </div>

            <p style={{ margin: "0 0 20px", fontSize: "0.875rem", color: "var(--text-muted)", lineHeight: 1.6 }}>
              달디단의 새 글이 발행될 때마다{" "}
              <span style={{ color: "var(--text-primary)", fontWeight: 600 }}>브라우저 푸시 알림</span>으로
              알려드립니다. 언제든지 설정에서 해제할 수 있어요.
            </p>

            <div style={{ display: "flex", gap: 10 }}>
              <button
                onClick={handleDismiss}
                style={{
                  flex: 1,
                  padding: "12px 0",
                  borderRadius: "0.875rem",
                  border: "1px solid var(--border)",
                  background: "transparent",
                  color: "var(--text-muted)",
                  fontSize: "0.875rem",
                  cursor: "pointer",
                  fontWeight: 500,
                }}
              >
                나중에
              </button>
              <button
                onClick={handleSubscribe}
                style={{
                  flex: 2,
                  padding: "12px 0",
                  borderRadius: "0.875rem",
                  border: "none",
                  background: "linear-gradient(135deg,#6366F1,#7C3AED)",
                  color: "#fff",
                  fontSize: "0.875rem",
                  cursor: "pointer",
                  fontWeight: 600,
                }}
              >
                구독하기
              </button>
            </div>
          </>
        )}

        {/* ── iOS 홈 화면 추가 안내 ── */}
        {view === "ios-guide" && (
          <>
            <button
              onClick={handleDismiss}
              style={{
                position: "absolute",
                top: 16,
                right: 16,
                background: "transparent",
                border: "none",
                cursor: "pointer",
                color: "var(--text-muted)",
                padding: 4,
              }}
              aria-label="닫기"
            >
              <X size={18} />
            </button>

            <p style={{ margin: "0 0 4px", fontWeight: 700, fontSize: "1rem", color: "var(--text-primary)" }}>
              아이폰 알림 설정 방법
            </p>
            <p style={{ margin: "0 0 20px", fontSize: "0.8rem", color: "var(--text-muted)" }}>
              iOS 사파리에서는 홈 화면에 추가한 뒤 알림을 허용할 수 있어요
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {[
                {
                  icon: <Share size={18} color="#6366F1" />,
                  step: "1",
                  text: (
                    <>
                      Safari 하단의{" "}
                      <strong style={{ color: "var(--text-primary)" }}>공유 버튼</strong>
                      (□↑)을 탭하세요
                    </>
                  ),
                },
                {
                  icon: <Plus size={18} color="#6366F1" />,
                  step: "2",
                  text: (
                    <>
                      스크롤해서{" "}
                      <strong style={{ color: "var(--text-primary)" }}>홈 화면에 추가</strong>를 선택하세요
                    </>
                  ),
                },
                {
                  icon: <Bell size={18} color="#6366F1" />,
                  step: "3",
                  text: (
                    <>
                      홈 화면의 달디단 아이콘으로 열면{" "}
                      <strong style={{ color: "var(--text-primary)" }}>알림 허용</strong> 팝업이 나타나요
                    </>
                  ),
                },
              ].map(({ icon, step, text }) => (
                <div
                  key={step}
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 12,
                    padding: "12px 14px",
                    borderRadius: "0.875rem",
                    background: "rgba(99,102,241,0.08)",
                    border: "1px solid rgba(99,102,241,0.18)",
                  }}
                >
                  <div
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: "50%",
                      background: "rgba(99,102,241,0.15)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    {icon}
                  </div>
                  <p style={{ margin: 0, fontSize: "0.85rem", color: "var(--text-muted)", lineHeight: 1.55 }}>
                    <span
                      style={{
                        display: "inline-block",
                        marginRight: 6,
                        fontWeight: 700,
                        fontSize: "0.75rem",
                        color: "#6366F1",
                      }}
                    >
                      STEP {step}
                    </span>
                    {text}
                  </p>
                </div>
              ))}
            </div>

            <p
              style={{
                margin: "16px 0 0",
                fontSize: "0.78rem",
                color: "var(--text-muted)",
                textAlign: "center",
                lineHeight: 1.5,
              }}
            >
              iOS 16.4 이상 Safari에서 지원됩니다
            </p>
          </>
        )}

        {/* ── 로딩 ── */}
        {view === "loading" && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14, padding: "12px 0" }}>
            <LoaderCircle size={36} color="#6366F1" style={{ animation: "spin 0.8s linear infinite" }} />
            <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
            <p style={{ margin: 0, color: "var(--text-muted)", fontSize: "0.875rem" }}>알림 권한 요청 중...</p>
          </div>
        )}

        {/* ── 성공 ── */}
        {view === "success" && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, padding: "12px 0" }}>
            <CheckCircle size={40} color="#10B981" />
            <p style={{ margin: 0, fontWeight: 700, fontSize: "1rem", color: "var(--text-primary)" }}>
              구독 완료!
            </p>
            <p style={{ margin: 0, fontSize: "0.85rem", color: "var(--text-muted)" }}>
              새 글이 등록되면 바로 알려드릴게요
            </p>
          </div>
        )}

        {/* ── 오류 ── */}
        {view === "error" && (
          <>
            <div
              style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, padding: "8px 0 16px" }}
            >
              <AlertCircle size={38} color="#F43F5E" />
              <p style={{ margin: 0, fontWeight: 700, fontSize: "1rem", color: "var(--text-primary)" }}>
                알림 설정 실패
              </p>
              <p style={{ margin: 0, fontSize: "0.85rem", color: "var(--text-muted)", textAlign: "center" }}>
                {errorMsg}
              </p>
            </div>
            <button
              onClick={handleDismiss}
              style={{
                width: "100%",
                padding: "12px 0",
                borderRadius: "0.875rem",
                border: "1px solid var(--border)",
                background: "transparent",
                color: "var(--text-muted)",
                fontSize: "0.875rem",
                cursor: "pointer",
                fontWeight: 500,
              }}
            >
              닫기
            </button>
          </>
        )}
      </div>
    </div>
  );
}
