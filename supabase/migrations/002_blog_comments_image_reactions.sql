-- ══════════════════════════════════════════════════════════════
-- 마이그레이션: 블로그 댓글 이미지 첨부 + 공감 기능
-- blog_comments.image_urls 컬럼 추가
-- blog_comment_reactions 테이블 신규 생성
-- ══════════════════════════════════════════════════════════════

-- 이미지 첨부 컬럼 추가 (기존 댓글은 빈 배열로 초기화)
alter table public.blog_comments
  add column if not exists image_urls text[] not null default '{}';

-- 댓글 공감 테이블
create table if not exists public.blog_comment_reactions (
  id          uuid primary key default uuid_generate_v4(),
  comment_id  uuid not null references public.blog_comments(id) on delete cascade,
  user_id     uuid references auth.users(id) on delete cascade,
  browser_id  text,
  reaction    text not null check (
    reaction in ('like', 'sad', 'best', 'check', 'heart')
    or reaction like 'custom:%'
  ),
  created_at  timestamptz not null default now()
);

-- 로그인 유저: 댓글+유저+공감 타입 유니크
create unique index if not exists idx_reactions_user_unique
  on public.blog_comment_reactions (comment_id, user_id, reaction)
  where user_id is not null;

-- 비로그인: 댓글+브라우저ID+공감 타입 유니크
create unique index if not exists idx_reactions_browser_unique
  on public.blog_comment_reactions (comment_id, browser_id, reaction)
  where browser_id is not null;

create index if not exists idx_reactions_comment
  on public.blog_comment_reactions (comment_id);

-- RLS
alter table public.blog_comment_reactions enable row level security;

create policy "공감 전체 공개 조회"
  on public.blog_comment_reactions for select
  using (true);

create policy "공감 작성 허용"
  on public.blog_comment_reactions for insert
  with check (true);

create policy "본인 공감만 삭제"
  on public.blog_comment_reactions for delete
  using (auth.uid() = user_id);
