'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

// ===== 상수 =====
const BUBBLE_R = 20;
const COLS_EVEN = 8;
const COLS_ODD = 7;
const ROW_H = Math.round(BUBBLE_R * Math.sqrt(3));
const CANVAS_W = COLS_EVEN * BUBBLE_R * 2;
const CANVAS_H = 600;
const SHOOTER_X = CANVAS_W / 2;
const SHOOTER_Y = CANVAS_H - 60;
const DEADLINE_Y = CANVAS_H - 110;
const MAX_ANGLE = (80 * Math.PI) / 180;
const SPEED = 10;
const PRESSURE_SHOTS = 8;
const PRESSURE_STEP = ROW_H;
const MIN_MATCH = 3;
const GRID_ROWS = 20;
const SCORE_PER_BUBBLE = 100;
const SCORE_PER_DROP = 150;
const ROTATE_STEP = 0.045;
const MAX_BOUNCES = 5;
const MAX_PARTICLES = 200;

const PALETTE = ['#EF4444', '#3B82F6', '#22C55E', '#EAB308', '#A855F7', '#EC4899'] as const;
type Color = (typeof PALETTE)[number];
type Cell = Color | null;
type Grid = Cell[][];

// ===== 레벨맵 =====
const LEVEL_MAP: (Color | null)[][] = [
  ['#EF4444','#3B82F6','#22C55E','#EAB308','#EF4444','#3B82F6','#22C55E','#EAB308'],
  ['#A855F7','#EC4899','#EF4444','#3B82F6','#22C55E','#EAB308','#A855F7'],
  ['#22C55E','#EAB308','#A855F7','#EC4899','#EF4444','#3B82F6','#22C55E','#EAB308'],
  ['#3B82F6','#EF4444','#22C55E','#A855F7','#EC4899','#EAB308','#3B82F6'],
  ['#EAB308','#22C55E','#3B82F6','#EF4444','#A855F7','#EC4899','#EAB308','#22C55E'],
];

// ===== 타입 인터페이스 =====
interface FlyBubble { x: number; y: number; dx: number; dy: number; color: Color; squashT: number; bounces: number; }
interface DropBubble { x: number; y: number; vy: number; vx: number; color: Color; alpha: number; }
interface Particle { x: number; y: number; vx: number; vy: number; color: string; life: number; maxLife: number; size: number; }
interface FloatingText { x: number; y: number; text: string; alpha: number; vy: number; size: number; color: string; }
interface GameState {
  grid: Grid;
  fly: FlyBubble | null;
  drops: DropBubble[];
  particles: Particle[];
  floatingTexts: FloatingText[];
  current: Color;
  next: Color;
  score: number;
  shots: number;
  angle: number;
  status: 'playing' | 'gameover' | 'clear';
  gridOffset: number;
  lastPressure: number;
  combo: number;
}
interface LeaderboardEntry { nickname: string; score: number; }

// ===== 순수 유틸 =====
function randColor(): Color { return PALETTE[Math.floor(Math.random() * PALETTE.length)]; }
function colCount(row: number): number { return row % 2 === 1 ? COLS_ODD : COLS_EVEN; }

function cellToPixel(row: number, col: number, gridOffset: number) {
  const isOdd = row % 2 === 1;
  return {
    x: col * BUBBLE_R * 2 + (isOdd ? BUBBLE_R : 0) + BUBBLE_R,
    y: row * ROW_H + BUBBLE_R + gridOffset,
  };
}

