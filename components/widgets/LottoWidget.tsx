"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { Shuffle, RefreshCw, LoaderCircle, QrCode, ScanSearch } from "lucide-react";
import type { LottoLatestResponse } from "@/app/api/lotto/latest/route";
import type { LottoGenerateResponse } from "@/app/api/lotto/generate/route";
import dynamic from "next/dynamic";
import { fetchWithTimeout } from "@/lib/fetch-with-timeout";
import { queryKeys } from "@/lib/queryKeys";
import { useState } from "react";

const LottoQrScannerModal = dynamic(
  () => import("@/components/widgets/LottoQrScannerModal"),
  { ssr: false },
);

const ACCENT = "#F7C137";

function calcNetPrize(amnt: number | null): number | null {
  if (!amnt) return null;
  const taxRate = amnt > 300_000_000 ? 0.33 : 0.22;
  return Math.round((amnt * (1 - taxRate)) / 100_000_000);
}

function getBallColor(n: number): string {
  if (n <= 10) return "#EF4444";
  if (n <= 20) return "#F97316";
  if (n <= 30) return "#EAB308";
  if (n <= 40) return "#22C55E";
  return "#3B82F6";
}

function LottoBall({ n, size = 36, dimmed = false }: { n: number; size?: number; dimmed?: boolean }) {
  const color = getBallColor(n);
  return (
    <div
      className="flex items-center justify-center rounded-full font-bold shrink-0 transition-opacity"
      style={{
        width: size,
        height: size,
        background: `radial-gradient(circle at 35% 35%, ${color}ee, ${color}99)`,
        color: "#fff",
        fontSize: size >= 36 ? 13 : size >= 30 ? 12 : 11,
        opacity: dimmed ? 0.38 : 1,
        boxShadow: dimmed ? "none" : `0 2px 8px ${color}66`,
      }}
    >
      {n}
    </div>
  );
}

/** 매칭 개수·보너스 일치로 등수 산정 (6→1등 … 3→5등, 그 외 낙첨) */
function calcRank(matched: number, bonusMatched: boolean): number | null {
  if (matched === 6) return 1;
  if (matched === 5 && bonusMatched) return 2;
  if (matched === 5) return 3;
  if (matched === 4) return 4;
  if (matched === 3) return 5;
  return null;
}

/**
 * 등수별 당첨금 안내 문구.
 * 1~3등은 pari-mutuel(변동)이라 고정 금액을 쓰지 않는다.
 * 1등만 지난 회차 1인당 금액을 참고용으로 노출, 4·5등은 고정 금액.
 */
function prizeHint(rank: number | null, firstWinamnt: number | null): string | null {
  switch (rank) {
    case 1:
      return firstWinamnt
        ? `지난 회차 1인당 ${Math.round(firstWinamnt / 100_000_000)}억`
        : "당첨금 변동";
    case 2:
    case 3:
      return "당첨금 변동";
    case 4:
      return "50,000원";
    case 5:
      return "5,000원";
    default:
      return null;
  }
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
          className="rounded-full skeleton-shimmer shrink-0"
          style={{ width: 36, height: 36 }}
        />
      ))}
    </div>
  );
}

