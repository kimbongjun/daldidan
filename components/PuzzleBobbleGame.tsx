'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

// ===== 게임 상수 =====
const BUBBLE_R = 20;                                   // 버블 반지름 (px)
const COLS_EVEN = 8;                                   // 짝수 행 열 개수
const COLS_ODD = 7;                                    // 홀수 행 열 개수 (1칸 오프셋)
const ROW_H = Math.round(BUBBLE_R * Math.sqrt(3));     // 행 간격 ≈ 35px (육각형 높이)
const CANVAS_W = COLS_EVEN * BUBBLE_R * 2;             // 캔버스 폭 = 320px
const CANVAS_H = 580;                                  // 캔버스 높이
const SHOOTER_X = CANVAS_W / 2;                        // 발사대 중심 X = 160
const SHOOTER_Y = CANVAS_H - 60;                       // 발사대 Y = 520
const DEADLINE_Y = CANVAS_H - 110;                     // 게임오버 데드라인 Y = 470
const MAX_ANGLE = (80 * Math.PI) / 180;                // 최대 발사각 (±80도 → 라디안)
const SPEED = 10;                                      // 버블 비행 속도 (px/프레임)
const INITIAL_ROWS = 5;                                // 초기 생성 버블 행 수
const PRESSURE_SHOTS = 8;                              // N발마다 격자 하강
const PRESSURE_STEP = ROW_H;                           // 한 번 압박 시 하강 거리
const MIN_MATCH = 3;                                   // 터지는 최소 연결 개수
const GRID_ROWS = 20;                                  // 격자 최대 행 수
const SCORE_PER_BUBBLE = 100;                          // 버블 1개 터짐 점수
const SCORE_PER_DROP = 150;                            // 낙하 버블 1개 보너스 점수

// 버블 색상 팔레트 (빨강, 파랑, 초록, 노랑)
const PALETTE = ['#EF4444', '#3B82F6', '#22C55E', '#EAB308'] as const;
type Color = (typeof PALETTE)[number];
type Cell = Color | null;
type Grid = Cell[][];

// ===== 타입 정의 =====
interface FlyBubble {
  x: number;
  y: number;
  dx: number;
  dy: number;
  color: Color;
}

interface DropBubble {
  x: number;
  y: number;
  vy: number;
  color: Color;
}

interface GameState {
  grid: Grid;
  fly: FlyBubble | null;
  drops: DropBubble[];
  current: Color;
  next: Color;
  score: number;
  shots: number;
  angle: number;           // 발사 각도 (라디안, 0 = 위쪽)
  status: 'playing' | 'gameover' | 'clear';
  gridOffset: number;      // 압박으로 인한 격자 Y 오프셋 (px)
  lastPressure: number;    // 마지막 압박 시점의 shots 카운트
}

// ===== 순수 유틸 함수 (컴포넌트 외부) =====

function randColor(): Color {
  return PALETTE[Math.floor(Math.random() * PALETTE.length)];
}

// 행 인덱스에 따른 열 개수 반환
function colCount(row: number): number {
  return row % 2 === 1 ? COLS_ODD : COLS_EVEN;
}

// 격자 좌표 → 캔버스 픽셀 좌표 변환 (지그재그 육각 격자)
function cellToPixel(row: number, col: number, gridOffset: number): { x: number; y: number } {
  const isOdd = row % 2 === 1;
  const x = col * BUBBLE_R * 2 + (isOdd ? BUBBLE_R : 0) + BUBBLE_R;
  const y = row * ROW_H + BUBBLE_R + gridOffset;
  return { x, y };
}

// 초기 격자 생성: 상위 INITIAL_ROWS 행에만 무작위 버블 배치
function createGrid(): Grid {
  return Array.from({ length: GRID_ROWS }, (_, r) =>
    Array.from({ length: colCount(r) }, () =>
      r < INITIAL_ROWS ? randColor() : null
    )
  );
}

