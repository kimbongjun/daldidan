-- ══════════════════════════════════════════════════════════════
-- Row Level Security (RLS) 정책
-- 모든 테이블 RLS 활성화 후 정책 적용
-- ══════════════════════════════════════════════════════════════

-- ── profiles ──────────────────────────────────────────────────
alter table public.profiles enable row level security;

create policy "본인 프로필만 조회"
  on public.profiles for select
  using (auth.uid() = id);

create policy "본인 프로필만 수정"
  on public.profiles for update
  using (auth.uid() = id);


-- ── transactions ──────────────────────────────────────────────
alter table public.transactions enable row level security;

create policy "본인 거래만 조회"
  on public.transactions for select
  using (auth.uid() = user_id);

create policy "본인 거래만 추가"
  on public.transactions for insert
  with check (auth.uid() = user_id);

create policy "본인 거래만 수정"
  on public.transactions for update
  using (auth.uid() = user_id);

create policy "본인 거래만 삭제"
  on public.transactions for delete
  using (auth.uid() = user_id);


-- ── travel_wishlist ───────────────────────────────────────────
alter table public.travel_wishlist enable row level security;

create policy "본인 찜 목록만 조회"
  on public.travel_wishlist for select
  using (auth.uid() = user_id);

create policy "본인 찜 목록만 추가"
  on public.travel_wishlist for insert
  with check (auth.uid() = user_id);

create policy "본인 찜 목록만 삭제"
  on public.travel_wishlist for delete
  using (auth.uid() = user_id);


-- ── travel_destinations (공개 읽기) ───────────────────────────
alter table public.travel_destinations enable row level security;

create policy "여행지 전체 공개 조회"
  on public.travel_destinations for select
  using (is_active = true);


-- ── culture_events (공개 캐시) ────────────────────────────────
alter table public.culture_events enable row level security;

create policy "문화행사 전체 공개 조회"
  on public.culture_events for select
  using (true);

-- 서버(Service Role)만 upsert 가능 — 정책 불필요 (service role은 RLS 우회)


-- ── market_quotes / market_indices (공개) ─────────────────────
alter table public.market_quotes enable row level security;
alter table public.market_indices enable row level security;

create policy "시세 전체 공개 조회"
  on public.market_quotes for select using (true);

create policy "지수 전체 공개 조회"
  on public.market_indices for select using (true);


-- ── road_segments / traffic_cctv (공개) ──────────────────────
alter table public.road_segments enable row level security;
alter table public.traffic_cctv enable row level security;
alter table public.traffic_incidents enable row level security;

create policy "도로 정보 공개 조회"
  on public.road_segments for select using (true);

create policy "CCTV 정보 공개 조회"
  on public.traffic_cctv for select using (true);

create policy "사고 정보 공개 조회"
  on public.traffic_incidents for select using (true);


-- ── shopping_deals (공개) ─────────────────────────────────────
alter table public.shopping_deals enable row level security;

create policy "쇼핑 특가 공개 조회"
  on public.shopping_deals for select using (true);


-- ── search_history ────────────────────────────────────────────
alter table public.search_history enable row level security;

create policy "본인 검색 기록만 조회"
  on public.search_history for select
  using (auth.uid() = user_id);

create policy "본인 검색 기록만 추가"
  on public.search_history for insert
  with check (auth.uid() = user_id);
