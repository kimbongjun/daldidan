-- profiles: 생일 월/일 추가 (디데이 위젯용)
alter table public.profiles
  add column if not exists birth_month integer check (birth_month between 1 and 12),
  add column if not exists birth_day   integer check (birth_day between 1 and 31);

-- site_settings: 만난 날, 결혼한 날 기본값 추가
insert into public.site_settings (key, value)
values
  ('met_date',     ''),
  ('married_date', '')
on conflict (key) do nothing;
