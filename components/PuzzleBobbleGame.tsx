'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

// ===== 게임 상수 =====
const BUBBLE_R = 20;
const COLS_EVEN = 8;
const COLS_ODD = 7;
const ROW_H = Math.round(BUBBLE_R * Math.sqrt(3));
const CANVAS_W = COLS_EVEN * BUBBLE_R * 2;
const CANVAS_H = 580;
const SHOOTER_X = CANVAS_W / 2;
const SHOOTER_Y = CANVAS_H - 60;
const DEADLINE_Y = CANVAS_H - 110;
const MAX_ANGLE = (80 * Math.PI) / 180;
const SPEED = 10;
const INITIAL_ROWS = 5;
const PRESSURE_SHOTS = 8;
const PRESSURE_STEP = ROW_H;
const MIN_MATCH = 3;
const GRID_ROWS = 20;
const SCORE_PER_BUBBLE = 100;
const SCORE_PER_DROP = 150;
const ROTATE_STEP = 0.045; // 버튼 1회 틱당 회전 라디안

const PALETTE = ['#EF4444', '#3B82F6', '#22C55E', '#EAB308'] as const;
type Color = (typeof PALETTE)[number];
type Cell = Color | null;
type Grid = Cell[][];

interface FlyBubble { x: number; y: number; dx: number; dy: number; color: Color; }
interface DropBubble { x: number; y: number; vy: number; color: Color; }
interface GameState {
  grid: Grid; fly: FlyBubble | null; drops: DropBubble[];
  current: Color; next: Color; score: number; shots: number; angle: number;
  status: 'playing' | 'gameover' | 'clear'; gridOffset: number; lastPressure: number;
}
interface LeaderboardEntry { nickname: string; score: number; }

// ===== 순수 유틸 함수 =====
function randColor(): Color { return PALETTE[Math.floor(Math.random() * PALETTE.length)]; }
function colCount(row: number): number { return row % 2 === 1 ? COLS_ODD : COLS_EVEN; }
function cellToPixel(row: number, col: number, gridOffset: number) {
  const isOdd = row % 2 === 1;
  return { x: col * BUBBLE_R * 2 + (isOdd ? BUBBLE_R : 0) + BUBBLE_R, y: row * ROW_H + BUBBLE_R + gridOffset };
}
function createGrid(): Grid {
  return Array.from({ length: GRID_ROWS }, (_, r) =>
    Array.from({ length: colCount(r) }, () => r < INITIAL_ROWS ? randColor() : null)
  );
}
function getNeighbors(row: number, col: number) {
  const isOdd = row % 2 === 1;
  return [
    { row, col: col - 1 }, { row, col: col + 1 },
    { row: row - 1, col: isOdd ? col : col - 1 }, { row: row - 1, col: isOdd ? col + 1 : col },
    { row: row + 1, col: isOdd ? col : col - 1 }, { row: row + 1, col: isOdd ? col + 1 : col },
  ].filter(({ row: r, col: c }) => r >= 0 && r < GRID_ROWS && c >= 0 && c < colCount(r));
}
function findConnected(grid: Grid, startRow: number, startCol: number) {
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
      if (!visited.has(`${nb.row},${nb.col}`) && grid[nb.row]?.[nb.col] === targetColor) queue.push(nb);
    }
  }
  return result;
}
function findFloating(grid: Grid) {
  const connected = new Set<string>();
  const queue: Array<{ row: number; col: number }> = [];
  for (let c = 0; c < colCount(0); c++) { if (grid[0]?.[c]) queue.push({ row: 0, col: c }); }
  while (queue.length > 0) {
    const cell = queue.shift()!;
    const key = `${cell.row},${cell.col}`;
    if (connected.has(key) || !grid[cell.row]?.[cell.col]) continue;
    connected.add(key);
    for (const nb of getNeighbors(cell.row, cell.col)) {
      if (!connected.has(`${nb.row},${nb.col}`) && grid[nb.row]?.[nb.col]) queue.push(nb);
    }
  }
  const floating: Array<{ row: number; col: number }> = [];
  for (let r = 0; r < grid.length; r++)
    for (let c = 0; c < colCount(r); c++)
      if (grid[r]?.[c] && !connected.has(`${r},${c}`)) floating.push({ row: r, col: c });
  return floating;
}
function hasBubbles(grid: Grid): boolean { return grid.some(row => row.some(cell => cell !== null)); }
function isDeadlineReached(grid: Grid, gridOffset: number): boolean {
  for (let r = 0; r < grid.length; r++)
    for (let c = 0; c < colCount(r); c++)
      if (grid[r]?.[c] && cellToPixel(r, c, gridOffset).y + BUBBLE_R > DEADLINE_Y) return true;
  return false;
}
function snapToGrid(px: number, py: number, gridOffset: number, grid: Grid) {
  let bestDist = Infinity, best: { row: number; col: number } | null = null;
  for (let r = 0; r < GRID_ROWS; r++)
    for (let c = 0; c < colCount(r); c++) {
      if (grid[r]?.[c] !== null) continue;
      const pos = cellToPixel(r, c, gridOffset);
      const dist = Math.hypot(px - pos.x, py - pos.y);
      if (dist < bestDist) { bestDist = dist; best = { row: r, col: c }; }
    }
  return best;
}

