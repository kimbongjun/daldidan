-- calendar_events 테이블에 color 컬럼 추가
-- NULL = 기본 색상(작성자 해시 색상), hex string = 사용자 지정 색상
alter table public.calendar_events
  add column if not exists color text default null;
