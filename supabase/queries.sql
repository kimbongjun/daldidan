-- ══════════════════════════════════════════════════════════════
-- 달디단 — 위젯별 주요 쿼리 레퍼런스
-- ══════════════════════════════════════════════════════════════


-- ────────────────────────────────────────────────────────────
-- [가계부 위젯] BudgetWidget
-- ────────────────────────────────────────────────────────────

-- 1. 이번 달 수입/지출/잔액 (공유 가계부 — 전체 유저 합산)
select
  sum(case when type = 'income'  then amount else 0 end) as total_income,
  sum(case when type = 'expense' then amount else 0 end) as total_expense,
  sum(case when type = 'income'  then amount
           when type = 'expense' then -amount end)       as balance
from public.transactions
where to_char(date, 'YYYY-MM') = to_char(current_date, 'YYYY-MM');

-- 2. 이번 달 카테고리별 지출 Top 5
select category, sum(amount) as total
from public.transactions
where user_id = auth.uid()
  and type = 'expense'
  and to_char(date, 'YYYY-MM') = to_char(current_date, 'YYYY-MM')
group by category
order by total desc
limit 5;

-- 3. 최근 거래 목록 (공유 가계부 — 전체, 20건)
select id, user_id, type, category, buyer, amount, note, date
from public.transactions
order by date desc, created_at desc
limit 20;

-- 4. 거래 추가
insert into public.transactions (user_id, type, category, amount, note, date)
values (auth.uid(), 'expense', '식비', 12000, '점심', current_date);

-- 5. 거래 수정
update public.transactions
set category = '교통', amount = 1500, note = '지하철', date = current_date
where id = '<uuid>' and user_id = auth.uid();

-- 6. 거래 삭제
delete from public.transactions
where id = '<uuid>' and user_id = auth.uid();

-- 7. 월별 추이 (최근 6개월, 공유 가계부 — 전체 합산)
select ym, total_income, total_expense, balance
from public.monthly_summary
where ym >= to_char(current_date - interval '6 months', 'YYYY-MM')
order by ym;

-- 8. 구매자별 지출 정산 (특정 월)
select buyer, total_amount, tx_count
from public.buyer_expense_summary
where ym = to_char(current_date, 'YYYY-MM')
order by total_amount desc;


-- ────────────────────────────────────────────────────────────
-- [주식 위젯] StockWidget — 캐시 테이블 활용
-- ────────────────────────────────────────────────────────────

-- 1. 전체 시세 조회 (최신 순)
select symbol, name, display_symbol, market, currency,
       price, change, change_pct, sparkline, fetched_at
from public.market_quotes
order by market, name;

-- 2. 캐시 upsert (서버 Route Handler에서 Service Role로 실행)
insert into public.market_quotes (
  symbol, name, display_symbol, market, exchange, currency,
  price, change, change_pct, previous_close,
  day_high, day_low, volume, sparkline, fetched_at
)
values (
  '005930.KS', '삼성전자', '005930', 'KR', 'KSC', 'KRW',
  74200, 300, 0.41, 73900, 74500, 73800, 12000000, '{74000,74100,74200}', now()
)
on conflict (symbol) do update set
  price       = excluded.price,
  change      = excluded.change,
  change_pct  = excluded.change_pct,
  sparkline   = excluded.sparkline,
  fetched_at  = excluded.fetched_at;

-- 3. 지수 upsert
insert into public.market_indices (symbol, name, region, value, change, change_pct, fetched_at)
values ('KOSPI', 'KOSPI', 'KR', 2650.5, 12.3, 0.47, now())
on conflict (symbol) do update set
  value      = excluded.value,
  change     = excluded.change,
  change_pct = excluded.change_pct,
  fetched_at = excluded.fetched_at;

-- 4. 오래된 캐시 확인 (15분 이상 미갱신)
select symbol, fetched_at
from public.market_quotes
where fetched_at < now() - interval '15 minutes';


-- ────────────────────────────────────────────────────────────
-- [문화 위젯] EventWidget — 캐시 upsert
-- ────────────────────────────────────────────────────────────

-- 1. 유효한 문화행사 조회 (만료 전, 최신 18건)
select id, slug, type, title, venue, date_label,
       summary, image_url, rating, tags, booking_url, source
from public.culture_events
where expires_at > now()
order by
  case type when 'movie' then 1 when 'concert' then 2 else 3 end,
  fetched_at desc
limit 18;

-- 2. 행사 상세 조회
select *
from public.culture_events
where slug = 'movie-avengers-2025';

-- 3. 캐시 upsert (Service Role)
insert into public.culture_events (
  id, slug, type, title, venue, date_label, summary,
  image_url, rating, tags, booking_url, source, fetched_at, expires_at
)
values (
  'tmdb-12345', 'movie-avengers-12345', 'movie',
  '어벤져스: 시크릿 워즈', '전국 CGV·롯데시네마',
  '2025.05 개봉', '마블 유니버스의 새로운 막',
  'https://image.tmdb.org/...', 8.2,
  '{마블, SF, 액션}', 'https://cgv.co.kr/...', 'tmdb', now(),
  now() + interval '6 hours'
)
on conflict (id) do update set
  title      = excluded.title,
  rating     = excluded.rating,
  fetched_at = excluded.fetched_at,
  expires_at = excluded.expires_at;

