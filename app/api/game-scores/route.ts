import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import type { GameId, GetGameScoresResponse } from "@/types/game";

export const runtime = "nodejs";

const VALID_GAME_IDS: GameId[] = ["tetris", "puzzle-bobble"];

type GameScoreRow = {
  id: string;
  user_id: string;
  score: number;
  created_at: string;
  profiles: { display_name: string | null } | null;
};

/** GET /api/game-scores?gameId=tetris|puzzle-bobble */
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { searchParams } = new URL(request.url);
  const gameId = searchParams.get("gameId");

  if (!gameId || !(VALID_GAME_IDS as string[]).includes(gameId)) {
    return NextResponse.json(
      { error: "gameId는 'tetris' 또는 'puzzle-bobble'이어야 합니다." },
      { status: 400 },
    );
  }

  // profiles 테이블 RLS를 우회해 다른 유저 닉네임을 정상 조회하기 위해 admin 클라이언트 사용
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("game_scores")
    .select("id, user_id, score, created_at, profiles(display_name)")
    .eq("game_id", gameId)
    .order("score", { ascending: false })
    .limit(20);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const rows = (data ?? []) as unknown as GameScoreRow[];

  // userId 기준 중복 제거 — rows는 score DESC 정렬이므로 첫 번째가 최고점
  const seen = new Set<string>();
  const scores = rows
    .map((row) => ({
      id: row.id,
      userId: row.user_id,
      nickname: row.profiles?.display_name ?? "익명",
      score: row.score,
      createdAt: row.created_at,
    }))
    .filter((entry) => {
      if (seen.has(entry.userId)) return false;
      seen.add(entry.userId);
      return true;
    });

  let myBest: number | null = null;
  if (user) {
    const { data: myData, error: myError } = await supabase
      .from("game_scores")
      .select("score")
      .eq("game_id", gameId)
      .eq("user_id", user.id)
      .order("score", { ascending: false })
      .limit(1)
      .single();

    if (!myError && myData) {
      myBest = myData.score as number;
    }
  }

  const response: GetGameScoresResponse = { scores, myBest };
  return NextResponse.json(response);
}

/** POST /api/game-scores — 점수 저장 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json() as { gameId?: string; score?: number };

  const { gameId, score } = body;

  if (!gameId || !(VALID_GAME_IDS as string[]).includes(gameId)) {
    return NextResponse.json(
      { error: "gameId는 'tetris' 또는 'puzzle-bobble'이어야 합니다." },
      { status: 400 },
    );
  }

  if (typeof score !== "number" || score <= 0) {
    return NextResponse.json(
      { error: "score는 0보다 큰 정수여야 합니다." },
      { status: 400 },
    );
  }

  // 기존 기록 조회 — 유저당 게임별 1건만 유지
  const { data: existing, error: fetchError } = await supabase
    .from("game_scores")
    .select("id, score")
    .eq("user_id", user.id)
    .eq("game_id", gameId)
    .maybeSingle();

  if (fetchError) return NextResponse.json({ error: fetchError.message }, { status: 500 });

  if (!existing) {
    const { data, error } = await supabase
      .from("game_scores")
      .insert({ user_id: user.id, game_id: gameId, score })
      .select()
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data, { status: 201 });
  }

  // 기존 최고점보다 낮으면 저장 불필요
  if (score <= existing.score) {
    return NextResponse.json({ id: existing.id, score: existing.score }, { status: 200 });
  }

  const { data, error } = await supabase
    .from("game_scores")
    .update({ score })
    .eq("id", existing.id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 200 });
}
