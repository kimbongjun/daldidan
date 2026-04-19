"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import { ChevronLeft, ChevronRight, X } from "lucide-react";

const ACCENT = "#EA580C";
const MIN_SCALE = 1;
const MAX_SCALE = 5;

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
  const [scale, setScale] = useState(1);
  const [translate, setTranslate] = useState({ x: 0, y: 0 });

  // Pinch state refs (avoid re-renders during gesture)
  const pinchRef = useRef({
    active: false,
    startDist: 0,
    startScale: 1,
    startMidX: 0,
    startMidY: 0,
    startTx: 0,
    startTy: 0,
  });

  // Pan state refs
  const panRef = useRef({
    active: false,
    startX: 0,
    startY: 0,
    startTx: 0,
    startTy: 0,
  });

  // Double-tap state
  const lastTapRef = useRef(0);

  const resetZoom = useCallback(() => {
    setScale(1);
    setTranslate({ x: 0, y: 0 });
  }, []);

  // Reset zoom when image changes
  useEffect(() => { resetZoom(); }, [index, resetZoom]);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") { resetZoom(); onClose(); }
      if (e.key === "ArrowLeft"  && urls.length > 1 && scale === 1) onPrev();
      if (e.key === "ArrowRight" && urls.length > 1 && scale === 1) onNext();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose, onPrev, onNext, urls.length, scale, resetZoom]);

  const getDist = (t1: React.Touch, t2: React.Touch) => {
    const dx = t1.clientX - t2.clientX;
    const dy = t1.clientY - t2.clientY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  const getMid = (t1: React.Touch, t2: React.Touch) => ({
    x: (t1.clientX + t2.clientX) / 2,
    y: (t1.clientY + t2.clientY) / 2,
  });

  const clampTranslate = (tx: number, ty: number, s: number, rect: DOMRect) => {
    const maxX = Math.max(0, (rect.width  * s - rect.width)  / 2);
    const maxY = Math.max(0, (rect.height * s - rect.height) / 2);
    return {
      x: Math.min(maxX, Math.max(-maxX, tx)),
      y: Math.min(maxY, Math.max(-maxY, ty)),
    };
  };

  const imgRef = useRef<HTMLImageElement>(null);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      e.preventDefault();
      const [t1, t2] = [e.touches[0], e.touches[1]];
      pinchRef.current = {
        active: true,
        startDist: getDist(t1, t2),
        startScale: scale,
        startMidX: getMid(t1, t2).x,
        startMidY: getMid(t1, t2).y,
        startTx: translate.x,
        startTy: translate.y,
      };
      panRef.current.active = false;
    } else if (e.touches.length === 1) {
      const now = Date.now();
      if (now - lastTapRef.current < 300) {
        // Double tap: toggle zoom
        if (scale > 1) {
          resetZoom();
        } else {
          setScale(2.5);
        }
        lastTapRef.current = 0;
        return;
      }
      lastTapRef.current = now;

      if (scale > 1) {
        panRef.current = {
          active: true,
          startX: e.touches[0].clientX,
          startY: e.touches[0].clientY,
          startTx: translate.x,
          startTy: translate.y,
        };
      }
    }
  }, [scale, translate, resetZoom]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2 && pinchRef.current.active) {
      e.preventDefault();
      const [t1, t2] = [e.touches[0], e.touches[1]];
      const dist = getDist(t1, t2);
      const ratio = dist / pinchRef.current.startDist;
      const newScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, pinchRef.current.startScale * ratio));

      const rect = imgRef.current?.getBoundingClientRect();
      if (!rect) { setScale(newScale); return; }

      const clamped = clampTranslate(pinchRef.current.startTx, pinchRef.current.startTy, newScale, rect);
      setScale(newScale);
      setTranslate(clamped);
    } else if (e.touches.length === 1 && panRef.current.active) {
      e.preventDefault();
      const dx = e.touches[0].clientX - panRef.current.startX;
      const dy = e.touches[0].clientY - panRef.current.startY;
      const rect = imgRef.current?.getBoundingClientRect();
      if (!rect) return;
      const clamped = clampTranslate(panRef.current.startTx + dx, panRef.current.startTy + dy, scale, rect);
      setTranslate(clamped);
    }
  }, [scale]);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (e.touches.length < 2) {
      pinchRef.current.active = false;
      if (scale < 1.05) resetZoom();
    }
    if (e.touches.length === 0) {
      panRef.current.active = false;
    }
  }, [scale, resetZoom]);

  const isZoomed = scale > 1.01;

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 9999,
        background: "rgba(0,0,0,0.92)", backdropFilter: "blur(12px)",
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        padding: "3.5rem 1rem 2.5rem",
        boxSizing: "border-box",
        touchAction: "none",
      }}
      onClick={(e) => { if (e.target === e.currentTarget && !isZoomed) onClose(); }}
    >
      {/* 닫기 */}
      <button
        onClick={() => { resetZoom(); onClose(); }}
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
      {urls.length > 1 && !isZoomed && (
        <button
          onClick={onPrev}
          className="pressable"
          style={{
            position: "absolute", left: "1rem", top: "50%", transform: "translateY(-50%)",
            width: 40, height: 40, borderRadius: "50%",
            background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.18)",
            display: "flex", alignItems: "center", justifyContent: "center",
            color: "#fff", zIndex: 1,
          }}
        >
          <ChevronLeft size={20} />
        </button>
      )}

      {/* 이미지 */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        ref={imgRef}
        key={urls[index]}
        src={urls[index]}
        alt={`이미지 ${index + 1}`}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
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
          transform: `scale(${scale}) translate(${translate.x / scale}px, ${translate.y / scale}px)`,
          transformOrigin: "center center",
          transition: pinchRef.current.active || panRef.current.active ? "none" : "transform 0.2s ease",
          cursor: isZoomed ? "grab" : "zoom-in",
          userSelect: "none",
          touchAction: "none",
        }}
      />

      {/* 다음 */}
      {urls.length > 1 && !isZoomed && (
        <button
          onClick={onNext}
          className="pressable"
          style={{
            position: "absolute", right: "1rem", top: "50%", transform: "translateY(-50%)",
            width: 40, height: 40, borderRadius: "50%",
            background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.18)",
            display: "flex", alignItems: "center", justifyContent: "center",
            color: "#fff", zIndex: 1,
          }}
        >
          <ChevronRight size={20} />
        </button>
      )}

      {/* 페이지 인디케이터 */}
      {urls.length > 1 && !isZoomed && (
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

      {/* 줌 힌트 */}
      {isZoomed && (
        <div style={{
          position: "absolute", bottom: "1rem",
          fontSize: "0.75rem", color: "rgba(255,255,255,0.5)",
          pointerEvents: "none",
        }}>
          더블탭으로 원래 크기로 돌아가기
        </div>
      )}
    </div>
  );
}
