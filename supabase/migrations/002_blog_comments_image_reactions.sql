-- ══════════════════════════════════════════════════════════════
-- 마이그레이션: 블로그 댓글 이미지 첨부 + 공감 기능
-- blog_comments.image_urls 컬럼 추가
-- blog_comment_reactions 테이블 신규 생성
-- ══════════════════════════════════════════════════════════════

-- 이미지 첨부 컬럼 추가 (기존 댓글은 빈 배열로 초기화)
alter table public.blog_comments
  add column if not exists image_urls text[] not null default '{}';

