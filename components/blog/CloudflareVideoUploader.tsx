"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import Uppy from "@uppy/core";
import Tus, { type TusBody } from "@uppy/tus";
import Dashboard from "@uppy/react/dashboard";
import { useUppyState } from "@uppy/react";
import type { UppyFile } from "@uppy/core";
import { LoaderCircle, X } from "lucide-react";

const POSTER_TIME = process.env.NEXT_PUBLIC_CLOUDFLARE_STREAM_POSTER_TIME?.trim() || "1s";
const MAX_DURATION_SECONDS = Number(process.env.NEXT_PUBLIC_CLOUDFLARE_STREAM_MAX_DURATION_SECONDS || 3600);
const THUMBNAIL_TIMESTAMP_PCT = "0.15";
const TUS_CHUNK_SIZE = 50 * 1024 * 1024;

type UploadMeta = {
  name?: string;
};

type UploadResult = {
  uid: string;
  title: string;
  posterTime: string;
};

function encodeTusMetadata(value: string) {
  return window.btoa(unescape(encodeURIComponent(value)));
}

function extractUid(file: UppyFile<UploadMeta, TusBody> | undefined): string | null {
  const xhr = file?.response?.body?.xhr;
  const headerUid = xhr?.getResponseHeader("stream-media-id")?.trim();
  if (headerUid) return headerUid;

  const uploadUrl = file?.response?.uploadURL?.trim();
  if (!uploadUrl) return null;
  const match = uploadUrl.match(/\/([a-z0-9]{32})$/i);
  return match?.[1] ?? null;
}

