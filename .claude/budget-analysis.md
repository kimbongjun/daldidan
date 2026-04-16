# 가계부 현황 분석 및 개선 방향

> 작성일: 2026-04-16  
> 대상: `/app/budget/`, `/app/api/transactions/`, `/components/widgets/BudgetWidget.tsx`, `/lib/supabase/actions/budget.ts`

---

## 1. 현재 프로세스 흐름

```
[사용자]
  │
  ├─ 영수증 이미지 선택
  │     → preprocessReceiptImage()   # 그레이스케일·대비 강화 (클라이언트)
  │     → uploadImagesToStorage()    # /api/blog/images 에 원본 업로드 ⚠️
  │     → analyzeReceiptImage()      # /api/transactions/ocr → CLOVA OCR
  │     → 폼 자동 입력
  │
  ├─ 폼 직접 입력 → "거래 추가" 클릭
  │     → POST /api/transactions     # Supabase insert
  │     → 상태 업데이트 (setTransactions)
  │
  ├─ 내역 클릭 → 수정 폼 → "수정 저장"
  │     → PATCH /api/transactions/[id]
  │
  └─ 삭제 버튼
        → DELETE /api/transactions/[id]

[BudgetWidget — 홈 화면]
  └─ 독립적으로 GET /api/transactions  # 페이지와 별개로 전체 재요청
```

---

## 2. 문제점 및 개선 방향

### 🔴 Critical

#### 2-1. 영수증 이미지가 블로그 버킷에 저장됨
- **현황**: `uploadImagesToStorage()`가 `/api/blog/images` 엔드포인트를 호출
- **문제**: 영수증 이미지가 블로그 이미지 버킷(`blog-images`)에 섞여 저장됨
- **개선**: `/api/transactions/images` 전용 엔드포인트 및 `receipt-images` 버킷 분리

#### 2-2. Server Actions의 `updateTransaction`에 user_id 필터 없음
- **현황**: `lib/supabase/actions/budget.ts`의 `updateTransaction`, `deleteTransaction`이 `.eq("id", id)` 만 사용
- **문제**: 다른 유저의 거래를 ID만 알면 수정·삭제 가능 (미사용 코드지만 잠재 위협)
- **개선**: `.eq("user_id", user.id)` 추가 또는 미사용 코드 제거

---

### 🟠 High

#### 2-3. 데이터 접근 레이어 이중화
- **현황**: API Routes(`/api/transactions/`) + Server Actions(`lib/supabase/actions/budget.ts`)가 동일한 역할로 병존
- **문제**: `monthly_summary`, `category_expense_summary` 뷰를 조회하는 Server Actions이 UI에서 실제로 사용되지 않음 — 사문화된 코드
- **개선**: API Routes 단일 경로로 통일하거나 Server Actions으로 전환 중 하나를 제거

#### 2-4. 전체 거래 내역을 한 번에 로드
- **현황**: `GET /api/transactions` → 전체 목록 반환 (limit 없음)
- **문제**: 내역이 많아질수록 초기 로딩 지연, 위젯도 독립적으로 동일 요청 반복
- **개선**:
  - 페이지네이션 또는 월별 필터를 기본 파라미터로 추가 (`?month=2026-04`)
  - BudgetWidget은 최근 N건만 요청 (`?limit=10`)

#### 2-5. 월별 필터 없음
- **현황**: 전체 기간 합산만 표시, 특정 월을 선택하는 기능 없음
- **문제**: 내역이 쌓일수록 "이번 달 지출"과 "전체 누적"이 혼재
- **개선**: 월 선택 탭(이번 달 / 지난 달 / 전체) 추가, API에 `?month=YYYY-MM` 파라미터 지원

---

### 🟡 Medium

#### 2-6. `BUYER_OPTIONS` 하드코딩
- **현황**: `["공동", "봉준", "달희"]`가 소스 코드에 고정
- **문제**: 다른 사용자가 사용할 경우 이름을 코드 수정 없이 변경 불가
- **개선**: 사이트 옵션 또는 마이페이지에서 구성원 목록을 편집 가능하게 변경, Supabase에 저장

#### 2-7. 삭제 전 확인 없음
- **현황**: 삭제 버튼 클릭 즉시 `DELETE /api/transactions/[id]` 호출
- **문제**: 실수로 누를 경우 복구 불가
- **개선**: 인라인 확인 버튼(「정말 삭제?」→ 재클릭) 또는 confirm 다이얼로그 추가

#### 2-8. 입력값 서버 검증 없음
- **현황**: `POST /api/transactions`에서 amount, date 유효성 검사 없음
- **문제**: `amount: -1000`, `date: "invalid"` 등 잘못된 값 그대로 저장 가능
- **개선**:
  ```typescript
  if (!body.amount || body.amount <= 0) return 400;
  if (body.date && isNaN(new Date(body.date).getTime())) return 400;
  ```

