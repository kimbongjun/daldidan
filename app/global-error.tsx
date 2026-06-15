"use client";

import { useEffect } from "react";

// 루트 레이아웃 자체에서 발생한 예외를 포착하는 최후방 boundary.
// 자체 <html>/<body>를 렌더해야 하며 globals.css가 적용되지 않으므로
// 색상은 인라인 하드코딩한다.
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[daldidan] global error boundary:", error);
  }, [error]);

  return (
    <html lang="ko">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "1rem",
          padding: "2rem 1rem",
          textAlign: "center",
          background: "#0F0F14",
          color: "#F0F0F5",
          fontFamily: "system-ui, -apple-system, sans-serif",
        }}
      >
        <p style={{ fontSize: "1rem", fontWeight: 700, margin: 0 }}>
          앱을 불러오는 중 오류가 발생했어요
        </p>
        <p style={{ fontSize: "0.85rem", color: "#9090AA", maxWidth: 360, margin: 0 }}>
          새로고침해도 문제가 계속되면, 브라우저의 시크릿/InPrivate 모드나 쿠키·사이트
          데이터 차단 설정을 해제한 뒤 다시 시도해 주세요.
        </p>
        {error?.message && (
          <code
            style={{
              fontSize: "0.7rem",
              color: "#9090AA",
              background: "rgba(255,255,255,0.04)",
              padding: "0.5rem 0.75rem",
              borderRadius: 8,
              maxWidth: 360,
              wordBreak: "break-word",
            }}
          >
            {error.message}
            {error.digest ? ` (${error.digest})` : ""}
          </code>
        )}
        <button
          type="button"
          onClick={reset}
          style={{
            fontSize: "0.85rem",
            fontWeight: 700,
            padding: "0.5rem 1rem",
            borderRadius: 12,
            border: "none",
            background: "#7C6AF7",
            color: "#fff",
            cursor: "pointer",
          }}
        >
          다시 시도
        </button>
      </body>
    </html>
  );
}
