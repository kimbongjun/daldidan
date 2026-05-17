import type { TetrominoType } from '@/types/tetris';

export const BOARD_WIDTH = 10;
export const BOARD_HEIGHT = 20;

export const SHAPES: Record<TetrominoType, number[][]> = {
  I: [[1, 1, 1, 1]],
  J: [[1, 0, 0], [1, 1, 1]],
  L: [[0, 0, 1], [1, 1, 1]],
  O: [[1, 1], [1, 1]],
  S: [[0, 1, 1], [1, 1, 0]],
  T: [[0, 1, 0], [1, 1, 1]],
  Z: [[1, 1, 0], [0, 1, 1]],
};

export const COLORS: Record<TetrominoType, string> = {
  I: '#22D3EE',
  J: '#3B82F6',
  L: '#FB923C',
  O: '#FACC15',
  S: '#4ADE80',
  T: '#C084FC',
  Z: '#F87171',
};

// Must list all class names explicitly so Tailwind v4 includes them in the build
export const CELL_BG: Record<TetrominoType, string> = {
  I: 'bg-cyan-400',
  J: 'bg-blue-500',
  L: 'bg-orange-400',
  O: 'bg-yellow-400',
  S: 'bg-green-400',
  T: 'bg-purple-400',
  Z: 'bg-red-400',
};

// Base scores by lines cleared: index = line count
export const SCORE_TABLE: number[] = [0, 100, 300, 500, 800];

// Back-to-Back Tetris score (800 × 1.5)
export const BACK_TO_BACK_SCORE = 1200;

// Combo bonus: comboCount × COMBO_BONUS_PER × level
export const COMBO_BONUS_PER = 50;

// Perfect Clear bonus base score
export const PERFECT_CLEAR_BASE = 3500;

// Speed in ms per level (level 1 = 800ms, decreases to minimum 80ms)
export const SPEED_TABLE: number[] = Array.from(
  { length: 20 },
  (_, i) => Math.max(80, 800 - i * 38),
);
