'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import type { Board, CellValue, ActivePiece, GameState, TetrominoType, ScoreEvent, ClearAction } from '@/types/tetris';
import {
  BOARD_WIDTH, BOARD_HEIGHT, SHAPES, SCORE_TABLE, SPEED_TABLE,
  BACK_TO_BACK_SCORE, COMBO_BONUS_PER, PERFECT_CLEAR_BASE,
} from '@/constants/tetris';
import { useTetrisAudio } from './useTetrisAudio';

// ── Helpers ────────────────────────────────────────────────────────────────

function createEmptyBoard(): Board {
  return Array.from({ length: BOARD_HEIGHT }, () =>
    new Array<CellValue>(BOARD_WIDTH).fill(0),
  );
}

const ALL_TYPES: TetrominoType[] = ['I', 'J', 'L', 'O', 'S', 'T', 'Z'];
const CLEAR_ACTIONS: ClearAction[] = ['single', 'double', 'triple', 'tetris'];

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

function getCompletedRows(board: Board): number[] {
  return board.reduce<number[]>((acc, row, i) => {
    if (row.every(cell => cell !== 0)) acc.push(i);
    return acc;
  }, []);
}

function removeRows(board: Board, rowIndices: number[]): Board {
  const set = new Set(rowIndices);
  const remaining = board.filter((_, i) => !set.has(i));
  const empty = Array.from({ length: rowIndices.length }, () =>
    new Array<CellValue>(BOARD_WIDTH).fill(0),
  );
  return [...empty, ...remaining];
}

function dropDistance(board: Board, shape: number[][], pos: { x: number; y: number }): number {
  let dist = 0;
  while (isValid(board, shape, { x: pos.x, y: pos.y + dist + 1 })) dist++;
  return dist;
}

function isBoardEmpty(board: Board): boolean {
  return board.every(row => row.every(cell => cell === 0));
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
    clearingLines: [],
    combo: 0,
    lastClearWasTetris: false,
    lastScoreEvent: null,
  };
}

// ── Pending clear data (stored in ref, not state) ─────────────────────────

interface PendingClear {
  board: Board;
  score: number;
  lines: number;
  level: number;
  nextPiece: ActivePiece;
  nextType: TetrominoType;
  hold: TetrominoType | null;
  isGameOver: boolean;
  combo: number;
  lastClearWasTetris: boolean;
}

// ── Hook ───────────────────────────────────────────────────────────────────

