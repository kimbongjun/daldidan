create table if not exists public.game_scores (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references public.profiles(id) on delete cascade not null,
  game_id    text not null check (game_id in ('tetris', 'puzzle-bobble')),
  score      integer not null,
  created_at timestamptz default now() not null
);

create index if not exists game_scores_game_id_score_idx on public.game_scores (game_id, score desc);
create index if not exists game_scores_user_id_idx on public.game_scores (user_id);

alter table public.game_scores enable row level security;

create policy "game_scores_select" on public.game_scores
  for select using (auth.role() = 'authenticated');

create policy "game_scores_insert" on public.game_scores
  for insert with check (auth.uid() = user_id);