function tickGame(state: GameState): Partial<GameState> {
  if (state.status !== 'playing') return {};
  const { grid, fly, score, shots, status, gridOffset, lastPressure } = state;
  let { drops } = state;
  drops = drops.map(d => ({ ...d, y: d.y + d.vy, vy: d.vy + 0.6 })).filter(d => d.y < CANVAS_H + 80);
  if (!fly) return { drops };

  let { x, y, dx } = fly;
  const { dy, color } = fly;
  x += dx; y += dy;
  if (x - BUBBLE_R <= 0) { x = BUBBLE_R; dx = Math.abs(dx); }
  if (x + BUBBLE_R >= CANVAS_W) { x = CANVAS_W - BUBBLE_R; dx = -Math.abs(dx); }

  let collided = y - BUBBLE_R <= gridOffset;
  if (!collided) {
    outer: for (let r = 0; r < grid.length; r++)
      for (let c = 0; c < colCount(r); c++) {
        if (!grid[r]?.[c]) continue;
        const pos = cellToPixel(r, c, gridOffset);
        if (Math.hypot(x - pos.x, y - pos.y) < BUBBLE_R * 2 - 2) { collided = true; break outer; }
      }
  }
  if (!collided) return { fly: { x, y, dx, dy, color }, drops };

  const snapCell = snapToGrid(x, y, gridOffset, grid);
  if (!snapCell) return { fly: null, drops };

  const newGrid: Grid = grid.map(row => [...row]);
  newGrid[snapCell.row][snapCell.col] = color;

  const matched = findConnected(newGrid, snapCell.row, snapCell.col);
  let finalGrid = newGrid, newScore = score, newDrops = drops;

  if (matched.length >= MIN_MATCH) {
    finalGrid = newGrid.map(row => [...row]);
    for (const { row: r, col: c } of matched) finalGrid[r][c] = null;
    newScore += matched.length * SCORE_PER_BUBBLE;
    const floating = findFloating(finalGrid);
    const extraDrops: DropBubble[] = [];
    for (const { row: r, col: c } of floating) {
      const pos = cellToPixel(r, c, gridOffset);
      extraDrops.push({ x: pos.x, y: pos.y, vy: -2 + Math.random() * -1, color: finalGrid[r][c] as Color });
      finalGrid[r][c] = null;
    }
    newScore += floating.length * SCORE_PER_DROP;
    newDrops = [...drops, ...extraDrops];
  }

  let newOffset = gridOffset, newLastPressure = lastPressure;
  if (shots - lastPressure >= PRESSURE_SHOTS) { newOffset += PRESSURE_STEP; newLastPressure = shots; }

  let newStatus: GameState['status'] = status;
  if (!hasBubbles(finalGrid)) newStatus = 'clear';
  else if (isDeadlineReached(finalGrid, newOffset)) newStatus = 'gameover';

  return { grid: finalGrid, fly: null, drops: newDrops, score: newScore, status: newStatus, gridOffset: newOffset, lastPressure: newLastPressure };
}