export default function LottoWidget() {
  const [qrOpen, setQrOpen] = useState(false);
  const [showCompare, setShowCompare] = useState(false);

  const {
    data: latest,
    isLoading: latestLoading,
    isError: latestError,
    refetch: refetchLatest,
  } = useQuery({
    queryKey: queryKeys.lotto.latest,
    queryFn: async () => {
      const res = await fetchWithTimeout(`/api/lotto/latest`, {}, 7000);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json() as Promise<LottoLatestResponse>;
    },
    staleTime: 60 * 60 * 1000,
  });

  const generateMutation = useMutation({
    mutationFn: async (): Promise<LottoGenerateResponse> => {
      const res = await fetchWithTimeout("/api/lotto/generate", {}, 7000);
      if (!res.ok) throw new Error("번호 생성에 실패했습니다.");
      return res.json() as Promise<LottoGenerateResponse>;
    },
    // 새 번호를 뽑으면 이전 회차 대조 결과는 숨김 상태로 초기화
    onMutate: () => setShowCompare(false),
  });

  const latestNumbers = latest
    ? [latest.drwtNo1, latest.drwtNo2, latest.drwtNo3, latest.drwtNo4, latest.drwtNo5, latest.drwtNo6]
    : [];

  const generated = generateMutation.data;
  const topNumbers = generated?.topNumbers ?? [];

  // 생성번호를 지난 회차 당첨번호와 클라이언트에서 대조 (API 호출/저장 없음 — 가상 시뮬레이션)
  const compare =
    generated && latest
      ? (() => {
          const matchedSet = new Set(latestNumbers);
          const matched = generated.numbers.filter((n) => matchedSet.has(n));
          const bonusMatched = matched.length === 5 && generated.numbers.includes(latest.bnusNo);
          const rank = calcRank(matched.length, bonusMatched);
          return {
            matchedSet: new Set(matched),
            matchedCount: matched.length,
            bonusMatched,
            rank,
            hint: prizeHint(rank, latest.firstWinamnt),
          };
        })()
      : null;

  const errorMessage =
    latestError ? "당첨 번호를 불러오지 못했습니다."
    : generateMutation.isError ? "번호 생성에 실패했습니다."
    : null;

  return (
    <div className="bento-card h-full flex flex-col p-5 gap-4">
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
              onClick={() => void refetchLatest()}
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
        ) : errorMessage && !latest ? (
          <p className="text-xs text-center py-2" style={{ color: "#F43F5E" }}>{errorMessage}</p>
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
            {latest.firstWinamnt ? (
              <p className="text-xs flex items-center gap-1.5" style={{ color: "var(--text-muted)" }}>
                1인당 <span className="font-bold" style={{ color: ACCENT }}>
                  {Math.round(latest.firstWinamnt / 100_000_000)}억
                </span>
                <span style={{ opacity: 0.35 }}>|</span>
                실수령 <span className="font-semibold" style={{ color: "var(--text-primary)" }}>
                  {calcNetPrize(latest.firstWinamnt)}억
                </span>
              </p>
            ) : (
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>당첨금 정보 집계 중</p>
            )}
          </div>
        )}
      </div>

      {/* AI 번호 생성 */}
      <div className="flex flex-col gap-3 flex-1">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold" style={{ color: "var(--text-muted)" }}>AI 추천 번호</p>
          <button
            onClick={() => generateMutation.mutate()}
            disabled={generateMutation.isPending}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-opacity hover:opacity-75 disabled:opacity-40"
            style={{ background: `${ACCENT}22`, color: ACCENT, border: `1px solid ${ACCENT}44` }}
          >
            {generateMutation.isPending
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

            {/* 역대 최다 출현(핫넘버) — generate 응답의 topNumbers 활용 */}
            {topNumbers.length > 0 && (
              <div
                className="flex flex-col gap-2 pt-1"
                style={{ borderTop: "1px solid var(--border)" }}
              >
                <p className="text-xs font-semibold pt-1" style={{ color: "var(--text-muted)" }}>
                  역대 최다 출현 번호
                </p>
                <div className="flex items-end justify-center gap-2 flex-wrap">
                  {topNumbers.map(({ number, count }) => (
                    <div key={number} className="flex flex-col items-center gap-1">
                      <LottoBall n={number} size={30} />
                      <span className="text-[10px] font-semibold tabular-nums" style={{ color: "var(--text-muted)" }}>
                        {count}회
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 지난 회차 대조 (클라이언트 가상 시뮬레이션) */}
            {compare && latest && (
              <div className="flex flex-col gap-2" style={{ borderTop: "1px solid var(--border)" }}>
                {!showCompare ? (
                  <button
                    onClick={() => setShowCompare(true)}
                    className="flex items-center justify-center gap-1.5 text-xs py-1.5 mt-2 rounded-lg transition-opacity hover:opacity-75"
                    style={{ color: ACCENT, background: `${ACCENT}14`, border: `1px solid ${ACCENT}33` }}
                  >
                    <ScanSearch size={12} /> 지난 제 {latest.drwNo}회로 맞춰보기
                  </button>
                ) : (
                  <div className="flex flex-col gap-2.5 pt-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className="tag"
                        style={
                          compare.rank
                            ? { background: `${ACCENT}22`, color: ACCENT }
                            : { background: "rgba(255,255,255,0.06)", color: "var(--text-muted)" }
                        }
                      >
                        {compare.rank
                          ? `이 번호였다면 제 ${latest.drwNo}회 기준 ${compare.rank}등`
                          : `이 번호였다면 제 ${latest.drwNo}회 기준 낙첨`}
                      </span>
                      {compare.hint && (
                        <span className="text-xs font-semibold shrink-0" style={{ color: ACCENT }}>
                          {compare.hint}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center justify-center gap-1.5 flex-wrap">
                      {generated.numbers.map((n) => (
                        <LottoBall key={`cmp-${n}`} n={n} size={30} dimmed={!compare.matchedSet.has(n)} />
                      ))}
                    </div>
                    <p className="text-[11px] text-center" style={{ color: "var(--text-muted)" }}>
                      {compare.matchedCount}개 일치 · 다음 추첨 결과와는 무관한 참고용 시뮬레이션입니다
                    </p>
                  </div>
                )}
              </div>
            )}

            <button
              onClick={() => generateMutation.mutate()}
              disabled={generateMutation.isPending}
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
              onClick={() => generateMutation.mutate()}
              disabled={generateMutation.isPending}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-50 transition-opacity hover:opacity-85"
              style={{ background: `linear-gradient(135deg, ${ACCENT}, #D97706)` }}
            >
              {generateMutation.isPending
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
