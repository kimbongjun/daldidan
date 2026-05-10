-- 국내여행 지원 및 구글 드라이브 링크 컬럼 추가
ALTER TABLE travel_locations
  ADD COLUMN IF NOT EXISTS is_domestic BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS province    TEXT,
  ADD COLUMN IF NOT EXISTS drive_link  TEXT;
