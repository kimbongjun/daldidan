-- 리더보드에서 다른 유저의 닉네임을 표시하기 위해
-- 인증된 유저가 모든 프로필의 display_name을 조회할 수 있도록 허용
create policy if not exists "profiles_authenticated_select" on public.profiles
  for select using (auth.uid() is not null);
