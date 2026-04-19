---
name: orchestrator
description: >
  달디단 프로젝트 하네스 오케스트레이터. 위젯·페이지·API 신규 구현, 기존 기능 수정,
  버그 수정, 디자인 개선, 리팩토링 등 달디단 개발 작업 전반을 에이전트 팀으로 조율한다.
  "만들어줘", "추가해줘", "수정해줘", "고쳐줘", "개선해줘", "다시 실행", "재실행",
  "업데이트", "보완", "이전 결과 기반으로" 등 달디단 코드 변경을 요청하면 반드시 이 스킬을 사용할 것.
  단순 코드 설명·읽기·질문은 직접 응답 가능.
---

# 달디단 오케스트레이터

## 에이전트 팀 구성

| 에이전트 | 역할 | 실행 모드 |
|---------|------|---------|
| `ui-developer` | 프론트엔드 위젯·컴포넌트·페이지 구현 | 팀 멤버 |
| `api-developer` | Route Handler·Supabase·외부 API 구현 | 팀 멤버 |
| `qa-validator` | 통합 정합성 검증 | 팀 멤버 |

**실행 모드:** 하이브리드
- Phase 1–2: 오케스트레이터 단독 분석
- Phase 3: 에이전트 팀 (ui-developer + api-developer 병렬 작업)
- Phase 4: qa-validator 서브 에이전트 (독립 검증)

---

## Phase 0: 컨텍스트 확인

작업 시작 전 이전 실행 컨텍스트를 확인한다:

```
_workspace/ 존재 + 부분 수정 요청 → 해당 에이전트만 재호출
_workspace/ 존재 + 새 작업 요청  → _workspace_prev/ 로 이동 후 새 실행
_workspace/ 없음                 → 초기 실행
```

초기 실행 시 `_workspace/` 디렉토리 생성.

---

## Phase 1: 요청 분석

다음 정보를 파악한다:

1. **작업 유형 분류**
   - UI 전용: 위젯 스타일 수정, 컴포넌트 레이아웃 변경 → ui-developer만 투입
   - API 전용: 엔드포인트 추가, 쿼리 수정 → api-developer만 투입
   - 풀스택: 새 기능(위젯+API) → 두 에이전트 병렬 투입

2. **관련 파일 목록 작성**
   - docs/components.md 위젯, docs/api.md 엔드포인트 참조
   - 수정 대상 파일 경로 확정

3. **의존성 파악**
   - API 응답 타입이 UI에 영향을 주면 → api-developer가 스펙 먼저 확정 후 ui-developer에 전달

---

## Phase 2: 작업 명세 작성

각 에이전트에게 전달할 명세를 작성한다:

```
ui-developer 명세:
- 구현 대상: {컴포넌트명 / 페이지 경로}
- 기능 요구사항: {상세 설명}
- accent 색상: {hex or 위젯명}
- API 스펙: {api-developer가 제공하는 엔드포인트 URL + 응답 타입}

api-developer 명세:
- 엔드포인트: {METHOD /api/path}
- 요청 파라미터: {파라미터명, 타입}
- 응답 타입: {인터페이스 정의}
- 사용 외부 API: {Google Places / Supabase / 없음}

qa-validator 명세:
- 검증 대상 파일 목록
- 경계면 체크포인트 (ui-developer, api-developer가 보고한 위험 지점)
```

---

## Phase 3: 에이전트 팀 실행

### 풀스택 작업 (UI + API)

```
1. api-developer에게 먼저 API 스펙 확정 요청
   → api-developer: "스펙 확정 완료, 응답 타입: {인터페이스}" 회신

2. ui-developer와 api-developer 병렬 실행
   - ui-developer: 확정된 API 스펙 기반으로 UI 구현
   - api-developer: Route Handler 구현

3. 각 에이전트 완료 보고 수신:
   - "구현 완료 파일: [...], 검증 포인트: [...]"
```

### UI 전용 작업

ui-developer만 단독 실행.

### API 전용 작업

api-developer만 단독 실행.

---

## Phase 4: QA 검증

구현 완료 후 qa-validator 실행:

```
1. 구현 완료 파일 목록 + 검증 포인트를 qa-validator에게 전달
2. qa-validator: 검증 실행 (tsc --noEmit, 경계면 비교, 버그 패턴 체크)
3. 수정 필요 항목 있으면:
   - 해당 에이전트에게 수정 요청
   - 수정 완료 후 qa-validator 재실행
4. 모든 항목 통과 → Phase 5로 진행
```

---

## Phase 5: 최종 처리

```
1. 빌드 최종 확인: npx tsc --noEmit
2. git push 여부 사용자에게 확인 (자동으로 push하지 않음)
3. 완료 요약 보고:
   - 구현된 파일 목록
   - 주요 변경 사항
   - 사용자 테스트 방법 (로컬 확인 방법)
4. _workspace/ 보존 (사후 검증·감사 추적용)
```

---

## 데이터 전달 프로토콜

| 전달 방향 | 방식 | 내용 |
|----------|------|------|
| 오케스트레이터 → 에이전트 | 메시지 | 작업 명세 |
| api-developer → ui-developer | 메시지 | API 스펙 (타입 포함) |
| 에이전트 → qa-validator | 메시지 | 완료 파일 + 검증 포인트 |
| qa-validator → 에이전트 | 메시지 | 수정 필요 항목 |
| 에이전트 → 오케스트레이터 | 메시지 | 완료 보고 |
| 중간 산출물 | 파일 | `_workspace/{phase}_{agent}_{artifact}.md` |

---

## 에러 핸들링

| 상황 | 처리 |
|------|------|
| 외부 API 키 없음 | api-developer가 즉시 보고, 사용자에게 환경 변수 설정 안내 |
| 타입 빌드 오류 | qa-validator 보고 → 해당 에이전트 수정 → 재빌드 |
| QA 2회 실패 | 오케스트레이터가 사용자에게 직접 확인 요청 |
| 에이전트 무응답 | 3분 후 재호출 1회, 재실패 시 단독 처리로 전환 |

---

## 테스트 시나리오

### 정상 흐름: 새 위젯 추가

```
사용자: "공휴일 위젯 추가해줘"

1. 분석: UI + API 풀스택 작업
2. api-developer: GET /api/holidays 엔드포인트 설계
3. ui-developer + api-developer 병렬 구현
4. qa-validator: 타입 정합성 + 디자인 시스템 검증
5. 완료 보고
```

### 에러 흐름: 타입 불일치

```
1. qa-validator: API 응답 `rating: string` vs UI에서 `rating.toFixed(1)` 사용 → 타입 오류
2. 오케스트레이터: api-developer에게 타입 수정 요청 (string → number)
3. api-developer: 수정 완료
4. qa-validator: 재검증 → 통과
```

---

## 후속 작업 지원

부분 수정 요청 시:
- "이 부분만 다시" → 해당 에이전트만 재호출
- "전체 다시" → _workspace_prev/ 이동 후 전체 재실행
- "결과 개선" → qa-validator 재실행 후 수정 에이전트 호출
