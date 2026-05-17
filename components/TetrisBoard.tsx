'use client';

import { useMemo } from 'react';
import type { Board, CellValue, ActivePiece, TetrominoType } from '@/types/tetris';
import { BOARD_WIDTH, BOARD_HEIGHT, CELL_BG, SHAPES, COLORS } from '@/constants/tetris';

// ── Types ─────────────────────────────────────────────────────────────────

interface RenderCell {
  type: CellValue;
  ghost: boolean;
}

// ── Helpers ────────────────────────────────────────────────────────────────

function buildDisplayBoard(
  board: Board,
  active: ActivePiece | null,
  ghost: ActivePiece | null,
): RenderCell[][] {
  const grid: RenderCell[][] = board.map(row =>
    row.map(cell => ({ type: cell, ghost: false })),
  );

  if (ghost) {
    for (let r = 0; r < ghost.shape.length; r++) {
      for (let c = 0; c < ghost.shape[r].length; c++) {
        if (!ghost.shape[r][c]) continue;
        const ny = ghost.pos.y + r;
        const nx = ghost.pos.x + c;
        if (ny >= 0 && ny < BOARD_HEIGHT && nx >= 0 && nx < BOARD_WIDTH) {
          if (grid[ny][nx].type === 0) grid[ny][nx] = { type: ghost.type, ghost: true };
        }
      }
    }
  }

  if (active) {
    for (let r = 0; r < active.shape.length; r++) {
      for (let c = 0; c < active.shape[r].length; c++) {
        if (!active.shape[r][c]) continue;
        const ny = active.pos.y + r;
        const nx = active.pos.x + c;
        if (ny >= 0 && ny < BOARD_HEIGHT && nx >= 0 && nx < BOARD_WIDTH) {
          grid[ny][nx] = { type: active.type, ghost: false };
        }
      }
    }
  }

  return grid;
}

// ── Cell ──────────────────────────────────────────────────────────────────

function Cell({ cell }: { cell: RenderCell }) {
  if (cell.type === 0) {
    return (
      <div
        className="w-full h-full"
        style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.05)' }}
      />
    );
  }

  const bgClass = CELL_BG[cell.type];

  if (cell.ghost) {
    return (
      <div
        className={`w-full h-full ${bgClass}`}
        style={{ opacity: 0.18, border: '1px solid rgba(255,255,255,0.15)' }}
      />
    );
  }

  return (
    <div
      className={`w-full h-full ${bgClass} border-t-2 border-l-2 border-white/30`}
      style={{ boxShadow: 'inset -2px -2px 4px rgba(0,0,0,0.4)' }}
    />
  );
}

// ── Hold Piece Preview ────────────────────────────────────────────────────

export function HoldPiecePreview({ type }: { type: TetrominoType | null }) {
  const emptyGrid = Array.from({ length: 4 }, () => Array.from({ length: 4 }, () => false));

  if (!type) {
    return (
      <div className="flex flex-col gap-0.5">
        {emptyGrid.map((row, r) => (
          <div key={r} className="flex gap-0.5">
            {row.map((_, c) => (
              <div key={c} className="w-5 h-5 rounded-sm" style={{ background: 'rgba(255,255,255,0.02)' }} />
            ))}
          </div>
        ))}
      </div>
    );
  }

  const shape = SHAPES[type];
  const color = COLORS[type];
  const rows = shape.length;
  const cols = shape[0].length;
  const padTop = Math.floor((4 - rows) / 2);
  const padLeft = Math.floor((4 - cols) / 2);

  const grid = Array.from({ length: 4 }, (_, r) =>
    Array.from({ length: 4 }, (_, c) => {
      const sr = r - padTop;
      const sc = c - padLeft;
      return sr >= 0 && sr < rows && sc >= 0 && sc < cols && shape[sr][sc] === 1;
    }),
  );

  return (
    <div className="flex flex-col gap-0.5">
      {grid.map((row, r) => (
        <div key={r} className="flex gap-0.5">
          {row.map((filled, c) => (
            <div
              key={c}
              className="w-5 h-5 rounded-sm"
              style={
                filled
                  ? { background: color, boxShadow: `0 0 6px ${color}88`, border: '1px solid rgba(255,255,255,0.3)' }
                  : { background: 'rgba(255,255,255,0.02)' }
              }
            />
          ))}
        </div>
      ))}
    </div>
  );
}

// ── Next Piece Preview ────────────────────────────────────────────────────

export function NextPiecePreview({ type }: { type: TetrominoType }) {
  const shape = SHAPES[type];
  const color = COLORS[type];
  const bgClass = CELL_BG[type];

  // Normalize to 4x4 grid centered
  const rows = shape.length;
  const cols = shape[0].length;
  const padTop = Math.floor((4 - rows) / 2);
  const padLeft = Math.floor((4 - cols) / 2);

  const grid = Array.from({ length: 4 }, (_, r) =>
    Array.from({ length: 4 }, (_, c) => {
      const sr = r - padTop;
      const sc = c - padLeft;
      return sr >= 0 && sr < rows && sc >= 0 && sc < cols && shape[sr][sc] === 1;
    }),
  );

  return (
    <div className="flex flex-col gap-0.5">
      {grid.map((row, r) => (
        <div key={r} className="flex gap-0.5">
          {row.map((filled, c) => (
            <div
              key={c}
              className="w-5 h-5 rounded-sm"
              style={
                filled
                  ? { background: color, boxShadow: `0 0 6px ${color}88`, border: '1px solid rgba(255,255,255,0.3)' }
                  : { background: 'rgba(255,255,255,0.02)' }
              }
            />
          ))}
        </div>
      ))}
      {/* suppress unused variable warning */}
      <span className="hidden">{bgClass}</span>
    </div>
  );
}

// ── Main Board ────────────────────────────────────────────────────────────

interface TetrisBoardProps {
  board: Board;
  active: ActivePiece | null;
  ghost: ActivePiece | null;
  cellSize?: number;
  clearingLines?: number[];
}

export default function TetrisBoard({
  board,
  active,
  ghost,
  cellSize = 28,
  clearingLines = [],
}: TetrisBoardProps) {
  const displayBoard = useMemo(
    () => buildDisplayBoard(board, active, ghost),
    [board, active, ghost],
  );

  const isEpic = clearingLines.length >= 3;
  // gap:1 → 각 셀 행 시작 y = padding(4) + r * (cellSize + 1)
  const rowTop = (r: number) => 4 + r * (cellSize + 1);

  return (
    <div
      className="relative"
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${BOARD_WIDTH}, 1fr)`,
        gap: 1,
        background: '#0A0A12',
        border: '2px solid rgba(255,255,255,0.1)',
        borderRadius: 4,
        padding: 4,
        boxShadow: '0 0 32px rgba(124,58,237,0.2), inset 0 0 16px rgba(0,0,0,0.5)',
      }}
    >
      {displayBoard.map((row, r) =>
        row.map((cell, c) => (
          <div key={`${r}-${c}`} style={{ width: cellSize, height: cellSize }}>
            <Cell cell={cell} />
          </div>
        )),
      )}

      {/* 라인 클리어 애니메이션 오버레이 */}
      {clearingLines.map(r => (
        <div
          key={`clr-${r}`}
          style={{
            position: 'absolute',
            top: rowTop(r),
            left: 4,
            right: 4,
            height: cellSize,
            borderRadius: 2,
            pointerEvents: 'none',
            zIndex: 10,
            animation: isEpic
              ? 'tetris-row-flash-epic 500ms ease-out forwards'
              : 'tetris-row-flash 300ms ease-out forwards',
          }}
        />
      ))}
    </div>
  );
}
