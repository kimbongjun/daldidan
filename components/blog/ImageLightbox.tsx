"use client";

import { useEffect } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";

const ACCENT = "#EA580C";

export interface ImageLightboxProps {
  urls: string[];
  index: number;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
}

export default function ImageLightbox({ urls, index, onClose, onPrev, onNext }: ImageLightboxProps) {
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
        position: "fixed", inset: 0, zIndex: 60,
        background: "rgba(0,0,0,0.92)", backdropFilter: "blur(12px)",
        display: "flex", alignItems: "center", justifyContent: "center",
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
          color: "#fff", zIndex: 1,
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
            position: "absolute", left: "1rem",
            width: 40, height: 40, borderRadius: "50%",
            background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.18)",
            display: "flex", alignItems: "center", justifyContent: "center",
            color: "#fff",
          }}
        >
          <ChevronLeft size={20} />
        </button>
      )}

      {/* 이미지 */}
      <div
        style={{ maxWidth: "min(90vw, 1200px)", maxHeight: "88vh", display: "flex", alignItems: "center", justifyContent: "center" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          key={urls[index]}
          src={urls[index]}
          alt={`이미지 ${index + 1}`}
          style={{ maxWidth: "100%", maxHeight: "88vh", objectFit: "contain", borderRadius: "0.75rem" }}
        />
      </div>

      {/* 다음 */}
      {urls.length > 1 && (
        <button
          onClick={onNext}
          className="pressable"
          style={{
            position: "absolute", right: "1rem",
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
        <div style={{ position: "absolute", bottom: "1.25rem", display: "flex", gap: "0.375rem", alignItems: "center" }}>
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
