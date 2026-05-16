'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import type { Board, CellValue, ActivePiece, GameState, TetrominoType } from '@/types/tetris';
import { BOARD_WIDTH, BOARD_HEIGHT, SHAPES, SCORE_TABLE, SPEED_TABLE } from '@/constants/tetris';

// ── Helpers ────────────────────────────────────────────────────────────────

function createEmptyBoard(): Board {
  return Array.from({ length: BOARD_HEIGHT }, () =>
    new Array<CellValue>(BOARD_WIDTH).fill(0),
  );
}

const ALL_TYPES: TetrominoType[] = ['I', 'J', 'L', 'O', 'S', 'T', 'Z'];

function randomType(): TetrominoType {
  return ALL_TYPES[Math.floor(Math.random() * ALL_TYPES.length)];
}

function rotateCW(shape: number[][]): number[][] {
  const rows = shape.length;
  const cols = shape[0].length;
  return Array.from({ length: cols }, (_, c) =>
    Array.from({ length: rows }, (_, r) => shape[rows - 1 - r][c]),
  );
}

function isValid(board: Board, shape: number[][], pos: { x: number; y: number }): boolean {
  for (let r = 0; r < shape.length; r++) {
    for (let c = 0; c < shape[r].length; c++) {
      if (!shape[r][c]) continue;
      const nx = pos.x + c;
      const ny = pos.y + r;
      if (nx < 0 || nx >= BOARD_WIDTH || ny >= BOARD_HEIGHT) return false;
      if (ny >= 0 && board[ny][nx] !== 0) return false;
    }
  }
  return true;
}

function spawnPiece(type: TetrominoType): ActivePiece {
  const shape = SHAPES[type];
  return {
    type,
    shape,
    pos: { x: Math.floor((BOARD_WIDTH - shape[0].length) / 2), y: 0 },
  };
}

function lockPiece(board: Board, piece: ActivePiece): Board {
  const next = board.map(row => [...row] as CellValue[]);
  for (let r = 0; r < piece.shape.length; r++) {
    for (let c = 0; c < piece.shape[r].length; c++) {
      if (!piece.shape[r][c]) continue;
      const ny = piece.pos.y + r;
      const nx = piece.pos.x + c;
      if (ny >= 0 && ny < BOARD_HEIGHT && nx >= 0 && nx < BOARD_WIDTH) {
        next[ny][nx] = piece.type;
      }
    }
  }
  return next;
}

function clearLines(board: Board): { board: Board; cleared: number } {
  const remaining = board.filter(row => row.some(cell => cell === 0));
  const cleared = BOARD_HEIGHT - remaining.length;
  const empty = Array.from({ length: cleared }, () =>
    new Array<CellValue>(BOARD_WIDTH).fill(0),
  );
  return { board: [...empty, ...remaining], cleared };
}

function dropDistance(board: Board, shape: number[][], pos: { x: number; y: number }): number {
  let dist = 0;
  while (isValid(board, shape, { x: pos.x, y: pos.y + dist + 1 })) dist++;
  return dist;
}

function createInitialState(): GameState {
  return {
    board: createEmptyBoard(),
    active: null,
    next: randomType(),
    hold: null,
    canHold: true,
    score: 0,
    lines: 0,
    level: 1,
    status: 'idle',
  };
}

// ── Hook ───────────────────────────────────────────────────────────────────

