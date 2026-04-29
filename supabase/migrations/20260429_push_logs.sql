create table if not exists push_logs (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  notification_type text not null default 'unknown',
  title text not null,
  body text not null,
  target_url text,
  sent_count int not null default 0,
  failed_count int not null default 0,
  os_summary jsonb not null default '{}'::jsonb,
  details jsonb not null default '[]'::jsonb
);

create index if not exists push_logs_created_at_idx on push_logs (created_at desc);
create index if not exists push_logs_type_idx on push_logs (notification_type);

-- 관리자만 조회, 서버(service_role)만 삽입
alter table push_logs enable row level security;

create policy "push_logs: service_role full access"
  on push_logs for all
  to service_role
  using (true)
  with check (true);
