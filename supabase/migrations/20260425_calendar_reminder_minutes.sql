-- calendar_events 테이블에 reminder_minutes 컬럼 추가
-- NULL = 알람 없음, 15/30/60/720 = 해당 분 전 알람
alter table public.calendar_events
  add column if not exists reminder_minutes integer default null
  check (reminder_minutes in (15, 30, 60, 720));
