"use client";

import { useState, useEffect } from "react";
import { Shuffle, RefreshCw, LoaderCircle, QrCode } from "lucide-react";
import type { LottoLatestResponse } from "@/app/api/lotto/latest/route";
import type { LottoGenerateResponse } from "@/app/api/lotto/generate/route";
import LottoQrScannerModal from "@/components/widgets/LottoQrScannerModal";

const ACCENT = "#F59E0B";

function getBallColor(n: number): string {
  if (n <= 10) return "#EF4444";
  if (n <= 20) return "#F97316";
  if (n <= 30) return "#EAB308";
  if (n <= 40) return "#22C55E";
  return "#3B82F6";
}

function LottoBall({ n, size = 36 }: { n: number; size?: number }) {
  const color = getBallColor(n);
  return (
    <div
      className="flex items-center justify-center rounded-full font-bold shrink-0"
      style={{
        width: size,
        height: size,
        background: `radial-gradient(circle at 35% 35%, ${color}ee, ${color}99)`,
        color: "#fff",
        fontSize: size >= 36 ? 13 : 11,
        boxShadow: `0 2px 8px ${color}66`,
      }}
    >
      {n}
    </div>
  );
}

function BonusBall({ n }: { n: number }) {
  return (
    <div className="flex items-center gap-1">
      <span style={{ color: "var(--text-muted)", fontSize: 14 }}>+</span>
      <LottoBall n={n} size={32} />
    </div>
  );
}

function SkeletonRow() {
  return (
    <div className="flex gap-2 justify-center">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="rounded-full animate-pulse shrink-0"
          style={{ width: 36, height: 36, background: "rgba(255,255,255,0.08)" }}
        />
      ))}
    </div>
  );
}

