-- 유저가 자신의 기록을 갱신(최고점 업데이트)할 수 있도록 UPDATE 정책 추가
create policy "game_scores_update" on public.game_scores
  for update using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