function createGrid(): Grid {
  return Array.from({ length: GRID_ROWS }, (_, r) => {
    const cnt = colCount(r);
    if (r < LEVEL_MAP.length) {
      const levelRow = LEVEL_MAP[r];
      return Array.from({ length: cnt }, (__, c) =>
        c < levelRow.length ? (levelRow[c] as Color | null) : null
      );
    }
    return Array.from({ length: cnt }, () => null);
  });
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

function snapToGrid(px: number, py: number, gridOffset: number, grid: Grid): { row: number; col: number } | null {
  const approxRow = Math.round((py - gridOffset - BUBBLE_R) / ROW_H);
  let bestDist = Infinity;
  let bestRow = -1;
  let bestCol = -1;

  // 근방 ±2행 먼저 탐색, 못 찾으면 전체 탐색 (소수점 오차 방지)
  const ranges: [number, number][] = [[approxRow - 2, approxRow + 2], [0, GRID_ROWS - 1]];
  for (const [startR, endR] of ranges) {
    for (let r = startR; r <= endR; r++) {
      if (r < 0 || r >= GRID_ROWS) continue;
      for (let c = 0; c < colCount(r); c++) {
        if (grid[r]?.[c] !== null) continue;
        const pos = cellToPixel(r, c, gridOffset);
        const dist = Math.hypot(px - pos.x, py - pos.y);
        if (dist < bestDist) { bestDist = dist; bestRow = r; bestCol = c; }
      }
    }
    if (bestRow !== -1) break; // 근방에서 찾으면 중단
  }

  return bestRow === -1 ? null : { row: bestRow, col: bestCol };
}

function createPopParticles(x: number, y: number, color: string): Particle[] {
  return Array.from({ length: 12 }, () => {
    const angle = Math.random() * Math.PI * 2;
    const speed = 2 + Math.random() * 4;
    const maxLife = 30 + Math.random() * 20;
    return {
      x, y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      color,
      life: 1,
      maxLife,
      size: 2 + Math.random() * 4,
    };
  });
}

function createDropParticles(x: number, y: number, color: string): Particle[] {
  return Array.from({ length: 6 }, () => {
    const angle = Math.random() * Math.PI * 2;
    const speed = 1 + Math.random() * 3;
    const maxLife = 20 + Math.random() * 15;
    return {
      x, y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      color,
      life: 1,
      maxLife,
      size: 1.5 + Math.random() * 3,
    };
  });
}

function getComboText(combo: number): string | null {
  if (combo === 1) return 'GREAT!';
  if (combo === 2) return '2 COMBO!';
  if (combo >= 5) return `${combo} COMBO!! 🔥`;
  if (combo >= 3) return `${combo} COMBO! ⚡`;
  return null;
}

// ===== 게임 틱 =====
function tickGame(state: GameState): Partial<GameState> {
  if (state.status !== 'playing') return {};
  const { grid, fly, score, shots, status, gridOffset, lastPressure, combo } = state;

  // drops 업데이트: .map().filter() 체이닝
  let drops = state.drops
    .map(d => ({ ...d, x: d.x + d.vx, y: d.y + d.vy, vy: d.vy + 0.6, vx: d.vx * 0.95, alpha: d.alpha - 0.015 }))
    .filter(d => d.y < CANVAS_H + 80 && d.alpha > 0);

  // particles 업데이트
  let particles = state.particles
    .map(p => ({
      ...p,
      x: p.x + p.vx,
      y: p.y + p.vy,
      vy: p.vy + 0.1,
      vx: p.vx * 0.95,
      life: p.life - 1 / p.maxLife,
    }))
    .filter(p => p.life > 0 && p.x > -50 && p.x < CANVAS_W + 50 && p.y > -50 && p.y < CANVAS_H + 50);

  // floatingTexts 업데이트
  let floatingTexts = state.floatingTexts
    .map(ft => ({ ...ft, y: ft.y + ft.vy, alpha: ft.alpha - 0.018 }))
    .filter(ft => ft.alpha > 0);

  // MAX_PARTICLES 제한
  if (particles.length > MAX_PARTICLES) particles = particles.slice(particles.length - MAX_PARTICLES);

  if (!fly) return { drops, particles, floatingTexts };

  let { x, y, dx, bounces, squashT } = fly;
  const { dy, color } = fly;
  x += dx; y += dy;

  // squashT 감소
  squashT = Math.max(0, squashT - 0.05);

  // 화면 밖 이탈 즉시 제거
  if (y < -BUBBLE_R * 2 || y > CANVAS_H + BUBBLE_R) {
    return { fly: null, drops, particles, floatingTexts };
  }

  // 벽 충돌 (끼임 방지 offset)
  let newSquashT = squashT;
  if (x - BUBBLE_R <= 0) {
    x = BUBBLE_R + 1;
    dx = Math.abs(dx);
    bounces++;
    newSquashT = 1;
  }
  if (x + BUBBLE_R >= CANVAS_W) {
    x = CANVAS_W - BUBBLE_R - 1;
    dx = -Math.abs(dx);
    bounces++;
    newSquashT = 1;
  }

  // MAX_BOUNCES 초과 시 강제 스냅
  const forceSnap = bounces > MAX_BOUNCES;

  let collided = y - BUBBLE_R <= gridOffset || forceSnap;
  if (!collided) {
    outer: for (let r = 0; r < grid.length; r++)
      for (let c = 0; c < colCount(r); c++) {
        if (!grid[r]?.[c]) continue;
        const pos = cellToPixel(r, c, gridOffset);
        if (Math.hypot(x - pos.x, y - pos.y) < BUBBLE_R * 2 - 2) { collided = true; break outer; }
      }
  }

  if (!collided) {
    return { fly: { x, y, dx, dy, color, squashT: newSquashT, bounces }, drops, particles, floatingTexts };
  }

  const snapCell = snapToGrid(x, y, gridOffset, grid);
  if (!snapCell) return { fly: null, drops, particles, floatingTexts };

  const newGrid: Grid = grid.map(row => [...row]);
  newGrid[snapCell.row][snapCell.col] = color;

  const matched = findConnected(newGrid, snapCell.row, snapCell.col);
  let finalGrid = newGrid;
  let newScore = score;
  let newDrops = drops;
  let newParticles = [...particles];
  let newFloatingTexts = [...floatingTexts];
  let newCombo = combo;

  if (matched.length >= MIN_MATCH) {
    newCombo = combo + 1;
    finalGrid = newGrid.map(row => [...row]);

    for (const { row: r, col: c } of matched) {
      const pos = cellToPixel(r, c, gridOffset);
      newParticles = [...newParticles, ...createPopParticles(pos.x, pos.y, finalGrid[r][c] as string)];
      finalGrid[r][c] = null;
    }
    newScore += matched.length * SCORE_PER_BUBBLE;

    // 콤보 보너스
    newScore += newCombo * 50;

    const floating = findFloating(finalGrid);
    const extraDrops: DropBubble[] = [];
    for (const { row: r, col: c } of floating) {
      const pos = cellToPixel(r, c, gridOffset);
      const dropColor = finalGrid[r][c] as Color;
      extraDrops.push({
        x: pos.x,
        y: pos.y,
        vy: -2 + Math.random() * -1,
        vx: (Math.random() - 0.5) * 3,
        color: dropColor,
        alpha: 1,
      });
      newParticles = [...newParticles, ...createDropParticles(pos.x, pos.y, dropColor)];
      finalGrid[r][c] = null;
    }
    newScore += floating.length * SCORE_PER_DROP;
    newDrops = [...drops, ...extraDrops];

    // 콤보 FloatingText
    const comboText = getComboText(newCombo);
    if (comboText) {
      const snapPos = cellToPixel(snapCell.row, snapCell.col, gridOffset);
      newFloatingTexts = [...newFloatingTexts, {
        x: snapPos.x,
        y: snapPos.y,
        text: comboText,
        alpha: 1,
        vy: -1.2,
        size: 16 + Math.min(newCombo * 2, 10),
        color: newCombo >= 5 ? '#EAB308' : newCombo >= 3 ? '#EC4899' : '#FFFFFF',
      }];
    }
  } else {
    newCombo = 0;
  }

  let newOffset = gridOffset, newLastPressure = lastPressure;
  if (shots - lastPressure >= PRESSURE_SHOTS) { newOffset += PRESSURE_STEP; newLastPressure = shots; }

  let newStatus: GameState['status'] = status;
  if (!hasBubbles(finalGrid)) newStatus = 'clear';
  else if (isDeadlineReached(finalGrid, newOffset)) newStatus = 'gameover';

  return {
    grid: finalGrid, fly: null, drops: newDrops, particles: newParticles,
    floatingTexts: newFloatingTexts, score: newScore, status: newStatus,
    gridOffset: newOffset, lastPressure: newLastPressure, combo: newCombo,
  };
}

// ===== 드로잉 =====
function drawBubble(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, color: string, radius: number,
  enableEffects = true,
  squashX = 1,
  squashY = 1,
) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(squashX, squashY);

  if (enableEffects) {
    ctx.shadowColor = color;
    ctx.shadowBlur = 12;
  }

  // 베이스 원
  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();
  ctx.shadowBlur = 0;

  if (enableEffects) {
    // 유리구슬 3단계 라디알 그라디언트
    const hl = ctx.createRadialGradient(
      -radius * 0.3, -radius * 0.3, radius * 0.05,
      0, 0, radius
    );
    hl.addColorStop(0, 'rgba(255,255,255,0.6)');
    hl.addColorStop(0.5, 'rgba(255,255,255,0.1)');
    hl.addColorStop(1, 'rgba(0,0,0,0.3)');
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.fillStyle = hl;
    ctx.fill();

    // 하단 림 라이팅
    const rim = ctx.createRadialGradient(0, radius * 0.6, radius * 0.1, 0, radius * 0.6, radius * 0.9);
    rim.addColorStop(0, 'rgba(255,255,255,0.18)');
    rim.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.fillStyle = rim;
    ctx.fill();
  } else {
    // 저비용 하이라이트
    ctx.beginPath();
    ctx.arc(-radius * 0.28, -radius * 0.28, radius * 0.32, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,0.28)';
    ctx.fill();
  }

  // 테두리
  ctx.beginPath();
  ctx.arc(0, 0, radius - 0.5, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(255,255,255,0.22)';
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.restore();
}

function drawAimLine(ctx: CanvasRenderingContext2D, angle: number, gridOffset: number) {
  ctx.strokeStyle = 'rgba(255,255,255,0.35)';
  ctx.lineWidth = 1.5;
  ctx.setLineDash([5, 8]);
  ctx.beginPath();
  ctx.moveTo(SHOOTER_X, SHOOTER_Y);

  let cx = SHOOTER_X, cy = SHOOTER_Y, cdx = Math.sin(angle);
  const cdy = -Math.cos(angle);
  let reflections = 0;

  for (let seg = 0; seg < 4; seg++) {
    let minT = 10000;
    let hitSide = 'ceil';

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
    reflections++;
    if (reflections >= 1) break; // 벽 반사 1회까지만
  }
  ctx.stroke();
  ctx.setLineDash([]);

  // 조준 방향 앞 30px에 흰 점
  const dotX = SHOOTER_X + Math.sin(angle) * 30;
  const dotY = SHOOTER_Y - Math.cos(angle) * 30;
  ctx.beginPath();
  ctx.arc(dotX, dotY, 3, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255,255,255,0.8)';
  ctx.fill();
}

function drawShooter(
  ctx: CanvasRenderingContext2D,
  angle: number, current: Color, next: Color,
  enableEffects: boolean
) {
  const panelY = CANVAS_H - 80;
  const panelH = 80;

  // 슈터 패널 배경
  ctx.fillStyle = 'rgba(15,23,42,0.92)';
  ctx.fillRect(0, panelY, CANVAS_W, panelH);

  // 구분선
  ctx.strokeStyle = 'rgba(100,116,139,0.4)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, panelY);
  ctx.lineTo(CANVAS_W, panelY);
  ctx.stroke();

  // 캐넌 배럴 (LinearGradient)
  ctx.save();
  ctx.translate(SHOOTER_X, SHOOTER_Y);
  ctx.rotate(angle);
  const barrelGrad = ctx.createLinearGradient(-6, 0, 6, 0);
  barrelGrad.addColorStop(0, '#1E293B');
  barrelGrad.addColorStop(0.5, '#64748B');
  barrelGrad.addColorStop(1, '#1E293B');
  ctx.fillStyle = barrelGrad;
  ctx.beginPath();
  ctx.roundRect(-6, -40, 12, 40, 3);
  ctx.fill();
  ctx.strokeStyle = '#475569';
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.restore();

  // 현재 버블
  drawBubble(ctx, SHOOTER_X, SHOOTER_Y, current, BUBBLE_R, enableEffects);

  // NEXT 버블 (슈터 좌측, 크기 0.65배)
  const nextX = 35;
  const nextY = CANVAS_H - 45;
  ctx.globalAlpha = 0.9;
  drawBubble(ctx, nextX, nextY, next, BUBBLE_R * 0.65, enableEffects);
  ctx.globalAlpha = 1;

  // "NEXT" 레이블
  ctx.fillStyle = 'rgba(148,163,184,0.85)';
  ctx.font = 'bold 8px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('NEXT', nextX, nextY + BUBBLE_R * 0.65 + 10);

  // "SPACE=SWAP" 힌트 (슈터 우측)
  ctx.fillStyle = 'rgba(100,116,139,0.7)';
  ctx.font = '9px sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText('SPACE=SWAP', CANVAS_W - 8, CANVAS_H - 8);
}

function drawParticles(ctx: CanvasRenderingContext2D, particles: Particle[]) {
  for (const p of particles) {
    ctx.save();
    ctx.globalAlpha = Math.max(0, p.life);
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fillStyle = p.color;
    ctx.fill();
    ctx.restore();
  }
}

function drawFloatingTexts(ctx: CanvasRenderingContext2D, floatingTexts: FloatingText[]) {
  for (const ft of floatingTexts) {
    ctx.save();
    ctx.globalAlpha = Math.max(0, ft.alpha);
    ctx.font = `bold ${ft.size}px sans-serif`;
    ctx.fillStyle = ft.color;
    ctx.strokeStyle = 'rgba(0,0,0,0.6)';
    ctx.lineWidth = 3;
    ctx.textAlign = 'center';
    ctx.strokeText(ft.text, ft.x, ft.y);
    ctx.fillText(ft.text, ft.x, ft.y);
    ctx.restore();
  }
}

function drawFrame(ctx: CanvasRenderingContext2D, gs: GameState, enableEffects: boolean) {
  const { grid, fly, drops, particles, floatingTexts, current, next, angle, gridOffset, score } = gs;

  // 배경 그라디언트
  const bg = ctx.createLinearGradient(0, 0, 0, CANVAS_H);
  bg.addColorStop(0, '#0F172A');
  bg.addColorStop(1, '#1E293B');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

  // 스코어 바 (상단 30px)
  ctx.fillStyle = 'rgba(15,23,42,0.85)';
  ctx.fillRect(0, 0, CANVAS_W, 30);
  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  ctx.font = 'bold 13px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(`SCORE  ${score.toLocaleString()}`, CANVAS_W / 2, 20);

  // DANGER ZONE 빨간 반투명 그라디언트
  const dangerGrad = ctx.createLinearGradient(0, DEADLINE_Y - 20, 0, DEADLINE_Y + 15);
  dangerGrad.addColorStop(0, 'rgba(239,68,68,0)');
  dangerGrad.addColorStop(0.5, 'rgba(239,68,68,0.12)');
  dangerGrad.addColorStop(1, 'rgba(239,68,68,0.25)');
  ctx.fillStyle = dangerGrad;
  ctx.fillRect(0, DEADLINE_Y - 20, CANVAS_W, 35);

  ctx.strokeStyle = 'rgba(239,68,68,0.5)';
  ctx.lineWidth = 2;
  ctx.setLineDash([8, 6]);
  ctx.beginPath();
  ctx.moveTo(0, DEADLINE_Y);
  ctx.lineTo(CANVAS_W, DEADLINE_Y);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = 'rgba(239,68,68,0.6)';
  ctx.font = '9px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('DANGER ZONE', 6, DEADLINE_Y - 5);

  // 그리드 버블
  for (let r = 0; r < grid.length; r++)
    for (let c = 0; c < colCount(r); c++) {
      const color = grid[r]?.[c];
      if (!color) continue;
      const pos = cellToPixel(r, c, gridOffset);
      if (pos.y - BUBBLE_R > CANVAS_H) continue;
      drawBubble(ctx, pos.x, pos.y, color, BUBBLE_R, enableEffects);
    }

  // 파티클 (버블 아래에 그려 자연스럽게)
  drawParticles(ctx, particles);

  // 낙하 버블 (alpha 적용)
  for (const d of drops) {
    ctx.save();
    ctx.globalAlpha = Math.max(0, d.alpha);
    drawBubble(ctx, d.x, d.y, d.color, BUBBLE_R * 0.88, enableEffects);
    ctx.restore();
  }

  // 비행 버블 (squash & stretch)
  if (fly) {
    const squashX = 1 + fly.squashT * 0.25;
    const squashY = 1 - fly.squashT * 0.15;
    drawBubble(ctx, fly.x, fly.y, fly.color, BUBBLE_R, enableEffects, squashX, squashY);
  }

  // 조준선 (비행 중 아닐 때)
  if (!fly && gs.status === 'playing') drawAimLine(ctx, angle, gridOffset);

  // 슈터 패널
  drawShooter(ctx, angle, current, next, enableEffects);

  // FloatingText (최상단)
  drawFloatingTexts(ctx, floatingTexts);
}

// ===== React 컴포넌트 =====
export default function PuzzleBobbleGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gsRef = useRef<GameState>({
    grid: createGrid(), fly: null, drops: [], particles: [], floatingTexts: [],
    current: randColor(), next: randColor(),
    score: 0, shots: 0, angle: 0, status: 'playing', gridOffset: 0, lastPressure: 0, combo: 0,
  });
  const rafRef = useRef<number>(0);
  const enableEffectsRef = useRef(true);
  const rotateTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [uiScore, setUiScore] = useState(0);
  const [uiStatus, setUiStatus] = useState<GameState['status']>('playing');
  const [uiCombo, setUiCombo] = useState(0);
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
      grid: createGrid(), fly: null, drops: [], particles: [], floatingTexts: [],
      current: randColor(), next: randColor(),
      score: 0, shots: 0, angle: 0, status: 'playing', gridOffset: 0, lastPressure: 0, combo: 0,
    };
    setUiScore(0);
    setUiStatus('playing');
    setUiCombo(0);
  }, []);

  // 스왑
  const handleSwap = useCallback(() => {
    const gs = gsRef.current;
    if (gs.fly || gs.status !== 'playing') return;
    gsRef.current = { ...gs, current: gs.next, next: gs.current };
  }, []);

  // 발사
  const handleFire = useCallback(() => {
    const gs = gsRef.current;
    if (gs.fly || gs.status !== 'playing') return;
    gsRef.current = {
      ...gs,
      fly: {
        x: SHOOTER_X,
        y: SHOOTER_Y - BUBBLE_R - 4,
        dx: Math.sin(gs.angle) * SPEED,
        dy: -Math.cos(gs.angle) * SPEED,
        color: gs.current,
        squashT: 0,
        bounces: 0,
      },
      current: gs.next, next: randColor(), shots: gs.shots + 1,
    };
  }, []);

  // 마우스 조준
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mx = (e.clientX - rect.left) * (CANVAS_W / rect.width);
    const my = (e.clientY - rect.top) * (CANVAS_H / rect.height);
    let angle = Math.atan2(mx - SHOOTER_X, SHOOTER_Y - my);
    angle = Math.max(-MAX_ANGLE, Math.min(MAX_ANGLE, angle));
    gsRef.current.angle = angle;
  }, []);

  // 방향 버튼 연속 회전
  const startRotate = useCallback((dir: 1 | -1) => {
    if (rotateTimerRef.current) clearInterval(rotateTimerRef.current);
    rotateTimerRef.current = setInterval(() => {
      const next = Math.max(-MAX_ANGLE, Math.min(MAX_ANGLE, gsRef.current.angle + dir * ROTATE_STEP * 2));
      gsRef.current.angle = next;
    }, 30);
  }, []);

  const stopRotate = useCallback(() => {
    if (rotateTimerRef.current) { clearInterval(rotateTimerRef.current); rotateTimerRef.current = null; }
  }, []);

  // 키보드 컨트롤
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      switch (e.code) {
        case 'Space':
          e.preventDefault();
          handleSwap();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          gsRef.current.angle = Math.max(-MAX_ANGLE, gsRef.current.angle - ROTATE_STEP * 2);
          break;
        case 'ArrowRight':
          e.preventDefault();
          gsRef.current.angle = Math.min(MAX_ANGLE, gsRef.current.angle + ROTATE_STEP * 2);
          break;
        case 'ArrowUp':
        case 'Enter':
        case 'KeyZ':
          e.preventDefault();
          handleFire();
          break;
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handleFire, handleSwap]);

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

  // 모바일 감지 + 네이티브 터치 이벤트
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

  // 게임 루프
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let prevScore = -1;
    let prevStatus: GameState['status'] = 'playing';
    let prevCombo = -1;

    const loop = () => {
      const updates = tickGame(gsRef.current);
      if (Object.keys(updates).length > 0) gsRef.current = { ...gsRef.current, ...updates };
      drawFrame(ctx, gsRef.current, enableEffectsRef.current);
      const { score, status, combo } = gsRef.current;
      if (score !== prevScore) { setUiScore(score); prevScore = score; }
      if (status !== prevStatus) { setUiStatus(status); prevStatus = status; }
      if (combo !== prevCombo) { setUiCombo(combo); prevCombo = combo; }
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
      />

      {/* 모바일 전용 컨트롤: [◀] [SWAP] [FIRE×2] [▶] */}
      {showButtons && (
        <div style={{ display: 'flex', gap: 8, marginTop: 12, width: '100%', maxWidth: CANVAS_W, touchAction: 'none' }}>
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
            style={{ ...btnBase, background: 'rgba(99,102,241,0.85)', color: 'white', fontSize: '0.85rem' }}
            onPointerDown={handleSwap}
          >
            SWAP
          </button>
          <button
            style={{ ...btnBase, flex: 2, background: 'linear-gradient(135deg,#A855F7,#7C3AED)', color: 'white', fontSize: '1rem' }}
            onPointerDown={handleFire}
          >
            FIRE×2
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

      {/* 게임오버 / 클리어 오버레이 */}
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
          <div style={{
            width: '100%', maxWidth: 200,
            background: 'rgba(6,182,212,0.08)', border: '1px solid rgba(6,182,212,0.25)',
            borderRadius: 12, padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: 4,
          }}>
            <p style={{ color: '#06B6D4', fontWeight: 700, fontSize: '0.75rem', textAlign: 'center', margin: 0 }}>🏆 BEST SCORES</p>
            {loadingLB ? (
              <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.7rem', textAlign: 'center', margin: 0 }}>...</p>
            ) : leaderboard.length === 0 ? (
              <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.7rem', textAlign: 'center', margin: 0 }}>기록 없음</p>
            ) : leaderboard.map((entry, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ color: '#06B6D4', fontWeight: 700, fontSize: '0.7rem', minWidth: 14 }}>{i + 1}.</span>
                <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.7rem', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 80 }}>
                  {entry.nickname.slice(0, 6)}
                </span>
                <span style={{ color: 'white', fontWeight: 700, fontSize: '0.7rem', fontVariantNumeric: 'tabular-nums' }}>
                  {entry.score.toLocaleString()}
                </span>
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

      {/* 콤보 표시 (디버그/접근성용, Canvas 외부) */}
      {uiCombo >= 2 && uiStatus === 'playing' && (
        <div style={{ position: 'absolute', top: 40, right: 8, pointerEvents: 'none', opacity: 0.85 }}>
          <span style={{ color: '#EAB308', fontWeight: 900, fontSize: '0.8rem', textShadow: '0 1px 4px #000' }}>
            {getComboText(uiCombo)}
          </span>
        </div>
      )}
    </div>
  );
}
