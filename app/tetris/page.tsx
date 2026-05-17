'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, RotateCcw, Play, Pause, Volume2, VolumeX } from 'lucide-react';
import { useTetris } from '@/hooks/useTetris';
import TetrisBoard, { NextPiecePreview, HoldPiecePreview } from '@/components/TetrisBoard';
import { useChiptuneBGM } from '@/hooks/useChiptuneBGM';
import type { ScoreEvent } from '@/types/tetris';

// ── Leaderboard Types ─────────────────────────────────────────────────────

interface LeaderboardEntry {
  nickname: string;
  score: number;
}

// ── Score Popup ───────────────────────────────────────────────────────────

const ACTION_CONFIG = {
  single: { label: 'SINGLE',  color: 'rgba(255,255,255,0.88)', size: 13, shadow: '' },
  double: { label: 'DOUBLE',  color: '#22D3EE',                size: 16, shadow: '0 0 10px #22D3EE99' },
  triple: { label: 'TRIPLE',  color: '#4ADE80',                size: 20, shadow: '0 0 14px #4ADE8099' },
  tetris: { label: 'TETRIS!', color: '#FACC15',                size: 26, shadow: '0 0 20px #FACC15BB, 0 0 40px #FACC1566' },
} as const;

function ScorePopup({ event }: { event: ScoreEvent }) {
  const cfg = ACTION_CONFIG[event.action];

  return (
    <div
      className="tetris-score-popup"
      style={{
        position: 'absolute',
        left: '50%',
        top: '32%',
        transform: 'translateX(-50%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 3,
        zIndex: 20,
        whiteSpace: 'nowrap',
        userSelect: 'none',
      }}
    >
      {event.backToBack && (
        <span
          style={{
            fontSize: 9,
            fontWeight: 900,
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            color: '#C084FC',
            background: 'rgba(168,85,247,0.2)',
            border: '1px solid rgba(168,85,247,0.4)',
            borderRadius: 4,
            padding: '1px 7px',
          }}
        >
          BACK-TO-BACK
        </span>
      )}
      <span
        style={{
          fontSize: cfg.size,
          fontWeight: 900,
          letterSpacing: '0.07em',
          color: cfg.color,
          textShadow: cfg.shadow,
          lineHeight: 1,
        }}
      >
        {cfg.label}
      </span>
      {event.combo > 0 && (
        <span
          style={{
            fontSize: 11,
            fontWeight: 800,
            letterSpacing: '0.09em',
            color: '#FB923C',
            textShadow: '0 0 8px #FB923C99',
          }}
        >
          COMBO ×{event.combo}
        </span>
      )}
      {event.perfectClear && (
        <span
          style={{
            fontSize: 12,
            fontWeight: 900,
            letterSpacing: '0.1em',
            color: '#F0ABFC',
            textShadow: '0 0 12px #F0ABFCBB, 0 0 24px #C084FC88',
          }}
        >
          ✨ PERFECT CLEAR!
        </span>
      )}
    </div>
  );
}

// ── Score Card ────────────────────────────────────────────────────────────

function ScoreCard({ label, value }: { label: string; value: number | string }) {
  return (
    <div
      className="rounded-xl p-2 flex flex-col gap-0.5 items-center w-full overflow-hidden"
      style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
    >
      <p className="text-[10px] font-semibold uppercase tracking-wide w-full text-center truncate" style={{ color: 'var(--text-muted)' }}>
        {label}
      </p>
      <p className="text-sm font-black tabular-nums w-full text-center leading-tight truncate" style={{ color: 'var(--text-primary)' }}>
        {value}
      </p>
    </div>
  );
}

// ── Mobile Control Button ─────────────────────────────────────────────────
// DAS = 167ms (initial delay), ARR = 50ms (repeat interval) — matches keyboard behavior

const DAS_DELAY = 167;
const ARR_INTERVAL = 50;

