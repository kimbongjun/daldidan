'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ensureAudioUnlocked } from '@/lib/audioUnlock';

export type BGMTrack = 'tetris' | 'puzzle-bobble';

// Note frequencies (Hz)
const N: Record<string, number> = {
  C4:261.63, D4:293.66, E4:329.63, F4:349.23, G4:392.00, A4:440.00, B4:493.88,
  C5:523.25, D5:587.33, E5:659.25, F5:698.46, G5:783.99, A5:880.00, B5:987.77,
  R:0,
};

// [frequency, sixteenth-note count]
type Seq = [number, number][];

// Korobeiniki (Russian folk song, public domain) — classic Tetris A theme
const TETRIS_SEQ: Seq = [
  [N.E5,4],[N.B4,2],[N.C5,2],[N.D5,4],[N.C5,2],[N.B4,2],
  [N.A4,4],[N.A4,2],[N.C5,2],[N.E5,4],[N.D5,2],[N.C5,2],
  [N.B4,6],[N.C5,2],[N.D5,4],[N.E5,4],
  [N.C5,4],[N.A4,4],[N.A4,8],
  [N.R,2],[N.D5,4],[N.F5,2],[N.A5,4],[N.G5,2],[N.F5,2],
  [N.E5,6],[N.C5,2],[N.E5,4],[N.D5,2],[N.C5,2],
  [N.B4,4],[N.B4,2],[N.C5,2],[N.D5,4],[N.E5,4],
  [N.C5,4],[N.A4,4],[N.A4,8],
];

// Original bubbly C-major melody for Puzzle Bobble
const PUZZLE_SEQ: Seq = [
  [N.C5,2],[N.E5,2],[N.G5,4],[N.E5,2],[N.D5,2],[N.C5,4],
  [N.D5,2],[N.F5,2],[N.A5,4],[N.G5,2],[N.F5,2],[N.E5,4],
  [N.C5,2],[N.E5,2],[N.G5,2],[N.A5,2],[N.G5,4],[N.E5,2],[N.C5,2],
  [N.D5,2],[N.F5,2],[N.E5,2],[N.D5,2],[N.C5,8],
  [N.G5,2],[N.A5,2],[N.B5,4],[N.A5,2],[N.G5,2],[N.E5,4],
  [N.F5,2],[N.G5,2],[N.A5,4],[N.G5,2],[N.F5,2],[N.E5,4],
  [N.C5,2],[N.D5,2],[N.E5,2],[N.F5,2],[N.E5,4],[N.D5,2],[N.C5,2],
  [N.D5,2],[N.F5,2],[N.G5,2],[N.A5,2],[N.G5,8],
];

const TRACKS = {
  tetris:          { bpm: 160, vol: 0.5,  seq: TETRIS_SEQ },
  'puzzle-bobble': { bpm: 128, vol: 0.45, seq: PUZZLE_SEQ },
} as const;

export function useChiptuneBGM(track: BGMTrack) {
  const [muted, setMuted] = useState(false);

  // All mutable state in refs so callbacks stay stable
  const mutedRef  = useRef(false);
  const ctxRef    = useRef<AudioContext | null>(null);
  const masterRef = useRef<GainNode | null>(null);
  const timerRef  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const idxRef    = useRef(0);
  const nextRef   = useRef(0);
  const runRef    = useRef(false);

  // Track config stored in refs so [] callbacks can read them
  const seqRef  = useRef(TRACKS[track].seq);
  const s16Ref  = useRef((60 / TRACKS[track].bpm) / 4);
  const volRef  = useRef(TRACKS[track].vol);

  const schedNote = useCallback((freq: number, t: number, dur16: number) => {
    const ctx    = ctxRef.current;
    const master = masterRef.current;
    if (!ctx || !master || freq === 0) return;

    const dur = dur16 * s16Ref.current;
    const osc = ctx.createOscillator();
    const env = ctx.createGain();
    const lp  = ctx.createBiquadFilter();

    osc.type = 'square';
    osc.frequency.setValueAtTime(freq, t);

    // Slight low-pass to soften square-wave harshness
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(1800, t);

    // ADSR-lite envelope
    env.gain.setValueAtTime(0, t);
    env.gain.linearRampToValueAtTime(0.4, t + 0.008);
    env.gain.setValueAtTime(0.32, t + 0.02);
    env.gain.linearRampToValueAtTime(0, t + dur * 0.85);

    osc.connect(lp);
    lp.connect(env);
    env.connect(master);
    osc.start(t);
    osc.stop(t + dur);
  }, []); // stable — uses only refs

  const tick = useCallback(() => {
    const ctx = ctxRef.current;
    if (!ctx || !runRef.current) return;

    const seq = seqRef.current;
    while (nextRef.current < ctx.currentTime + 0.15) {
      const [freq, beats] = seq[idxRef.current];
      schedNote(freq, nextRef.current, beats);
      nextRef.current += beats * s16Ref.current;
      idxRef.current = (idxRef.current + 1) % seq.length;
    }
    timerRef.current = setTimeout(tick, 40);
  }, [schedNote]); // schedNote is stable

  const play = useCallback(async () => {
    if (typeof AudioContext === 'undefined') return;
    ensureAudioUnlocked();

    if (!ctxRef.current) {
      const ctx    = new AudioContext();
      const master = ctx.createGain();
      master.gain.setValueAtTime(mutedRef.current ? 0 : volRef.current, ctx.currentTime);
      master.connect(ctx.destination);
      ctxRef.current    = ctx;
      masterRef.current = master;
    }

    const ctx = ctxRef.current;
    if (ctx.state === 'suspended') await ctx.resume();

    if (timerRef.current !== null) { clearTimeout(timerRef.current); timerRef.current = null; }
    idxRef.current  = 0;
    nextRef.current = ctx.currentTime + 0.05;
    runRef.current  = true;
    tick();
  }, [tick]);

  const pause = useCallback(async () => {
    runRef.current = false;
    if (timerRef.current !== null) { clearTimeout(timerRef.current); timerRef.current = null; }
    if (ctxRef.current) await ctxRef.current.suspend();
  }, []);

  const resume = useCallback(async () => {
    if (!ctxRef.current) { await play(); return; }
    const ctx = ctxRef.current;
    if (ctx.state === 'suspended') await ctx.resume();
    runRef.current  = true;
    nextRef.current = ctx.currentTime + 0.05;
    tick();
  }, [play, tick]);

  const stop = useCallback(() => {
    runRef.current = false;
    if (timerRef.current !== null) { clearTimeout(timerRef.current); timerRef.current = null; }
  }, []);

  const toggleMute = useCallback(() => {
    setMuted(prev => {
      const next = !prev;
      mutedRef.current = next;
      if (masterRef.current && ctxRef.current) {
        masterRef.current.gain.setValueAtTime(
          next ? 0 : volRef.current,
          ctxRef.current.currentTime,
        );
      }
      return next;
    });
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      runRef.current = false;
      if (timerRef.current !== null) clearTimeout(timerRef.current);
      void ctxRef.current?.close();
      ctxRef.current    = null;
      masterRef.current = null;
    };
  }, []);

  return { muted, play, pause, resume, stop, toggleMute };
}
