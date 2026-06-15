"use client";

import { useEffect } from "react";
import { RefreshCw } from "lucide-react";

// 라우트 세그먼트에서 발생한 클라이언트 예외를 격리한다.
// 이 boundary가 없으면 예외 하나로 Next.js 기본 크래시 화면이 떠
// 전체 페이지가 죽는 것처럼 보인다(특히 Edge의 storage 차단 환경).
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // 추후 원격 로깅 연동 지점. 현재는 콘솔에 전체 스택을 남긴다.
    console.error("[daldidan] client error boundary:", error);
  }, [error]);

  return (
    <div
      style={{
        minHeight: "70vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "1rem",
        padding: "2rem 1rem",
        textAlign: "center",
      }}
    >
      <p className="text-base font-bold" style={{ color: "var(--text-primary)" }}>
        일시적인 오류가 발생했어요
      </p>
      <p className="text-sm" style={{ color: "var(--text-muted)", maxWidth: 360 }}>
        잠시 후 다시 시도해 주세요. 문제가 계속되면 브라우저의 시크릿/InPrivate 모드나
        쿠키 차단 설정을 확인해 주세요.
      </p>
      {error?.message && (
        <code
          className="text-[11px]"
          style={{
            color: "var(--text-muted)",
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
        className="flex items-center gap-2 text-sm font-bold px-4 py-2 rounded-xl transition-opacity hover:opacity-80"
        style={{ background: "var(--accent-primary)", color: "#fff" }}
      >
        <RefreshCw size={14} />
        다시 시도
      </button>
    </div>
  );
}
