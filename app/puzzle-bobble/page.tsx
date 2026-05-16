'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, Volume2, VolumeX } from 'lucide-react';
import PuzzleBobbleGame from '@/components/PuzzleBobbleGame';
import { useChiptuneBGM } from '@/hooks/useChiptuneBGM';

export default function PuzzleBobbblePage() {
  const { muted, play: bgmPlay, stop: bgmStop, toggleMute } = useChiptuneBGM('puzzle-bobble');

  useEffect(() => {
    void bgmPlay();
    return () => bgmStop();
  }, [bgmPlay, bgmStop]);

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#0F172A' }}>
      <header
        className="flex items-center justify-between px-4 py-3"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}
      >
        <Link
          href="/"
          className="flex items-center gap-2 text-sm transition-colors"
          style={{ color: 'rgba(148,163,184,1)', textDecoration: 'none' }}
        >
          <ArrowLeft size={16} />
          홈으로
        </Link>
        <h1 className="text-sm font-black" style={{ color: 'white' }}>
          퍼즐버즐 🫧
        </h1>
        <button
          type="button"
          onClick={toggleMute}
          className="flex items-center justify-center rounded-lg transition-opacity hover:opacity-75"
          style={{ width: 36, height: 36, background: 'rgba(6,182,212,0.12)', border: '1px solid rgba(6,182,212,0.25)', color: '#06B6D4' }}
          aria-label={muted ? '음악 켜기' : '음악 끄기'}
        >
          {muted ? <VolumeX size={16} /> : <Volume2 size={16} />}
        </button>
      </header>

      <main className="flex-1 flex items-center justify-center p-4">
        <PuzzleBobbleGame />
      </main>
    </div>
  );
}
