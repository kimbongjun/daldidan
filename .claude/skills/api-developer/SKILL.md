---
name: api-developer
description: >
  달디단 백엔드 API 구현 전문 스킬. Route Handler 작성, Supabase 쿼리, 외부 API 통합
  (Google Places, Naver, OCR), 비즈니스 로직 구현을 담당한다.
  "API 만들어줘", "엔드포인트 추가", "Supabase 쿼리", "외부 API 연동", "데이터 파싱",
  "서버 로직", "DB 스키마 수정" 등 모든 백엔드·서버사이드 구현 요청 시 반드시 이 스킬을 사용할 것.
---

# API Developer 스킬 — 달디단 백엔드

## 역할 개요

달디단의 Route Handler, Supabase 쿼리, 외부 API 통합을 구현한다.
타입 안전성과 외부 의존성 실패에 대한 견고한 폴백을 최우선으로 한다.

---

## 실행 전 필수 확인

작업 시작 전:
1. `.claude/docs/api.md` — 기존 API 패턴 파악
2. `.claude/docs/database.md` — 관련 테이블 구조 확인
3. `.env.local` — 사용 가능한 환경 변수 확인

---

## Route Handler 구현 패턴

### 기본 구조

```typescript
// app/api/{resource}/route.ts
import { NextRequest, NextResponse } from "next/server";

// 1. 응답 타입 먼저 정의
interface ResponseType {
  items: Item[];
}

interface Item {
  id: string;
  name: string;
  // ...
}

// 2. 핸들러 구현
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const param = searchParams.get("param");

  // 필수 파라미터 검증
  if (!param) {
    return NextResponse.json({ error: "param이 필요합니다." }, { status: 400 });
  }

  // 환경 변수 검증
  const apiKey = process.env.API_KEY?.trim();
  if (!apiKey) {
    return NextResponse.json({ error: "API_KEY가 설정되지 않았습니다." }, { status: 500 });
  }

  try {
    const data = await fetchSomething(apiKey);
    return NextResponse.json({ items: data });
  } catch (err) {
    console.error("[route] 에러:", err);
    return NextResponse.json({ error: "서버 오류가 발생했습니다." }, { status: 500 });
  }
}
```

### 외부 API 호출 패턴

```typescript
// AbortSignal.timeout + 타입 단언
const res = await fetch("https://api.example.com/data", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "X-Api-Key": apiKey,
  },
  body: JSON.stringify({ query: param }),
  signal: AbortSignal.timeout(8000),   // 8초 타임아웃
  cache: "no-store",
});

if (!res.ok) {
  const text = await res.text().catch(() => "");
  console.error("[route] 외부 API 에러:", res.status, text.slice(0, 300));
  return [];  // 또는 폴백 데이터 반환
}

const data = (await res.json()) as ExternalApiResponse;
```

### 병렬 요청 (allSettled 패턴)

```typescript
// 일부 실패가 전체를 막지 않도록 allSettled 사용
const [result1, result2] = await Promise.allSettled([
  fetchBatch1(apiKey),
  fetchBatch2(apiKey),
]);

const items = [
  ...(result1.status === "fulfilled" ? result1.value : []),
  ...(result2.status === "fulfilled" ? result2.value : []),
];
```

---

## Supabase 패턴

### 서버 컴포넌트 / Route Handler

```typescript
import { createServerClient } from "@/lib/supabase/server";

const supabase = createServerClient();

// 목록 조회
const { data, error } = await supabase
  .from("table_name")
  .select("id, field1, field2")
  .eq("user_id", userId)
  .order("created_at", { ascending: false });

if (error) {
  console.error("[query] Supabase 에러:", error);
  return [];
}
return data ?? [];

// 단건 삽입
const { data: inserted, error: insertError } = await supabase
  .from("table_name")
  .insert({ field1: value1, field2: value2 })
  .select()
  .single();
```

### 관계 조회 (join)

```typescript
// profiles 조인 예시
const { data } = await supabase
  .from("transactions")
  .select("*, profiles(display_name)")
  .eq("user_id", userId);

// 응답 타입 정의
interface TransactionWithProfile {
  id: string;
  amount: number;
  profiles: { display_name: string | null } | null;
}
```

---

## 캐싱 전략

```typescript
// 자주 변경되지 않는 데이터 (축제, 여행 정보)
export const revalidate = 3600; // 1시간

// 실시간 데이터 (거래, 사용자 정보)
const res = await fetch(url, { cache: "no-store" });

// 사진 등 정적 자원
const res = await fetch(url, { next: { revalidate: 86400 } }); // 24시간
```

---

## 완료 후 체크리스트

- [ ] 응답 타입 인터페이스 정의
- [ ] 필수 파라미터 검증 (400 반환)
- [ ] 환경 변수 검증 (500 반환)
- [ ] 외부 API 호출에 `AbortSignal.timeout()` 적용
- [ ] 병렬 요청에 `Promise.allSettled()` 사용
- [ ] Supabase 에러 로그 출력
- [ ] `npx tsc --noEmit` 오류 없음

---

## 참고

환경 변수 전체 목록과 외부 API 상세 스펙은 `references/api-specs.md` 참조.
