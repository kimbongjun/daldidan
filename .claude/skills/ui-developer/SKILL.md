---
name: ui-developer
description: >
  달디단 프론트엔드 UI 구현 전문 스킬. 위젯 추가, 페이지 구현, 컴포넌트 수정, 레이아웃 개선,
  디자인 시스템 적용, 반응형 처리를 담당한다. "위젯 만들어줘", "페이지 추가", "컴포넌트 수정",
  "레이아웃 깨짐", "스타일 개선", "말줄임 처리", "UI 개선" 등 모든 프론트엔드 구현 요청 시
  반드시 이 스킬을 사용할 것. 단순 코드 읽기·설명만 요청하는 경우는 제외.
---

# UI Developer — 달디단 프론트엔드

## 실행 전 필수 확인
1. `.claude/docs/design-system.md` — 색상 토큰, 유틸 클래스
2. 수정 대상 파일 — 기존 패턴 파악 후 일관성 유지

---

## 핵심 패턴

**위젯 루트**: `<div className="bento-card gradient-{color} h-full flex flex-col p-5 gap-4">`

**색상**: `const ACCENT = "#HEX"` → `style={{ color: ACCENT }}` / `style={{ background: \`${ACCENT}22\` }}`
- Tailwind 임의 색상값(`text-[#...]`) 절대 금지

**텍스트 overflow**: flex 자식에 `min-w-0`, 텍스트에 `truncate`

**뱃지/태그**: `.tag` 클래스 + `style={{ background: \`${ACCENT}22\`, color: ACCENT }}`

**스크롤**: `overflow-x-auto scrollbar-hide` / `overflow-y-auto scrollbar-hide`

**hover**: `hover:opacity-80 transition-opacity`

**로딩 상태**: skeleton shimmer (`skeleton-shimmer` 클래스) + loading/error/empty 3가지 처리

**모달**: `fixed inset-0 z-50`, ESC 키 닫기, 배경 클릭 닫기

**삭제 2-step**: 첫 클릭 → confirmDelete=true (3초 타임아웃), 두 번째 클릭 → 실제 삭제

---

## 반응형

| 브레이크포인트 | 처리 |
|-------------|------|
| 모바일 `<640px` | 단일 컬럼 flex |
| 태블릿 `640–1099px` | 2열 그리드, 고정 높이 |
| 데스크톱 `≥1100px` | `grid-template-areas` BentoGrid |

---

## 완료 체크

- [ ] `"use client"` 선언
- [ ] `.bento-card gradient-{color}` 루트 적용
- [ ] `truncate` + `min-w-0` overflow 처리
- [ ] loading / error / empty 세 상태 처리
- [ ] `npx tsc --noEmit` 오류 없음
- [ ] CSS 변수 / 인라인 style (Tailwind 임의값 금지)