export default function LottoWidget() {
  const [latest, setLatest] = useState<LottoLatestResponse | null>(null);
  const [generated, setGenerated] = useState<LottoGenerateResponse | null>(null);
  const [latestLoading, setLatestLoading] = useState(true);
  const [genLoading, setGenLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [qrOpen, setQrOpen] = useState(false);

  const loadLatest = async () => {
    setLatestLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/lotto/latest?ts=${Date.now()}`, { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json() as LottoLatestResponse;
      setLatest(data);
    } catch {
      setError("당첨 번호를 불러오지 못했습니다.");
    } finally {
      setLatestLoading(false);
    }
  };

  useEffect(() => {
    void loadLatest();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleGenerate = async () => {
    setGenLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/lotto/generate");
      if (!res.ok) throw new Error();
      const data = await res.json() as LottoGenerateResponse;
      setGenerated(data);
    } catch {
      setError("번호 생성에 실패했습니다.");
    } finally {
      setGenLoading(false);
    }
  };

  const latestNumbers = latest
    ? [latest.drwtNo1, latest.drwtNo2, latest.drwtNo3, latest.drwtNo4, latest.drwtNo5, latest.drwtNo6]
    : [];

  return (
    <div className="bento-card gradient-amber h-full flex flex-col p-5 gap-4">
      {/* 헤더 */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: ACCENT }}>복권</p>
          <h2 className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>로또 6/45</h2>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setQrOpen(true)}
            className="tag flex items-center gap-1.5 transition-opacity hover:opacity-80"
            style={{ background: "rgba(255,255,255,0.06)", color: "var(--text-primary)" }}
          >
            <QrCode size={13} />
            QR 확인
          </button>
          <span className="tag" style={{ background: `${ACCENT}22`, color: ACCENT }}>
            🎱 번호 생성
          </span>
        </div>
      </div>

      {/* 최신 당첨 번호 */}
      <div
        className="rounded-xl p-4 flex flex-col gap-3"
        style={{ background: "rgba(255,255,255,0.04)", border: "1px solid var(--border)" }}
      >
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold" style={{ color: "var(--text-muted)" }}>
            {latest ? `제 ${latest.drwNo}회 당첨 번호` : "최근 당첨 번호"}
          </p>
          <div className="flex items-center gap-2">
            {latest && (
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>{latest.drwNoDate}</p>
            )}
            <button
              type="button"
              onClick={() => void loadLatest()}
              disabled={latestLoading}
              className="rounded-lg px-2 py-1 text-[11px] font-semibold transition-opacity hover:opacity-80 disabled:opacity-50"
              style={{ color: ACCENT, background: `${ACCENT}18`, border: `1px solid ${ACCENT}33` }}
            >
              새로고침
            </button>
          </div>
        </div>

        {latestLoading ? (
          <SkeletonRow />
        ) : error && !latest ? (
          <p className="text-xs text-center py-2" style={{ color: "#F43F5E" }}>{error}</p>
        ) : (
          <div className="flex items-center justify-center gap-1.5 flex-wrap">
            {latestNumbers.map((n) => (
              <LottoBall key={n} n={n} />
            ))}
            {latest && <BonusBall n={latest.bnusNo} />}
          </div>
        )}

        {latest && (
          <div className="flex items-center justify-between pt-1">
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>
              1등 당첨자 <span className="font-bold" style={{ color: ACCENT }}>{latest.firstPrzwnerCo}명</span>
            </p>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>
              1인당 <span className="font-bold" style={{ color: ACCENT }}>
                {Math.round(latest.firstWinamnt / 100000000)}억
              </span>
            </p>
          </div>
        )}
      </div>

      {/* AI 번호 생성 */}
      <div className="flex flex-col gap-3 flex-1">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold" style={{ color: "var(--text-muted)" }}>AI 추천 번호</p>
          <button
            onClick={handleGenerate}
            disabled={genLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-opacity hover:opacity-75 disabled:opacity-40"
            style={{ background: `${ACCENT}22`, color: ACCENT, border: `1px solid ${ACCENT}44` }}
          >
            {genLoading
              ? <><LoaderCircle size={11} className="animate-spin" /> 생성 중…</>
              : <><Shuffle size={11} /> 번호 뽑기</>
            }
          </button>
        </div>

        {generated ? (
          <div
            className="rounded-xl p-4 flex flex-col gap-3"
            style={{ background: `${ACCENT}10`, border: `1px solid ${ACCENT}33` }}
          >
            <div className="flex items-center justify-center gap-1.5 flex-wrap">
              {generated.numbers.map((n) => (
                <LottoBall key={n} n={n} />
              ))}
              <BonusBall n={generated.bonus} />
            </div>
            <button
              onClick={handleGenerate}
              disabled={genLoading}
              className="flex items-center justify-center gap-1.5 text-xs py-1.5 rounded-lg transition-opacity hover:opacity-75"
              style={{ color: "var(--text-muted)", background: "rgba(255,255,255,0.04)" }}
            >
              <RefreshCw size={11} /> 다시 생성
            </button>
          </div>
        ) : (
          <div
            className="flex-1 rounded-xl flex flex-col items-center justify-center gap-3 py-6"
            style={{ background: `${ACCENT}08`, border: `1px dashed ${ACCENT}33` }}
          >
            <span style={{ fontSize: "2rem" }}>🎱</span>
            <p className="text-xs text-center" style={{ color: "var(--text-muted)" }}>
              최근 당첨 이력을 분석해<br />행운의 번호를 추천해 드려요
            </p>
            <button
              onClick={handleGenerate}
              disabled={genLoading}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-50 transition-opacity hover:opacity-85"
              style={{ background: `linear-gradient(135deg, ${ACCENT}, #D97706)` }}
            >
              {genLoading
                ? <><LoaderCircle size={14} className="animate-spin" /> 생성 중…</>
                : <><Shuffle size={14} /> 번호 생성하기</>
              }
            </button>
          </div>
        )}
      </div>

      <LottoQrScannerModal open={qrOpen} onClose={() => setQrOpen(false)} />
    </div>
  );
}