// 육각 격자의 이웃 6개 셀 반환 (유효 범위 필터링 포함)
// 짝수 행: 위/아래 이웃이 col-1, col
// 홀수 행: 위/아래 이웃이 col, col+1
function getNeighbors(row: number, col: number): Array<{ row: number; col: number }> {
  const isOdd = row % 2 === 1;
  const candidates = [
    { row, col: col - 1 },                              // 왼쪽
    { row, col: col + 1 },                              // 오른쪽
    { row: row - 1, col: isOdd ? col : col - 1 },       // 위 왼쪽
    { row: row - 1, col: isOdd ? col + 1 : col },       // 위 오른쪽
    { row: row + 1, col: isOdd ? col : col - 1 },       // 아래 왼쪽
    { row: row + 1, col: isOdd ? col + 1 : col },       // 아래 오른쪽
  ];
  return candidates.filter(({ row: r, col: c }) => {
    if (r < 0 || r >= GRID_ROWS) return false;
    if (c < 0 || c >= colCount(r)) return false;
    return true;
  });
}

// BFS: 같은 색상으로 연결된 버블 그룹 탐색
function findConnected(
  grid: Grid,
  startRow: number,
  startCol: number
): Array<{ row: number; col: number }> {
  const targetColor = grid[startRow]?.[startCol];
  if (!targetColor) return [];

  const visited = new Set<string>();
  const queue = [{ row: startRow, col: startCol }];
  const result: Array<{ row: number; col: number }> = [];

  while (queue.length > 0) {
    const cell = queue.shift()!;
    const key = `${cell.row},${cell.col}`;
    if (visited.has(key)) continue;
    visited.add(key);

    if (grid[cell.row]?.[cell.col] !== targetColor) continue;
    result.push(cell);

    for (const nb of getNeighbors(cell.row, cell.col)) {
      if (!visited.has(`${nb.row},${nb.col}`) && grid[nb.row]?.[nb.col] === targetColor) {
        queue.push(nb);
      }
    }
  }
  return result;
}

// BFS: 천장(0행)에 연결되지 않은 공중 부양 버블 탐색
// 천장에서 BFS로 방문 가능한 버블 = 고정 버블
// 나머지 = 공중 부양 → 낙하 처리
function findFloating(grid: Grid): Array<{ row: number; col: number }> {
  const connected = new Set<string>();
  const queue: Array<{ row: number; col: number }> = [];

  // 0행(천장)의 버블을 BFS 시작점으로 등록
  for (let c = 0; c < colCount(0); c++) {
    if (grid[0]?.[c]) {
      queue.push({ row: 0, col: c });
    }
  }

  while (queue.length > 0) {
    const cell = queue.shift()!;
    const key = `${cell.row},${cell.col}`;
    if (connected.has(key)) continue;
    if (!grid[cell.row]?.[cell.col]) continue;
    connected.add(key);

    for (const nb of getNeighbors(cell.row, cell.col)) {
      if (!connected.has(`${nb.row},${nb.col}`) && grid[nb.row]?.[nb.col]) {
        queue.push(nb);
      }
    }
  }

  // 방문하지 못한 버블 = 공중 부양 버블
  const floating: Array<{ row: number; col: number }> = [];
  for (let r = 0; r < grid.length; r++) {
    for (let c = 0; c < colCount(r); c++) {
      if (grid[r]?.[c] && !connected.has(`${r},${c}`)) {
        floating.push({ row: r, col: c });
      }
    }
  }
  return floating;
}

// 격자에 버블이 하나라도 있는지 확인 (스테이지 클리어 조건)
function hasBubbles(grid: Grid): boolean {
  return grid.some(row => row.some(cell => cell !== null));
}

// 데드라인을 넘은 버블이 있는지 확인 (게임오버 조건)
function isDeadlineReached(grid: Grid, gridOffset: number): boolean {
  for (let r = 0; r < grid.length; r++) {
    for (let c = 0; c < colCount(r); c++) {
      if (grid[r]?.[c]) {
        const { y } = cellToPixel(r, c, gridOffset);
        if (y + BUBBLE_R > DEADLINE_Y) return true;
      }
    }
  }
  return false;
}

