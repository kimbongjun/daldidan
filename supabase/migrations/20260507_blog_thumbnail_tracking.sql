-- 블로그 썸네일 추적 컬럼 추가
-- thumbnail_prompt: 이미지 생성에 사용된 첫 번째 키워드 (중복 방지용)
-- thumbnail_source: 이미지 출처 구분 ('auto_magnific' | 'auto_unsplash' | 'auto_pollinations' | 'auto_picsum' | 'stream_video' | 'content_image')
ALTER TABLE blog_posts
  ADD COLUMN IF NOT EXISTS thumbnail_prompt TEXT,
  ADD COLUMN IF NOT EXISTS thumbnail_source TEXT;
