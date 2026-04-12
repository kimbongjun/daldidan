-- ══════════════════════════════════════════════════════════════
-- 달디단 (Daldidan) — Supabase DB 스키마
-- 실행 순서: Extensions → Tables → Indexes → RLS → Functions
-- ══════════════════════════════════════════════════════════════

-- ── Extensions ────────────────────────────────────────────────
create extension if not exists "uuid-ossp";
create extension if not exists "pg_cron";         -- 스케줄 캐시 갱신용


-- ══════════════════════════════════════════════════════════════
-- 1. 사용자 프로필 (auth.users 확장)
-- ══════════════════════════════════════════════════════════════
create table if not exists public.profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  display_name  text,
  theme         text not null default 'dark' check (theme in ('dark', 'light')),
  home_city     text not null default '서울',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- 신규 유저 자동 프로필 생성
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, new.raw_user_meta_data->>'full_name');
  return new;
end;
$$;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();


-- ══════════════════════════════════════════════════════════════
-- 2. 가계부 (Budget)
-- ══════════════════════════════════════════════════════════════
create table if not exists public.transactions (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  type        text not null check (type in ('income', 'expense')),
  category    text not null,
  amount      bigint not null check (amount > 0),    -- 원(KRW) 단위 정수
  note        text not null default '',
  date        date not null default current_date,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists idx_transactions_user_date
  on public.transactions (user_id, date desc);

create index if not exists idx_transactions_user_type
  on public.transactions (user_id, type, date desc);

-- 월별 집계 뷰 (BudgetWidget / QuickStats에서 사용)
create or replace view public.monthly_summary as
select
  user_id,
  to_char(date, 'YYYY-MM')                             as ym,
  sum(case when type = 'income'  then amount else 0 end) as total_income,
  sum(case when type = 'expense' then amount else 0 end) as total_expense,
  sum(case when type = 'income'  then amount
           when type = 'expense' then -amount end)       as balance
from public.transactions
group by user_id, to_char(date, 'YYYY-MM');

-- 카테고리별 지출 집계 뷰
create or replace view public.category_expense_summary as
select
  user_id,
  to_char(date, 'YYYY-MM') as ym,
  category,
  sum(amount)               as total_amount,
  count(*)                  as tx_count
from public.transactions
where type = 'expense'
group by user_id, to_char(date, 'YYYY-MM'), category;


-- ══════════════════════════════════════════════════════════════
-- 3. 여행 (Travel)
-- ══════════════════════════════════════════════════════════════
create table if not exists public.travel_destinations (
  id          uuid primary key default uuid_generate_v4(),
  name        text not null,
  location    text not null,
  region      text,                   -- '제주도', '강원도' 등 광역 분류
  category    text not null,          -- '해변', '역사', '카페거리' 등
  country     text not null default '한국',
  rating      numeric(3,1) check (rating between 0 and 5),
  price_label text,                   -- '항공 89,000원~'
  tag         text,                   -- 'HOT', '추천', '벚꽃시즌' 등
  image_url   text,
  season      text[],                 -- '{spring, summer, fall, winter}'
  is_active   boolean not null default true,
  created_at  timestamptz not null default now()
);

-- 사용자 찜 목록
create table if not exists public.travel_wishlist (
  user_id        uuid not null references public.profiles(id) on delete cascade,
  destination_id uuid not null references public.travel_destinations(id) on delete cascade,
  created_at     timestamptz not null default now(),
  primary key (user_id, destination_id)
);

create index if not exists idx_travel_season
  on public.travel_destinations using gin(season);


-- ══════════════════════════════════════════════════════════════
-- 4. 문화 행사 캐시 (Culture Events)
-- 외부 API 결과를 DB에 캐시하여 quota 절약
-- ══════════════════════════════════════════════════════════════
create table if not exists public.culture_events (
  id          text primary key,               -- 외부 API id 그대로 사용
  slug        text not null unique,
  type        text not null check (type in ('movie', 'concert', 'exhibition')),
  title       text not null,
  venue       text not null default '',
  date_label  text not null default '',
  summary     text not null default '',
  image_url   text,
  rating      numeric(4,2),
  tags        text[] not null default '{}',
  booking_url text,
  detail_url  text,
  source      text not null,                  -- 'tmdb', 'ticketmaster', 'seoul'
  -- 상세 정보
  description text,
  address     text,
  runtime     text,
  period      text,
  cast_list   text[],
  price_info  text,
  status      text,
  -- 캐시 관리
  fetched_at  timestamptz not null default now(),
  expires_at  timestamptz not null default (now() + interval '6 hours')
);

create index if not exists idx_culture_type_fetched
  on public.culture_events (type, fetched_at desc);

create index if not exists idx_culture_expires
  on public.culture_events (expires_at);


-- ══════════════════════════════════════════════════════════════
-- 5. 주식 시세 캐시 (Market Quotes)
-- ══════════════════════════════════════════════════════════════
create table if not exists public.market_quotes (
  symbol          text primary key,
  name            text not null,
  display_symbol  text,
  market          text not null check (market in ('KR', 'US')),
  exchange        text not null default '',
  currency        text not null default 'KRW',
  price           numeric(18,4) not null,
  change          numeric(18,4) not null default 0,
  change_pct      numeric(8,4) not null default 0,
  previous_close  numeric(18,4),
  day_high        numeric(18,4),
  day_low         numeric(18,4),
  volume          bigint,
  market_cap      bigint,
  range52w_high   numeric(18,4),
  range52w_low    numeric(18,4),
  sparkline       numeric[] not null default '{}',
  fetched_at      timestamptz not null default now()
);

create table if not exists public.market_indices (
  symbol      text primary key,
  name        text not null,
  region      text not null,
  value       numeric(18,4) not null,
  change      numeric(18,4) not null default 0,
  change_pct  numeric(8,4) not null default 0,
  fetched_at  timestamptz not null default now()
);


-- ══════════════════════════════════════════════════════════════
-- 6. 교통 정보 캐시 (Traffic)
-- ══════════════════════════════════════════════════════════════
create type traffic_status as enum ('원활', '서행', '정체', '사고');
create type road_type as enum ('고속도로', '국도', '도시고속');

create table if not exists public.road_segments (
  id              uuid primary key default uuid_generate_v4(),
  name            text not null,
  road_type       road_type not null,
  from_location   text not null,
  to_location     text not null,
  status          traffic_status not null default '원활',
  speed_kmh       integer check (speed_kmh >= 0),
  travel_time_min integer check (travel_time_min >= 0),
  distance_km     integer check (distance_km > 0),
  fetched_at      timestamptz not null default now()
);

create table if not exists public.traffic_cctv (
  id          uuid primary key default uuid_generate_v4(),
  road_name   text not null,
  location    text not null,
  status      traffic_status not null default '원활',
  direction   text not null default '',
  image_url   text,         -- 실제 CCTV 정지 이미지 URL (ITS API)
  fetched_at  timestamptz not null default now()
);

create table if not exists public.traffic_incidents (
  id          uuid primary key default uuid_generate_v4(),
  road_id     uuid references public.road_segments(id) on delete set null,
  description text not null,
  severity    text not null check (severity in ('경미', '보통', '심각')),
  occurred_at timestamptz not null default now(),
  resolved_at timestamptz
);


-- ══════════════════════════════════════════════════════════════
-- 7. 쇼핑 특가 캐시 (Shopping Deals)
-- ══════════════════════════════════════════════════════════════
create table if not exists public.shopping_deals (
  id              text primary key,             -- Naver productId
  title           text not null,
  store           text not null default '',
  category        text not null default '',
  original_price  bigint not null,
  sale_price      bigint not null,
  discount_pct    integer not null default 0,
  purchase_url    text not null,
  image_url       text,
  mall_name       text,
  brand           text,
  review_count    integer,
  source          text not null default 'naver',
  fetched_at      timestamptz not null default now(),
  expires_at      timestamptz not null default (now() + interval '30 minutes')
);

create index if not exists idx_deals_discount
  on public.shopping_deals (discount_pct desc, fetched_at desc);

create index if not exists idx_deals_expires
  on public.shopping_deals (expires_at);

-- 사용자 검색 히스토리 (선택)
create table if not exists public.search_history (
  id           uuid primary key default uuid_generate_v4(),
  user_id      uuid references public.profiles(id) on delete cascade,
  keyword      text not null,
  result_count integer not null default 0,
  searched_at  timestamptz not null default now()
);

create index if not exists idx_search_history_user
  on public.search_history (user_id, searched_at desc);


-- ══════════════════════════════════════════════════════════════
-- 8. updated_at 자동 갱신 트리거
-- ══════════════════════════════════════════════════════════════
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_updated_at_transactions
  before update on public.transactions
  for each row execute procedure public.set_updated_at();

create trigger set_updated_at_profiles
  before update on public.profiles
  for each row execute procedure public.set_updated_at();
