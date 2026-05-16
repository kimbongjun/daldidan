'use client';

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import PuzzleBobbleGame from '@/components/PuzzleBobbleGame';

export default function PuzzleBobbblePage() {
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
        <div style={{ width: 64 }} />
      </header>

      <main className="flex-1 flex items-center justify-center p-4">
        <PuzzleBobbleGame />
      </main>
    </div>
  );
}
