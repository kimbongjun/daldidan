# 달디단 (Daldidan) — Claude Code Harness

## 프로젝트 개요
일상의 편리함을 제공하는 웹앱 플랫폼.
주식(국내/해외), 날씨, 쇼핑 특가, 영화/공연/전시, 여행, 가계부 기능을 Bento Grid 레이아웃으로 제공한다.

---

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

## 디렉토리 구조

```
app/
  globals.css          # CSS 변수 + 유틸 클래스 (bento-card, gradient-*, accent-*, tag)
  layout.tsx           # HTML 루트 + 메타데이터
  page.tsx             # 메인 페이지 — BentoGrid (lg/md/sm 분기)
components/
  Header.tsx           # 로고, 시간대별 인사말, 실시간 시계
  QuickStats.tsx       # 상단 핵심 지표 4개 요약 바
  widgets/
    StockWidget.tsx    # 국내·해외 주식 목록 + 자동 티커 테이프
    WeatherWidget.tsx  # 현재 날씨 + 4일 예보
    ShoppingWidget.tsx # 이벤트 특가 목록 (할인율·만료일)
    EventWidget.tsx    # 영화·공연·전시
    TravelWidget.tsx   # 추천 여행지 (평점·가격)
    BudgetWidget.tsx   # 가계부 CRUD (수입/지출·잔액)
store/
  useAppStore.ts       # Zustand 전역 스토어 + 타입 정의 + Mock 데이터
.claude/
  CLAUDE.md            # 이 파일 — 하네스 전체 문서
  settings.json        # Claude Code 권한 + 훅 설정
  memory/
    MEMORY.md          # 메모리 인덱스
    project_daldidan.md# 프로젝트 핵심 요약 메모리
```

---

## 색상 시스템 (Vibrant Accents)

CSS 변수는 `app/globals.css`에 정의. 직접 인라인 style로 사용한다 (`className`에 Tailwind 컬러 대신).

| 변수 / 클래스 | Hex | 용도 |
|--------------|-----|------|
| `--accent-violet` / `.gradient-violet` | `#7C3AED` | 주식 위젯 |
| `--accent-cyan` / `.gradient-cyan` | `#06B6D4` | 날씨 위젯 |
| `--accent-amber` / `.gradient-amber` | `#F59E0B` | 쇼핑 위젯 |
| `--accent-rose` / `.gradient-rose` | `#F43F5E` | 문화 위젯 |
| `--accent-emerald` / `.gradient-emerald` | `#10B981` | 여행 위젯 |
| `--accent-indigo` / `.gradient-indigo` | `#6366F1` | 가계부 위젯 |
| `--bg-base` | `#0F0F14` | 페이지 배경 |
| `--bg-card` | `#16161F` | 카드 배경 |
| `--border` | `#2A2A3A` | 카드 테두리 |
| `--text-primary` | `#F1F1F5` | 주요 텍스트 |
| `--text-muted` | `#8B8BA7` | 보조 텍스트 |

---

## 레이아웃 규칙

- **데스크톱(≥1024px)**: `grid-template-areas`로 6-cell Bento Grid
  ```
  "weather  stock   budget"   ← 460px 행
  "shopping event   travel"   ← 420px 행
  ```
  컬럼 비율: `1fr 2fr 1fr`
- **태블릿(640–1023px)**: 2열 그리드, 각 위젯 고정 높이
- **모바일(<640px)**: 단일 열 flex, 위젯별 고정 높이

---

## 스타일 컨벤션

1. 위젯 외관은 반드시 `.bento-card` 클래스를 루트에 적용한다.
2. 위젯 배경 그라디언트는 `.gradient-{color}` 유틸 클래스를 사용한다.
3. accent 색상은 `style={{ color: "#HEX" }}` 또는 `.accent-{color}` 클래스로 적용한다.
4. 태그/뱃지는 `.tag` 클래스를 사용하고 `background`/`color`를 인라인으로 넣는다.
5. 스크롤 영역은 `.scrollbar-hide` 클래스로 스크롤바를 숨긴다.
6. hover 효과는 `hover:opacity-80 transition-opacity` 패턴을 쓴다.
7. Tailwind의 임의 색상값(`text-[#...]`) 사용 금지 — 인라인 style을 쓴다.

---

## 상태 관리 (Zustand)

- 스토어: `store/useAppStore.ts` — 단일 스토어
- Mock 데이터 상수는 반드시 `create()` 호출 **이전**에 선언한다 (TDZ 방지).
- 새 위젯 추가 시 타입 인터페이스 → Mock 데이터 상수 → 스토어 상태/액션 순서로 작성한다.
- 서버 컴포넌트에서 Zustand 훅 직접 호출 금지 → 모든 위젯은 `"use client"` 필수.

