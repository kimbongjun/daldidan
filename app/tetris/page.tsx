'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, RotateCcw, Play, Pause, Volume2, VolumeX } from 'lucide-react';
import { useTetris } from '@/hooks/useTetris';
import TetrisBoard, { NextPiecePreview, HoldPiecePreview } from '@/components/TetrisBoard';
import { useChiptuneBGM } from '@/hooks/useChiptuneBGM';

// ── Score Card ────────────────────────────────────────────────────────────

function ScoreCard({ label, value }: { label: string; value: number | string }) {
  return (
    <div
      className="rounded-xl p-3 flex flex-col gap-1 items-center w-full overflow-hidden"
      style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
    >
      <p className="text-xs font-semibold uppercase tracking-wide w-full text-center truncate" style={{ color: 'var(--text-muted)' }}>
        {label}
      </p>
      <p className="text-lg font-black tabular-nums w-full text-center leading-tight" style={{ color: 'var(--text-primary)' }}>
        {value}
      </p>
    </div>
  );
}

// ── Mobile Control Button ─────────────────────────────────────────────────

function CtrlBtn({
  onClick,
  children,
  wide = false,
  disabled = false,
}: {
  onClick: () => void;
  children: React.ReactNode;
  wide?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onPointerDown={e => { e.preventDefault(); if (!disabled) onClick(); }}
      className={`flex items-center justify-center rounded-xl select-none active:scale-90 transition-transform font-bold text-lg ${wide ? 'col-span-2' : ''}`}
      style={{
        background: disabled ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.07)',
        border: '1px solid rgba(255,255,255,0.12)',
        color: 'var(--text-primary)',
        opacity: disabled ? 0.45 : 1,
        height: 52,
        userSelect: 'none',
        WebkitUserSelect: 'none',
        touchAction: 'manipulation',
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
      const availW = vw - 32 - 16 - 130;

      const byH = Math.floor((availH - 12 - 19) / 20);
      const byW = Math.floor((availW - 12 - 9) / 10);
      setCellSize(Math.max(14, Math.min(28, byH, byW)));
    };
    calculate();
    window.addEventListener('resize', calculate);
    return () => window.removeEventListener('resize', calculate);
  }, []);

  const { gameState, ghostPiece, start, pause, resume, moveLeft, moveRight, softDrop, rotate, hardDrop, holdPiece } =
    useTetris();

  const { board, active, next, hold, canHold, score, lines, level, status } = gameState;

  const { muted, play: bgmPlay, pause: bgmPause, resume: bgmResume, stop: bgmStop, toggleMute } =
    useChiptuneBGM('tetris');

  const prevStatusRef = useRef<typeof status>('idle');
  useEffect(() => {
    const prev = prevStatusRef.current;
    prevStatusRef.current = status;
    if (status === 'playing') {
      if (prev === 'paused') {
        void bgmResume();
      } else if (prev !== 'playing') {
        void bgmPlay();
      }
    } else if (status === 'paused') {
      void bgmPause();
    } else if (status === 'over') {
      bgmStop();
    }
  }, [status, bgmPlay, bgmPause, bgmResume, bgmStop]);

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
          <TetrisBoard board={board} active={active} ghost={ghostPiece} cellSize={cellSize} />

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
        <div className="flex flex-col gap-3 shrink-0" style={{ width: 130 }}>
          {/* Hold */}
          <div
            className="rounded-xl p-3 flex flex-col gap-2"
            style={{
              background: canHold ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.02)',
              border: `1px solid ${canHold ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.04)'}`,
            }}
          >
            <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
              HOLD
            </p>
            <div className="flex items-center justify-center py-1" style={{ opacity: canHold ? 1 : 0.4 }}>
              <HoldPiecePreview type={hold} />
            </div>
          </div>

          {/* Next */}
          <div
            className="rounded-xl p-3 flex flex-col gap-2"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
              NEXT
            </p>
            <div className="flex items-center justify-center py-1">
              <NextPiecePreview type={next} />
            </div>
          </div>

          <ScoreCard label="SCORE" value={score.toLocaleString()} />
          <ScoreCard label="LINES" value={lines} />
          <ScoreCard label="LEVEL" value={level} />

          {/* Keyboard hint (desktop only) */}
          <div
            className="rounded-xl p-3 hidden sm:flex flex-col gap-1.5"
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
              <div key={key} className="flex items-center gap-1.5">
                <span
                  className="rounded px-1.5 py-0.5 text-[10px] font-bold font-mono shrink-0"
                  style={{ background: 'rgba(255,255,255,0.08)', color: 'var(--text-primary)' }}
                >
                  {key}
                </span>
                <span className="text-[10px] flex-1 min-w-0 truncate text-right" style={{ color: 'var(--text-muted)' }}>{desc}</span>
              </div>
            ))}
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
          <CtrlBtn onClick={moveLeft}>←</CtrlBtn>
          <CtrlBtn onClick={softDrop}>↓</CtrlBtn>
          <CtrlBtn onClick={moveRight}>→</CtrlBtn>
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
