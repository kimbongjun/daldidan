---
name: qa-validator
description: >
  달디단 UI·API 구현 완료 후 통합 정합성을 검증하는 QA 스킬. 타입 불일치, 레이아웃 깨짐,
  디자인 시스템 위반, 반응형 미처리, 빌드 오류를 탐지한다.
  "검증해줘", "QA", "타입 체크", "빌드 오류", "레이아웃 확인", "정합성 검사" 요청 시 사용.
  ui-developer·api-developer 완료 후 자동으로 이 스킬을 실행할 것.
---

# QA Validator 스킬 — 달디단 품질 검증

## 역할 개요

UI와 API 구현의 경계면 정합성을 검증한다.
"파일이 있는가"가 아닌 **"연결이 올바른가"** 를 확인한다.

---

## 검증 실행 순서

### Step 1: 빌드 검증 (즉시 실행)

```bash
npx tsc --noEmit 2>&1
npm run lint 2>&1
```

빌드 실패 → 즉시 오케스트레이터에 보고, 해당 에이전트에 수정 요청.

---

### Step 2: 경계면 교차 비교

**API ↔ UI 타입 비교:**
1. Route Handler의 응답 타입 인터페이스를 읽는다
2. 해당 API를 호출하는 컴포넌트에서 사용하는 필드를 확인한다
3. 불일치 항목 목록화

```
체크포인트:
- API가 string을 반환하는데 컴포넌트가 number로 사용하는가?
- API에서 null 가능한 필드를 컴포넌트가 undefined 처리 없이 접근하는가?
- API 응답 배열의 key 필드가 유니크한가? (React key prop)
```

**Supabase 스키마 ↔ 쿼리 비교:**
1. docs/database.md 스키마 또는 마이그레이션 파일 확인
2. 실제 쿼리에서 참조하는 컬럼명 비교
3. null 가능 컬럼에 null 처리 누락 시 버그 등록

---

### Step 3: 달디단 공통 버그 패턴 체크

| 버그 유형 | 체크 방법 |
|----------|---------|
| **Hydration 에러** | `"use client"` 누락 파일 검색, Zustand 훅 서버 사용 여부 |
| **레이아웃 깨짐** | `flex-1 min-w-0` 없는 텍스트 overflow 지점 |
| **말줄임 누락** | 동적 데이터 렌더링에서 `truncate` 미적용 |
| **이미지 mixed content** | `http://` URL이 `<img src>` 또는 CSS `url()`에 직접 사용 |
| **env 변수 미처리** | `.trim()` 없는 `process.env.VAR` 사용 |
| **allSettled 미사용** | 외부 API 병렬 호출에서 `Promise.all` 사용 → 단일 실패로 전체 중단 |
| **색상 시스템 위반** | `text-[#...]` 형식의 Tailwind 임의 색상값 사용 |
| **상태 미처리** | loading/error/empty 세 상태 중 하나라도 누락 |

---

### Step 4: 디자인 시스템 준수 확인

```
위젯 루트 체크:
- className에 "bento-card" 포함?
- className에 "gradient-{color}" 포함?
- "h-full flex flex-col" 포함?

색상 체크:
- style={{ color: "var(--text-*)" }} 또는 style={{ color: "#HEX" }} 형태?
- className에 text-[#...] 형태가 있으면 → 위반
```

---

### Step 5: 반응형 처리 확인

```
- 모바일 레이아웃 처리 (sm: 미만)
- 태블릿 레이아웃 처리 (sm: ~ lg: 미만)
- 데스크톱 레이아웃 처리 (lg: 이상)
- 텍스트 overflow가 각 브레이크포인트에서 보호되는가?
```

---

## 보고 형식

오케스트레이터에게 다음 형식으로 보고한다:

```
## QA 검증 결과

### ✅ 통과 항목
- 타입 정합성: API 응답과 컴포넌트 타입 일치
- 빌드: tsc --noEmit 오류 없음
- ...

### ⚠️ 수정 필요 항목
| 파일 | 줄 | 문제 | 수정 방향 | 담당 |
|------|---|------|---------|-----|
| components/widgets/XxxWidget.tsx | 45 | truncate 없이 동적 텍스트 렌더링 | max-w-[8rem] truncate 추가 | ui-developer |

### 🚨 긴급 (빌드 실패 / 런타임 크래시)
- (없으면 생략)

### 재검증 필요 여부
수정 항목이 있으면 → 수정 완료 후 재검증 요청
없으면 → 검증 완료
```

---

## 완료 기준

모든 항목이 통과하거나, 수정 필요 항목이 모두 해소되면 검증 완료.
긴급 항목이 0개이고 수정 필요 항목이 0개면 최종 승인.
