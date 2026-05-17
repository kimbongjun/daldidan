'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ensureAudioUnlocked } from '@/lib/audioUnlock';

// Note frequencies (Hz)
const N: Record<string, number> = {
  C4:261.63, D4:293.66, E4:329.63, F4:349.23, G4:392.00, A4:440.00, B4:493.88,
  C5:523.25, D5:587.33, E5:659.25, F5:698.46, G5:783.99, A5:880.00, B5:987.77,
  R:0,
};

// [frequency, sixteenth-note count]
type Seq = [number, number][];

// Song 1: Korobeiniki — classic Tetris A theme (public domain)
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

// Song 2: Bubbly puzzle theme (original)
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

// Song 3: Waltz in C
const WALTZ_SEQ: Seq = [
  [N.C5,4],[N.E5,2],[N.G5,2],[N.E5,2],[N.C5,2],
  [N.D5,4],[N.F5,2],[N.A5,2],[N.F5,2],[N.D5,2],
  [N.E5,4],[N.G5,2],[N.B5,2],[N.A5,2],[N.G5,2],
  [N.F5,4],[N.E5,4],[N.D5,4],[N.C5,4],
  [N.G4,4],[N.B4,2],[N.D5,2],[N.B4,2],[N.G4,2],
  [N.A4,4],[N.C5,2],[N.E5,2],[N.C5,2],[N.A4,2],
  [N.D5,4],[N.F5,4],[N.E5,4],[N.D5,4],
  [N.C5,16],
];

// Song 4: Chase — fast and exciting
const CHASE_SEQ: Seq = [
  [N.E5,2],[N.D5,2],[N.C5,2],[N.D5,2],[N.E5,2],[N.E5,2],[N.E5,4],
  [N.D5,2],[N.D5,2],[N.D5,4],[N.E5,2],[N.G5,2],[N.G5,4],
  [N.E5,2],[N.D5,2],[N.C5,2],[N.D5,2],[N.E5,2],[N.E5,2],[N.E5,2],[N.E5,2],
  [N.D5,2],[N.D5,2],[N.E5,2],[N.D5,2],[N.C5,8],
  [N.G4,2],[N.A4,2],[N.B4,2],[N.C5,2],[N.D5,2],[N.E5,2],[N.F5,2],[N.G5,2],
  [N.A5,4],[N.G5,2],[N.F5,2],[N.E5,4],[N.D5,4],
  [N.C5,2],[N.D5,2],[N.E5,2],[N.F5,2],[N.G5,4],[N.C5,4],
  [N.G4,4],[N.E4,4],[N.C5,8],
];

// Song 5: Star — ethereal arpeggios
const STAR_SEQ: Seq = [
  [N.C5,2],[N.E5,2],[N.G5,2],[N.C5,2],[N.E5,2],[N.G5,2],[N.E5,2],[N.C5,2],
  [N.D5,2],[N.F5,2],[N.A5,2],[N.D5,2],[N.F5,2],[N.A5,2],[N.F5,2],[N.D5,2],
  [N.E5,2],[N.G5,2],[N.B5,2],[N.E5,2],[N.G5,2],[N.B5,2],[N.G5,2],[N.E5,2],
  [N.F5,4],[N.E5,4],[N.D5,4],[N.C5,4],
  [N.G5,2],[N.E5,2],[N.C5,2],[N.E5,2],[N.G5,2],[N.A5,2],[N.G5,2],[N.E5,2],
  [N.A5,2],[N.F5,2],[N.D5,2],[N.F5,2],[N.A5,2],[N.B5,2],[N.A5,2],[N.F5,2],
  [N.G5,2],[N.F5,2],[N.E5,2],[N.D5,2],[N.E5,2],[N.D5,2],[N.C5,2],[N.B4,2],
  [N.C5,16],
];