export function useTetris() {
  const [gameState, setGameState_] = useState<GameState>(createInitialState);
  const stateRef = useRef<GameState>(gameState);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Sync ref on every render so interval callbacks always read latest state
  stateRef.current = gameState;

  const setState = useCallback((updater: (s: GameState) => GameState) => {
    const next = updater(stateRef.current);
    stateRef.current = next;
    setGameState_(next);
  }, []);

  const stopLoop = useCallback(() => {
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  // ── Tick (called every interval) ─────────────────────────────────────────
  const tick = useCallback(() => {
    const s = stateRef.current;
    if (s.status !== 'playing' || !s.active) return;

    const moved: ActivePiece = { ...s.active, pos: { ...s.active.pos, y: s.active.pos.y + 1 } };

    if (isValid(s.board, moved.shape, moved.pos)) {
      setState(prev => ({ ...prev, active: moved }));
      return;
    }

    // Lock piece and spawn next
    const lockedBoard = lockPiece(s.board, s.active);
    const { board: clearedBoard, cleared } = clearLines(lockedBoard);
    const newLines = s.lines + cleared;
    const newLevel = Math.floor(newLines / 10) + 1;
    const newScore = s.score + (SCORE_TABLE[cleared] ?? 0) * s.level;
    const nextType = s.next;
    const newPiece = spawnPiece(nextType);
    const newNext = randomType();

    if (!isValid(clearedBoard, newPiece.shape, newPiece.pos)) {
      stopLoop();
      setState(() => ({
        board: clearedBoard,
        active: null,
        next: newNext,
        hold: s.hold,
        canHold: true,
        score: newScore,
        lines: newLines,
        level: newLevel,
        status: 'over',
      }));
      return;
    }

    setState(() => ({
      board: clearedBoard,
      active: newPiece,
      next: newNext,
      hold: s.hold,
      canHold: true,
      score: newScore,
      lines: newLines,
      level: newLevel,
      status: 'playing',
    }));
  }, [setState, stopLoop]);

  // ── Interval management ───────────────────────────────────────────────────
  useEffect(() => {
    if (gameState.status === 'playing') {
      stopLoop();
      const speed = SPEED_TABLE[Math.min(gameState.level - 1, SPEED_TABLE.length - 1)] ?? 80;
      intervalRef.current = setInterval(tick, speed);
    } else {
      stopLoop();
    }
    return stopLoop;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameState.status, gameState.level]);

  // ── Actions ───────────────────────────────────────────────────────────────
  const start = useCallback(() => {
    const firstType = randomType();
    setState(() => ({
      board: createEmptyBoard(),
      active: spawnPiece(firstType),
      next: randomType(),
      hold: null,
      canHold: true,
      score: 0,
      lines: 0,
      level: 1,
      status: 'playing',
    }));
  }, [setState]);

  const pause = useCallback(() => {
    if (stateRef.current.status !== 'playing') return;
    setState(s => ({ ...s, status: 'paused' }));
  }, [setState]);

  const resume = useCallback(() => {
    if (stateRef.current.status !== 'paused') return;
    setState(s => ({ ...s, status: 'playing' }));
  }, [setState]);

  const moveLeft = useCallback(() => {
    const s = stateRef.current;
    if (s.status !== 'playing' || !s.active) return;
    const moved = { ...s.active, pos: { ...s.active.pos, x: s.active.pos.x - 1 } };
    if (isValid(s.board, moved.shape, moved.pos)) setState(prev => ({ ...prev, active: moved }));
  }, [setState]);

  const moveRight = useCallback(() => {
    const s = stateRef.current;
    if (s.status !== 'playing' || !s.active) return;
    const moved = { ...s.active, pos: { ...s.active.pos, x: s.active.pos.x + 1 } };
    if (isValid(s.board, moved.shape, moved.pos)) setState(prev => ({ ...prev, active: moved }));
  }, [setState]);

  const softDrop = useCallback(() => {
    const s = stateRef.current;
    if (s.status !== 'playing' || !s.active) return;
    const moved = { ...s.active, pos: { ...s.active.pos, y: s.active.pos.y + 1 } };
    if (isValid(s.board, moved.shape, moved.pos)) {
      setState(prev => ({ ...prev, active: moved, score: prev.score + 1 }));
    }
  }, [setState]);

  const rotate = useCallback(() => {
    const s = stateRef.current;
    if (s.status !== 'playing' || !s.active) return;
    const rotated = rotateCW(s.active.shape);
    // Wall kick: try center, left 1, right 1, left 2, right 2
    for (const kick of [0, -1, 1, -2, 2]) {
      const pos = { x: s.active.pos.x + kick, y: s.active.pos.y };
      if (isValid(s.board, rotated, pos)) {
        setState(prev => ({ ...prev, active: { ...s.active!, shape: rotated, pos } }));
        return;
      }
    }
  }, [setState]);

  const hardDrop = useCallback(() => {
    const s = stateRef.current;
    if (s.status !== 'playing' || !s.active) return;
    const dist = dropDistance(s.board, s.active.shape, s.active.pos);
    const dropped: ActivePiece = { ...s.active, pos: { ...s.active.pos, y: s.active.pos.y + dist } };
    const lockedBoard = lockPiece(s.board, dropped);
    const { board: clearedBoard, cleared } = clearLines(lockedBoard);
    const newLines = s.lines + cleared;
    const newLevel = Math.floor(newLines / 10) + 1;
    const newScore = s.score + dist * 2 + (SCORE_TABLE[cleared] ?? 0) * s.level;
    const nextType = s.next;
    const newPiece = spawnPiece(nextType);
    const newNext = randomType();

    if (!isValid(clearedBoard, newPiece.shape, newPiece.pos)) {
      stopLoop();
      setState(() => ({
        board: clearedBoard,
        active: null,
        next: newNext,
        hold: s.hold,
        canHold: true,
        score: newScore,
        lines: newLines,
        level: newLevel,
        status: 'over',
      }));
      return;
    }

    setState(() => ({
      board: clearedBoard,
      active: newPiece,
      next: newNext,
      hold: s.hold,
      canHold: true,
      score: newScore,
      lines: newLines,
      level: newLevel,
      status: 'playing',
    }));
  }, [setState, stopLoop]);

  // ── Hold ──────────────────────────────────────────────────────────────────
  const holdPiece = useCallback(() => {
    const s = stateRef.current;
    if (s.status !== 'playing' || !s.active || !s.canHold) return;

    const currentType = s.active.type;

    if (s.hold === null) {
      const nextType = s.next;
      const newPiece = spawnPiece(nextType);
      if (!isValid(s.board, newPiece.shape, newPiece.pos)) return;
      setState(prev => ({
        ...prev,
        active: newPiece,
        next: randomType(),
        hold: currentType,
        canHold: false,
      }));
    } else {
      const swappedPiece = spawnPiece(s.hold);
      if (!isValid(s.board, swappedPiece.shape, swappedPiece.pos)) return;
      setState(prev => ({
        ...prev,
        active: swappedPiece,
        hold: currentType,
        canHold: false,
      }));
    }
  }, [setState]);

  // ── Keyboard handler ──────────────────────────────────────────────────────
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const status = stateRef.current.status;
      if (status === 'idle' || status === 'over') return;

      switch (e.key) {
        case 'ArrowLeft':
          e.preventDefault();
          moveLeft();
          break;
        case 'ArrowRight':
          e.preventDefault();
          moveRight();
          break;
        case 'ArrowDown':
          e.preventDefault();
          softDrop();
          break;
        case 'ArrowUp':
          e.preventDefault();
          rotate();
          break;
        case ' ':
          e.preventDefault();
          hardDrop();
          break;
        case 'c':
        case 'C':
          e.preventDefault();
          holdPiece();
          break;
        case 'p':
        case 'P':
        case 'Escape':
          if (status === 'playing') pause();
          else if (status === 'paused') resume();
          break;
      }
    };

    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [moveLeft, moveRight, softDrop, rotate, hardDrop, holdPiece, pause, resume]);

  useEffect(() => () => stopLoop(), [stopLoop]);

  // Ghost piece position
  const ghostPiece: ActivePiece | null =
    gameState.active && gameState.status === 'playing'
      ? {
          ...gameState.active,
          pos: {
            ...gameState.active.pos,
            y: gameState.active.pos.y + dropDistance(gameState.board, gameState.active.shape, gameState.active.pos),
          },
        }
      : null;

  return { gameState, ghostPiece, start, pause, resume, moveLeft, moveRight, softDrop, rotate, hardDrop, holdPiece };
}