---

## 새 위젯 추가 절차

1. `store/useAppStore.ts`에 타입·Mock 데이터·상태 추가
2. `components/widgets/XxxWidget.tsx` 생성 (`"use client"` 필수)
   - 루트: `<div className="bento-card gradient-{color} h-full flex flex-col p-5 gap-4">`
   - 헤더 섹션: accent 색 label + 제목 + `.tag` 뱃지
3. `app/page.tsx` BentoGrid에 grid-area 슬롯 추가
4. `QuickStats.tsx`에 요약 지표 추가 (선택)

---

## 개발 명령어

```bash
npm run dev      # 개발 서버 (기본 포트 3000)
npm run build    # 프로덕션 빌드
npm run lint     # ESLint 검사
```

---

## 주의사항

- `date-fns` locale은 `ko`(한국어)를 사용한다.
- 빌드 전 `npx next build`로 타입·lint 오류를 반드시 확인한다.
- 모든 언어는 꺠지지 않게 `UTF-8` 언어셋을 지킨다.
- `"use client"` 없이 Zustand 훅을 쓰면 SSR prerender 오류가 발생한다.
- 업데이트가 완료되면 타입,lint 오류 검증 후 `npm run dev` 와 `git push`를 진행한다.

---

## 하네스: 달디단 개발 자동화

**목표:** 위젯·페이지·API 구현과 QA 검증을 에이전트 팀(ui-developer + api-developer + qa-validator)으로 자동화한다.

**트리거:** 달디단 코드 변경 작업(구현·수정·버그 수정·개선) 요청 시 `orchestrator` 스킬을 사용하라. 단순 코드 읽기·설명은 직접 응답 가능.

**상세 문서:** `.claude/ENGINEERING.md` — 컴포넌트 구조, 디자인 가이드, API 스펙 전체 참조.

**변경 이력:**
| 날짜 | 변경 내용 | 대상 | 사유 |
|------|----------|------|------|
| 2026-04-17 | 초기 하네스 구성 | 전체 | 달디단 개발 자동화 |

---

## 업데이트 사항
- 프로젝트: 부동산 정보 위젯 데이터 구성 및 로직 설계

### 1. 핵심 타겟 유저
- 아파트 청약 대기자 및 실거주 위주 투자자
- 지역별 시세 변동을 주기적으로 확인하는 사용자

### 2. 수집 및 구성이 필요한 추가 정보 항목
단순 시세 외에 사용자의 체류 시간을 늘릴 수 있는 유용한 데이터 항목들입니다.

  #### A. 정책 및 대출 (Financial Insight)
  - **생애주기별 대출 금리 모니터링:** 디딤돌, 버팀목, 특례보금자리론 등 주요 정책 금융 금리 현황 (주택금융공사 API 연동 추천)
  - **부동산 세금 계산기:** 취득세, 종부세, 양도세 간편 계산 로직

  #### B. 청약 및 분양 (Subscription Focus)
  - **청약 가점 계산기:** 사용자 데이터를 기반으로 본인의 청약 가점을 저장하고 관리하는 기능
  - **단지별 커뮤니티 반응 스크래핑:** 블라인드, 호갱노노, 부동산 스터디 등 주요 커뮤니티의 특정 단지 언급 빈도 및 긍정/부정 키워드 분석

  #### C. 지역 호재 및 입지 분석 (Location Analysis)
  - **교통 호재 타임라인:** GTX, 지하철 연장선 등 예정된 교통망의 착공/개통 일정 리스트
  - **학군 정보:** 지역별 특화 학업 성취도 또는 학원가 밀집도 데이터 (공공데이터포털 학교 알리미 API 활용)

  #### D. 시장 지표 (Market Sentiment)
  - **KB 주택가격동향 및 매수우위지수:** 현재 시장이 매도자 우위인지 매수자 우위인지 직관적인 게이지 위젯으로 표현
  - **실거래가 vs 매물가 괴리율:** 최근 실거래 대비 현재 올라온 매물의 호가 차이를 분석하여 저평가/고평가 여부 판단

### 3. 기술적 구현 요청 사항
- **API 연동:** 국토교통부 실거래가 API, 한국부동산원 청약홈 API 등의 엔드포인트와 데이터 파싱 로직 제안
- **크롤링/스크래핑:** 네이버 부동산, 아실 등에서 유의미한 데이터를 추출하기 위한 파이썬 기반 BeautifulSoup/Selenium 스크립트 구조 설계