export function useTetris({ muted = false }: { muted?: boolean } = {}) {
  const [gameState, setGameState_] = useState<GameState>(createInitialState);
  const stateRef = useRef<GameState>(gameState);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pendingClearRef = useRef<PendingClear | null>(null);
  const scoreEventIdRef = useRef(0);

  stateRef.current = gameState;

  const {
    soundPlace, soundClearLine, soundHardDrop, soundHold, soundGameOver,
    soundBackToBack, soundPerfectClear,
  } = useTetrisAudio(muted);

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

  // ── Lock helper: enters clearing animation or spawns next directly ────────
  const handleLock = useCallback(
    (s: GameState, lockedBoard: Board, dropBonus: number) => {
      const completedRows = getCompletedRows(lockedBoard);

      if (completedRows.length > 0) {
        const clearedBoard = removeRows(lockedBoard, completedRows);
        const count = completedRows.length;
        const action: ClearAction = CLEAR_ACTIONS[count - 1]!;

        // Back-to-Back: consecutive Tetris clears only
        const isBackToBack = action === 'tetris' && s.lastClearWasTetris;
        const newLastClearWasTetris = action === 'tetris';

        // Base line score (Back-to-Back replaces base for Tetris)
        const baseScore = isBackToBack ? BACK_TO_BACK_SCORE : (SCORE_TABLE[count] ?? 0);
        const lineScore = baseScore * s.level;

        // Combo bonus: s.combo is the count before this clear
        const comboBonus = s.combo * COMBO_BONUS_PER * s.level;
        const newCombo = s.combo + 1;

        // Perfect Clear
        const perfectClear = isBoardEmpty(clearedBoard);
        const perfectClearBonus = perfectClear ? PERFECT_CLEAR_BASE * s.level : 0;

        const newLines = s.lines + count;
        const newLevel = Math.floor(newLines / 10) + 1;
        const newScore = s.score + dropBonus + lineScore + comboBonus + perfectClearBonus;

        const nextType = s.next;
        const newPiece = spawnPiece(nextType);
        const newNext = randomType();

        const scoreEvent: ScoreEvent = {
          id: ++scoreEventIdRef.current,
          action,
          combo: s.combo,
          backToBack: isBackToBack,
          perfectClear,
        };

        pendingClearRef.current = {
          board: clearedBoard,
          score: newScore,
          lines: newLines,
          level: newLevel,
          nextPiece: newPiece,
          nextType: newNext,
          hold: s.hold,
          isGameOver: !isValid(clearedBoard, newPiece.shape, newPiece.pos),
          combo: newCombo,
          lastClearWasTetris: newLastClearWasTetris,
        };

        soundClearLine(count, s.combo);
        if (isBackToBack) soundBackToBack();
        if (perfectClear) soundPerfectClear();

        setState(() => ({
          ...s,
          board: lockedBoard,
          active: null,
          clearingLines: completedRows,
          status: 'clearing',
          lastScoreEvent: scoreEvent,
        }));
      } else {
        const nextType = s.next;
        const newPiece = spawnPiece(nextType);
        const newNext = randomType();

        soundPlace();

        if (!isValid(lockedBoard, newPiece.shape, newPiece.pos)) {
          stopLoop();
          setState(() => ({
            board: lockedBoard,
            active: null,
            next: newNext,
            hold: s.hold,
            canHold: true,
            score: s.score + dropBonus,
            lines: s.lines,
            level: s.level,
            status: 'over',
            clearingLines: [],
            combo: 0,
            lastClearWasTetris: false,
            lastScoreEvent: null,
          }));
          soundGameOver();
        } else {
          setState(() => ({
            board: lockedBoard,
            active: newPiece,
            next: newNext,
            hold: s.hold,
            canHold: true,
            score: s.score + dropBonus,
            lines: s.lines,
            level: s.level,
            status: 'playing',
            clearingLines: [],
            combo: 0,
            lastClearWasTetris: false,
            lastScoreEvent: null,
          }));
        }
      }
    },
    [setState, stopLoop, soundPlace, soundClearLine, soundGameOver, soundBackToBack, soundPerfectClear],
  );

  // ── Tick ──────────────────────────────────────────────────────────────────
  const tick = useCallback(() => {
    const s = stateRef.current;
    if (s.status !== 'playing' || !s.active) return;

    const moved: ActivePiece = { ...s.active, pos: { ...s.active.pos, y: s.active.pos.y + 1 } };

    if (isValid(s.board, moved.shape, moved.pos)) {
      setState(prev => ({ ...prev, active: moved }));
      return;
    }

    handleLock(s, lockPiece(s.board, s.active), 0);
  }, [setState, handleLock]);

  // ── Clearing animation effect ─────────────────────────────────────────────
  useEffect(() => {
    if (gameState.status !== 'clearing' || gameState.clearingLines.length === 0) return;

    const delay = gameState.clearingLines.length >= 3 ? 500 : 300;

    const timer = setTimeout(() => {
      if (stateRef.current.status !== 'clearing') return;
      const pending = pendingClearRef.current;
      if (!pending) return;

      if (pending.isGameOver) {
        stopLoop();
        setState(() => ({
          board: pending.board,
          active: null,
          next: pending.nextType,
          hold: pending.hold,
          canHold: true,
          score: pending.score,
          lines: pending.lines,
          level: pending.level,
          status: 'over',
          clearingLines: [],
          combo: pending.combo,
          lastClearWasTetris: pending.lastClearWasTetris,
          lastScoreEvent: null,
        }));
        soundGameOver();
      } else {
        setState(() => ({
          board: pending.board,
          active: pending.nextPiece,
          next: pending.nextType,
          hold: pending.hold,
          canHold: true,
          score: pending.score,
          lines: pending.lines,
          level: pending.level,
          status: 'playing',
          clearingLines: [],
          combo: pending.combo,
          lastClearWasTetris: pending.lastClearWasTetris,
          lastScoreEvent: null,
        }));
      }

      pendingClearRef.current = null;
    }, delay);

    return () => clearTimeout(timer);
  }, [gameState.status, gameState.clearingLines, setState, stopLoop, soundGameOver]);

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
      clearingLines: [],
      combo: 0,
      lastClearWasTetris: false,
      lastScoreEvent: null,
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
    soundHardDrop();
    handleLock(s, lockPiece(s.board, dropped), dist * 2);
  }, [handleLock, soundHardDrop]);

  // ── Hold ──────────────────────────────────────────────────────────────────
  const holdPiece = useCallback(() => {
    const s = stateRef.current;
    if (s.status !== 'playing' || !s.active || !s.canHold) return;

    soundHold();
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
  }, [setState, soundHold]);

  // ── Keyboard handler: DAS/ARR ─────────────────────────────────────────────
  // DAS = 167ms (initial delay), ARR = 33ms (repeat interval) — Tetris guideline standard
  useEffect(() => {
    let heldKey: string | null = null;
    let dasTimer: ReturnType<typeof setTimeout> | null = null;
    let arrTimer: ReturnType<typeof setInterval> | null = null;

    const clearRepeat = () => {
      if (dasTimer) { clearTimeout(dasTimer); dasTimer = null; }
      if (arrTimer) { clearInterval(arrTimer); arrTimer = null; }
      heldKey = null;
    };

    const startRepeat = (key: string, action: () => void) => {
      clearRepeat();
      heldKey = key;
      dasTimer = setTimeout(() => {
        arrTimer = setInterval(action, 33);
      }, 167);
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.repeat) return;
      const status = stateRef.current.status;
      if (status === 'idle' || status === 'over') return;

      switch (e.key) {
        case 'ArrowLeft':
          e.preventDefault();
          moveLeft();
          startRepeat('ArrowLeft', moveLeft);
          break;
        case 'ArrowRight':
          e.preventDefault();
          moveRight();
          startRepeat('ArrowRight', moveRight);
          break;
        case 'ArrowDown':
          e.preventDefault();
          softDrop();
          startRepeat('ArrowDown', softDrop);
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

    const onKeyUp = (e: KeyboardEvent) => {
      if (e.key === heldKey) clearRepeat();
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      clearRepeat();
    };
  }, [moveLeft, moveRight, softDrop, rotate, hardDrop, holdPiece, pause, resume]);

  useEffect(() => () => stopLoop(), [stopLoop]);

  // ── Ghost piece ───────────────────────────────────────────────────────────
  const ghostPiece: ActivePiece | null =
    gameState.active && gameState.status === 'playing'
      ? {
          ...gameState.active,
          pos: {
            ...gameState.active.pos,
            y:
              gameState.active.pos.y +
              dropDistance(gameState.board, gameState.active.shape, gameState.active.pos),
          },
        }
      : null;

  return {
    gameState,
    ghostPiece,
    start,
    pause,
    resume,
    moveLeft,
    moveRight,
    softDrop,
    rotate,
    hardDrop,
    holdPiece,
  };
}
