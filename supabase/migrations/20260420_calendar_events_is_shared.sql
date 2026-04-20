-- calendar_events 테이블에 is_shared 컬럼 추가
alter table calendar_events
  add column if not exists is_shared boolean not null default false;
