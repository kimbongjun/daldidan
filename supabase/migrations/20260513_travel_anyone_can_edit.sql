-- travel_locations: 등록자 무관 누구나 편집 가능
-- 기존 정책 전체 삭제 후 재생성

DROP POLICY IF EXISTS "travel_select"                  ON travel_locations;
DROP POLICY IF EXISTS "travel_insert"                  ON travel_locations;
DROP POLICY IF EXISTS "travel_update"                  ON travel_locations;
DROP POLICY IF EXISTS "travel_delete"                  ON travel_locations;
DROP POLICY IF EXISTS "travel_select_all_authenticated" ON travel_locations;
DROP POLICY IF EXISTS "travel_update_all_authenticated" ON travel_locations;
DROP POLICY IF EXISTS "travel_delete_all_authenticated" ON travel_locations;

-- 조회: 인증 유저 전체
CREATE POLICY "travel_select"
  ON travel_locations FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- 등록: 본인 user_id로만 (공유 지도에 내 기록 추가)
CREATE POLICY "travel_insert"
  ON travel_locations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- 수정: 인증 유저 누구나 (등록자 무관)
CREATE POLICY "travel_update"
  ON travel_locations FOR UPDATE
  USING  (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- 삭제: 인증 유저 누구나 (등록자 무관)
CREATE POLICY "travel_delete"
  ON travel_locations FOR DELETE
  USING (auth.uid() IS NOT NULL);
