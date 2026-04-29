-- ══════════════════════════════════════════════════════════════
-- Supabase Storage 버킷 생성 및 RLS 정책
-- Supabase 대시보드 > SQL Editor에서 실행하세요.
-- ══════════════════════════════════════════════════════════════

-- ── 버킷 생성 (이미 존재하면 무시) ───────────────────────────

insert into storage.buckets (id, name, public)
values ('blog-images', 'blog-images', true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('comment-images', 'comment-images', true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('receipt-images', 'receipt-images', true)
on conflict (id) do nothing;

-- ── blog-images 버킷 RLS ──────────────────────────────────────
-- 서버(service role)만 업로드 — 클라이언트 직접 접근 차단
-- 공개 읽기는 버킷 public=true 로 처리

alter table storage.objects enable row level security;

-- 공개 읽기 (public 버킷)
create policy "blog-images 공개 읽기"
  on storage.objects for select
  using (bucket_id = 'blog-images');

-- ── comment-images 버킷 RLS ───────────────────────────────────

create policy "comment-images 공개 읽기"
  on storage.objects for select
  using (bucket_id = 'comment-images');

-- ── receipt-images 버킷 RLS ───────────────────────────────────

create policy "receipt-images 공개 읽기"
  on storage.objects for select
  using (bucket_id = 'receipt-images');

-- 참고: INSERT/UPDATE/DELETE는 service_role 키(createAdminClient)로만 처리.
-- service_role은 RLS를 우회하므로 별도 INSERT 정책 불필요.
-- 클라이언트(anon/authenticated)가 직접 업로드하는 경로는 모두 제거됨.
