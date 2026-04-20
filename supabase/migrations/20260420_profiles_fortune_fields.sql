-- profiles 테이블에 운세 관련 필드 추가
alter table public.profiles
  add column if not exists birth_year  integer check (birth_year between 1900 and 2100),
  add column if not exists gender      text    check (gender in ('남성', '여성', '기타')),
  add column if not exists birth_hour  integer check (birth_hour between 0 and 23);
