# 달디단 — 디자인 시스템 & 레이아웃

## 색상 토큰 (CSS 변수)

`app/globals.css`에 정의. **Tailwind 임의 색상값(`text-[#...]`) 사용 금지** — 반드시 인라인 `style` 또는 클래스를 사용한다.

```css
/* 배경 */
--bg-base:  #0F0F14    /* 페이지 배경 */
--bg-card:  #16161F    /* 카드 배경 */
--bg-input: #16161F    /* 입력 필드 배경 */

/* 테두리 / 텍스트 */
--border:        #2A2A3A
--text-primary:  #F1F1F5
--text-muted:    #8B8BA7

/* 위젯 액센트 */
--accent-violet:  #7C3AED   /* 주식 */
--accent-cyan:    #06B6D4   /* 날씨 */
--accent-amber:   #F59E0B   /* 쇼핑 / 축제 */
--accent-rose:    #F43F5E   /* 공연·행사 */
--accent-emerald: #10B981   /* 여행 */
--accent-indigo:  #6366F1   /* 가계부 */
--accent-sky:     #0EA5E9   /* 캘린더 */
--accent-purple:  #7C3AED   /* 블로그 */
```

라이트 테마는 `[data-theme="light"]` 블록에서 오버라이드.

---

## 유틸 클래스

| 클래스 | 용도 |
|--------|------|
| `.bento-card` | 위젯 외곽 스타일 (border, shadow, hover 전환) |
| `.gradient-violet` | 블로그·주식 위젯 배경 |
| `.gradient-cyan` | 날씨 위젯 배경 |
| `.gradient-amber` | 쇼핑·축제 위젯 배경 |
| `.gradient-rose` | 공연·행사 위젯 배경 |
| `.gradient-emerald` | 여행 위젯 배경 |
| `.gradient-indigo` | 가계부 위젯 배경 |
| `.gradient-sky` | 캘린더 위젯 배경 |
| `.accent-{color}` | 텍스트 액센트 색상 적용 |
| `.tag` | 뱃지/라벨 기본 스타일 (padding, border-radius) |
| `.pressable` | 클릭 피드백 (scale + brightness) |
| `.scrollbar-hide` | 스크롤바 숨김 |
| `.animate-pulse-glow` | 펄스 글로우 애니메이션 |
| `.animate-ticker` | 좌우 티커 스크롤 |
| `.blog-prose` | 블로그 콘텐츠 읽기 타이포그래피 |
| `.blog-editor-content` | TipTap 에디터 내부 스타일 |

---

## 컴포넌트 스타일 규칙

```
1. 위젯 루트 → <div className="bento-card gradient-{color} h-full flex flex-col p-5 gap-4">
2. 위젯 헤더 → accent 색 라벨(uppercase tracking-widest) + h2 제목 + .tag 뱃지
3. 스크롤 영역 → overflow-x-auto scrollbar-hide
4. hover → hover:opacity-80 transition-opacity
5. 태그 배경 → style={{ background: `${ACCENT}22`, color: ACCENT }}
6. 비활성 태그 → style={{ background: `${ACCENT}18`, color: "var(--text-muted)" }}
```

---

## BentoGrid 레이아웃

### 컨테이너: `components/home/DashboardShell.tsx`

| 브레이크포인트 | 구성 |
|--------------|------|
| 모바일 `<640px` | 단일 컬럼 flex (위젯 순서대로 적층) |
| 태블릿 `640–1099px` | 2열 그리드, 위젯별 고정 높이 |
| 데스크톱 `≥1100px` | `grid-template-areas` |

**데스크톱 grid-template-areas:**
```
"blog    budget"
"blog    calendar"
"festival festival"
"realestate realestate"
```

컬럼 비율: `2fr 1fr`

### 새 위젯 grid-area 추가 패턴

```tsx
// DashboardShell.tsx grid-template-areas에 슬롯 추가
"newwidget newwidget"  ← 추가

// 데스크톱·태블릿·모바일 3곳 모두 추가
<div style={{ gridArea: "newwidget", minWidth: 0 }}><NewWidget /></div>
```
