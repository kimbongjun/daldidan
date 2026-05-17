export type TetrominoType = 'I' | 'J' | 'L' | 'O' | 'S' | 'T' | 'Z';
export type CellValue = 0 | TetrominoType;
export type Board = CellValue[][];

export interface Position {
  x: number;
  y: number;
}

export interface ActivePiece {
  type: TetrominoType;
  shape: number[][];
  pos: Position;
}

export type GameStatus = 'idle' | 'playing' | 'paused' | 'over' | 'clearing';

export type ClearAction = 'single' | 'double' | 'triple' | 'tetris';

export interface ScoreEvent {
  id: number;
  action: ClearAction;
  combo: number;       // current combo count before this clear (0 = no combo bonus)
  backToBack: boolean;
  perfectClear: boolean;
}

export interface GameState {
  board: Board;
  active: ActivePiece | null;
  next: TetrominoType;
  hold: TetrominoType | null;
  canHold: boolean;
  score: number;
  lines: number;
  level: number;
  status: GameStatus;
  clearingLines: number[];
  combo: number;
  lastClearWasTetris: boolean;
  lastScoreEvent: ScoreEvent | null;
}
