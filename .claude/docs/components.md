# 달디단 — 컴포넌트 & 상태 관리

## 위젯 컴포넌트

모든 위젯은 `"use client"` + Zustand 훅(필요 시). 루트는 반드시 `.bento-card` 적용.

### BlogWidget
**파일**: `components/widgets/BlogWidget.tsx` | **액센트**: `#7C3AED` | **그라디언트**: `.gradient-violet`

- 로그인 여부 판단 → 비로그인 시 로그인 CTA 표시
- 최신 포스트 3개 카드형 표시
- 새 댓글 배지: `latestCommentAt`이 7일 이내면 "새 댓글" 뱃지
- 썸네일 이미지 fallback: 이미지 로드 실패 시 emoji placeholder

### BudgetWidget
**파일**: `components/widgets/BudgetWidget.tsx` | **액센트**: `#6366F1` | **그라디언트**: `.gradient-indigo`

- 로그인 필수 (비로그인 → CTA)
- 당월 수입 / 지출 / 잔액 표시
- 저축률 프로그레스 바
- "전체보기" → `/budget` 링크

### CalendarWidget
**파일**: `components/widgets/CalendarWidget.tsx` | **액센트**: `#0EA5E9` | **그라디언트**: `.gradient-sky`

- 일정 / 기념일 등록 (Supabase `calendar_events` 테이블)
- 월별 달력 뷰, 날짜 클릭 → 상세 모달
- 반복 일정 (daily/weekly/monthly/yearly)
- D-1 푸시 알림 → `/api/calendar/remind` (Vercel Cron: `0 0 * * *` UTC)

### FestivalWidget
**파일**: `components/widgets/FestivalWidget.tsx` | **액센트**: `#F59E0B` | **그라디언트**: `.gradient-amber`

- TourAPI 축제 데이터
- 지역 필터: 전체 | 서울 | 경기/인천 | 강원 | 충청 | 전라 | 경상 | 제주
- 진행중: 에메랄드 펄스 뱃지 / 예정: D-day 카운트다운

### RealEstateWidget
**파일**: `components/widgets/RealEstateWidget.tsx` | **그라디언트**: `.gradient-emerald`

- 부동산 정보 위젯

### TravelWidget
**파일**: `components/widgets/TravelWidget.tsx` | **액센트**: `#10B981` | **그라디언트**: `.gradient-emerald`

- Klook / KKday 액티비티 카드, 플랫폼 뱃지, 평점, 가격

### StockWidget
**파일**: `components/widgets/StockWidget.tsx` | **액센트**: `#7C3AED` | **그라디언트**: `.gradient-violet`

- 국내/해외 주식 시세, 자동 티커 테이프 (`.animate-ticker`)

### WeatherWidget
**파일**: `components/widgets/WeatherWidget.tsx` | **액센트**: `#06B6D4` | **그라디언트**: `.gradient-cyan`

- 현재 날씨 + 4일 예보

### ShoppingWidget
**파일**: `components/widgets/ShoppingWidget.tsx` | **액센트**: `#F59E0B` | **그라디언트**: `.gradient-amber`

- 이벤트 특가 목록, 할인율 뱃지, 만료일 표시

### EventWidget
**파일**: `components/widgets/EventWidget.tsx` | **액센트**: `#F43F5E` | **그라디언트**: `.gradient-rose`

- 영화 / 공연 / 전시 이벤트, 날짜 범위, 장소 표시

---

## 공통 컴포넌트

### Header (`components/Header.tsx`)
- 시간대별 인사말 + 수동 편집 (새벽 0–5 / 아침 6–11 / 오후 12–17 / 저녁 18–23)
- 실시간 시계
- 테마 토글 (Dark ↔ Light, `useThemeStore`)
- 로그인/로그아웃 버튼
- 알림 센터 (벨 아이콘, 최근 3개 인박스, 읽음 처리)
- 푸시 알림 구독/해제 (FCM 토큰)
- 사용자 아바타 드롭다운 → `/mypage`

### PageHeader (`components/PageHeader.tsx`)
```typescript
interface Props {
  title: string;
  subtitle?: string;
  accentColor: string;   // hex 색상
  backHref?: string;
  actions?: React.ReactNode;
}
```

### Pagination (`components/Pagination.tsx`)
```typescript
interface Props {
  currentPage: number;
  totalPages: number;
  baseUrl: string;
}
```

### OcrScanModal (`components/OcrScanModal.tsx`)
영수증 이미지 미리보기 + 분석 중 로딩 오버레이 표시.

---

## 상태 관리 (Zustand)

### useThemeStore (`store/useThemeStore.ts`)
**persist key**: `"daldidan-theme"`

```typescript
interface ThemeState {
  theme: "dark" | "light";
  toggle: () => void;
  setTheme: (t: "dark" | "light") => void;
}
```

`theme` 값에 따라 `<html data-theme="dark|light">` 속성 토글 (Header에서 처리).

### useNotificationStore (`store/useNotificationStore.ts`)
**persist key**: `"daldidan-notifications"`

```typescript
interface InboxNotification {
  id: string;
  title: string;
  body: string;
  url: string;
  createdAt: string;
  read: boolean;
}

interface NotificationState {
  enabled: boolean;
  notifyNewPost: boolean;
  notifyComment: boolean;
  inbox: InboxNotification[];   // 최대 20개 보관
  unreadCount: number;

  setEnabled(enabled: boolean): void;
  setNotifyNewPost(v: boolean): void;
  setNotifyComment(v: boolean): void;
  addInboxNotification(n: InboxNotification): void;
  markInboxRead(id: string): void;
  markAllInboxRead(): void;
}
```
