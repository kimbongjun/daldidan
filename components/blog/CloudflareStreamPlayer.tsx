"use client";

import { useEffect, useMemo, useState } from "react";
import { LoaderCircle, PlayCircle, RefreshCw } from "lucide-react";
import { MediaCommunitySkin, MediaOutlet, MediaPlayer, MediaPoster } from "@vidstack/react";
import {
  buildCloudflareStreamHlsUrl,
  buildCloudflareStreamThumbnailUrl,
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
  posterTime = "1s",
}: {
  uid: string;
  title?: string;
  posterTime?: string;
}) {
  const { customerCode, defaultPosterTime } = getCloudflareStreamPublicConfig();
  const fallbackPosterTime = posterTime || defaultPosterTime;

  const fallbackThumbnail = useMemo(() => {
    if (!customerCode) return null;
    return buildCloudflareStreamThumbnailUrl(customerCode, uid, { time: fallbackPosterTime, height: 720 });
  }, [customerCode, fallbackPosterTime, uid]);

  const fallbackHls = useMemo(() => {
    if (!customerCode) return null;
    return buildCloudflareStreamHlsUrl(customerCode, uid);
  }, [customerCode, uid]);

  const [payload, setPayload] = useState<VideoStatusPayload | null>(null);
  const [error, setError] = useState("");

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

  const posterUrl = payload?.thumbnail || fallbackThumbnail;
  const hlsUrl = payload?.playback.hls || fallbackHls;

  if (!payload?.readyToStream || !hlsUrl) {
    return (
      <div className="blog-stream-video-pending">
        {posterUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={posterUrl} alt={title || "동영상 썸네일"} className="blog-stream-video-pending-poster" />
        ) : null}
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
    <div className="blog-stream-video-player-wrap">
      <MediaPlayer
        title={title || "Cloudflare Stream video"}
        src={hlsUrl}
        poster={posterUrl ?? undefined}
        crossorigin=""
        playsinline
        className="blog-stream-video-player"
      >
        <MediaOutlet />
        <MediaPoster alt={title || "Cloudflare Stream poster"} />
        <MediaCommunitySkin />
      </MediaPlayer>
      <div className="blog-stream-video-caption">
        <PlayCircle size={14} />
        Adaptive HLS streaming via Cloudflare Stream + Vidstack
      </div>
    </div>
  );
}
