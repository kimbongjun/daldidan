"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { LoaderCircle, RefreshCw } from "lucide-react";
import { MediaCommunitySkin, MediaOutlet, MediaPlayer } from "@vidstack/react";
import {
  buildCloudflareStreamHlsUrl,
  getCloudflareStreamPublicConfig,
} from "@/lib/cloudflare-stream-public";

type VideoStatusPayload = {
  uid: string;
  readyToStream: boolean;
  status: string;
  pctComplete: string | null;
  errorReasonCode: string | null;
  errorReasonText: string | null;
  playback: {
    hls: string | null;
    dash: string | null;
  };
  thumbnail: string | null;
  preview: string | null;
};

export default function CloudflareStreamPlayer({
  uid,
  title,
}: {
  uid: string;
  title?: string;
  posterTime?: string;
}) {
  const { customerCode } = getCloudflareStreamPublicConfig();
  const wrapRef = useRef<HTMLDivElement>(null);

  const fallbackHls = useMemo(() => {
    if (!customerCode) return null;
    return buildCloudflareStreamHlsUrl(customerCode, uid);
  }, [customerCode, uid]);

  const [payload, setPayload] = useState<VideoStatusPayload | null>(null);
  const [error, setError] = useState("");

  // Vidstack gesture 레이어가 wheel/touch 이벤트를 소비하므로
  // 래퍼에서 직접 포워딩해 페이지 스크롤을 복원
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;

    const onWheel = (e: WheelEvent) => {
      window.scrollBy({ top: e.deltaY, left: e.deltaX, behavior: "instant" });
    };

    let touchStartY = 0;
    const onTouchStart = (e: TouchEvent) => {
      touchStartY = e.touches[0].clientY;
    };
    const onTouchMove = (e: TouchEvent) => {
      const delta = touchStartY - e.touches[0].clientY;
      touchStartY = e.touches[0].clientY;
      window.scrollBy({ top: delta, behavior: "instant" });
    };

    el.addEventListener("wheel", onWheel, { passive: true });
    el.addEventListener("touchstart", onTouchStart, { passive: true });
    el.addEventListener("touchmove", onTouchMove, { passive: true });

    return () => {
      el.removeEventListener("wheel", onWheel);
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    let timer: number | null = null;

    const load = async () => {
      try {
        const response = await fetch(`/api/upload/video?uid=${encodeURIComponent(uid)}`, { cache: "no-store" });
        const json = await response.json() as VideoStatusPayload | { error?: string };
        if (!response.ok || !("uid" in json)) {
          throw new Error(("error" in json && json.error) || "동영상 상태를 불러오지 못했습니다.");
        }

        if (cancelled) return;
        setPayload(json);
        setError("");

        if (!json.readyToStream && json.status !== "error") {
          timer = window.setTimeout(() => {
            void load();
          }, 5000);
        }
      } catch (loadError) {
        if (cancelled) return;
        setError(loadError instanceof Error ? loadError.message : "동영상 상태를 불러오지 못했습니다.");
      }
    };

    void load();

    return () => {
      cancelled = true;
      if (timer) window.clearTimeout(timer);
    };
  }, [uid]);

  if (!customerCode) {
    return (
      <div className="blog-stream-video-shell">
        <div className="blog-stream-video-badge">Cloudflare Stream</div>
        <div className="blog-stream-video-copy">
          <strong>{title || "동영상"}</strong>
          <span>NEXT_PUBLIC_CLOUDFLARE_STREAM_CUSTOMER_CODE 설정이 필요합니다.</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="blog-stream-video-shell">
        <div className="blog-stream-video-badge">Cloudflare Stream</div>
        <div className="blog-stream-video-copy">
          <strong>{title || "동영상"}</strong>
          <span>{error}</span>
        </div>
      </div>
    );
  }

  const hlsUrl = payload?.playback.hls || fallbackHls;

  if (!payload?.readyToStream || !hlsUrl) {
    return (
      <div className="blog-stream-video-pending">
        <div className="blog-stream-video-pending-overlay">
          <div className="blog-stream-video-badge">Cloudflare Stream</div>
          <div className="blog-stream-video-copy">
            <strong>{title || "업로드한 동영상"}</strong>
            <span>
              {payload?.status === "error"
                ? payload.errorReasonText || "인코딩에 실패했습니다."
                : `인코딩 중${payload?.pctComplete ? ` (${payload.pctComplete}%)` : ""}`}
            </span>
          </div>
          <div className="blog-stream-video-pending-meta">
            {payload?.status === "error" ? <RefreshCw size={14} /> : <LoaderCircle size={14} className="animate-spin" />}
            {payload?.status === "error" ? "Cloudflare Stream 상태를 확인해 주세요." : "영상이 준비되면 자동으로 플레이어가 활성화됩니다."}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="blog-stream-video-player-wrap" ref={wrapRef}>
      <MediaPlayer
        title={title || "Cloudflare Stream video"}
        src={hlsUrl}
        crossorigin=""
        playsinline
        className="blog-stream-video-player"
      >
        <MediaOutlet />
        <MediaCommunitySkin />
      </MediaPlayer>
    </div>
  );
}
