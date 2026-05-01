"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import Uppy from "@uppy/core";
import Tus, { type TusBody } from "@uppy/tus";
import Dashboard from "@uppy/react/dashboard";
import { useUppyState } from "@uppy/react";
import type { UppyFile } from "@uppy/core";
import { LoaderCircle, UploadCloud, X } from "lucide-react";

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
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [statusMessage, setStatusMessage] = useState("영상을 선택하면 업로드 전 미리보기가 바로 표시됩니다.");

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
    const onFileAdded = (file: UppyFile<UploadMeta, TusBody>) => {
      setUploadError("");
      setStatusMessage(`"${file.name}" 업로드 준비 완료`);
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      if (file.data instanceof File) {
        setPreviewUrl(URL.createObjectURL(file.data));
      } else {
        setPreviewUrl(null);
      }
    };

    const onFileRemoved = () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
      setStatusMessage("영상을 선택하면 업로드 전 미리보기가 바로 표시됩니다.");
    };

    const onUpload = () => {
      setIsUploading(true);
      setUploadError("");
      setStatusMessage("Cloudflare Stream으로 영상을 업로드하는 중입니다.");
    };

    const onUploadSuccess = (file: UppyFile<UploadMeta, TusBody> | undefined) => {
      const uid = extractUid(file);
      if (!uid) {
        setUploadError("업로드는 완료됐지만 Cloudflare Stream video uid를 받지 못했습니다.");
        setIsUploading(false);
        return;
      }

      setStatusMessage("업로드가 완료되었습니다. 본문에 스트리밍 플레이어를 삽입합니다.");
      setIsUploading(false);
      onUploaded({
        uid,
        title: file?.name || "업로드한 동영상",
        posterTime: POSTER_TIME,
      });
      instanceCleanup();
      onClose();
    };

    const onUploadError = (_file: UppyFile<UploadMeta, TusBody> | undefined, error: Error) => {
      setUploadError(error.message || "동영상 업로드에 실패했습니다.");
      setStatusMessage("업로드가 중단되었습니다.");
      setIsUploading(false);
    };

    const onRestrictionFailed = (_file: UppyFile<UploadMeta, TusBody> | undefined, error: Error) => {
      setUploadError(error.message || "이 파일 형식은 업로드할 수 없습니다.");
    };

    const instanceCleanup = () => {
      uppy.cancelAll();
      uppy.clear();
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    };

    uppy.on("file-added", onFileAdded);
    uppy.on("file-removed", onFileRemoved);
    uppy.on("upload", onUpload);
    uppy.on("upload-success", onUploadSuccess);
    uppy.on("upload-error", onUploadError);
    uppy.on("restriction-failed", onRestrictionFailed);

    return () => {
      uppy.off("file-added", onFileAdded);
      uppy.off("file-removed", onFileRemoved);
      uppy.off("upload", onUpload);
      uppy.off("upload-success", onUploadSuccess);
      uppy.off("upload-error", onUploadError);
      uppy.off("restriction-failed", onRestrictionFailed);
    };
  }, [onClose, onUploaded, previewUrl, uppy]);

  useEffect(() => {
    if (open) return;
    uppy.cancelAll();
    uppy.clear();
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setUploadError("");
    setIsUploading(false);
    setStatusMessage("영상을 선택하면 업로드 전 미리보기가 바로 표시됩니다.");
  }, [open, previewUrl, uppy]);

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
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      uppy.destroy();
    };
  }, [previewUrl, uppy]);

  if (!open || !mounted) return null;

  const selectedFile = files[0];
  const progressWidth = `${Math.max(0, Math.min(100, totalProgress || 0))}%`;

  return createPortal(
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/55 p-4 backdrop-blur-sm">
      <div
        className="w-full max-w-5xl overflow-hidden rounded-[1.75rem]"
        style={{ background: "var(--bg-card)", border: "1px solid var(--border)", boxShadow: "var(--shadow-lg)" }}
      >
        <div className="flex items-center justify-between gap-4 border-b px-5 py-4" style={{ borderColor: "var(--border)" }}>
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: "#EA580C" }}>Cloudflare Stream</p>
            <h3 className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>동영상 업로드</h3>
            <p className="mt-1 text-sm" style={{ color: "var(--text-muted)" }}>{statusMessage}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-xl"
            style={{ background: "var(--bg-input)", color: "var(--text-muted)", border: "1px solid var(--border)" }}
            aria-label="닫기"
          >
            <X size={16} />
          </button>
        </div>

        <div className="grid gap-0 lg:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
          <div className="min-h-[420px] border-b lg:border-b-0 lg:border-r" style={{ borderColor: "var(--border)" }}>
            <Dashboard
              uppy={uppy}
              width="100%"
              height={420}
              proudlyDisplayPoweredByUppy={false}
              hideUploadButton
              hidePauseResumeButton={false}
              hideRetryButton={false}
              note="MP4, MOV, WebM 등 동영상 파일을 선택하세요. 대용량 업로드는 TUS로 재개할 수 있습니다."
              singleFileFullScreen={false}
            />
          </div>

          <div className="flex flex-col gap-4 p-5">
            <div
              className="overflow-hidden rounded-2xl"
              style={{ background: "var(--bg-input)", border: "1px solid var(--border)" }}
            >
              {previewUrl ? (
                <video src={previewUrl} controls className="aspect-video w-full bg-black object-contain" />
              ) : (
                <div className="flex aspect-video items-center justify-center px-6 text-center text-sm" style={{ color: "var(--text-muted)" }}>
                  업로드 전 미리보기는 파일 선택 직후 `URL.createObjectURL()`로 표시됩니다.
                </div>
              )}
            </div>

            {selectedFile ? (
              <div className="rounded-2xl p-4" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid var(--border)" }}>
                <p className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>{selectedFile.name}</p>
                <p className="mt-1 text-xs" style={{ color: "var(--text-muted)" }}>
                  {((selectedFile.size ?? 0) / 1024 / 1024).toFixed(1)} MB
                </p>
              </div>
            ) : null}

            <div className="rounded-2xl p-4" style={{ background: "rgba(234,88,12,0.08)", border: "1px solid rgba(234,88,12,0.18)" }}>
              <div className="flex items-center gap-2 text-sm font-semibold" style={{ color: "#EA580C" }}>
                {isUploading ? <LoaderCircle size={14} className="animate-spin" /> : <UploadCloud size={14} />}
                업로드 진행률
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full" style={{ background: "rgba(234,88,12,0.14)" }}>
                <div className="h-full rounded-full transition-all duration-300" style={{ background: "#EA580C", width: progressWidth }} />
              </div>
              <p className="mt-2 text-xs" style={{ color: "var(--text-muted)" }}>
                {selectedFile ? `${Math.round(totalProgress || 0)}% 업로드됨` : "파일을 선택한 뒤 업로드를 시작하세요."}
              </p>
            </div>

            {uploadError ? (
              <div className="rounded-2xl px-4 py-3 text-sm" style={{ background: "rgba(244,63,94,0.1)", border: "1px solid rgba(244,63,94,0.28)", color: "#F43F5E" }}>
                {uploadError}
              </div>
            ) : null}

            <div className="mt-auto flex gap-2">
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
      </div>
    </div>,
    document.body,
  );
}
