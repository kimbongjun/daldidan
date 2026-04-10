---
name: 달디단 프로젝트 개요
description: 일상 편의 웹앱 플랫폼 — 스택/구조/규칙 요약
type: project
---

일상의 편리함을 위한 Bento Grid 웹앱 플랫폼.

**Why:** 주식·날씨·쇼핑·문화·여행·가계부를 한 화면에서 제공

**스택:** Next.js 15 (App Router) · TypeScript strict · Zustand 5 · Tailwind CSS v4 · lucide-react · date-fns(ko)

**핵심 규칙:**
- 모든 위젯은 `"use client"` 필수 (Zustand SSR 오류 방지)
- Mock 데이터 상수는 `create()` 이전에 선언 (TDZ 방지)
- 색상은 CSS 변수(globals.css) + 인라인 style — Tailwind 임의값 금지
- 위젯 루트: `bento-card gradient-{color} h-full flex flex-col p-5 gap-4`

**레이아웃 (데스크톱):**
```
weather(1fr) | stock(2fr)   | budget(1fr)   ← 460px
shopping     | event(1fr)   | travel(1fr)   ← 420px
```

**How to apply:** 새 위젯 추가·스타일 변경·레이아웃 조정 시 이 규칙을 기준으로 판단
