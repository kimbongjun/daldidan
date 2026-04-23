"use client";

import type { ReactNode } from "react";
import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Camera, ImagePlus, Link as LinkIcon, LoaderCircle, ScanLine, TriangleAlert, X } from "lucide-react";
import type { LottoQrResponse } from "@/app/api/lotto/qr/route";
import type { Html5Qrcode } from "html5-qrcode";

const ACCENT = "#F59E0B";

type ScanStatus = "idle" | "starting" | "scanning" | "submitting" | "error" | "success";

interface CameraDevice {
  id: string;
  label: string;
}

function rankLabel(rank: number | null): string {
  if (rank === null) return "낙첨";
  return `${rank}등`;
}

function getBallColor(n: number): string {
  if (n <= 10) return "#EF4444";
  if (n <= 20) return "#F97316";
  if (n <= 30) return "#EAB308";
  if (n <= 40) return "#22C55E";
  return "#3B82F6";
}

function LottoBall({ n, dimmed = false }: { n: number; dimmed?: boolean }) {
  const color = getBallColor(n);
  return (
    <div
      className="flex items-center justify-center rounded-full font-bold shrink-0"
      style={{
        width: 28,
        height: 28,
        background: `radial-gradient(circle at 35% 35%, ${color}ee, ${color}99)`,
        color: "#fff",
        fontSize: 11,
        opacity: dimmed ? 0.45 : 1,
        boxShadow: `0 2px 8px ${color}44`,
      }}
    >
      {n}
    </div>
  );
}

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function LottoQrScannerModal({ open, onClose }: Props) {
  const scannerRegionId = useId().replace(/:/g, "-");
  const captureInputRef = useRef<HTMLInputElement | null>(null);
  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const lastScanRef = useRef<string | null>(null);
  const mountedRef = useRef(true);

  const [status, setStatus] = useState<ScanStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [manualQr, setManualQr] = useState("");
  const [result, setResult] = useState<LottoQrResponse | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    setMounted(true);
    return () => {
      setMounted(false);
    };
  }, []);

  useEffect(() => {
    if (!open) {
      void stopScanner();
      setStatus("idle");
      setError(null);
      setManualQr("");
      setResult(null);
      lastScanRef.current = null;
      return;
    }

    return () => {
      void stopScanner();
    };
  }, [open]);

  useEffect(() => {
    if (!open || typeof document === "undefined") return;

    const { body, documentElement } = document;
    const prevBodyOverflow = body.style.overflow;
    const prevHtmlOverflow = documentElement.style.overflow;

    body.style.overflow = "hidden";
    documentElement.style.overflow = "hidden";

    return () => {
      body.style.overflow = prevBodyOverflow;
      documentElement.style.overflow = prevHtmlOverflow;
    };
  }, [open]);

  const stopScanner = async () => {
    const scanner = html5QrCodeRef.current;
    if (!scanner) return;

    html5QrCodeRef.current = null;

    try {
      if (scanner.isScanning) {
        await scanner.stop();
      }
    } catch {
      // 스캐너 정지 실패는 정리 단계에서 무시한다.
    }

    try {
      scanner.clear();
    } catch {
      // DOM 정리 실패는 무시한다.
    }
  };

  const submitQr = async (rawQr: string) => {
    setStatus("submitting");
    setError(null);

    try {
      const res = await fetch("/api/lotto/qr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ qr: rawQr }),
      });

      const json = await res.json() as LottoQrResponse | { error?: string };
      if (!res.ok) {
        throw new Error("error" in json && json.error ? json.error : "QR 결과 조회에 실패했습니다.");
      }

      if (!mountedRef.current) return;
      await stopScanner();
      setResult(json as LottoQrResponse);
      setStatus("success");
    } catch (e) {
      if (!mountedRef.current) return;
      setError(e instanceof Error ? e.message : "QR 결과 조회에 실패했습니다.");
      setStatus("error");
      lastScanRef.current = null;
    }
  };

  const loadQrLibrary = () => import("html5-qrcode");

  const pickPreferredCamera = (cameras: CameraDevice[]): CameraDevice | null => {
    if (cameras.length === 0) return null;

    const rearCamera = cameras.find((camera) => /back|rear|environment|후면|광각/i.test(camera.label));
    if (rearCamera) return rearCamera;

    return cameras[cameras.length - 1] ?? null;
  };

  const startScanner = async () => {
    if (typeof window === "undefined") return;
    if (!navigator.mediaDevices?.getUserMedia) {
      setStatus("error");
      setError("이 브라우저는 실시간 카메라 스캔을 지원하지 않습니다. 사진 업로드나 QR 주소 입력을 사용해 주세요.");
      return;
    }

    setStatus("starting");
    setError(null);

    try {
      await stopScanner();
      const { Html5Qrcode, Html5QrcodeSupportedFormats } = await loadQrLibrary();
      const scanner = new Html5Qrcode(
        scannerRegionId,
        {
          formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
          verbose: false,
          useBarCodeDetectorIfSupported: true,
        },
      );
      html5QrCodeRef.current = scanner;

      const cameras = await Html5Qrcode.getCameras() as CameraDevice[];
      const preferredCamera = pickPreferredCamera(cameras);
      const cameraConfig = preferredCamera?.id
        ? preferredCamera.id
        : { facingMode: { ideal: "environment" } };

      await scanner.start(
        cameraConfig,
        {
          fps: 10,
          qrbox: { width: 220, height: 220 },
          aspectRatio: 1,
          disableFlip: false,
        },
        (decodedText) => {
          const rawValue = decodedText.trim();
          if (!rawValue || rawValue === lastScanRef.current || status === "submitting" || status === "success") return;
          lastScanRef.current = rawValue;
          void submitQr(rawValue);
        },
        () => {
          // 검출 실패는 정상 플로우라 무시한다.
        },
      );

      if (!mountedRef.current) return;
      setStatus("scanning");
    } catch (e) {
      await stopScanner();
      setStatus("error");
      setError(e instanceof Error ? e.message : "카메라를 시작하지 못했습니다. 사진 업로드나 QR 주소 입력을 사용해 주세요.");
    }
  };

  const handleManualSubmit = async () => {
    if (!manualQr.trim()) {
      setError("QR 문자열 또는 주소를 입력해 주세요.");
      return;
    }
    await submitQr(manualQr.trim());
  };

  const handleCaptureImage = async (file: File | null) => {
    if (!file) return;

    setStatus("submitting");
    setError(null);

    try {
      await stopScanner();
      const { Html5Qrcode, Html5QrcodeSupportedFormats } = await loadQrLibrary();
      const scanner = new Html5Qrcode(
        scannerRegionId,
        {
          formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
          verbose: false,
          useBarCodeDetectorIfSupported: true,
        },
      );
      html5QrCodeRef.current = scanner;

      const rawValue = (await scanner.scanFile(file, false)).trim();
      if (!rawValue) {
        throw new Error("촬영한 이미지에서 QR을 찾지 못했습니다.");
      }

      await submitQr(rawValue);
    } catch (e) {
      await stopScanner();
      setStatus("error");
      setError(e instanceof Error ? e.message : "촬영 이미지에서 QR을 읽지 못했습니다.");
    }
  };

  if (!open || !mounted) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)" }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="w-full max-w-md rounded-3xl overflow-hidden"
        style={{
          background: "var(--bg-card)",
          border: "1px solid var(--border)",
          boxShadow: "0 30px 80px rgba(0,0,0,0.45)",
          maxHeight: "min(92dvh, 860px)",
        }}
      >
        <div className="flex items-center justify-between px-5 pt-5 pb-4">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: ACCENT }}>복권 QR</p>
            <h3 className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>당첨 결과 확인</h3>
            <p className="mt-1 text-xs" style={{ color: "var(--text-muted)" }}>
              전체 화면 레이어에서 처리해 레이아웃 흔들림 없이 스캔합니다.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 transition-opacity hover:opacity-75"
            style={{ color: "var(--text-muted)", background: "rgba(255,255,255,0.04)" }}
            aria-label="닫기"
          >
            <X size={16} />
          </button>
        </div>

        <div className="overflow-y-auto px-5 pb-5 flex flex-col gap-4">
          <input
            ref={captureInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0] ?? null;
              void handleCaptureImage(file);
              e.currentTarget.value = "";
            }}
          />

          <div
            className="relative rounded-2xl overflow-hidden"
            style={{ background: "#0B1220", aspectRatio: "3 / 4", border: "1px solid rgba(255,255,255,0.08)" }}
          >
            <div id={scannerRegionId} className="absolute inset-0" />

            {status !== "success" && (
              <>
                <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, rgba(0,0,0,0.3), rgba(0,0,0,0.08), rgba(0,0,0,0.4))" }} />
                {(status === "scanning" || status === "starting" || status === "submitting") && (
                  <div className="absolute inset-6 rounded-2xl" style={{ border: `2px solid ${ACCENT}CC`, boxShadow: `0 0 0 9999px rgba(0,0,0,0.22)` }}>
                    <div
                      className="absolute inset-x-0"
                      style={{
                        top: "50%",
                        height: 2,
                        background: `linear-gradient(90deg, transparent 0%, ${ACCENT} 18%, #FCD34D 50%, ${ACCENT} 82%, transparent 100%)`,
                        boxShadow: `0 0 18px ${ACCENT}`,
                        animation: "lotto-qr-scan 2s ease-in-out infinite",
                      }}
                    />
                  </div>
                )}
              </>
            )}

            {status === "idle" && (
              <OverlayMessage
                icon={<ScanLine size={18} />}
                title="QR 확인 방식을 선택해 주세요"
                description="실시간 스캔을 시작하거나, 티켓 사진 업로드 또는 QR 주소 붙여넣기로 바로 확인할 수 있습니다."
              />
            )}

            {status === "starting" && (
              <OverlayMessage icon={<LoaderCircle size={18} className="animate-spin" />} title="카메라 준비 중" description="후면 카메라 권한을 확인해 주세요." />
            )}
            {status === "submitting" && (
              <OverlayMessage icon={<LoaderCircle size={18} className="animate-spin" />} title="QR 확인 중" description="스캔한 번호를 당첨 데이터와 비교하고 있습니다." />
            )}
            {(status === "idle" || status === "scanning") && (
              <div className="absolute left-0 right-0 bottom-0 p-4">
                <div className="rounded-xl px-3 py-2 backdrop-blur-sm" style={{ background: "rgba(0,0,0,0.45)", border: "1px solid rgba(255,255,255,0.1)" }}>
                  <div className="flex items-center gap-2 text-sm font-semibold text-white">
                    <ScanLine size={16} />
                    QR 코드를 프레임 안에 맞춰 주세요
                  </div>
                  <p className="mt-1 text-xs text-white/70">동행복권 로또 티켓의 구매자용 QR을 자동 인식합니다.</p>
                </div>
              </div>
            )}

            {status === "error" && (
              <OverlayMessage icon={<TriangleAlert size={18} />} title="카메라 스캔을 진행하지 못했습니다" description={error ?? "아래 입력칸으로 QR 주소를 확인해 주세요."} />
            )}

            {status === "success" && result && (
              <div className="absolute inset-0 overflow-y-auto p-4" style={{ background: "rgba(8,12,24,0.82)" }}>
                <div className="rounded-2xl p-4 flex flex-col gap-3" style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)" }}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold" style={{ color: "#FCD34D" }}>
                        제 {result.drwNo}회 · {result.drawDate}
                      </p>
                      <p className="text-sm font-bold text-white">
                        {result.bestRank ? `최고 ${rankLabel(result.bestRank)}` : "당첨 내역 없음"}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setResult(null);
                        setStatus("idle");
                        setError(null);
                        lastScanRef.current = null;
                        void startScanner();
                      }}
                      className="rounded-lg px-3 py-1.5 text-xs font-semibold transition-opacity hover:opacity-80"
                      style={{ color: ACCENT, background: `${ACCENT}22`, border: `1px solid ${ACCENT}44` }}
                    >
                      다시 스캔
                    </button>
                  </div>

                  <div className="flex items-center gap-1.5 flex-wrap">
                    {result.winningNumbers.map((n) => (
                      <LottoBall key={`win-${n}`} n={n} />
                    ))}
                    <span className="text-xs font-semibold px-2" style={{ color: "#fff" }}>+</span>
                    <LottoBall n={result.bonusNumber} />
                  </div>

                  {result.games.map((game) => (
                    <div
                      key={game.line}
                      className="rounded-xl p-3 flex flex-col gap-2"
                      style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-xs font-semibold text-white">게임 {game.line}</p>
                        <p className="text-xs font-semibold" style={{ color: game.rank ? "#FCD34D" : "var(--text-muted)" }}>
                          {rankLabel(game.rank)}
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {game.numbers.map((n) => (
                          <LottoBall key={`${game.line}-${n}`} n={n} dimmed={!game.matchedNumbers.includes(n)} />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={() => void startScanner()}
              disabled={status === "starting" || status === "submitting"}
              className="flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition-opacity hover:opacity-85 disabled:opacity-50"
              style={{ background: `linear-gradient(135deg, ${ACCENT}, #D97706)`, color: "#fff" }}
            >
              {status === "starting"
                ? <><LoaderCircle size={15} className="animate-spin" /> 실시간 스캔 준비 중</>
                : <><Camera size={15} /> 실시간 스캔 시작</>
              }
            </button>
            <button
              type="button"
              onClick={() => captureInputRef.current?.click()}
              disabled={status === "submitting"}
              className="flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition-opacity hover:opacity-85 disabled:opacity-50"
              style={{ background: "rgba(255,255,255,0.04)", color: "var(--text-primary)", border: "1px solid var(--border)" }}
            >
              <ImagePlus size={15} />
              사진 업로드로 QR 확인
            </button>

            <label className="text-xs font-semibold" style={{ color: "var(--text-muted)" }}>
              QR 주소 직접 입력
            </label>
            <textarea
              value={manualQr}
              onChange={(e) => setManualQr(e.target.value)}
              placeholder="https://m.dhlottery.co.kr/qr.do?method=winQr&v=..."
              className="w-full rounded-2xl px-3 py-3 text-sm resize-none outline-none"
              rows={3}
              style={{
                background: "rgba(255,255,255,0.04)",
                border: "1px solid var(--border)",
                color: "var(--text-primary)",
              }}
            />
            <button
              type="button"
              onClick={handleManualSubmit}
              disabled={status === "submitting"}
              className="flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition-opacity hover:opacity-85 disabled:opacity-50"
              style={{ background: `linear-gradient(135deg, ${ACCENT}, #D97706)`, color: "#fff" }}
            >
              {status === "submitting" ? <LoaderCircle size={15} className="animate-spin" /> : <LinkIcon size={15} />}
              QR 결과 확인
            </button>
          </div>
        </div>

        <style>{`
          #${scannerRegionId} {
            width: 100%;
            height: 100%;
          }

          #${scannerRegionId} video,
          #${scannerRegionId} canvas {
            width: 100% !important;
            height: 100% !important;
            object-fit: cover;
          }

          @keyframes lotto-qr-scan {
            0%, 100% { transform: translateY(-90px); opacity: 0.35; }
            50% { transform: translateY(90px); opacity: 1; }
          }
        `}</style>
      </div>
    </div>,
    document.body,
  );
}

function OverlayMessage({
  icon,
  title,
  description,
}: {
  icon: ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="absolute inset-0 flex items-center justify-center p-6">
      <div
        className="rounded-2xl p-4 text-center flex flex-col items-center gap-2"
        style={{ background: "rgba(10,14,28,0.78)", border: "1px solid rgba(255,255,255,0.12)" }}
      >
        <div style={{ color: "#FCD34D" }}>{icon}</div>
        <p className="text-sm font-bold text-white">{title}</p>
        <p className="text-xs" style={{ color: "rgba(255,255,255,0.72)" }}>{description}</p>
      </div>
    </div>
  );
}
