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
  buyer       text not null default '공동' check (buyer in ('공동', '봉준', '달희')),
  merchant_name text not null default '',
  location    text not null default '',
  receipt_image_url text,
  amount      bigint not null check (amount > 0),    -- 원(KRW) 단위 정수
  note        text not null default '',
  date        date not null default current_date,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table public.transactions add column if not exists buyer text not null default '공동';
alter table public.transactions add column if not exists merchant_name text not null default '';
alter table public.transactions add column if not exists location text not null default '';
alter table public.transactions add column if not exists receipt_image_url text;

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
-- 8. 블로그 (Blog)
-- ══════════════════════════════════════════════════════════════
create table if not exists public.blog_posts (
  id            uuid primary key default uuid_generate_v4(),
  author_id     uuid not null references public.profiles(id) on delete cascade,
  author_name   text not null default '',
  slug          text not null unique,
  title         text not null,
  description   text not null default '',
  thumbnail_url text,
  content_html  text not null default '',
  content_json  jsonb,
  is_published  boolean not null default true,
  published_at  timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists idx_blog_posts_published
  on public.blog_posts (is_published, published_at desc, created_at desc);

create index if not exists idx_blog_posts_author
  on public.blog_posts (author_id, created_at desc);


-- ══════════════════════════════════════════════════════════════
-- 9. 블로그 댓글 (Blog Comments)
-- ══════════════════════════════════════════════════════════════
create table if not exists public.blog_comments (
  id            uuid primary key default uuid_generate_v4(),
  post_id       uuid not null references public.blog_posts(id) on delete cascade,
  user_id       uuid references auth.users(id) on delete set null,  -- 로그인 유저: NULL이면 비로그인
  author_name   text not null,
  password_hash text,        -- 비로그인 댓글만 사용 (로그인 댓글은 NULL)
  content       text not null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- 기존 테이블에 user_id 컬럼이 없으면 추가
alter table public.blog_comments
  add column if not exists user_id uuid references auth.users(id) on delete set null;

create index if not exists idx_blog_comments_post
  on public.blog_comments (post_id, created_at asc);

create index if not exists idx_blog_comments_user
  on public.blog_comments (user_id);

create trigger set_updated_at_blog_comments
  before update on public.blog_comments
  for each row execute procedure public.set_updated_at();


-- ══════════════════════════════════════════════════════════════
-- 10. updated_at 자동 갱신 트리거
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

create trigger set_updated_at_blog_posts
  before update on public.blog_posts
  for each row execute procedure public.set_updated_at();


-- ══════════════════════════════════════════════════════════════
-- 11. 사이트 설정 (Site Settings)
-- ══════════════════════════════════════════════════════════════
create table if not exists public.site_settings (
  key         text primary key,
  value       text not null default '',
  updated_at  timestamptz not null default now()
);

-- 기본값 삽입 (없을 때만)
insert into public.site_settings (key, value)
values
  ('meta_title',       '달디단 — 일상의 편리함'),
  ('meta_description', '날씨, 쇼핑, 영화, 여행, 가계부를 한 곳에서'),
  ('meta_og_image',    ''),
  ('logo_url',         ''),
  ('custom_greeting',  '')
on conflict (key) do nothing;

-- RLS: 누구나 읽기 가능, 로그인 유저만 수정
alter table public.site_settings enable row level security;
create policy "site_settings_read" on public.site_settings for select using (true);
create policy "site_settings_write" on public.site_settings for all using (auth.role() = 'authenticated');

create trigger set_updated_at_site_settings
  before update on public.site_settings
  for each row execute procedure public.set_updated_at();


-- ══════════════════════════════════════════════════════════════
-- 12. 푸시 구독 (Push Subscriptions)
-- FCM 토큰 저장 — 비로그인 구독도 허용 (user_id nullable)
-- ══════════════════════════════════════════════════════════════
create table if not exists public.push_subscriptions (
  id              uuid primary key default uuid_generate_v4(),
  user_id         uuid references public.profiles(id) on delete set null,
  fcm_token       text not null unique,
  device_type     text not null default 'web' check (device_type in ('web', 'ios', 'android')),
  user_agent      text,
  notify_new_post boolean not null default true,
  notify_comment  boolean not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- 기존 테이블에 알림 설정 컬럼 추가 (idempotent)
alter table public.push_subscriptions add column if not exists notify_new_post boolean not null default true;
alter table public.push_subscriptions add column if not exists notify_comment  boolean not null default true;

create index if not exists idx_push_subscriptions_user
  on public.push_subscriptions (user_id);

-- RLS
alter table public.push_subscriptions enable row level security;
-- 누구나 INSERT (비로그인 포함)
create policy "push_subscriptions_insert" on public.push_subscriptions
  for insert with check (true);
-- 토큰을 알고 있으면 자신 것만 삭제 가능 (서버는 service_role로 RLS 우회)
create policy "push_subscriptions_delete" on public.push_subscriptions
  for delete using (true);
-- 클라이언트 SELECT 불가 (service_role은 RLS 우회하므로 서버는 항상 조회 가능)

create trigger set_updated_at_push_subscriptions
  before update on public.push_subscriptions
  for each row execute procedure public.set_updated_at();
