'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Gamepad2 } from 'lucide-react';

const ACCENT = '#A855F7';

interface Game {
  id: string;
  emoji: string;
  name: string;
  desc: string;
  href: string;
  color: string;
}

const GAMES: Game[] = [
  {
    id: 'tetris',
    emoji: '🎮',
    name: '테트리스',
    desc: '클래식 블록 퍼즐',
    href: '/tetris',
    color: '#A855F7',
  },
  {
    id: 'puzzle-bobble',
    emoji: '🫧',
    name: '퍼즐버즐',
    desc: '버블 매칭 퍼즐',
    href: '/puzzle-bobble',
    color: '#06B6D4',
  },
];

function GameCard({ game, myBest }: { game: Game; myBest: number | null }) {
  return (
    <Link
      href={game.href}
      className="flex flex-col items-center gap-2 rounded-2xl p-4 transition-all hover:scale-105 hover:opacity-90 pressable"
      style={{
        background: `${game.color}12`,
        border: `1px solid ${game.color}30`,
        textDecoration: 'none',
      }}
    >
      {/* Emoji icon with glow */}
      <div
        className="flex items-center justify-center rounded-2xl"
        style={{
          width: 60,
          height: 60,
          fontSize: '2rem',
          background: `${game.color}1A`,
          boxShadow: `0 0 20px ${game.color}40`,
          border: `1px solid ${game.color}44`,
        }}
      >
        {game.emoji}
      </div>

      {/* Name */}
      <p className="text-sm font-black text-center" style={{ color: 'var(--text-primary)' }}>
        {game.name}
      </p>

      {/* Desc */}
      <p className="text-xs text-center leading-tight" style={{ color: 'var(--text-muted)' }}>
        {game.desc}
      </p>

      {/* My best score */}
      {myBest !== null && (
        <p className="text-xs font-bold text-center" style={{ color: game.color, margin: 0 }}>
          🏆 {myBest.toLocaleString()}점
        </p>
      )}

      {/* Play button */}
      <span
        className="text-xs font-bold px-4 py-1.5 rounded-full mt-1"
        style={{
          background: `linear-gradient(135deg, ${game.color}, ${game.color}aa)`,
          color: '#fff',
        }}
      >
        PLAY ▶
      </span>
    </Link>
  );
}

export default function PlaygroundWidget() {
  const [bestScores, setBestScores] = useState<Record<string, number | null>>({});

  useEffect(() => {
    for (const game of GAMES) {
      fetch(`/api/game-scores?gameId=${game.id}`)
        .then(res => {
          if (res.status === 401) return null;
          if (!res.ok) return null;
          return res.json() as Promise<{ myBest: number | null }>;
        })
        .then(data => {
          if (data === null) return;
          setBestScores(prev => ({ ...prev, [game.id]: data.myBest }));
        })
        .catch(err => console.error('bestScore fetch error:', err));
    }
  }, []);

  return (
    <div
      className="bento-card h-full flex flex-col p-5 gap-4"
      style={{
        background: `linear-gradient(135deg, #1A1030 0%, #16161F 60%, #1A1030 100%)`,
      }}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p
            className="text-xs font-semibold uppercase tracking-widest"
            style={{ color: ACCENT }}
          >
            놀이터
          </p>
          <h2 className="text-lg font-black" style={{ color: 'var(--text-primary)' }}>
            게임 센터 🕹️
          </h2>
        </div>
        <span
          className="tag shrink-0 flex items-center gap-1.5"
          style={{ background: `${ACCENT}22`, color: ACCENT }}
        >
          <Gamepad2 size={12} />
          {GAMES.length}개 게임
        </span>
      </div>

      {/* Decorative stars */}
      <div
        className="absolute top-3 right-16 text-lg pointer-events-none select-none opacity-20"
        aria-hidden
      >
        ✨
      </div>
      <div
        className="absolute bottom-20 left-4 text-sm pointer-events-none select-none opacity-15"
        aria-hidden
      >
        ⭐
      </div>

      {/* Games grid */}
      <div className="flex flex-wrap gap-3 justify-center flex-1 items-center">
        {GAMES.map(game => (
          <GameCard key={game.id} game={game} myBest={bestScores[game.id] ?? null} />
        ))}

        <div
          className="flex flex-col items-center gap-2 rounded-2xl p-4 opacity-40"
          style={{
            background: 'rgba(255,255,255,0.03)',
            border: '1px dashed rgba(255,255,255,0.1)',
            width: 130,
          }}
        >
          <div
            className="flex items-center justify-center rounded-2xl"
            style={{ width: 60, height: 60, fontSize: '1.8rem', background: 'rgba(255,255,255,0.05)' }}
          >
            🧱
          </div>
          <p className="text-sm font-black text-center" style={{ color: 'var(--text-muted)' }}>
            벽돌깨기
          </p>
          <span
            className="text-[10px] font-bold px-3 py-1 rounded-full"
            style={{ background: 'rgba(255,255,255,0.06)', color: 'var(--text-muted)' }}
          >
            준비 중
          </span>
        </div>
      </div>

      {/* Footer hint */}
      <p className="text-xs text-center" style={{ color: 'var(--text-muted)', opacity: 0.6 }}>
        게임 아이콘을 클릭해서 플레이해보세요 🎉
      </p>
    </div>
  );
}