export default function CloudflareVideoUploader({
  open,
  onClose,
  onUploaded,
}: {
  open: boolean;
  onClose: () => void;
  onUploaded: (result: UploadResult) => void;
}) {
  const [mounted, setMounted] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [isUploading, setIsUploading] = useState(false);

  const uppy = useMemo(() => {
    const instance = new Uppy<UploadMeta, TusBody>({
      autoProceed: false,
      restrictions: {
        maxNumberOfFiles: 1,
        allowedFileTypes: ["video/*"],
      },
    });

    instance.use(Tus<UploadMeta, TusBody>, {
      endpoint: "/api/upload/video",
      chunkSize: TUS_CHUNK_SIZE,
      allowedMetaFields: ["name"],
      removeFingerprintOnSuccess: true,
      onBeforeRequest(req) {
        if (req.getMethod() !== "POST" || !req.getURL().includes("/api/upload/video")) return;

        const nextMetadata = [
          req.getHeader("Upload-Metadata"),
          `maxdurationseconds ${encodeTusMetadata(String(MAX_DURATION_SECONDS))}`,
          `thumbnailtimestamppct ${encodeTusMetadata(THUMBNAIL_TIMESTAMP_PCT)}`,
        ].filter(Boolean).join(",");

        req.setHeader("Upload-Metadata", nextMetadata);
      },
    });

    return instance;
  }, []);

  const files = useUppyState(uppy, (state) => Object.values(state.files));
  const totalProgress = useUppyState(uppy, (state) => state.totalProgress);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const onFileAdded = () => {
      setUploadError("");
    };

    const onUpload = () => {
      setIsUploading(true);
      setUploadError("");
    };

    const onUploadSuccess = (file: UppyFile<UploadMeta, TusBody> | undefined) => {
      const uid = extractUid(file);
      if (!uid) {
        setUploadError("업로드는 완료됐지만 Cloudflare Stream video uid를 받지 못했습니다.");
        setIsUploading(false);
        return;
      }

      setIsUploading(false);
      onUploaded({
        uid,
        title: file?.name || "업로드한 동영상",
        posterTime: POSTER_TIME,
      });
      uppy.cancelAll();
      uppy.clear();
      onClose();
    };

    const onUploadError = (_file: UppyFile<UploadMeta, TusBody> | undefined, error: Error) => {
      setUploadError(error.message || "동영상 업로드에 실패했습니다.");
      setIsUploading(false);
    };

    const onRestrictionFailed = (_file: UppyFile<UploadMeta, TusBody> | undefined, error: Error) => {
      setUploadError(error.message || "이 파일 형식은 업로드할 수 없습니다.");
    };

    uppy.on("file-added", onFileAdded);
    uppy.on("upload", onUpload);
    uppy.on("upload-success", onUploadSuccess);
    uppy.on("upload-error", onUploadError);
    uppy.on("restriction-failed", onRestrictionFailed);

    return () => {
      uppy.off("file-added", onFileAdded);
      uppy.off("upload", onUpload);
      uppy.off("upload-success", onUploadSuccess);
      uppy.off("upload-error", onUploadError);
      uppy.off("restriction-failed", onRestrictionFailed);
    };
  }, [onClose, onUploaded, uppy]);

  useEffect(() => {
    if (open) return;
    uppy.cancelAll();
    uppy.clear();
    setUploadError("");
    setIsUploading(false);
  }, [open, uppy]);

  useEffect(() => {
    if (!open || !mounted) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [mounted, open]);

  useEffect(() => {
    return () => {
      uppy.destroy();
    };
  }, [uppy]);

  if (!open || !mounted) return null;

  const selectedFile = files[0];
  const progressWidth = `${Math.max(0, Math.min(100, totalProgress || 0))}%`;

  return createPortal(
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/55 p-4 backdrop-blur-sm">
      <div
        className="w-full max-w-lg overflow-hidden rounded-2xl"
        style={{ background: "var(--bg-card)", border: "1px solid var(--border)", boxShadow: "var(--shadow-lg)" }}
      >
        {/* 헤더 */}
        <div className="flex items-center justify-between gap-4 border-b px-5 py-4" style={{ borderColor: "var(--border)" }}>
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: "#EA580C" }}>Cloudflare Stream</p>
            <h3 className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>동영상 업로드</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
            style={{ background: "var(--bg-input)", color: "var(--text-muted)", border: "1px solid var(--border)" }}
            aria-label="닫기"
          >
            <X size={16} />
          </button>
        </div>

        {/* 바디 */}
        <div className="flex flex-col gap-4 p-5">
          {/* Uppy Dashboard */}
          <Dashboard
            uppy={uppy}
            width="100%"
            height={280}
            proudlyDisplayPoweredByUppy={false}
            hideUploadButton
            hidePauseResumeButton={false}
            hideRetryButton={false}
            note="MP4, MOV, WebM 등 동영상 파일을 선택하세요."
            singleFileFullScreen={false}
          />

          {/* 파일 정보 + 진행률 카드 */}
          {selectedFile ? (
            <div
              className="flex items-center justify-between gap-4 rounded-xl px-4 py-3"
              style={{ background: "rgba(255,255,255,0.03)", border: "1px solid var(--border)" }}
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold" style={{ color: "var(--text-primary)" }}>{selectedFile.name}</p>
                <p className="mt-0.5 text-xs" style={{ color: "var(--text-muted)" }}>
                  {((selectedFile.size ?? 0) / 1024 / 1024).toFixed(1)} MB
                </p>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1.5">
                <div className="flex items-center gap-1.5">
                  {isUploading && <LoaderCircle size={12} className="animate-spin" style={{ color: "#EA580C" }} />}
                  <span className="text-xs font-semibold tabular-nums" style={{ color: "#EA580C" }}>
                    {Math.round(totalProgress || 0)}%
                  </span>
                </div>
                <div className="h-1.5 w-24 overflow-hidden rounded-full" style={{ background: "rgba(234,88,12,0.14)" }}>
                  <div
                    className="h-full rounded-full transition-all duration-300"
                    style={{ background: "#EA580C", width: progressWidth }}
                  />
                </div>
              </div>
            </div>
          ) : null}

          {/* 에러 메시지 */}
          {uploadError ? (
            <div
              className="rounded-xl px-4 py-3 text-sm"
              style={{ background: "rgba(244,63,94,0.1)", border: "1px solid rgba(244,63,94,0.28)", color: "#F43F5E" }}
            >
              {uploadError}
            </div>
          ) : null}

          {/* 버튼 행 */}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl px-4 py-3 text-sm font-semibold"
              style={{ background: "var(--bg-input)", border: "1px solid var(--border)", color: "var(--text-muted)" }}
            >
              취소
            </button>
            <button
              type="button"
              disabled={!selectedFile || isUploading}
              onClick={() => {
                setUploadError("");
                void uppy.upload();
              }}
              className="flex-1 rounded-xl px-4 py-3 text-sm font-semibold"
              style={{
                background: !selectedFile || isUploading ? "rgba(234,88,12,0.3)" : "#EA580C",
                color: "#fff",
                opacity: !selectedFile || isUploading ? 0.65 : 1,
              }}
            >
              {isUploading ? "업로드 중..." : "본문에 삽입"}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