// ===== 드로잉 함수 =====

function roundRectPath(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y); ctx.closePath();
}

// enableEffects=false: 삼성/모바일 브라우저 성능을 위해 shadowBlur·gradient 생략
function drawBubble(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, color: string, radius: number,
  enableEffects = true
) {
  if (enableEffects) {
    ctx.shadowColor = color;
    ctx.shadowBlur = 10;
  }
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();
  ctx.shadowBlur = 0; // 항상 리셋

  if (enableEffects) {
    const hl = ctx.createRadialGradient(x - radius * 0.28, y - radius * 0.28, radius * 0.04, x, y, radius);
    hl.addColorStop(0, 'rgba(255,255,255,0.5)');
    hl.addColorStop(0.5, 'rgba(255,255,255,0.08)');
    hl.addColorStop(1, 'rgba(0,0,0,0.15)');
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fillStyle = hl;
    ctx.fill();
  } else {
    // 저비용 하이라이트: 단순 반원
    ctx.beginPath();
    ctx.arc(x - radius * 0.28, y - radius * 0.28, radius * 0.32, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,0.28)';
    ctx.fill();
  }

  ctx.beginPath();
  ctx.arc(x, y, radius - 0.5, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(255,255,255,0.22)';
  ctx.lineWidth = 1;
  ctx.stroke();
}

function drawAimLine(ctx: CanvasRenderingContext2D, angle: number, gridOffset: number) {
  ctx.strokeStyle = 'rgba(255,255,255,0.22)';
  ctx.lineWidth = 1.5;
  ctx.setLineDash([5, 8]);
  ctx.beginPath();
  ctx.moveTo(SHOOTER_X, SHOOTER_Y);
  let cx = SHOOTER_X, cy = SHOOTER_Y, cdx = Math.sin(angle);
  const cdy = -Math.cos(angle);
  for (let bounce = 0; bounce < 3; bounce++) {
    let minT = 10000, hitSide = 'ceil';
    const tCeil = (gridOffset + BUBBLE_R - cy) / cdy;
    if (cdy < 0 && tCeil > 0 && tCeil < minT) { minT = tCeil; hitSide = 'ceil'; }
    if (cdx !== 0) {
      const tLeft = (BUBBLE_R - cx) / cdx;
      if (cdx < 0 && tLeft > 0 && tLeft < minT) { minT = tLeft; hitSide = 'left'; }
      const tRight = (CANVAS_W - BUBBLE_R - cx) / cdx;
      if (cdx > 0 && tRight > 0 && tRight < minT) { minT = tRight; hitSide = 'right'; }
    }
    if (minT >= 5000) break;
    ctx.lineTo(cx + cdx * minT, cy + cdy * minT);
    if (hitSide === 'ceil') break;
    cx += cdx * minT; cy += cdy * minT; cdx = -cdx;
  }
  ctx.stroke();
  ctx.setLineDash([]);
}

function drawShooter(
  ctx: CanvasRenderingContext2D, angle: number, current: Color, next: Color, enableEffects: boolean
) {
  ctx.fillStyle = 'rgba(30,41,59,0.85)';
  roundRectPath(ctx, SHOOTER_X - 75, SHOOTER_Y - 18, 150, 55, 10);
  ctx.fill();
  ctx.strokeStyle = 'rgba(100,116,139,0.35)';
  ctx.lineWidth = 1;
  ctx.stroke();

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

  drawBubble(ctx, SHOOTER_X, SHOOTER_Y, current, BUBBLE_R, enableEffects);

  ctx.save();
  ctx.globalAlpha = 0.85;
  drawBubble(ctx, SHOOTER_X - 55, SHOOTER_Y + 8, next, BUBBLE_R * 0.62, enableEffects);
  ctx.restore();

  ctx.fillStyle = 'rgba(148,163,184,0.75)';
  ctx.font = 'bold 8px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('NEXT', SHOOTER_X - 55, SHOOTER_Y + 28);
}

function drawFrame(ctx: CanvasRenderingContext2D, gs: GameState, enableEffects: boolean) {
  const { grid, fly, drops, current, next, angle, gridOffset, score } = gs;

  ctx.fillStyle = '#0F172A';
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  ctx.font = 'bold 13px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(`SCORE  ${score.toLocaleString()}`, CANVAS_W / 2, 22);

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

  for (let r = 0; r < grid.length; r++)
    for (let c = 0; c < colCount(r); c++) {
      const color = grid[r]?.[c];
      if (!color) continue;
      const pos = cellToPixel(r, c, gridOffset);
      if (pos.y - BUBBLE_R > CANVAS_H) continue;
      drawBubble(ctx, pos.x, pos.y, color, BUBBLE_R, enableEffects);
    }

  for (const d of drops) drawBubble(ctx, d.x, d.y, d.color, BUBBLE_R * 0.88, enableEffects);
  if (fly) drawBubble(ctx, fly.x, fly.y, fly.color, BUBBLE_R, enableEffects);
  if (!fly && gs.status === 'playing') drawAimLine(ctx, angle, gridOffset);

  drawShooter(ctx, angle, current, next, enableEffects);
}

// ===== React 컴포넌트 =====
export default function PuzzleBobbleGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gsRef = useRef<GameState>({
    grid: createGrid(), fly: null, drops: [], current: randColor(), next: randColor(),
    score: 0, shots: 0, angle: 0, status: 'playing', gridOffset: 0, lastPressure: 0,
  });
  const rafRef = useRef<number>(0);
  // 모바일 감지 후 저성능 렌더 모드 활성화
  const enableEffectsRef = useRef(true);
  // 버튼 연속 회전용 인터벌 ref
  const rotateTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [uiScore, setUiScore] = useState(0);
  const [uiStatus, setUiStatus] = useState<GameState['status']>('playing');
  const [showButtons, setShowButtons] = useState(false);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loadingLB, setLoadingLB] = useState(false);
  const savedRef = useRef(false);

  const fetchLeaderboard = useCallback(async () => {
    setLoadingLB(true);
    try {
      const res = await fetch('/api/game-scores?gameId=puzzle-bobble');
      if (res.status === 401 || !res.ok) return;
      const data = (await res.json()) as { scores: Array<{ nickname: string; score: number }> };
      setLeaderboard(data.scores.slice(0, 5).map(s => ({ nickname: s.nickname, score: s.score })));
    } catch (err) {
      console.error('fetchLeaderboard error:', err);
    } finally {
      setLoadingLB(false);
    }
  }, []);

  const restart = useCallback(() => {
    savedRef.current = false;
    gsRef.current = {
      grid: createGrid(), fly: null, drops: [], current: randColor(), next: randColor(),
      score: 0, shots: 0, angle: 0, status: 'playing', gridOffset: 0, lastPressure: 0,
    };
    setUiScore(0);
    setUiStatus('playing');
  }, []);

  // 버블 발사 (캔버스 클릭·탭 및 FIRE 버튼 공용)
  const handleFire = useCallback(() => {
    const gs = gsRef.current;
    if (gs.fly || gs.status !== 'playing') return;
    gsRef.current = {
      ...gs,
      fly: { x: SHOOTER_X, y: SHOOTER_Y - BUBBLE_R - 4, dx: Math.sin(gs.angle) * SPEED, dy: -Math.cos(gs.angle) * SPEED, color: gs.current },
      current: gs.next, next: randColor(), shots: gs.shots + 1,
    };
  }, []);

  // 마우스 조준 (데스크톱)
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mx = (e.clientX - rect.left) * (CANVAS_W / rect.width);
    const my = (e.clientY - rect.top) * (CANVAS_H / rect.height);
    let angle = Math.atan2(mx - SHOOTER_X, SHOOTER_Y - my);
    angle = Math.max(-MAX_ANGLE, Math.min(MAX_ANGLE, angle));
    gsRef.current.angle = angle; // 스프레드 없이 직접 변경
  }, []);

  // 방향 버튼: 눌리는 동안 연속 회전
  const startRotate = useCallback((dir: 1 | -1) => {
    if (rotateTimerRef.current) clearInterval(rotateTimerRef.current);
    rotateTimerRef.current = setInterval(() => {
      const next = Math.max(-MAX_ANGLE, Math.min(MAX_ANGLE, gsRef.current.angle + dir * ROTATE_STEP));
      gsRef.current.angle = next;
    }, 30);
  }, []);
  const stopRotate = useCallback(() => {
    if (rotateTimerRef.current) { clearInterval(rotateTimerRef.current); rotateTimerRef.current = null; }
  }, []);

  // 게임 종료 → 스코어 저장 + 리더보드
  useEffect(() => {
    if (uiStatus === 'playing' || savedRef.current) return;
    savedRef.current = true;
    fetch('/api/game-scores', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ gameId: 'puzzle-bobble', score: uiScore }),
    }).then(res => { if (res.status === 401 || !res.ok) throw new Error(); return fetchLeaderboard(); })
      .catch(err => console.error('saveScore error:', err));
  }, [uiStatus, uiScore, fetchLeaderboard]);

  // 모바일 감지 + 네이티브 터치 이벤트 등록
  // Samsung 브라우저는 React 합성 이벤트의 preventDefault를 passive listener로 무시함
  // → canvas에 직접 { passive: false } 리스너를 붙여 스크롤 간섭 차단
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const mobile = /Android|iPhone|iPad|Mobile|SamsungBrowser/i.test(navigator.userAgent);
    enableEffectsRef.current = !mobile;
    setShowButtons(mobile);

    const calcAngle = (clientX: number, clientY: number) => {
      const rect = canvas.getBoundingClientRect();
      const mx = (clientX - rect.left) * (CANVAS_W / rect.width);
      const my = (clientY - rect.top) * (CANVAS_H / rect.height);
      let angle = Math.atan2(mx - SHOOTER_X, SHOOTER_Y - my);
      angle = Math.max(-MAX_ANGLE, Math.min(MAX_ANGLE, angle));
      gsRef.current.angle = angle;
    };

    const onTouchStart = (e: TouchEvent) => {
      e.preventDefault();
      const t = e.touches[0];
      if (t) calcAngle(t.clientX, t.clientY);
    };
    const onTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      const t = e.touches[0];
      if (t) calcAngle(t.clientX, t.clientY);
    };
    const onTouchEnd = (e: TouchEvent) => {
      e.preventDefault();
      // touchend 좌표는 changedTouches 사용
      const t = e.changedTouches[0];
      if (t) calcAngle(t.clientX, t.clientY);
      handleFire();
    };

    canvas.addEventListener('touchstart', onTouchStart, { passive: false });
    canvas.addEventListener('touchmove', onTouchMove, { passive: false });
    canvas.addEventListener('touchend', onTouchEnd, { passive: false });
    return () => {
      canvas.removeEventListener('touchstart', onTouchStart);
      canvas.removeEventListener('touchmove', onTouchMove);
      canvas.removeEventListener('touchend', onTouchEnd);
    };
  }, [handleFire]);

  // 게임 루프 (requestAnimationFrame)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let prevScore = -1, prevStatus: GameState['status'] = 'playing';
    const loop = () => {
      const updates = tickGame(gsRef.current);
      if (Object.keys(updates).length > 0) gsRef.current = { ...gsRef.current, ...updates };
      drawFrame(ctx, gsRef.current, enableEffectsRef.current);
      const { score, status } = gsRef.current;
      if (score !== prevScore) { setUiScore(score); prevScore = score; }
      if (status !== prevStatus) { setUiStatus(status); prevStatus = status; }
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  const btnBase: React.CSSProperties = {
    flex: 1, padding: '14px 0', borderRadius: 14, border: 'none',
    fontSize: '1.1rem', fontWeight: 700, cursor: 'pointer',
    WebkitTapHighlightColor: 'transparent', userSelect: 'none',
    touchAction: 'none',
  };

  return (
    <div className="relative flex flex-col items-center select-none" style={{ touchAction: 'none' }}>
      <canvas
        ref={canvasRef}
        width={CANVAS_W}
        height={CANVAS_H}
        className="rounded-2xl cursor-crosshair"
        style={{ maxHeight: '80vh', width: 'auto', display: 'block', touchAction: 'none', willChange: 'transform' }}
        onMouseMove={handleMouseMove}
        onClick={handleFire}
        // 터치 이벤트는 useEffect에서 네이티브로 등록 (passive: false 강제)
      />

      {/* 모바일 전용 컨트롤 버튼 */}
      {showButtons && (
        <div
          style={{ display: 'flex', gap: 10, marginTop: 12, width: '100%', maxWidth: CANVAS_W, touchAction: 'none' }}
        >
          <button
            style={{ ...btnBase, background: 'rgba(71,85,105,0.85)', color: 'white' }}
            onPointerDown={() => startRotate(-1)}
            onPointerUp={stopRotate}
            onPointerLeave={stopRotate}
            onPointerCancel={stopRotate}
          >
            ◀
          </button>
          <button
            style={{ ...btnBase, flex: 2, background: 'linear-gradient(135deg,#A855F7,#7C3AED)', color: 'white', fontSize: '1rem' }}
            onPointerDown={handleFire}
          >
            FIRE
          </button>
          <button
            style={{ ...btnBase, background: 'rgba(71,85,105,0.85)', color: 'white' }}
            onPointerDown={() => startRotate(1)}
            onPointerUp={stopRotate}
            onPointerLeave={stopRotate}
            onPointerCancel={stopRotate}
          >
            ▶
          </button>
        </div>
      )}

      {/* 게임오버 / 스테이지 클리어 오버레이 */}
      {uiStatus !== 'playing' && (
        <div
          className="absolute inset-0 flex flex-col items-center justify-center gap-4 rounded-2xl"
          style={{ background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(4px)' }}
        >
          {uiStatus === 'clear' ? (
            <>
              <div style={{ fontSize: '3rem' }}>🎉</div>
              <p style={{ color: 'white', fontSize: '1.5rem', fontWeight: 900, margin: 0 }}>Stage Clear!</p>
              <p style={{ color: '#EAB308', fontWeight: 700, margin: 0 }}>Score: {uiScore.toLocaleString()}</p>
            </>
          ) : (
            <>
              <div style={{ fontSize: '3rem' }}>💥</div>
              <p style={{ color: 'white', fontSize: '1.5rem', fontWeight: 900, margin: 0 }}>Game Over</p>
              <p style={{ color: '#94A3B8', margin: 0 }}>Score: {uiScore.toLocaleString()}</p>
            </>
          )}
          <div style={{ width: '100%', maxWidth: 200, background: 'rgba(6,182,212,0.08)', border: '1px solid rgba(6,182,212,0.25)', borderRadius: 12, padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: 4 }}>
            <p style={{ color: '#06B6D4', fontWeight: 700, fontSize: '0.75rem', textAlign: 'center', margin: 0 }}>🏆 BEST SCORES</p>
            {loadingLB ? (
              <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.7rem', textAlign: 'center', margin: 0 }}>...</p>
            ) : leaderboard.length === 0 ? (
              <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.7rem', textAlign: 'center', margin: 0 }}>기록 없음</p>
            ) : leaderboard.map((entry, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ color: '#06B6D4', fontWeight: 700, fontSize: '0.7rem', minWidth: 14 }}>{i + 1}.</span>
                <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.7rem', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 80 }}>{entry.nickname.slice(0, 6)}</span>
                <span style={{ color: 'white', fontWeight: 700, fontSize: '0.7rem', fontVariantNumeric: 'tabular-nums' }}>{entry.score.toLocaleString()}</span>
              </div>
            ))}
          </div>
          <button
            onClick={restart}
            style={{ marginTop: 8, padding: '8px 28px', borderRadius: 9999, border: 'none', background: 'linear-gradient(135deg,#A855F7,#7C3AED)', color: 'white', fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer' }}
          >
            Restart ↺
          </button>
        </div>
      )}
    </div>
  );
}