-- 4. 만료된 캐시 삭제 (pg_cron으로 자동화 가능)
delete from public.culture_events
where expires_at < now() - interval '1 day';


-- ────────────────────────────────────────────────────────────
-- [쇼핑 위젯] ShoppingWidget
-- ────────────────────────────────────────────────────────────

-- 1. 유효한 특가 상품 (만료 전, 할인율 내림차순)
select id, title, store, category, original_price, sale_price,
       discount_pct, purchase_url, image_url, brand, mall_name
from public.shopping_deals
where expires_at > now()
  and discount_pct >= 8
order by discount_pct desc, fetched_at desc
limit 18;

-- 2. 특가 upsert (Service Role)
insert into public.shopping_deals (
  id, title, store, category,
  original_price, sale_price, discount_pct,
  purchase_url, image_url, brand, mall_name,
  source, fetched_at, expires_at
)
values (
  'naver-98765432', '애플 에어팟 4세대',
  '네이버쇼핑', '이어폰/헤드폰',
  289000, 239000, 17,
  'https://...', 'https://...', 'Apple', '쿠팡',
  'naver', now(), now() + interval '30 minutes'
)
on conflict (id) do update set
  sale_price   = excluded.sale_price,
  discount_pct = excluded.discount_pct,
  fetched_at   = excluded.fetched_at,
  expires_at   = excluded.expires_at;

-- 3. 만료된 특가 삭제
delete from public.shopping_deals
where expires_at < now();


-- ────────────────────────────────────────────────────────────
-- [여행 위젯] TravelWidget
-- ────────────────────────────────────────────────────────────

-- 1. 현재 계절 추천 여행지
select d.*, (w.destination_id is not null) as is_wishlisted
from public.travel_destinations d
left join public.travel_wishlist w
  on w.destination_id = d.id and w.user_id = auth.uid()
where d.is_active = true
  and d.season @> array[
    case
      when extract(month from current_date) in (3,4,5)  then 'spring'
      when extract(month from current_date) in (6,7,8)  then 'summer'
      when extract(month from current_date) in (9,10,11) then 'fall'
      else 'winter'
    end
  ]::text[]
order by d.rating desc nulls last
limit 6;

-- 2. 전체 여행지 (계절 무관)
select * from public.travel_destinations
where is_active = true
order by rating desc;

-- 3. 찜 추가
insert into public.travel_wishlist (user_id, destination_id)
values (auth.uid(), '<destination_uuid>')
on conflict do nothing;

-- 4. 찜 삭제
delete from public.travel_wishlist
where user_id = auth.uid() and destination_id = '<destination_uuid>';

-- 5. 여행지 추가 (관리자)
insert into public.travel_destinations (
  name, location, region, category, country,
  rating, price_label, tag, image_url, season
)
values (
  '제주 협재 해수욕장', '제주도', '제주', '해변', '한국',
  4.8, '항공 89,000원~', 'HOT',
  'https://...', '{spring, summer}'
);


-- ────────────────────────────────────────────────────────────
-- [교통 위젯] TrafficWidget
-- ────────────────────────────────────────────────────────────

-- 1. 도로 현황 전체
select id, name, road_type, from_location, to_location,
       status, speed_kmh, travel_time_min, distance_km, fetched_at
from public.road_segments
order by
  case status when '사고' then 1 when '정체' then 2 when '서행' then 3 else 4 end,
  name;

-- 2. 상태별 건수
select status, count(*) as cnt
from public.road_segments
group by status;

-- 3. CCTV 목록
select id, road_name, location, status, direction, image_url, fetched_at
from public.traffic_cctv
order by
  case status when '사고' then 1 when '정체' then 2 when '서행' then 3 else 4 end;

-- 4. 도로 상태 upsert (Service Role — ITS API 연동 후)
insert into public.road_segments (
  name, road_type, from_location, to_location,
  status, speed_kmh, travel_time_min, distance_km, fetched_at
)
values (
  '경부고속도로', '고속도로', '서울', '수원',
  '서행', 42, 38, 29, now()
)
on conflict (id) do update set
  status          = excluded.status,
  speed_kmh       = excluded.speed_kmh,
  travel_time_min = excluded.travel_time_min,
  fetched_at      = excluded.fetched_at;

-- 5. 진행 중인 사고 조회
select i.*, r.name as road_name
from public.traffic_incidents i
left join public.road_segments r on r.id = i.road_id
where i.resolved_at is null
order by i.occurred_at desc;


-- ────────────────────────────────────────────────────────────
-- [캐시 자동 삭제] pg_cron 스케줄
-- Supabase Dashboard → Database → Extensions → pg_cron 활성화 후 실행
-- ────────────────────────────────────────────────────────────
select cron.schedule(
  'clean-expired-deals',
  '*/30 * * * *',   -- 30분마다
  $$delete from public.shopping_deals where expires_at < now()$$
);

select cron.schedule(
  'clean-expired-culture',
  '0 */6 * * *',    -- 6시간마다
  $$delete from public.culture_events where expires_at < now() - interval '1 day'$$
);