function CtrlBtn({
  onClick,
  repeat = false,
  children,
  wide = false,
  disabled = false,
}: {
  onClick: () => void;
  repeat?: boolean;
  children: React.ReactNode;
  wide?: boolean;
  disabled?: boolean;
}) {
  const dasRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const arrRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const onClickRef = useRef(onClick);
  onClickRef.current = onClick;

  const clearRepeat = useCallback(() => {
    if (dasRef.current) { clearTimeout(dasRef.current); dasRef.current = null; }
    if (arrRef.current) { clearInterval(arrRef.current); arrRef.current = null; }
  }, []);

  useEffect(() => clearRepeat, [clearRepeat]);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    // setPointerCapture: AOS에서 손가락이 버튼 밖으로 이동해도 pointerup/pointercancel이 이 요소에서 발화됨.
    // capture 중에는 pointerleave가 발화되지 않으므로 repeat가 중단되지 않음.
    e.currentTarget.setPointerCapture(e.pointerId);
    if (disabled) return;
    onClickRef.current();
    if (!repeat) return;
    clearRepeat();
    dasRef.current = setTimeout(() => {
      arrRef.current = setInterval(() => onClickRef.current(), ARR_INTERVAL);
    }, DAS_DELAY);
  }, [disabled, repeat, clearRepeat]);

  return (
    <button
      type="button"
      onPointerDown={handlePointerDown}
      onPointerUp={clearRepeat}
      onPointerCancel={clearRepeat}
      onPointerLeave={clearRepeat}
      onContextMenu={(e) => e.preventDefault()}
      className={`flex items-center justify-center rounded-xl select-none active:scale-90 transition-transform font-bold text-lg ${wide ? 'col-span-2' : ''}`}
      style={{
        background: disabled ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.07)',
        border: '1px solid rgba(255,255,255,0.12)',
        color: 'var(--text-primary)',
        opacity: disabled ? 0.45 : 1,
        height: 52,
        userSelect: 'none',
        WebkitUserSelect: 'none',
        WebkitTapHighlightColor: 'transparent',
        touchAction: 'none',
      }}
    >
      {children}
    </button>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────

