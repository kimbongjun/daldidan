-- ══════════════════════════════════════════════════════════════
-- 마이그레이션: 가계부 공동 열람 활성화
-- 기존 유저-고유 SELECT 정책 제거 → 인증 유저 전체 조회 허용
-- ══════════════════════════════════════════════════════════════

-- 혹시 존재할 수 있는 구 버전 제한적 정책 제거
DROP POLICY IF EXISTS "본인 거래만 조회" ON public.transactions;
DROP POLICY IF EXISTS "Users can only view their own transactions" ON public.transactions;
DROP POLICY IF EXISTS "인증 유저 전체 거래 조회" ON public.transactions;

-- 인증된 모든 유저가 전체 거래 조회 가능 (공유 가계부)
CREATE POLICY "인증 유저 전체 거래 조회"
  ON public.transactions FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- 월별 집계 뷰: 전체 유저 합산 (user_id 분리 제거)
CREATE OR REPLACE VIEW public.monthly_summary AS
SELECT
  to_char(date, 'YYYY-MM')                              AS ym,
  sum(CASE WHEN type = 'income'  THEN amount ELSE 0 END) AS total_income,
  sum(CASE WHEN type = 'expense' THEN amount ELSE 0 END) AS total_expense,
  sum(CASE WHEN type = 'income'  THEN amount
           WHEN type = 'expense' THEN -amount END)        AS balance
FROM public.transactions
GROUP BY to_char(date, 'YYYY-MM');

-- 카테고리별 지출 집계 뷰: 전체 유저 합산
CREATE OR REPLACE VIEW public.category_expense_summary AS
SELECT
  to_char(date, 'YYYY-MM') AS ym,
  category,
  sum(amount)               AS total_amount,
  count(*)                  AS tx_count
FROM public.transactions
WHERE type = 'expense'
GROUP BY to_char(date, 'YYYY-MM'), category;
