"use client";

import { useEffect, useState } from "react";
import { CheckCircle2 } from "lucide-react";

interface Props {
  imageUrl: string;       // 업로드된 영수증 이미지 ObjectURL
  isDone: boolean;        // OCR 완료 여부
  onClose: () => void;    // 완료 후 모달 닫기
}

export default function OcrScanModal({ imageUrl, isDone, onClose }: Props) {
  const [phase, setPhase] = useState<"scanning" | "done">("scanning");

  // OCR 완료 시 done 페이즈로 전환 후 1.2초 뒤 자동 닫기
  useEffect(() => {
    if (!isDone) return;
    setPhase("done");
    const t = setTimeout(onClose, 1200);
    return () => clearTimeout(t);
  }, [isDone, onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.72)", backdropFilter: "blur(6px)" }}
      onClick={(e) => {
        // done 단계에서는 배경 클릭으로도 닫기
        if (phase === "done" && e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="relative flex flex-col items-center gap-4 rounded-2xl overflow-hidden"
        style={{
          width: "min(340px, 90vw)",
          background: "var(--bg-card)",
          border: "1px solid var(--border)",
          boxShadow: "0 24px 80px rgba(0,0,0,0.6)",
          padding: "1.25rem",
        }}
      >
        {/* 헤더 */}
        <div className="flex flex-col items-center gap-1 w-full">
          <p className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>
            {phase === "done" ? "분석 완료!" : "영수증 분석 중..."}
          </p>
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            {phase === "done" ? "정보가 자동으로 입력되었습니다" : "잠시만 기다려 주세요"}
          </p>
        </div>

        {/* 이미지 + 스캔 오버레이 */}
        <div
          className="relative w-full rounded-xl overflow-hidden"
          style={{ maxHeight: 360, background: "#000" }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imageUrl}
            alt="영수증 미리보기"
            className="w-full object-contain"
            style={{
              maxHeight: 360,
              display: "block",
              opacity: phase === "done" ? 1 : 0.85,
              transition: "opacity 0.4s ease",
            }}
          />

          {/* 스캔 라인 애니메이션 */}
          {phase === "scanning" && (
            <>
              {/* 어두운 상단 마스크 — 스캔 라인 위 */}
              <div
                className="absolute inset-x-0 top-0"
                style={{
                  background: "rgba(0,0,0,0.35)",
                  animationName: "scanMaskTop",
                  animationDuration: "2s",
                  animationTimingFunction: "ease-in-out",
                  animationIterationCount: "infinite",
                }}
              />

              {/* 스캔 라인 */}
              <div
                className="absolute inset-x-0"
                style={{
                  height: 3,
                  background: "linear-gradient(90deg, transparent 0%, #6366F1 20%, #06B6D4 50%, #6366F1 80%, transparent 100%)",
                  boxShadow: "0 0 16px 4px rgba(99,102,241,0.7), 0 0 40px 8px rgba(6,182,212,0.4)",
                  animationName: "scanLine",
                  animationDuration: "2s",
                  animationTimingFunction: "ease-in-out",
                  animationIterationCount: "infinite",
                }}
              />

              {/* 코너 마커 */}
              <CornerMarkers />
            </>
          )}

          {/* 완료 오버레이 */}
          {phase === "done" && (
            <div
              className="absolute inset-0 flex items-center justify-center"
              style={{
                background: "rgba(16,185,129,0.18)",
                animation: "fadeIn 0.3s ease",
              }}
            >
              <div
                className="flex items-center justify-center rounded-full"
                style={{
                  width: 56, height: 56,
                  background: "rgba(16,185,129,0.9)",
                  animation: "popIn 0.35s cubic-bezier(0.34,1.56,0.64,1)",
                }}
              >
                <CheckCircle2 size={28} className="text-white" />
              </div>
            </div>
          )}
        </div>

        {/* 진행 점들 */}
        {phase === "scanning" && (
          <div className="flex items-center gap-1.5">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="rounded-full"
                style={{
                  width: 6, height: 6,
                  background: "#6366F1",
                  animationName: "dotPulse",
                  animationDuration: "1.2s",
                  animationTimingFunction: "ease-in-out",
                  animationIterationCount: "infinite",
                  animationDelay: `${i * 0.2}s`,
                }}
              />
            ))}
          </div>
        )}

        {/* 키프레임 */}
        <style>{`
          @keyframes scanLine {
            0%   { top: 0%; }
            50%  { top: calc(100% - 3px); }
            100% { top: 0%; }
          }
          @keyframes scanMaskTop {
            0%   { height: 0%; }
            50%  { height: calc(100% - 3px); }
            100% { height: 0%; }
          }
          @keyframes dotPulse {
            0%, 100% { opacity: 0.25; transform: scale(0.8); }
            50%       { opacity: 1;    transform: scale(1.2); }
          }
          @keyframes fadeIn {
            from { opacity: 0; }
            to   { opacity: 1; }
          }
          @keyframes popIn {
            from { transform: scale(0.4); opacity: 0; }
            to   { transform: scale(1);   opacity: 1; }
          }
        `}</style>
      </div>
    </div>
  );
}

// 네 모서리 L자 마커
function CornerMarkers() {
  const size = 16;
  const thickness = 2;
  const color = "#6366F1";
  const corners = [
    { top: 8, left: 8, borderTop: thickness, borderLeft: thickness, borderRight: 0, borderBottom: 0 },
    { top: 8, right: 8, borderTop: thickness, borderRight: thickness, borderLeft: 0, borderBottom: 0 },
    { bottom: 8, left: 8, borderBottom: thickness, borderLeft: thickness, borderTop: 0, borderRight: 0 },
    { bottom: 8, right: 8, borderBottom: thickness, borderRight: thickness, borderTop: 0, borderLeft: 0 },
  ];

  return (
    <>
      {corners.map((c, i) => (
        <div
          key={i}
          className="absolute"
          style={{
            width: size,
            height: size,
            borderColor: color,
            borderStyle: "solid",
            borderTopWidth: c.borderTop ?? 0,
            borderLeftWidth: c.borderLeft ?? 0,
            borderRightWidth: c.borderRight ?? 0,
            borderBottomWidth: c.borderBottom ?? 0,
            top: c.top,
            left: c.left,
            bottom: c.bottom,
            right: c.right,
          }}
        />
      ))}
    </>
  );
}
