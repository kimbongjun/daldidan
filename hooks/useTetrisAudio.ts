'use client';

import { useCallback, useRef } from 'react';
import { ensureAudioUnlocked } from '@/lib/audioUnlock';

// ── Singleton AudioContext ────────────────────────────────────────────────

let _ctx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  ensureAudioUnlocked();
  if (!_ctx || _ctx.state === 'closed') {
    try {
      _ctx = new AudioContext();
    } catch {
      return null;
    }
  }
  if (_ctx.state === 'suspended') void _ctx.resume();
  return _ctx;
}

// ── Primitive sound builders ──────────────────────────────────────────────

function tone(
  ctx: AudioContext,
  freq: number,
  type: OscillatorType,
  t: number,
  duration: number,
  peak: number,
) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  gain.gain.setValueAtTime(0, t);
  gain.gain.linearRampToValueAtTime(peak, t + 0.005);
  gain.gain.exponentialRampToValueAtTime(0.001, t + duration);
  osc.start(t);
  osc.stop(t + duration + 0.02);
}

function noise(
  ctx: AudioContext,
  t: number,
  duration: number,
  peak: number,
  filterFreq: number,
) {
  const size = Math.ceil(ctx.sampleRate * duration);
  const buf = ctx.createBuffer(1, size, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < size; i++) data[i] = Math.random() * 2 - 1;

  const src = ctx.createBufferSource();
  src.buffer = buf;
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(filterFreq, t);
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(peak, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + duration);
  src.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);
  src.start(t);
  src.stop(t + duration);
}

// ── Hook ──────────────────────────────────────────────────────────────────

export function useTetrisAudio(muted: boolean) {
  const mutedRef = useRef(muted);
  mutedRef.current = muted;

  // 블록 고정 (라인 없음)
  const soundPlace = useCallback(() => {
    if (mutedRef.current) return;
    const ctx = getCtx();
    if (!ctx) return;
    const t = ctx.currentTime;
    noise(ctx, t, 0.07, 0.22, 350);
    tone(ctx, 110, 'sine', t, 0.09, 0.32);
  }, []);

  // 라인 클리어 (count: 제거 줄 수, combo: 현재 콤보 카운트)
  // 콤보 수에 따라 피치를 높여 긴장감 부여
  const soundClearLine = useCallback((count: number, combo: number = 0) => {
    if (mutedRef.current) return;
    const ctx = getCtx();
    if (!ctx) return;
    const t = ctx.currentTime;
    // 콤보가 쌓일수록 피치 최대 50% 상승 (combo 5 이상은 고정)
    const pitchMult = 1 + Math.min(combo, 5) * 0.1;
    if (count >= 3) {
      // 트리플/테트리스: C major 아르페지오 + 노이즈 임팩트
      [523, 659, 784, 1047].forEach((f, i) => {
        tone(ctx, f * pitchMult, 'square', t + i * 0.055, 0.38, 0.1);
      });
      noise(ctx, t, 0.22, 0.13, 900);
    } else if (count === 2) {
      tone(ctx, 440 * pitchMult, 'square', t, 0.14, 0.11);
      tone(ctx, 660 * pitchMult, 'square', t + 0.08, 0.13, 0.09);
    } else {
      tone(ctx, 330 * pitchMult, 'square', t, 0.11, 0.11);
      tone(ctx, 440 * pitchMult, 'square', t + 0.07, 0.09, 0.08);
    }
  }, []);

  // 백투백 테트리스: 강렬한 상승 팡파레
  const soundBackToBack = useCallback(() => {
    if (mutedRef.current) return;
    const ctx = getCtx();
    if (!ctx) return;
    const t = ctx.currentTime;
    [784, 988, 1175, 1568].forEach((f, i) => {
      tone(ctx, f, 'square', t + i * 0.04, 0.28, 0.09);
    });
    tone(ctx, 1568, 'sine', t + 0.18, 0.35, 0.12);
    noise(ctx, t + 0.1, 0.15, 0.07, 1200);
  }, []);

  // 퍼펙트 클리어: 화려한 상승 아르페지오 + 여운
  const soundPerfectClear = useCallback(() => {
    if (mutedRef.current) return;
    const ctx = getCtx();
    if (!ctx) return;
    const t = ctx.currentTime;
    [523, 659, 784, 1047, 1319, 1568].forEach((f, i) => {
      tone(ctx, f, 'sine', t + i * 0.06, 0.5, 0.13);
    });
    [523, 659, 784].forEach((f, i) => {
      tone(ctx, f * 2, 'triangle', t + 0.42 + i * 0.07, 0.4, 0.07);
    });
    noise(ctx, t, 0.1, 0.08, 1600);
  }, []);

  // 하드 드롭: 충격음
  const soundHardDrop = useCallback(() => {
    if (mutedRef.current) return;
    const ctx = getCtx();
    if (!ctx) return;
    const t = ctx.currentTime;
    tone(ctx, 80, 'sine', t, 0.1, 0.42);
    noise(ctx, t, 0.05, 0.16, 240);
  }, []);

  // 홀드: 소프트 클릭
  const soundHold = useCallback(() => {
    if (mutedRef.current) return;
    const ctx = getCtx();
    if (!ctx) return;
    const t = ctx.currentTime;
    tone(ctx, 880, 'sine', t, 0.07, 0.11);
    tone(ctx, 660, 'sine', t + 0.04, 0.06, 0.07);
  }, []);

  // 게임 오버: 하강 아르페지오
  const soundGameOver = useCallback(() => {
    if (mutedRef.current) return;
    const ctx = getCtx();
    if (!ctx) return;
    const t = ctx.currentTime;
    [440, 370, 330, 220].forEach((f, i) => {
      tone(ctx, f, 'sawtooth', t + i * 0.18, 0.22, 0.16);
    });
  }, []);

  return {
    soundPlace,
    soundClearLine,
    soundHardDrop,
    soundHold,
    soundGameOver,
    soundBackToBack,
    soundPerfectClear,
  };
}