// 픽셀 좌표 → 가장 가까운 빈 격자 셀 (충돌 후 스냅 위치 결정)
function snapToGrid(
  px: number,
  py: number,
  gridOffset: number,
  grid: Grid
): { row: number; col: number } | null {
  let bestDist = Infinity;
  let best: { row: number; col: number } | null = null;

  for (let r = 0; r < GRID_ROWS; r++) {
    for (let c = 0; c < colCount(r); c++) {
      if (grid[r]?.[c] !== null) continue; // 이미 채워진 셀 제외
      const pos = cellToPixel(r, c, gridOffset);
      const dist = Math.hypot(px - pos.x, py - pos.y);
      if (dist < bestDist) {
        bestDist = dist;
        best = { row: r, col: c };
      }
    }
  }
  return best;
}

// 게임 한 프레임 업데이트 (순수 함수 — 변경된 필드만 반환)
function tickGame(state: GameState): Partial<GameState> {
  if (state.status !== 'playing') return {};

  const { grid, fly, score, shots, status, gridOffset, lastPressure } = state;
  let { drops } = state;

  // 낙하 버블 물리 업데이트 (중력 가속 + 화면 이탈 시 제거)
  drops = drops
    .map(d => ({ ...d, y: d.y + d.vy, vy: d.vy + 0.6 }))
    .filter(d => d.y < CANVAS_H + 80);

  if (!fly) return { drops };

  // 비행 버블 위치 업데이트
  let { x, y, dx } = fly;
  const { dy, color } = fly;
  x += dx;
  y += dy;

  // 좌우 벽 반사: 입사각 = 반사각
  if (x - BUBBLE_R <= 0) { x = BUBBLE_R; dx = Math.abs(dx); }
  if (x + BUBBLE_R >= CANVAS_W) { x = CANVAS_W - BUBBLE_R; dx = -Math.abs(dx); }

  // 충돌 감지: 천장 또는 고정 버블과의 접촉 여부 확인
  let collided = false;

  // 천장 충돌 (gridOffset이 천장의 Y 위치)
  if (y - BUBBLE_R <= gridOffset) {
    collided = true;
  }

  // 고정 버블과 거리 기반 충돌 감지
  if (!collided) {
    outer: for (let r = 0; r < grid.length; r++) {
      for (let c = 0; c < colCount(r); c++) {
        if (!grid[r]?.[c]) continue;
        const pos = cellToPixel(r, c, gridOffset);
        if (Math.hypot(x - pos.x, y - pos.y) < BUBBLE_R * 2 - 2) {
          collided = true;
          break outer;
        }
      }
    }
  }

  // 충돌 없음 → 계속 비행
  if (!collided) return { fly: { x, y, dx, dy, color }, drops };

  // ===== 충돌 처리: 격자에 버블 고정 =====
  const snapCell = snapToGrid(x, y, gridOffset, grid);
  if (!snapCell) return { fly: null, drops }; // 스냅 실패 시 그냥 제거

  // 새 격자에 버블 배치
  const newGrid: Grid = grid.map(row => [...row]);
  newGrid[snapCell.row][snapCell.col] = color;

  // ===== 색상 매칭 BFS: 3개 이상 연결이면 제거 =====
  const matched = findConnected(newGrid, snapCell.row, snapCell.col);
  let finalGrid = newGrid;
  let newScore = score;
  let newDrops = drops;

  if (matched.length >= MIN_MATCH) {
    // 매칭된 버블 격자에서 제거
    finalGrid = newGrid.map(row => [...row]);
    for (const { row: r, col: c } of matched) {
      finalGrid[r][c] = null;
    }
    newScore += matched.length * SCORE_PER_BUBBLE;

    // ===== 공중 부양 버블 낙하 처리 =====
    const floating = findFloating(finalGrid);
    const extraDrops: DropBubble[] = [];
    for (const { row: r, col: c } of floating) {
      const pos = cellToPixel(r, c, gridOffset);
      extraDrops.push({
        x: pos.x,
        y: pos.y,
        vy: -2 + Math.random() * -1, // 살짝 튀어오르다 낙하
        color: finalGrid[r][c] as Color,
      });
      finalGrid[r][c] = null;
    }
    newScore += floating.length * SCORE_PER_DROP;
    newDrops = [...drops, ...extraDrops];
  }

  // ===== 압박 메커니즘: N발마다 격자를 한 줄씩 아래로 내림 =====
  let newOffset = gridOffset;
  let newLastPressure = lastPressure;
  if (shots - lastPressure >= PRESSURE_SHOTS) {
    newOffset += PRESSURE_STEP;
    newLastPressure = shots;
  }

  // ===== 게임 종료 조건 확인 =====
  let newStatus: GameState['status'] = status;
  if (!hasBubbles(finalGrid)) {
    newStatus = 'clear';
  } else if (isDeadlineReached(finalGrid, newOffset)) {
    newStatus = 'gameover';
  }

  return {
    grid: finalGrid,
    fly: null,
    drops: newDrops,
    score: newScore,
    status: newStatus,
    gridOffset: newOffset,
    lastPressure: newLastPressure,
  };
}

