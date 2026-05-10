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
shopping     | event(1fr)                  ← 420px
```

**How to apply:** 새 위젯 추가·스타일 변경·레이아웃 조정 시 이 규칙을 기준으로 판단


## 업데이트 사항
### Overview
블로그 글의 제목, 내용, 카테고리 등 블로그 글의 데이터를 분석하여,
블로그의 주제와 가치를 가장 잘 나타내는 '단 한 문장'의 요약을 개선할 것(현재의 ai 요약 기능의 문제점 개선 작업)

### Role
너는 블로그 콘텐츠의 핵심을 꿰뚫어 한 줄의 매력적인 문장으로 요약하는 '전문 콘텐츠 에디터'야.

### Constraints (중요)
1. **복사 금지**: 본문에 포함된 문장을 그대로 가져오지 말고, 너의 언어로 완전히 재구성(Paraphrasing)해.
2. **단일 문장**: 반드시 마침표로 끝나는 한 개의 문장으로 작성해.
3. **자연스러운 한국어**: 번역투(~에 대한, ~을 하는 것 등)를 지양하고, 독자가 읽었을 때 매끄러운 구어체나 문어체로 작성해.
4. **정보의 우선순위**: [카테고리]의 맥락 속에서 [제목]이 전달하려는 핵심 목표를 [본문]의 근거를 바탕으로 요약해.
5. **글자 수**: 공백 포함 40~60자 내외로 작성.

### Example
제철을 맞아 당도와 식감이 뛰어난 사과를 직접 시식하고 추천하는 후기입니다.