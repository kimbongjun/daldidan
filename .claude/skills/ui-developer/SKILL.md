---
name: ui-developer
description: >
  달디단 프론트엔드 UI 구현 전문 스킬. 위젯 추가, 페이지 구현, 컴포넌트 수정, 레이아웃 개선,
  디자인 시스템 적용, 반응형 처리를 담당한다. "위젯 만들어줘", "페이지 추가", "컴포넌트 수정",
  "레이아웃 깨짐", "스타일 개선", "말줄임 처리", "UI 개선" 등 모든 프론트엔드 구현 요청 시
  반드시 이 스킬을 사용할 것. 단순 코드 읽기·설명만 요청하는 경우는 제외.
---

# UI Developer 스킬 — 달디단 프론트엔드

## 역할 개요

달디단의 컴포넌트·위젯·페이지를 구현하고 수정한다.
디자인 시스템 규칙 준수와 반응형 처리를 최우선으로 한다.

---

## 실행 전 필수 확인

작업 시작 전 다음 파일을 반드시 읽는다:
1. `.claude/ENGINEERING.md` §3 디자인 시스템 — 색상 토큰, 유틸 클래스 확인
2. 수정 대상 파일 — 기존 코드 패턴 파악 후 일관성 유지

---

## 구현 패턴

### 위젯 루트 구조

```tsx
"use client";

const ACCENT = "#HEXCOLOR"; // ENGINEERING.md §3-1 색상 토큰 참조

export default function XxxWidget() {
  return (
    <div className="bento-card gradient-{color} h-full flex flex-col p-5 gap-4">
      {/* 헤더 */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: ACCENT }}>
            라벨 텍스트
          </p>
          <h2 className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>
            위젯 제목
          </h2>
        </div>
        {/* 전체보기 링크 등 */}
      </div>

      {/* 콘텐츠 영역 */}
      <div className="flex gap-3 overflow-x-auto scrollbar-hide flex-1">
        {/* 아이템 카드들 */}
      </div>
    </div>
  );
}
```

### 텍스트 말줄임 (레이아웃 보호)

```tsx
{/* 단일 줄 말줄임 */}
<p className="text-sm font-semibold truncate" style={{ color: "var(--text-primary)", maxWidth: "10rem" }}>
  {text}
</p>

{/* 뱃지/태그 말줄임 */}
<span className="text-[11px] px-1.5 py-0.5 rounded-md max-w-[5rem] truncate"
  style={{ color: ACCENT, background: `${ACCENT}22` }}>
  {label}
</span>

{/* flex 컨테이너 내 overflow 방지 */}
<div className="flex-1 min-w-0">
  <p className="truncate">...</p>
</div>
```

### 태그/뱃지 스타일

```tsx
{/* 활성 태그 */}
<span className="tag" style={{ background: ACCENT, color: "#fff" }}>활성</span>

{/* 비활성 태그 */}
<span className="tag" style={{ background: `${ACCENT}18`, color: "var(--text-muted)" }}>비활성</span>

{/* 카테고리 색상 뱃지 */}
<span className="text-xs px-2 py-0.5 rounded-full font-semibold"
  style={{ background: `${COLOR}22`, color: COLOR }}>
  {category}
</span>
```

### 스켈레톤 / 로딩 상태

```tsx
function SkeletonCard() {
  return (
    <div className="shrink-0 rounded-xl animate-pulse"
      style={{ width: 280, minWidth: 280, height: "100%", background: "rgba(255,255,255,0.06)" }} />
  );
}

// 로딩 / 에러 / 빈 상태 3가지 모두 처리
{loading ? (
  <><SkeletonCard /><SkeletonCard /></>
) : error ? (
  <div className="flex-1 flex items-center justify-center text-sm" style={{ color: "var(--text-muted)" }}>
    {error}
  </div>
) : items.length === 0 ? (
  <div className="flex-1 flex items-center justify-center text-sm" style={{ color: "var(--text-muted)" }}>
    데이터가 없습니다.
  </div>
) : (
  items.map((item) => <ItemCard key={item.id} item={item} />)
)}
```

### 삭제 2-step 확인

```tsx
const [confirmDelete, setConfirmDelete] = useState(false);

const handleDeleteClick = () => {
  if (confirmDelete) {
    onDelete();
  } else {
    setConfirmDelete(true);
    setTimeout(() => setConfirmDelete(false), 3000);
  }
};

<button onClick={handleDeleteClick}
  style={{
    padding: confirmDelete ? "2px 6px" : "2px",
    background: confirmDelete ? "rgba(244,63,94,0.15)" : "transparent",
  }}>
  {confirmDelete
    ? <span className="text-[10px] font-bold" style={{ color: "#F43F5E" }}>삭제?</span>
    : <Trash2 size={12} className="opacity-40 hover:opacity-80 transition-opacity" />}
</button>
```

### 모달 패턴

```tsx
// ESC 키 닫기 + 배경 클릭 닫기
useEffect(() => {
  const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
  window.addEventListener("keydown", handler);
  return () => window.removeEventListener("keydown", handler);
}, [onClose]);

<div className="fixed inset-0 z-50 flex items-center justify-center"
  style={{ background: "rgba(0,0,0,0.82)", backdropFilter: "blur(8px)" }}
  onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
  <div className="relative flex flex-col rounded-2xl overflow-hidden"
    style={{
      width: "min(420px, 94vw)",
      background: "var(--bg-card)",
      border: "1px solid var(--border)",
      boxShadow: "0 24px 80px rgba(0,0,0,0.7)",
    }}>
    {/* 모달 내용 */}
  </div>
</div>
```

---

## 반응형 처리 기준

| 브레이크포인트 | 클래스 | 처리 방식 |
|-------------|-------|---------|
| 모바일 `<640px` | `sm:` 미만 | 단일 컬럼 flex, 위젯 적층 |
| 태블릿 `640–1023px` | `sm:` ~ `lg:` 미만 | 2열 그리드, 고정 높이 |
| 데스크톱 `≥1024px` | `lg:` 이상 | `grid-template-areas` BentoGrid |

---

## 완료 후 체크리스트

- [ ] `"use client"` 선언 있음
- [ ] `.bento-card gradient-{color}` 루트에 적용
- [ ] 텍스트 overflow 가능한 곳에 `truncate` + `max-w-*` 적용
- [ ] `flex` 자식에 `min-w-0` 적용
- [ ] loading / error / empty 세 상태 모두 처리
- [ ] `npx tsc --noEmit` 오류 없음
- [ ] 색상은 CSS 변수 또는 인라인 style 사용 (Tailwind 임의값 금지)

---

## 참고

세부 패턴은 `references/widget-patterns.md` 참조.
