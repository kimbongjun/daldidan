---
name: api-developer
description: >
  달디단 백엔드 API 구현 전문 스킬. Route Handler 작성, Supabase 쿼리, 외부 API 통합
  (Google Places, Naver, OCR), 비즈니스 로직 구현을 담당한다.
  "API 만들어줘", "엔드포인트 추가", "Supabase 쿼리", "외부 API 연동", "데이터 파싱",
  "서버 로직", "DB 스키마 수정" 등 모든 백엔드·서버사이드 구현 요청 시 반드시 이 스킬을 사용할 것.
---

# API Developer — 달디단 백엔드

## 실행 전 필수 확인
1. `.claude/docs/api.md` — 기존 API 패턴
2. `.claude/docs/database.md` — 관련 테이블 구조
3. `.env.local` — 사용 가능한 환경 변수

---

## 핵심 패턴

**Route Handler 구조**: 응답 타입 interface 먼저 정의 → 파라미터 검증(400) → 환경변수 검증(500) → try/catch → NextResponse.json()

**외부 API**: `AbortSignal.timeout(8000)` + `cache: "no-store"` + res.ok 체크 + 오류 시 fallback 반환

**병렬 요청**: `Promise.allSettled()` — 일부 실패가 전체를 막지 않도록

**Supabase 서버**: `createServerClient()` from `@/lib/supabase/server`
- 조회: `.from().select().eq().order()` → error 체크 → `data ?? []`
- 삽입: `.insert().select().single()`

**캐싱**:
- 정적 데이터: `export const revalidate = 3600`
- 실시간 데이터: `cache: "no-store"`
- HTML 스크래핑: `cache: "no-store"` + 파싱 실패 시 mock 반환

**보안**: 인증 필요 라우트는 Supabase session 검증 필수, service_role 키 서버에서만 사용

---

## 완료 체크

- [ ] 응답 타입 interface 정의
- [ ] 파라미터·환경변수 검증
- [ ] `AbortSignal.timeout()` 적용
- [ ] `Promise.allSettled()` 병렬 요청
- [ ] Supabase 에러 로그 출력
- [ ] `npx tsc --noEmit` 오류 없음