// Song 6: Bounce — playful with rests
const BOUNCE_SEQ: Seq = [
  [N.C5,2],[N.R,2],[N.E5,2],[N.R,2],[N.G5,2],[N.R,2],[N.C5,2],[N.R,2],
  [N.D5,2],[N.R,2],[N.F5,2],[N.R,2],[N.A5,2],[N.R,2],[N.G5,2],[N.R,2],
  [N.E5,2],[N.G5,2],[N.B5,2],[N.G5,2],[N.E5,2],[N.D5,2],[N.C5,4],
  [N.G4,2],[N.C5,2],[N.E5,2],[N.G5,2],[N.C5,8],
  [N.E5,2],[N.R,2],[N.D5,2],[N.R,2],[N.C5,2],[N.R,2],[N.B4,2],[N.R,2],
  [N.A4,2],[N.R,2],[N.G4,2],[N.R,2],[N.F4,2],[N.R,2],[N.E4,2],[N.R,2],
  [N.G4,2],[N.A4,2],[N.B4,2],[N.C5,2],[N.E5,2],[N.G5,2],[N.E5,4],
  [N.D5,4],[N.G4,4],[N.C5,8],
];

// Song 7: Irish Jig
const JIG_SEQ: Seq = [
  [N.E5,2],[N.F5,2],[N.G5,2],[N.A5,4],[N.G5,2],[N.F5,2],
  [N.E5,2],[N.G5,2],[N.E5,2],[N.G5,6],
  [N.D5,2],[N.E5,2],[N.F5,2],[N.G5,4],[N.F5,2],[N.E5,2],
  [N.D5,2],[N.F5,2],[N.D5,2],[N.F5,6],
  [N.C5,2],[N.D5,2],[N.E5,2],[N.F5,4],[N.E5,2],[N.D5,2],
  [N.C5,2],[N.E5,2],[N.G5,2],[N.A5,6],
  [N.G5,2],[N.F5,2],[N.E5,2],[N.D5,4],[N.C5,4],
  [N.G4,4],[N.C5,8],[N.R,4],
];

// Song 8: Fanfare — triumphant
const FANFARE_SEQ: Seq = [
  [N.C5,2],[N.C5,2],[N.C5,4],[N.E5,4],[N.G5,8],
  [N.A5,4],[N.G5,2],[N.F5,2],[N.E5,8],
  [N.D5,2],[N.E5,2],[N.F5,4],[N.G5,4],[N.A5,4],
  [N.G5,4],[N.F5,4],[N.E5,4],[N.D5,4],
  [N.C5,4],[N.E5,4],[N.G5,4],[N.C5,4],
  [N.B4,2],[N.C5,2],[N.D5,4],[N.G5,8],
  [N.E5,2],[N.D5,2],[N.C5,2],[N.B4,2],[N.A4,4],[N.G4,4],
  [N.C5,16],
];

// Song 9: Lullaby — gentle and slow
const LULLABY_SEQ: Seq = [
  [N.E5,4],[N.D5,4],[N.C5,4],[N.D5,4],
  [N.E5,4],[N.E5,4],[N.E5,8],
  [N.D5,4],[N.D5,4],[N.D5,8],
  [N.E5,4],[N.G5,4],[N.G5,8],
  [N.E5,4],[N.D5,4],[N.C5,4],[N.D5,4],
  [N.E5,4],[N.E5,4],[N.E5,4],[N.E5,4],
  [N.D5,4],[N.D5,4],[N.E5,4],[N.D5,4],
  [N.C5,16],
];

// Song 10: Adventure — heroic
const ADVENTURE_SEQ: Seq = [
  [N.G4,4],[N.C5,4],[N.E5,4],[N.G5,4],
  [N.A5,4],[N.G5,4],[N.F5,4],[N.E5,4],
  [N.D5,2],[N.E5,2],[N.F5,4],[N.G5,2],[N.A5,2],
  [N.G5,8],[N.R,8],
  [N.G4,4],[N.C5,4],[N.E5,4],[N.C5,4],
  [N.D5,4],[N.F5,4],[N.A5,4],[N.F5,4],
  [N.E5,2],[N.D5,2],[N.C5,2],[N.B4,2],[N.A4,4],[N.G4,4],
  [N.C5,16],
];

interface SongConfig {
  bpm: number;
  vol: number;
  seq: Seq;
}

