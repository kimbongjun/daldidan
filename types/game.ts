export interface GameScoreEntry {
  id: string;
  userId: string;
  nickname: string;
  score: number;
  createdAt: string;
}

export interface GetGameScoresResponse {
  scores: GameScoreEntry[];
  myBest: number | null;
}

export type GameId = 'tetris' | 'puzzle-bobble';