#### 2-9. OCR 결과 신뢰도(confidence) 미활용
- **현황**: CLOVA OCR 응답의 `inferConfidence` 필드를 파싱에 전혀 활용하지 않음
- **문제**: 낮은 신뢰도 텍스트가 그대로 금액·매장명으로 사용될 수 있음
- **개선**: `inferConfidence < 0.6` 필드는 파싱에서 제외 또는 별도 표시

#### 2-10. 영수증 이미지 미리보기 중복 렌더링
- **현황**: OCR 완료 후 폼에 영수증 이미지 URL이 표시되는데, 해당 URL이 `/api/blog/images` 경유 퍼블릭 URL
- **문제**: 2-1 문제와 연동 — 블로그 버킷 URL이 가계부 폼에 표시됨
- **개선**: 2-1 해결과 함께 수정

---

### 🟢 Low (기능 확장)

#### 2-11. 카테고리별 예산 한도 설정 없음
- 월별 카테고리 예산 설정 → 초과 시 경고 표시
- 예: 식비 30만원 → 27만원 소비 시 진행률 바 빨간색 전환

#### 2-12. 정기 거래 등록 없음
- 월세·구독료 등 고정 지출을 매달 자동 생성하는 반복 거래 기능

#### 2-13. 구매자별 정산 기능 없음
- `buyer` 필드가 있지만 구매자별 합산 및 정산 금액 계산 UI가 없음
- `봉준 총지출 vs 달희 총지출` 비교 및 차액 정산 제안

#### 2-14. 내보내기(Export) 없음
- 전체 또는 월별 거래 내역 CSV / Excel 다운로드

---

## 3. 우선순위 로드맵

| 순위 | 항목 | 난이도 | 예상 효과 | 상태 |
|------|------|--------|-----------|------|
| 1 | 영수증 전용 스토리지 분리 (2-1) | 낮음 | 데이터 격리 | ✅ 완료 |
| 2 | 월별 필터 + API 파라미터 (2-5) | 중간 | UX 핵심 개선 | - |
| 3 | 전체 로드 → 페이지네이션 (2-4) | 중간 | 성능 | - |
| 4 | 삭제 확인 UX (2-7) | 낮음 | 실수 방지 | ✅ 완료 |
| 5 | 입력값 서버 검증 (2-8) | 낮음 | 데이터 무결성 | ✅ 완료 |
| 6 | OCR confidence 필터 (2-9) | 낮음 | OCR 정확도 | - |
| 7 | BUYER_OPTIONS 동적 설정 (2-6) | 중간 | 다사용자 지원 | - |
| 8 | 미사용 Server Actions 정리 (2-3) | 낮음 | 코드 품질 | - |
| 9 | 카테고리 예산 한도 (2-11) | 높음 | 기능 확장 | - |
| 10 | 구매자 정산 기능 (2-13) | 높음 | 기능 확장 | - |

---

## 4. 현재 데이터 모델 (transactions 테이블)

```
transactions
├── id                  uuid PK
├── user_id             uuid FK → auth.users
├── type                "income" | "expense"
├── category            string
├── buyer               "공동" | "봉준" | "달희"
├── merchant_name       string
├── location            string
├── receipt_image_url   string | null
├── amount              number
├── note                string
├── date                date (YYYY-MM-DD)
└── created_at          timestamp
```

### 향후 추가 고려 컬럼
```
├── is_recurring        boolean (정기 거래 여부)
├── recur_interval      "monthly" | "weekly" (반복 주기)
└── confidence_score    number (OCR 신뢰도 — 디버깅용)
```

---

## 5. OCR 파이프라인 현황

```
파일 선택
  → [클라이언트] preprocessReceiptImage()
      그레이스케일 + 대비 강화 + 1920px 리사이즈
  → [서버] /api/transactions/ocr
      CLOVA OCR 일반 모델 (특화 승인 대기 중)
  → [서버] buildPositionedFields()
      boundingPoly.vertices 기반 Y좌표 정규화
  → [서버] parseMerchantName()
      위치·길이·문자 비율 점수 기반 + 지점명 병합
  → [서버] parseAmount()
      키워드 슬라이딩 윈도우 → 하단 40% 최댓값
  → [서버] parseDate()
      7가지 날짜 패턴 매칭
  → [서버] recommendCategory()
      키워드 룰 기반 10개 카테고리 분류
```

### OCR 추가 개선 여지
- `inferConfidence` 기반 저신뢰도 필드 제외 (2-9)
- 특화 모델 승인 후 Receipt 구조체로 전환 → 정확도 대폭 향상
- 장기: Claude Vision으로 교체 시 구조화 이해 가능