// ===== 드로잉 함수 (모두 순수 함수) =====

// 둥근 사각형 경로 (ctx.roundRect 호환성 대신 사용)
function roundRectPath(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number, r: number
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

// 버블 1개 그리기 (글로우 + 하이라이트 효과)
function drawBubble(
  ctx: CanvasRenderingContext2D,
  x: number, y: number,
  color: string,
  radius: number
) {
  // 외부 글로우
  ctx.shadowColor = color;
  ctx.shadowBlur = 12;

  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();
  ctx.shadowBlur = 0;

  // 상단 하이라이트 그라디언트 (입체감)
  const hl = ctx.createRadialGradient(
    x - radius * 0.28, y - radius * 0.28, radius * 0.04,
    x, y, radius
  );
  hl.addColorStop(0, 'rgba(255,255,255,0.5)');
  hl.addColorStop(0.5, 'rgba(255,255,255,0.08)');
  hl.addColorStop(1, 'rgba(0,0,0,0.15)');
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fillStyle = hl;
  ctx.fill();

  // 테두리
  ctx.beginPath();
  ctx.arc(x, y, radius - 0.5, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(255,255,255,0.22)';
  ctx.lineWidth = 1;
  ctx.stroke();
}

// 조준선 그리기 (벽 반사 경로 포함)
function drawAimLine(
  ctx: CanvasRenderingContext2D,
  angle: number,
  gridOffset: number
) {
  ctx.strokeStyle = 'rgba(255,255,255,0.22)';
  ctx.lineWidth = 1.5;
  ctx.setLineDash([5, 8]);
  ctx.beginPath();
  ctx.moveTo(SHOOTER_X, SHOOTER_Y);

  let cx = SHOOTER_X;
  let cy = SHOOTER_Y;
  let cdx = Math.sin(angle);
  const cdy = -Math.cos(angle);

  // 최대 3번 반사까지 조준선 표시
  for (let bounce = 0; bounce < 3; bounce++) {
    let minT = 10000;
    let hitSide = 'ceil';

    // 천장까지 거리
    const tCeil = (gridOffset + BUBBLE_R - cy) / cdy;
    if (cdy < 0 && tCeil > 0 && tCeil < minT) { minT = tCeil; hitSide = 'ceil'; }

    // 왼쪽 벽
    if (cdx !== 0) {
      const tLeft = (BUBBLE_R - cx) / cdx;
      if (cdx < 0 && tLeft > 0 && tLeft < minT) { minT = tLeft; hitSide = 'left'; }
      // 오른쪽 벽
      const tRight = (CANVAS_W - BUBBLE_R - cx) / cdx;
      if (cdx > 0 && tRight > 0 && tRight < minT) { minT = tRight; hitSide = 'right'; }
    }

    if (minT >= 5000) break;

    const nx = cx + cdx * minT;
    const ny = cy + cdy * minT;
    ctx.lineTo(nx, ny);

    if (hitSide === 'ceil') break;

    cx = nx;
    cy = ny;
    cdx = -cdx; // 벽 반사
  }

  ctx.stroke();
  ctx.setLineDash([]);
}

// 발사대 그리기 (포탑 + 현재 버블 + 다음 버블 미리보기)
function drawShooter(
  ctx: CanvasRenderingContext2D,
  angle: number,
  current: Color,
  next: Color
) {
  // 발사대 배경 플랫폼
  ctx.fillStyle = 'rgba(30,41,59,0.85)';
  roundRectPath(ctx, SHOOTER_X - 75, SHOOTER_Y - 18, 150, 55, 10);
  ctx.fill();
  ctx.strokeStyle = 'rgba(100,116,139,0.35)';
  ctx.lineWidth = 1;
  ctx.stroke();

  // 포탑 (각도 방향으로 회전)
  ctx.save();
  ctx.translate(SHOOTER_X, SHOOTER_Y);
  ctx.rotate(angle);
  ctx.fillStyle = '#475569';
  roundRectPath(ctx, -6, -36, 12, 36, 3);
  ctx.fill();
  ctx.strokeStyle = '#64748B';
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.restore();

  // 현재 발사 버블 (발사대 중심)
  drawBubble(ctx, SHOOTER_X, SHOOTER_Y, current, BUBBLE_R);

  // 다음 대기 버블 (작게, 왼쪽 하단)
  ctx.save();
  ctx.globalAlpha = 0.85;
  drawBubble(ctx, SHOOTER_X - 55, SHOOTER_Y + 8, next, BUBBLE_R * 0.62);
  ctx.restore();

  // NEXT 라벨
  ctx.fillStyle = 'rgba(148,163,184,0.75)';
  ctx.font = 'bold 8px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('NEXT', SHOOTER_X - 55, SHOOTER_Y + 28);
}

// 전체 프레임 그리기
function drawFrame(ctx: CanvasRenderingContext2D, gs: GameState) {
  const { grid, fly, drops, current, next, angle, gridOffset, score } = gs;

  // 배경
  ctx.fillStyle = '#0F172A';
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

  // 점수 표시 (상단)
  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  ctx.font = 'bold 13px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(`SCORE  ${score.toLocaleString()}`, CANVAS_W / 2, 22);

  // 데드라인 (위험 구역 표시)
  ctx.strokeStyle = 'rgba(239,68,68,0.5)';
  ctx.lineWidth = 2;
  ctx.setLineDash([8, 6]);
  ctx.beginPath();
  ctx.moveTo(0, DEADLINE_Y);
  ctx.lineTo(CANVAS_W, DEADLINE_Y);
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.fillStyle = 'rgba(239,68,68,0.4)';
  ctx.font = '9px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('DANGER ZONE', 6, DEADLINE_Y - 5);

  // 격자 버블 그리기
  for (let r = 0; r < grid.length; r++) {
    for (let c = 0; c < colCount(r); c++) {
      const color = grid[r]?.[c];
      if (!color) continue;
      const pos = cellToPixel(r, c, gridOffset);
      if (pos.y - BUBBLE_R > CANVAS_H) continue;
      drawBubble(ctx, pos.x, pos.y, color, BUBBLE_R);
    }
  }

  // 낙하 버블 그리기
  for (const d of drops) {
    drawBubble(ctx, d.x, d.y, d.color, BUBBLE_R * 0.88);
  }

  // 비행 중인 버블 그리기
  if (fly) {
    drawBubble(ctx, fly.x, fly.y, fly.color, BUBBLE_R);
  }

  // 조준선 (버블 비행 중이 아닐 때만 표시)
  if (!fly && gs.status === 'playing') {
    drawAimLine(ctx, angle, gridOffset);
  }

  // 발사대 그리기
  drawShooter(ctx, angle, current, next);
}

// ── Leaderboard Types ─────────────────────────────────────────────────────

interface LeaderboardEntry {
  nickname: string;
  score: number;
}

// ===== React 컴포넌트 =====
export default function PuzzleBobbleGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // 전체 게임 상태를 단일 ref로 관리 (re-render 없이 직접 변경)
  const gsRef = useRef<GameState>({
    grid: createGrid(),
    fly: null,
    drops: [],
    current: randColor(),
    next: randColor(),
    score: 0,
    shots: 0,
    angle: 0,
    status: 'playing',
    gridOffset: 0,
    lastPressure: 0,
  });

  const rafRef = useRef<number>(0);

  // UI 레이어용 React 상태 (게임오버/클리어 오버레이)
  const [uiScore, setUiScore] = useState(0);
  const [uiStatus, setUiStatus] = useState<GameState['status']>('playing');

  // ── Leaderboard state ─────────────────────────────────────────────────
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loadingLB, setLoadingLB] = useState(false);
  const savedRef = useRef(false);

  const fetchLeaderboard = useCallback(async () => {
    setLoadingLB(true);
    try {
      const res = await fetch('/api/game-scores?gameId=puzzle-bobble');
      if (res.status === 401) return;
      if (!res.ok) return;
      const data = (await res.json()) as { scores: Array<{ nickname: string; score: number }> };
      setLeaderboard(data.scores.slice(0, 5).map(s => ({ nickname: s.nickname, score: s.score })));
    } catch (err) {
      console.error('fetchLeaderboard error:', err);
    } finally {
      setLoadingLB(false);
    }
  }, []);

  // 게임 재시작
  const restart = useCallback(() => {
    savedRef.current = false;
    gsRef.current = {
      grid: createGrid(),
      fly: null,
      drops: [],
      current: randColor(),
      next: randColor(),
      score: 0,
      shots: 0,
      angle: 0,
      status: 'playing',
      gridOffset: 0,
      lastPressure: 0,
    };
    setUiScore(0);
    setUiStatus('playing');
  }, []);

  // 마우스 이동 → 발사대 각도 계산 (±80도 제한)
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    // CSS 크기와 실제 캔버스 크기 비율 보정
    const scaleX = CANVAS_W / rect.width;
    const scaleY = CANVAS_H / rect.height;
    const mx = (e.clientX - rect.left) * scaleX;
    const my = (e.clientY - rect.top) * scaleY;

    const dx = mx - SHOOTER_X;
    const dy = SHOOTER_Y - my; // 캔버스 Y축 반전
    let angle = Math.atan2(dx, dy);
    angle = Math.max(-MAX_ANGLE, Math.min(MAX_ANGLE, angle));

    gsRef.current = { ...gsRef.current, angle };
  }, []);

  // 터치 이동 지원 (모바일)
  const handleTouchMove = useCallback((e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const touch = e.touches[0];
    const rect = canvas.getBoundingClientRect();
    const scaleX = CANVAS_W / rect.width;
    const scaleY = CANVAS_H / rect.height;
    const mx = (touch.clientX - rect.left) * scaleX;
    const my = (touch.clientY - rect.top) * scaleY;

    const dx = mx - SHOOTER_X;
    const dy = SHOOTER_Y - my;
    let angle = Math.atan2(dx, dy);
    angle = Math.max(-MAX_ANGLE, Math.min(MAX_ANGLE, angle));

    gsRef.current = { ...gsRef.current, angle };
  }, []);

  // 클릭/탭 → 버블 발사
  const handleFire = useCallback(() => {
    const gs = gsRef.current;
    if (gs.fly || gs.status !== 'playing') return;

    const fly: FlyBubble = {
      x: SHOOTER_X,
      y: SHOOTER_Y - BUBBLE_R - 4,
      dx: Math.sin(gs.angle) * SPEED,
      dy: -Math.cos(gs.angle) * SPEED,
      color: gs.current,
    };

    gsRef.current = {
      ...gs,
      fly,
      current: gs.next,
      next: randColor(),
      shots: gs.shots + 1,
    };
  }, []);

  // 게임 종료 시 스코어 저장 + 리더보드 조회
  useEffect(() => {
    if (uiStatus === 'playing') return;
    if (savedRef.current) return;
    savedRef.current = true;

    fetch('/api/game-scores', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ gameId: 'puzzle-bobble', score: uiScore }),
    })
      .then(res => {
        if (res.status === 401) return;
        if (!res.ok) throw new Error('save failed');
        return fetchLeaderboard();
      })
      .catch(err => console.error('saveScore error:', err));
  }, [uiStatus, uiScore, fetchLeaderboard]);

  // 게임 루프 (requestAnimationFrame)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let prevScore = -1;
    let prevStatus: GameState['status'] = 'playing';

    const loop = () => {
      // 한 프레임 업데이트
      const updates = tickGame(gsRef.current);
      if (Object.keys(updates).length > 0) {
        gsRef.current = { ...gsRef.current, ...updates };
      }

      // 캔버스 렌더링
      drawFrame(ctx, gsRef.current);

      // 점수/상태 변경 시에만 React 상태 업데이트
      const { score, status } = gsRef.current;
      if (score !== prevScore) { setUiScore(score); prevScore = score; }
      if (status !== prevStatus) { setUiStatus(status); prevStatus = status; }

      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  return (
    <div className="relative flex items-center justify-center select-none" style={{ touchAction: 'none' }}>
      <canvas
        ref={canvasRef}
        width={CANVAS_W}
        height={CANVAS_H}
        className="rounded-2xl cursor-crosshair"
        style={{ maxHeight: '80vh', width: 'auto', display: 'block' }}
        onMouseMove={handleMouseMove}
        onClick={handleFire}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleFire}
      />

      {/* 게임오버 / 스테이지 클리어 오버레이 */}
      {uiStatus !== 'playing' && (
        <div
          className="absolute inset-0 flex flex-col items-center justify-center gap-4 rounded-2xl"
          style={{ background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(4px)' }}
        >
          {uiStatus === 'clear' ? (
            <>
              <div style={{ fontSize: '3rem' }}>🎉</div>
              <p style={{ color: 'white', fontSize: '1.5rem', fontWeight: 900, margin: 0 }}>
                Stage Clear!
              </p>
              <p style={{ color: '#EAB308', fontWeight: 700, margin: 0 }}>
                Score: {uiScore.toLocaleString()}
              </p>
            </>
          ) : (
            <>
              <div style={{ fontSize: '3rem' }}>💥</div>
              <p style={{ color: 'white', fontSize: '1.5rem', fontWeight: 900, margin: 0 }}>
                Game Over
              </p>
              <p style={{ color: '#94A3B8', margin: 0 }}>
                Score: {uiScore.toLocaleString()}
              </p>
            </>
          )}
          {/* Scoreboard */}
          <div
            style={{
              width: '100%',
              maxWidth: 200,
              background: 'rgba(6,182,212,0.08)',
              border: '1px solid rgba(6,182,212,0.25)',
              borderRadius: 12,
              padding: '10px 14px',
              display: 'flex',
              flexDirection: 'column',
              gap: 4,
            }}
          >
            <p style={{ color: '#06B6D4', fontWeight: 700, fontSize: '0.75rem', textAlign: 'center', margin: 0 }}>
              🏆 BEST SCORES
            </p>
            {loadingLB ? (
              <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.7rem', textAlign: 'center', margin: 0 }}>...</p>
            ) : leaderboard.length === 0 ? (
              <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.7rem', textAlign: 'center', margin: 0 }}>기록 없음</p>
            ) : (
              leaderboard.map((entry, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ color: '#06B6D4', fontWeight: 700, fontSize: '0.7rem', minWidth: 14 }}>{i + 1}.</span>
                  <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.7rem', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 80 }}>
                    {entry.nickname.slice(0, 6)}
                  </span>
                  <span style={{ color: 'white', fontWeight: 700, fontSize: '0.7rem', fontVariantNumeric: 'tabular-nums' }}>
                    {entry.score.toLocaleString()}
                  </span>
                </div>
              ))
            )}
          </div>

          <button
            onClick={restart}
            style={{
              marginTop: 8,
              padding: '8px 28px',
              borderRadius: 9999,
              border: 'none',
              background: 'linear-gradient(135deg, #A855F7, #7C3AED)',
              color: 'white',
              fontWeight: 700,
              fontSize: '0.9rem',
              cursor: 'pointer',
            }}
          >
            Restart ↺
          </button>
        </div>
      )}
    </div>
  );
}
