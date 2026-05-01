"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Uppy from "@uppy/core";
import Tus, { type TusBody } from "@uppy/tus";
import Dashboard from "@uppy/react/dashboard";
import { useUppyState } from "@uppy/react";
import type { UppyFile } from "@uppy/core";
import { Film, LoaderCircle, RefreshCw, Search, X } from "lucide-react";

const POSTER_TIME = process.env.NEXT_PUBLIC_CLOUDFLARE_STREAM_POSTER_TIME?.trim() || "1s";
const TUS_CHUNK_SIZE = 50 * 1024 * 1024;

type UploadMeta = { name?: string };
type TusBody_ = TusBody;

type UploadResult = {
  uid: string;
  title: string;
  posterTime: string;
};

type LibraryVideo = {
  uid: string;
  meta?: { name?: string };
  duration?: number;
  readyToStream: boolean;
};

type ActiveTab = "upload" | "library";

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

function extractUidFromUploadUrl(file: UppyFile<UploadMeta, TusBody_> | undefined): string | null {
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
  const [isMobile, setIsMobile] = useState(false);
  const [activeTab, setActiveTab] = useState<ActiveTab>("upload");

  // Upload tab state
  const [uploadError, setUploadError] = useState("");
  const [isUploading, setIsUploading] = useState(false);

  // Library tab state
  const [libraryVideos, setLibraryVideos] = useState<LibraryVideo[]>([]);
  const [libraryLoading, setLibraryLoading] = useState(false);
  const [libraryError, setLibraryError] = useState("");
  const [librarySearch, setLibrarySearch] = useState("");
  const [libraryLoaded, setLibraryLoaded] = useState(false);
  const [selectedUid, setSelectedUid] = useState<string | null>(null);

  // Captures stream-media-id from init endpoint or onAfterResponse (secondary)
  const capturedUidRef = useRef<string | null>(null);

  const uppy = useMemo(() => {
    const instance = new Uppy<UploadMeta, TusBody_>({
      autoProceed: false,
      restrictions: {
        maxNumberOfFiles: 1,
        allowedFileTypes: ["video/*"],
      },
    });

    instance.use(Tus<UploadMeta, TusBody_>, {
      endpoint: "/api/upload/video",
      chunkSize: TUS_CHUNK_SIZE,
      allowedMetaFields: ["name"],
      removeFingerprintOnSuccess: true,
      onAfterResponse(req, res) {
        // Secondary capture: if TUS ignores pre-set uploadUrl and does its own creation POST,
        // capture the returned stream-media-id and overwrite ref.
        if (req.getMethod() === "POST" && req.getURL().includes("/api/upload/video")) {
          const mediaId = res.getHeader("stream-media-id")?.trim();
          if (mediaId) capturedUidRef.current = mediaId;
        }
      },
    });
    return instance;
  }, []);

  const files = useUppyState(uppy, (s) => Object.values(s.files));
  const totalProgress = useUppyState(uppy, (s) => s.totalProgress);

  // ── Library loader ──────────────────────────────────────────
  const loadLibrary = useCallback(async (search?: string) => {
    setLibraryLoading(true);
    setLibraryError("");
    try {
      const url = new URL("/api/stream/videos", window.location.origin);
      if (search?.trim()) url.searchParams.set("search", search.trim());
      const res = await fetch(url.toString());
      const data = await res.json() as { videos?: LibraryVideo[]; error?: string };
      if (!res.ok) throw new Error(data.error ?? "비디오 목록을 불러오지 못했습니다.");
      setLibraryVideos(data.videos ?? []);
      setLibraryLoaded(true);
    } catch (err) {
      setLibraryError(err instanceof Error ? err.message : "비디오 목록을 불러오지 못했습니다.");
    } finally {
      setLibraryLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === "library" && !libraryLoaded && !libraryLoading) {
      void loadLibrary();
    }
  }, [activeTab, libraryLoaded, libraryLoading, loadLibrary]);

  // ── Uppy event handlers ─────────────────────────────────────
  useEffect(() => {
    const onFileAdded = () => { setUploadError(""); };

    const onUpload = () => {
      setIsUploading(true);
      setUploadError("");
    };

    const onUploadSuccess = (file: UppyFile<UploadMeta, TusBody_> | undefined) => {
      const uid = capturedUidRef.current || extractUidFromUploadUrl(file);
      capturedUidRef.current = null;
      if (!uid) {
        setUploadError("업로드는 완료됐지만 Cloudflare Stream video uid를 받지 못했습니다.");
        setIsUploading(false);
        return;
      }
      setIsUploading(false);
      onUploaded({ uid, title: file?.name ?? "업로드한 동영상", posterTime: POSTER_TIME });
      uppy.cancelAll();
      uppy.clear();
      onClose();
    };

    const onUploadError = (_file: UppyFile<UploadMeta, TusBody_> | undefined, error: Error) => {
      setUploadError(error.message || "동영상 업로드에 실패했습니다.");
      setIsUploading(false);
    };

    const onRestrictionFailed = (_file: UppyFile<UploadMeta, TusBody_> | undefined, error: Error) => {
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

  // ── Reset on close ──────────────────────────────────────────
  useEffect(() => {
    if (open) return;
    uppy.cancelAll();
    uppy.clear();
    capturedUidRef.current = null;
    setActiveTab("upload");
    setUploadError("");
    setIsUploading(false);
    setSelectedUid(null);
  }, [open, uppy]);

  // ── Body scroll lock ────────────────────────────────────────
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    const sync = () => setIsMobile(window.innerWidth < 640);
    sync();
    window.addEventListener("resize", sync);
    return () => window.removeEventListener("resize", sync);
  }, [mounted]);

  useEffect(() => {
    if (!open || !mounted) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [mounted, open]);

  useEffect(() => {
    return () => { uppy.destroy(); };
  }, [uppy]);

  if (!open || !mounted) return null;

  const selectedFile = files[0];
  const progressWidth = `${Math.max(0, Math.min(100, totalProgress || 0))}%`;
  const dashboardHeight = isMobile ? 188 : 260;

  // ── Upload button handler: pre-init then upload ─────────────
  const handleStartUpload = async () => {
    if (!selectedFile || isUploading) return;
    setUploadError("");
    setIsUploading(true);
    capturedUidRef.current = null;

    try {
      const initRes = await fetch("/api/upload/video/init", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ size: selectedFile.size, name: selectedFile.name }),
      });
      const initData = await initRes.json() as { uploadUrl?: string; mediaId?: string; error?: string };

      if (!initRes.ok || !initData.uploadUrl || !initData.mediaId) {
        throw new Error(initData.error ?? "업로드 초기화에 실패했습니다.");
      }

      capturedUidRef.current = initData.mediaId;

      // Tell @uppy/tus to use the pre-created Cloudflare upload URL,
      // skipping its own TUS creation POST to our endpoint.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (uppy as any).setFileState(selectedFile.id, { tus: { uploadUrl: initData.uploadUrl } });

      void uppy.upload();
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "업로드 초기화에 실패했습니다.");
      setIsUploading(false);
    }
  };

  // ── Library insert ──────────────────────────────────────────
  const handleLibraryInsert = () => {
    if (!selectedUid) return;
    const video = libraryVideos.find((v) => v.uid === selectedUid);
    onUploaded({
      uid: selectedUid,
      title: video?.meta?.name ?? "업로드한 동영상",
      posterTime: POSTER_TIME,
    });
    onClose();
  };

  // ── Render ──────────────────────────────────────────────────
  return createPortal(
    <div className="fixed inset-0 z-[120] flex items-end justify-center bg-black/55 p-0 sm:items-center sm:p-4 backdrop-blur-sm">
      <div
        className="flex h-[100dvh] w-full max-w-3xl flex-col overflow-hidden rounded-none sm:h-auto sm:max-h-[90dvh] sm:rounded-2xl"
        style={{ background: "var(--bg-card)", border: "1px solid var(--border)", boxShadow: "var(--shadow-lg)" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-4 border-b px-4 py-3 sm:px-5 sm:py-4" style={{ borderColor: "var(--border)" }}>
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: "#EA580C" }}>Cloudflare Stream</p>
            <h3 className="text-base font-bold sm:text-lg" style={{ color: "var(--text-primary)" }}>동영상</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl sm:h-10 sm:w-10"
            style={{ background: "var(--bg-input)", color: "var(--text-muted)", border: "1px solid var(--border)" }}
            aria-label="닫기"
          >
            <X size={16} />
          </button>
        </div>

        {/* Tab bar */}
        <div className="flex border-b px-2 sm:px-3" style={{ borderColor: "var(--border)" }}>
          {(["upload", "library"] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className="flex-1 py-3 text-sm font-semibold transition-colors"
              style={{
                borderBottom: activeTab === tab ? "2px solid #EA580C" : "2px solid transparent",
                color: activeTab === tab ? "#EA580C" : "var(--text-muted)",
                background: "transparent",
                marginBottom: -1,
              }}
            >
              {tab === "upload" ? "업로드" : "라이브러리"}
            </button>
          ))}
        </div>

        {/* ── Upload tab ── */}
        {activeTab === "upload" && (
          <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-4 sm:gap-4 sm:p-5">
            <Dashboard
              uppy={uppy}
              width="100%"
              height={dashboardHeight}
              proudlyDisplayPoweredByUppy={false}
              hideUploadButton
              hidePauseResumeButton={false}
              hideRetryButton={false}
              note={isMobile ? "동영상 1개 선택" : "MP4, MOV, WebM 등 동영상 파일을 선택하세요."}
              singleFileFullScreen={false}
            />

            {selectedFile && (
              <div
                className="flex items-center justify-between gap-3 rounded-xl px-3.5 py-3 sm:px-4"
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
            )}

            {uploadError && (
              <div
                className="rounded-xl px-4 py-3 text-sm"
                style={{ background: "rgba(244,63,94,0.1)", border: "1px solid rgba(244,63,94,0.28)", color: "#F43F5E" }}
              >
                {uploadError}
              </div>
            )}

            <div className="sticky bottom-0 mt-auto flex gap-2 bg-[var(--bg-card)] pt-1">
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
                onClick={() => { void handleStartUpload(); }}
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
        )}

        {/* ── Library tab ── */}
        {activeTab === "library" && (
          <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-4 sm:gap-4 sm:p-5">
            {/* Search */}
            <form
              onSubmit={(e) => { e.preventDefault(); void loadLibrary(librarySearch); }}
              className="flex gap-2"
            >
              <div className="relative flex-1">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--text-muted)" }} />
                <input
                  type="text"
                  value={librarySearch}
                  onChange={(e) => setLibrarySearch(e.target.value)}
                  placeholder="영상 이름으로 검색"
                  className="w-full rounded-xl py-2.5 pl-8 pr-3 text-sm"
                  style={{
                    background: "var(--bg-input)",
                    border: "1px solid var(--border)",
                    color: "var(--text-primary)",
                    outline: "none",
                  }}
                />
              </div>
              <button
                type="submit"
                disabled={libraryLoading}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
                style={{ background: "var(--bg-input)", border: "1px solid var(--border)", color: "var(--text-muted)" }}
                aria-label="검색"
              >
                {libraryLoading
                  ? <LoaderCircle size={14} className="animate-spin" />
                  : <RefreshCw size={14} />}
              </button>
            </form>

            {/* Video grid */}
            <div
              className="overflow-y-auto scrollbar-hide"
              style={{ maxHeight: isMobile ? "none" : 320, minHeight: isMobile ? 220 : 200 }}
            >
              {libraryLoading && libraryVideos.length === 0 && (
                <div className="flex items-center justify-center py-16">
                  <LoaderCircle size={20} className="animate-spin" style={{ color: "var(--text-muted)" }} />
                </div>
              )}

              {!libraryLoading && libraryError && (
                <div
                  className="rounded-xl px-4 py-3 text-sm"
                  style={{ background: "rgba(244,63,94,0.1)", border: "1px solid rgba(244,63,94,0.28)", color: "#F43F5E" }}
                >
                  {libraryError}
                </div>
              )}

              {!libraryLoading && !libraryError && libraryLoaded && libraryVideos.length === 0 && (
                <div className="flex items-center justify-center py-16 text-sm" style={{ color: "var(--text-muted)" }}>
                  업로드된 영상이 없습니다.
                </div>
              )}

              {libraryVideos.length > 0 && (
                <div className="grid gap-2">
                  {libraryVideos.map((video) => {
                    const isSelected = selectedUid === video.uid;
                    const name = video.meta?.name ?? video.uid;
                    return (
                      <button
                        key={video.uid}
                        type="button"
                        onClick={() => setSelectedUid(isSelected ? null : video.uid)}
                        className="flex items-center gap-3 overflow-hidden rounded-xl px-3 py-3 text-left transition-opacity hover:opacity-80"
                        style={{
                          border: isSelected ? "2px solid #EA580C" : "2px solid var(--border)",
                          background: isSelected ? "rgba(234,88,12,0.08)" : "var(--bg-input)",
                        }}
                      >
                        <div
                          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl"
                          style={{
                            background: isSelected ? "rgba(234,88,12,0.14)" : "rgba(255,255,255,0.05)",
                            color: isSelected ? "#EA580C" : "var(--text-muted)",
                          }}
                        >
                          <Film size={18} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p
                            className="truncate text-xs font-semibold leading-tight"
                            style={{ color: isSelected ? "#EA580C" : "var(--text-primary)" }}
                            title={name}
                          >
                            {name}
                          </p>
                          <p className="mt-1 text-xs" style={{ color: "var(--text-muted)" }}>
                            {video.readyToStream
                              ? (video.duration ? formatDuration(video.duration) : "준비됨")
                              : "처리 중"}
                          </p>
                        </div>
                        <div
                          className="shrink-0 rounded-full px-2 py-1 text-[11px] font-semibold"
                          style={{
                            background: video.readyToStream ? "rgba(16,185,129,0.14)" : "rgba(255,255,255,0.06)",
                            color: video.readyToStream ? "#10B981" : "var(--text-muted)",
                          }}
                        >
                          {video.readyToStream ? "사용 가능" : "인코딩 중"}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Buttons */}
            <div className="sticky bottom-0 mt-auto flex gap-2 bg-[var(--bg-card)] pt-1">
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
                disabled={!selectedUid}
                onClick={handleLibraryInsert}
                className="flex-1 rounded-xl px-4 py-3 text-sm font-semibold"
                style={{
                  background: selectedUid ? "#EA580C" : "rgba(234,88,12,0.3)",
                  color: "#fff",
                  opacity: selectedUid ? 1 : 0.65,
                }}
              >
                선택한 영상 삽입
              </button>
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
