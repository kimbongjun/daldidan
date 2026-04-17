# 위젯 패턴 레퍼런스

## 위젯별 액센트 색상

| 위젯 | 변수 | Hex | 그라디언트 클래스 |
|------|------|-----|----------------|
| 블로그 | `--accent-purple` | `#7C3AED` | `gradient-violet` |
| 가계부 | `--accent-indigo` | `#6366F1` | `gradient-indigo` |
| 축제 | `--accent-amber` | `#F59E0B` | `gradient-amber` |
| 맛집 | `--accent-orange` | `#EA580C` | `gradient-orange` |
| 여행 | `--accent-emerald` | `#10B981` | `gradient-emerald` |
| 주식 | `--accent-violet` | `#7C3AED` | `gradient-violet` |
| 날씨 | `--accent-cyan` | `#06B6D4` | `gradient-cyan` |
| 쇼핑 | `--accent-amber` | `#F59E0B` | `gradient-amber` |
| 공연/행사 | `--accent-rose` | `#F43F5E` | `gradient-rose` |

새 위젯 추가 시 위 목록에서 겹치지 않는 색상 선택 권장.

---

## BentoGrid grid-area 슬롯 추가 패턴

`app/page.tsx` 또는 `DashboardShell.tsx`의 grid-template-areas에 슬롯 추가:

```tsx
// 데스크톱 레이아웃 (lg)
style={{
  gridTemplateAreas: `
    "blog blog budget"
    "festival festival festival"
    "restaurant restaurant restaurant"
    "newwidget newwidget newwidget"  ← 추가
  `,
  gridTemplateColumns: "1fr 1fr 1fr",
}}

// 위젯 래퍼에 gridArea 지정
<div style={{ gridArea: "newwidget" }}>
  <NewWidget />
</div>
```

---

## 카드 캐러셀 패턴 (가로 스크롤)

```tsx
<div className="flex gap-3 overflow-x-auto scrollbar-hide flex-1 pb-0.5">
  {items.map((item) => (
    <div key={item.id}
      className="shrink-0 rounded-xl overflow-hidden cursor-pointer"
      style={{ width: 280, minWidth: 280 }}>
      {/* 카드 내용 */}
    </div>
  ))}
</div>
```

---

## 영업중/상태 뱃지

```tsx
// 영업중 (펄스 애니메이션)
<span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-semibold"
  style={{ background: "rgba(16,185,129,0.32)", color: "#10B981" }}>
  <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse inline-block" />
  영업중
</span>

// 종료
<span className="text-xs px-2 py-0.5 rounded-full font-semibold"
  style={{ background: "rgba(239,68,68,0.32)", color: "#EF4444" }}>
  영업종료
</span>
```

---

## 수입/지출 색상 규칙

```
수입: text-emerald-400 (#34D399) 또는 #10B981
지출: text-rose-400   (#FB7185) 또는 #F43F5E
잔액: balance >= 0 ? "#10B981" : "#F43F5E"
```

---

## PageHeader 사용법

```tsx
import PageHeader from "@/components/PageHeader";

<PageHeader
  title="페이지 제목"
  subtitle="서브타이틀 (선택)"
  accentColor={ACCENT}
  backHref="/"           // 생략 시 뒤로가기 없음
  actions={<button>...</button>}  // 선택
/>
```
