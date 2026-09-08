-- 로또 당첨 결과 테이블 — schema.sql 14번 섹션과 동일.
-- 프로덕션에 이 테이블이 적용되지 않아 /api/lotto/latest 가 매 요청 외부 라이브
-- 크롤링에 의존하며 간헐 타임아웃 오류를 냈다 (2026-09-08 진단).
-- Supabase Dashboard > SQL Editor 에서 이 파일 전체를 실행할 것.

create table if not exists public.lotto_results (
  id                   uuid primary key default uuid_generate_v4(),
  drw_no               integer unique not null,
  drw_no_date          date not null,
  drw_no1              integer not null check (drw_no1 between 1 and 45),
  drw_no2              integer not null check (drw_no2 between 1 and 45),
  drw_no3              integer not null check (drw_no3 between 1 and 45),
  drw_no4              integer not null check (drw_no4 between 1 and 45),
  drw_no5              integer not null check (drw_no5 between 1 and 45),
  drw_no6              integer not null check (drw_no6 between 1 and 45),
  drw_no_bonus_no      integer not null check (drw_no_bonus_no between 1 and 45),
  first_win_cnt        integer not null default 0,
  first_win_amnt       bigint,
  first_accum_prize_r  bigint not null default 0,
  created_at           timestamptz not null default now()
);

create index if not exists idx_lotto_results_drw_no
  on public.lotto_results (drw_no desc);

-- 서버(service role) 전용 테이블 — 클라이언트 직접 접근 차단
alter table public.lotto_results enable row level security;