export default function TetrisPage() {
  const [cellSize, setCellSize] = useState(28);

  useEffect(() => {
    const calculate = () => {
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      if (vw >= 640) { setCellSize(28); return; }

      const bottomPad = Math.max(vh * 0.1, 20);
      const controlsH = 13 + 3 * 52 + 2 * 8 + bottomPad;
      const availH = vh - 57 - controlsH - 32;
      const availW = vw - 32 - 16 - 144;

      const byH = Math.floor((availH - 12 - 19) / 20);
      const byW = Math.floor((availW - 12 - 9) / 10);
      setCellSize(Math.max(14, Math.min(28, byH, byW)));
    };
    calculate();
    window.addEventListener('resize', calculate);
    return () => window.removeEventListener('resize', calculate);
  }, []);

  const { muted, play: bgmPlay, pause: bgmPause, resume: bgmResume, stop: bgmStop, toggleMute } =
    useChiptuneBGM('tetris');

  const { gameState, ghostPiece, start, pause, resume, moveLeft, moveRight, softDrop, rotate, hardDrop, holdPiece } =
    useTetris({ muted });

  const { board, active, next, hold, canHold, score, lines, level, status, clearingLines, lastScoreEvent } = gameState;

  // ── Score popup queue ───────────────────────────────────────────────────
  const [scorePopups, setScorePopups] = useState<ScoreEvent[]>([]);

  useEffect(() => {
    if (!lastScoreEvent) return;
    setScorePopups(prev => [...prev, lastScoreEvent]);
    const timer = setTimeout(() => {
      setScorePopups(prev => prev.filter(e => e.id !== lastScoreEvent.id));
    }, 1700);
    return () => clearTimeout(timer);
  }, [lastScoreEvent]);

  // ── Leaderboard state ───────────────────────────────────────────────────
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loadingLB, setLoadingLB] = useState(false);
  const savedRef = useRef(false);

  const fetchLeaderboard = useCallback(async () => {
    setLoadingLB(true);
    try {
      const res = await fetch('/api/game-scores?gameId=tetris');
      if (res.status === 401) return;
      if (!res.ok) return;
      const data = (await res.json()) as { scores: Array<{ nickname: string; score: number }> };
      setLeaderboard(data.scores.slice(0, 5).map(s => ({ nickname: s.nickname, score: s.score })));
    } catch (err) {
      console.error('fetchLeaderboard error:', err);
    } finally {
      setLoadingLB(false);
    }
  }, []);

  useEffect(() => {
    void fetchLeaderboard();
  }, [fetchLeaderboard]);

  const prevStatusRef = useRef<typeof status>('idle');
  useEffect(() => {
    const prev = prevStatusRef.current;
    prevStatusRef.current = status;
    if (status === 'playing') {
      savedRef.current = false;
      if (prev === 'paused') {
        void bgmResume();
      } else if (prev !== 'playing' && prev !== 'clearing') {
        void bgmPlay();
      }
    } else if (status === 'paused') {
      void bgmPause();
    } else if (status === 'over') {
      bgmStop();
      if (!savedRef.current) {
        savedRef.current = true;
        fetch('/api/game-scores', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ gameId: 'tetris', score }),
        })
          .then(res => {
            if (res.status === 401) return;
            if (!res.ok) throw new Error('save failed');
            return fetchLeaderboard();
          })
          .catch(err => console.error('saveScore error:', err));
      }
    }
  }, [status, bgmPlay, bgmPause, bgmResume, bgmStop, score, fetchLeaderboard]);

  const isIdle = status === 'idle';
  const isPlaying = status === 'playing';
  const isPaused = status === 'paused';
  const isOver = status === 'over';

  return (
    <div
      className="h-dvh flex flex-col overflow-hidden"
      style={{ background: 'var(--bg-base)' }}
    >
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div
        className="flex items-center gap-3 px-4 py-3 shrink-0"
        style={{ borderBottom: '1px solid var(--border)' }}
      >
        <Link
          href="/"
          className="flex items-center justify-center rounded-lg transition-opacity hover:opacity-70"
          style={{ width: 36, height: 36, background: 'rgba(255,255,255,0.06)', color: 'var(--text-primary)' }}
        >
          <ArrowLeft size={18} />
        </Link>
        <div className="min-w-0 flex-1">
          <p
            className="text-xs font-semibold uppercase tracking-widest"
            style={{ color: '#A855F7' }}
          >
            놀이터
          </p>
          <h1 className="text-lg font-black truncate" style={{ color: 'var(--text-primary)' }}>
            🎮 테트리스
          </h1>
        </div>

        <button
          type="button"
          onClick={toggleMute}
          className="flex items-center justify-center rounded-lg transition-opacity hover:opacity-75"
          style={{ width: 36, height: 36, background: 'rgba(168,85,247,0.12)', border: '1px solid rgba(168,85,247,0.25)', color: '#A855F7' }}
          aria-label={muted ? '음악 켜기' : '음악 끄기'}
        >
          {muted ? <VolumeX size={16} /> : <Volume2 size={16} />}
        </button>

        {(isPlaying || isPaused) && (
          <button
            type="button"
            onClick={isPlaying ? pause : resume}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-opacity hover:opacity-75"
            style={{ background: 'rgba(168,85,247,0.15)', color: '#A855F7', border: '1px solid rgba(168,85,247,0.3)' }}
          >
            {isPlaying ? <><Pause size={12} /> 일시정지</> : <><Play size={12} /> 계속하기</>}
          </button>
        )}
      </div>

      {/* ── Game Area ──────────────────────────────────────────────────── */}
      <div className="flex-1 min-h-0 flex items-center justify-center gap-4 p-4 overflow-hidden">

        {/* Board */}
        <div className="relative shrink-0">
          <TetrisBoard board={board} active={active} ghost={ghostPiece} cellSize={cellSize} clearingLines={clearingLines} />

          {/* Score event popups */}
          {scorePopups.map(event => (
            <ScorePopup key={event.id} event={event} />
          ))}

          {/* Overlays */}
          {(isIdle || isOver || isPaused) && (
            <div
              className="absolute inset-0 flex flex-col items-center justify-center gap-4 rounded"
              style={{ background: 'rgba(0,0,0,0.82)', backdropFilter: 'blur(4px)' }}
            >
              {isOver && (
                <>
                  <p className="text-4xl">💀</p>
                  <p className="text-xl font-black" style={{ color: '#F43F5E' }}>GAME OVER</p>
                  <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                    최종 점수 <span className="font-bold" style={{ color: 'var(--text-primary)' }}>{score.toLocaleString()}</span>
                  </p>
                </>
              )}
              {isPaused && (
                <>
                  <p className="text-4xl">⏸️</p>
                  <p className="text-xl font-black" style={{ color: '#A855F7' }}>PAUSED</p>
                </>
              )}
              {isIdle && (
                <>
                  <p className="text-5xl animate-bounce">🎮</p>
                  <p className="text-xl font-black" style={{ color: 'var(--text-primary)' }}>TETRIS</p>
                  <p className="text-xs text-center leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                    ↑ 회전 &nbsp;|&nbsp; ↓ 소프트 드롭<br />
                    스페이스 하드 드롭 &nbsp;|&nbsp; C 홀드<br />
                    P 일시정지
                  </p>
                </>
              )}
              <button
                type="button"
                onClick={isPaused ? resume : start}
                className="flex items-center gap-2 px-6 py-3 rounded-xl font-black text-sm text-white transition-opacity hover:opacity-85"
                style={{ background: 'linear-gradient(135deg, #A855F7, #7C3AED)' }}
              >
                <Play size={14} />
                {isOver ? '다시 플레이' : isPaused ? '계속하기' : '게임 시작'}
              </button>
              {isOver && (
                <button
                  type="button"
                  onClick={start}
                  className="flex items-center gap-1.5 text-xs transition-opacity hover:opacity-70"
                  style={{ color: 'var(--text-muted)' }}
                >
                  <RotateCcw size={11} /> 새 게임
                </button>
              )}
            </div>
          )}
        </div>

        {/* Side Panel */}
        <div className="flex flex-col gap-2 shrink-0 self-stretch overflow-y-auto scrollbar-hide" style={{ width: 144 }}>
          {/* Hold */}
          <div
            className="rounded-xl p-2 flex flex-col gap-1.5"
            style={{
              background: canHold ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.02)',
              border: `1px solid ${canHold ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.04)'}`,
            }}
          >
            <p className="text-[10px] font-semibold uppercase tracking-wide truncate overflow-hidden" style={{ color: 'var(--text-muted)' }}>
              HOLD
            </p>
            <div className="flex items-center justify-center" style={{ opacity: canHold ? 1 : 0.4 }}>
              <HoldPiecePreview type={hold} />
            </div>
          </div>

          {/* Next */}
          <div
            className="rounded-xl p-2 flex flex-col gap-1.5"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            <p className="text-[10px] font-semibold uppercase tracking-wide truncate overflow-hidden" style={{ color: 'var(--text-muted)' }}>
              NEXT
            </p>
            <div className="flex items-center justify-center">
              <NextPiecePreview type={next} />
            </div>
          </div>

          <ScoreCard label="SCORE" value={score.toLocaleString()} />
          <ScoreCard label="LINES" value={lines} />
          <ScoreCard label="LEVEL" value={level} />

          {/* Keyboard hint (desktop only) */}
          <div
            className="rounded-xl p-2 hidden sm:flex flex-col gap-1"
            style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}
          >
            {[
              { key: '↑', desc: '회전' },
              { key: '← →', desc: '이동' },
              { key: '↓', desc: '소프트' },
              { key: 'SPC', desc: '하드' },
              { key: 'C', desc: '홀드' },
              { key: 'P', desc: '일시정지' },
            ].map(({ key, desc }) => (
              <div key={key} className="flex items-center gap-1">
                <span
                  className="rounded px-1 py-0.5 text-[10px] font-bold font-mono shrink-0"
                  style={{ background: 'rgba(255,255,255,0.08)', color: 'var(--text-primary)' }}
                >
                  {key}
                </span>
                <span className="text-[10px] flex-1 min-w-0 truncate text-right" style={{ color: 'var(--text-muted)' }}>{desc}</span>
              </div>
            ))}
          </div>

          {/* Leaderboard */}
          <div
            className="rounded-xl p-2 flex flex-col gap-1"
            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(168,85,247,0.15)' }}
          >
            <p
              className="text-[10px] font-semibold uppercase tracking-wide w-full text-center truncate overflow-hidden"
              style={{ color: '#A855F7' }}
            >
              BEST
            </p>
            {loadingLB ? (
              <p className="text-[10px] text-center" style={{ color: 'var(--text-muted)' }}>...</p>
            ) : leaderboard.length === 0 ? (
              <p className="text-[10px] text-center" style={{ color: 'var(--text-muted)' }}>기록 없음</p>
            ) : (
              leaderboard.map((entry, i) => (
                <div key={i} className="flex items-center gap-1 w-full overflow-hidden min-w-0">
                  <span
                    className="text-[10px] font-bold shrink-0 tabular-nums"
                    style={{ color: '#A855F7', width: 14 }}
                  >
                    {i + 1}.
                  </span>
                  <span
                    className="text-[10px] flex-1 min-w-0 truncate"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    {entry.nickname}
                  </span>
                  <span
                    className="text-[10px] font-bold tabular-nums shrink-0 truncate overflow-hidden"
                    style={{ color: 'var(--text-primary)', maxWidth: 58 }}
                  >
                    {entry.score.toLocaleString()}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* ── Mobile Controls ─────────────────────────────────────────────── */}
      <div
        className="sm:hidden shrink-0 px-4 pt-3"
        style={{
          borderTop: '1px solid var(--border)',
          paddingBottom: 'calc(10vh + env(safe-area-inset-bottom, 0px))',
        }}
      >
        <div className="grid grid-cols-3 gap-2 max-w-xs mx-auto">
          {/* Row 1: hold / rotate / empty */}
          <CtrlBtn onClick={holdPiece} disabled={!canHold}>
            <span style={{ fontSize: 13 }}>홀드</span>
          </CtrlBtn>
          <CtrlBtn onClick={rotate}>↑</CtrlBtn>
          <div />
          {/* Row 2: left / down / right */}
          <CtrlBtn onClick={moveLeft} repeat>←</CtrlBtn>
          <CtrlBtn onClick={softDrop} repeat>↓</CtrlBtn>
          <CtrlBtn onClick={moveRight} repeat>→</CtrlBtn>
          {/* Row 3: hard drop / pause */}
          <CtrlBtn onClick={hardDrop} wide>⬇ 하드 드롭</CtrlBtn>
          <CtrlBtn onClick={isPlaying ? pause : resume}>
            {isPlaying ? '⏸' : '▶'}
          </CtrlBtn>
        </div>
      </div>
    </div>
  );
}