const SONG_POOL: SongConfig[] = [
  { bpm: 160, vol: 0.50, seq: TETRIS_SEQ },
  { bpm: 128, vol: 0.45, seq: PUZZLE_SEQ },
  { bpm: 138, vol: 0.45, seq: WALTZ_SEQ },
  { bpm: 180, vol: 0.45, seq: CHASE_SEQ },
  { bpm: 120, vol: 0.40, seq: STAR_SEQ },
  { bpm: 148, vol: 0.45, seq: BOUNCE_SEQ },
  { bpm: 160, vol: 0.50, seq: JIG_SEQ },
  { bpm: 132, vol: 0.50, seq: FANFARE_SEQ },
  { bpm: 100, vol: 0.40, seq: LULLABY_SEQ },
  { bpm: 144, vol: 0.45, seq: ADVENTURE_SEQ },
];

function fisherYatesShuffle(arr: number[]): number[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// BGMTrack kept for backward compatibility — ignored internally
export type BGMTrack = 'tetris' | 'puzzle-bobble';

export function useChiptuneBGM(_track?: BGMTrack) {
  const [muted, setMuted] = useState(false);

  const mutedRef    = useRef(false);
  const ctxRef      = useRef<AudioContext | null>(null);
  const masterRef   = useRef<GainNode | null>(null);
  const timerRef    = useRef<ReturnType<typeof setTimeout> | null>(null);
  const noteIdxRef  = useRef(0);        // note index within current song
  const nextRef     = useRef(0);        // next scheduled audio time
  const runRef      = useRef(false);
  const playlistRef = useRef<number[]>([]); // shuffled song indices
  const plPosRef    = useRef(0);            // current position in playlist
  const seqRef      = useRef<Seq>(SONG_POOL[0].seq);
  const s16Ref      = useRef((60 / SONG_POOL[0].bpm) / 4);
  const volRef      = useRef(SONG_POOL[0].vol);

  const loadSong = useCallback((songIdx: number) => {
    const song = SONG_POOL[songIdx];
    seqRef.current     = song.seq;
    s16Ref.current     = (60 / song.bpm) / 4;
    volRef.current     = song.vol;
    noteIdxRef.current = 0;
    if (masterRef.current && ctxRef.current && !mutedRef.current) {
      masterRef.current.gain.setValueAtTime(song.vol, ctxRef.current.currentTime);
    }
  }, []);

  const advancePlaylist = useCallback(() => {
    plPosRef.current += 1;
    if (plPosRef.current >= playlistRef.current.length) {
      // Reshuffle when all songs have played
      playlistRef.current = fisherYatesShuffle(SONG_POOL.map((_, i) => i));
      plPosRef.current    = 0;
    }
    loadSong(playlistRef.current[plPosRef.current]);
  }, [loadSong]);

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

    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(1800, t);

    env.gain.setValueAtTime(0, t);
    env.gain.linearRampToValueAtTime(0.4, t + 0.008);
    env.gain.setValueAtTime(0.32, t + 0.02);
    env.gain.linearRampToValueAtTime(0, t + dur * 0.85);

    osc.connect(lp);
    lp.connect(env);
    env.connect(master);
    osc.start(t);
    osc.stop(t + dur);
  }, []);

  const tick = useCallback(() => {
    const ctx = ctxRef.current;
    if (!ctx || !runRef.current) return;

    while (nextRef.current < ctx.currentTime + 0.15) {
      // Re-read each iteration — seqRef and s16Ref may change after advancePlaylist
      const seq         = seqRef.current;
      const [freq, beats] = seq[noteIdxRef.current];
      schedNote(freq, nextRef.current, beats);
      nextRef.current  += beats * s16Ref.current;
      noteIdxRef.current += 1;
      if (noteIdxRef.current >= seqRef.current.length) {
        advancePlaylist(); // updates seqRef, s16Ref, noteIdxRef = 0
      }
    }
    timerRef.current = setTimeout(tick, 40);
  }, [schedNote, advancePlaylist]);

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

    // Build a fresh shuffled playlist and load the first song
    playlistRef.current = fisherYatesShuffle(SONG_POOL.map((_, i) => i));
    plPosRef.current    = 0;
    loadSong(playlistRef.current[0]);

    if (masterRef.current) {
      masterRef.current.gain.setValueAtTime(
        mutedRef.current ? 0 : volRef.current,
        ctx.currentTime,
      );
    }

    nextRef.current = ctx.currentTime + 0.05;
    runRef.current  = true;
    tick();
  }, [tick, loadSong]);

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
