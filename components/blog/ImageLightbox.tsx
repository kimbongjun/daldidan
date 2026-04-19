"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronLeft, ChevronRight, X } from "lucide-react";

const ACCENT = "#EA580C";

export interface ImageLightboxProps {
  urls: string[];
  index: number;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
}

export default function ImageLightbox(props: ImageLightboxProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  if (!mounted) return null;
  return createPortal(<LightboxContent {...props} />, document.body);
}

function LightboxContent({ urls, index, onClose, onPrev, onNext }: ImageLightboxProps) {
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft"  && urls.length > 1) onPrev();
      if (e.key === "ArrowRight" && urls.length > 1) onNext();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose, onPrev, onNext, urls.length]);

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 9999,
        background: "rgba(0,0,0,0.92)", backdropFilter: "blur(12px)",
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        padding: "3.5rem 1rem 2.5rem",  /* 상단: 닫기버튼, 하단: 인디케이터 여백 */
        boxSizing: "border-box",
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      {/* 닫기 */}
      <button
        onClick={onClose}
        className="pressable"
        style={{
          position: "absolute", top: "1rem", right: "1rem",
          width: 36, height: 36, borderRadius: "50%",
          background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.18)",
          display: "flex", alignItems: "center", justifyContent: "center",
          color: "#fff",
        }}
      >
        <X size={18} />
      </button>

      {/* 이전 */}
      {urls.length > 1 && (
        <button
          onClick={onPrev}
          className="pressable"
          style={{
            position: "absolute", left: "1rem", top: "50%", transform: "translateY(-50%)",
            width: 40, height: 40, borderRadius: "50%",
            background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.18)",
            display: "flex", alignItems: "center", justifyContent: "center",
            color: "#fff",
          }}
        >
          <ChevronLeft size={20} />
        </button>
      )}

      {/* 이미지 — 남은 공간을 flex로 채우고 그 안에서 contain */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        key={urls[index]}
        src={urls[index]}
        alt={`이미지 ${index + 1}`}
        onClick={(e) => e.stopPropagation()}
        style={{
          display: "block",
          maxWidth: "min(90vw, 1200px)",
          maxHeight: "100%",
          width: "auto",
          height: "auto",
          objectFit: "contain",
          borderRadius: "0.75rem",
          flexShrink: 0,
        }}
      />

      {/* 다음 */}
      {urls.length > 1 && (
        <button
          onClick={onNext}
          className="pressable"
          style={{
            position: "absolute", right: "1rem", top: "50%", transform: "translateY(-50%)",
            width: 40, height: 40, borderRadius: "50%",
            background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.18)",
            display: "flex", alignItems: "center", justifyContent: "center",
            color: "#fff",
          }}
        >
          <ChevronRight size={20} />
        </button>
      )}

      {/* 페이지 인디케이터 */}
      {urls.length > 1 && (
        <div style={{ position: "absolute", bottom: "1rem", display: "flex", gap: "0.375rem", alignItems: "center" }}>
          {urls.map((_, i) => (
            <button
              key={i}
              onClick={() => {
                const diff = i - index;
                if (diff < 0) for (let j = 0; j < -diff; j++) onPrev();
                else          for (let j = 0; j < diff;  j++) onNext();
              }}
              style={{
                width: i === index ? 20 : 6, height: 6, borderRadius: 3,
                background: i === index ? ACCENT : "rgba(255,255,255,0.35)",
                transition: "all 0.2s", border: "none", padding: 0, cursor: "pointer",
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
