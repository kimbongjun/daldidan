# 달디단 (Daldidan) — Claude Code Harness

## 프로젝트 개요
일상 편의 웹앱. 주식·날씨·쇼핑·공연·여행·가계부·캘린더·블로그·부동산 위젯을 Bento Grid로 제공.

## 기술 스택

| 항목 | 선택 |
|------|------|
| 프레임워크 | Next.js 15 (App Router) |
| 언어 | TypeScript (strict) |
| 상태관리 | Zustand 5 |
| 스타일 | Tailwind CSS v4 + CSS Variables |
| 아이콘 | lucide-react |
| 날짜 | date-fns (locale: ko) |
| 런타임 | Node.js, React 19 |

---

## 개발 명령어

```bash
npm run dev           # 개발 서버 (기본 포트 3000)
npm run build         # 프로덕션 빌드
npm run lint          # ESLint 검사
npm run test          # vitest
```

---

## 주의사항

- 모든 위젯은 `"use client"` 필수 (Zustand 훅 사용)
- Tailwind 임의 색상값(`text-[#...]`) 금지 — 인라인 `style` 사용
- `date-fns` locale은 `ko`
- 업데이트 완료 시: 타입·lint 오류 확인 후 `npm run dev` + `git push`
- push 알람 컴포넌트 오류 테스트 필수 후 배포

---

## 하네스: 달디단 개발 자동화

**트리거:** 달디단 코드 변경 작업 시 `orchestrator` 스킬 사용. 단순 읽기·설명은 직접 응답.

**레퍼런스 문서** (on-demand, 필요 시 읽기):
- `.claude/docs/architecture.md` — 디렉토리 구조, 라우트 맵
- `.claude/docs/design-system.md` — 색상 토큰, 유틸 클래스, BentoGrid
- `.claude/docs/components.md` — 위젯 목록, 공통 컴포넌트, Zustand 스토어
- `.claude/docs/api.md` — API 엔드포인트 전체 목록
- `.claude/docs/database.md` — DB 스키마, 인증 플로우
- `.claude/docs/features.md` — 기능 플로우, 라이브러리
- `.claude/docs/external-apis.md` — 외부 API, 환경 변수
