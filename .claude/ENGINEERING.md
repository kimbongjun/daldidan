# 달디단(Daldidan) — 엔지니어링 레퍼런스

> 컴포넌트 구조, 기능 상세, 디자인 가이드를 하네스 엔지니어링 관점에서 정리한 문서.  
> 새 기능 추가·리팩토링·디버깅 시 가장 먼저 참고한다.

---

## 목차

1. [디렉토리 구조](#1-디렉토리-구조)
2. [라우트 맵](#2-라우트-맵)
3. [디자인 시스템](#3-디자인-시스템)
4. [BentoGrid 레이아웃](#4-bentogrid-레이아웃)
5. [위젯 컴포넌트](#5-위젯-컴포넌트)
6. [공통 컴포넌트](#6-공통-컴포넌트)
7. [상태 관리 (Zustand)](#7-상태-관리-zustand)
8. [API 엔드포인트](#8-api-엔드포인트)
9. [주요 페이지 상세](#9-주요-페이지-상세)
10. [라이브러리 / 유틸](#10-라이브러리--유틸)
11. [데이터베이스 스키마](#11-데이터베이스-스키마)
12. [인증 플로우](#12-인증-플로우)
13. [주요 기능 플로우](#13-주요-기능-플로우)
14. [외부 API 통합](#14-외부-api-통합)
15. [PWA / 푸시 알림](#15-pwa--푸시-알림)

---

## 1. 디렉토리 구조

```
daldidan/
├── app/                          # Next.js 15 App Router
│   ├── page.tsx                  # 홈 대시보드 (SSR)
│   ├── layout.tsx                # Root 레이아웃 (메타, 테마)
│   ├── globals.css               # CSS 변수 + 유틸 클래스
│   ├── manifest.ts               # PWA 매니페스트
│   ├── api/                      # Route Handlers
│   │   ├── blog/                 # 블로그 API
│   │   ├── transactions/         # 가계부 API
│   │   ├── places/               # Google Places 프록시
│   │   ├── geocode/              # 역지오코딩
│   │   ├── maps/                 # 지도 검색
│   │   ├── festival/             # 축제 API
│   │   ├── travel/               # 여행 API
│   │   ├── push/                 # 푸시 알림
│   │   ├── site-settings         # 사이트 설정
│   │   ├── me/                   # 현재 유저
│   │   ├── mypage/               # 마이페이지 설정
│   │   └── firebase-messaging-sw # Service Worker
│   ├── blog/                     # 블로그 페이지
│   │   ├── page.tsx              # 목록 (list / weekly / monthly)
│   │   ├── write/page.tsx        # 글쓰기 (로그인 필수)
│   │   └── [slug]/
│   │       ├── page.tsx          # 상세보기
│   │       └── edit/page.tsx     # 편집 (로그인 필수)
│   ├── budget/
│   │   └── page.tsx              # 가계부 (로그인 필수)
│   ├── restaurants/
│   │   ├── page.tsx              # 목록 (SSR shell)
│   │   └── RestaurantPageClient.tsx
│   ├── festival/
│   │   └── page.tsx              # 축제 목록 (revalidate 3600)
│   ├── mypage/
│   │   └── page.tsx              # 사용자 설정 (로그인 필수)
│   └── login/
│       └── page.tsx              # 로그인
│
├── components/
│   ├── home/
│   │   └── DashboardShell.tsx    # BentoGrid 컨테이너
│   ├── widgets/
│   │   ├── BlogWidget.tsx        # 블로그 위젯
│   │   ├── BudgetWidget.tsx      # 가계부 위젯
│   │   ├── FestivalWidget.tsx    # 축제 위젯
│   │   ├── RestaurantWidget.tsx  # 맛집 위젯
│   │   ├── TravelWidget.tsx      # 여행 위젯
│   │   ├── StockWidget.tsx       # 주식 위젯
│   │   ├── WeatherWidget.tsx     # 날씨 위젯
│   │   ├── ShoppingWidget.tsx    # 쇼핑 위젯
│   │   └── EventWidget.tsx       # 공연/행사 위젯
│   ├── blog/
│   │   ├── BlogEditor.tsx        # TipTap WYSIWYG
│   │   ├── BlogWriteForm.tsx     # 글쓰기 폼
│   │   ├── BlogComments.tsx      # 댓글 시스템
│   │   ├── BlogCategoryFilter.tsx
│   │   ├── BlogViewToggle.tsx    # List/Weekly/Monthly
│   │   ├── BlogWeeklyView.tsx
│   │   ├── BlogMonthlyView.tsx
│   │   ├── BlogShareBar.tsx
│   │   ├── BlogDeleteButton.tsx
│   │   ├── BlogNotifyButton.tsx
│   │   ├── BlogViewCounter.tsx
│   │   └── MapInputBlock.tsx     # 블로그 내 지도 임베드
│   ├── Header.tsx                # 상단 헤더 (인사말, 알림, 테마)
│   ├── Footer.tsx
│   ├── PageHeader.tsx            # 페이지 타이틀 바
│   ├── Pagination.tsx
│   ├── OcrScanModal.tsx          # 영수증 스캔 모달
│   └── ErrorBoundary.tsx
│
├── store/
│   ├── useThemeStore.ts          # dark/light 테마
│   └── useNotificationStore.ts   # 알림 상태
│
├── lib/
│   ├── blog.ts                   # 블로그 쿼리 함수
│   ├── blog-shared.ts            # 공유 타입 (BlogPostSummary)
│   ├── data/
│   │   ├── festival.ts           # 축제 데이터 (TourAPI / Seoul API)
│   │   └── restaurant.ts         # 맛집 카테고리 상수
│   ├── supabase/
│   │   ├── client.ts             # 브라우저 Supabase 클라이언트
│   │   ├── server.ts             # 서버 Supabase 클라이언트 + Admin
│   │   └── actions/auth.ts       # signOut 서버 액션
│   ├── firebase-admin.ts         # Firebase Admin (서버 푸시)
│   ├── firebase-client.ts        # Firebase 클라이언트 (토큰 발급)
│   ├── push-notification.ts      # 구독자 관리, 발송
│   ├── notifications.ts          # 네이티브 브라우저 알림
│   ├── image-upload.ts           # Supabase Storage 업로드
│   ├── image-preprocess.ts       # Sharp 압축/회전 보정
│   ├── receipt-ocr.ts            # Google Vision API OCR
│   └── resend.ts                 # Resend 이메일 발송
│
└── supabase/
    └── migrations/               # DB 마이그레이션 SQL
```

---

## 2. 라우트 맵

| 경로 | 파일 | 인증 | 설명 |
|------|------|------|------|
| `/` | `app/page.tsx` | 공개 | 홈 대시보드 (BentoGrid) |
| `/login` | `app/login/page.tsx` | 공개 | Supabase Auth 로그인 |
| `/blog` | `app/blog/page.tsx` | 공개 | 블로그 목록 (카테고리, 뷰 전환) |
| `/blog/write` | `app/blog/write/page.tsx` | **필수** | 새 글 작성 |
| `/blog/[slug]` | `app/blog/[slug]/page.tsx` | 공개 | 글 상세 + 댓글 |
| `/blog/[slug]/edit` | `app/blog/[slug]/edit/page.tsx` | **필수** | 글 편집 |
| `/budget` | `app/budget/page.tsx` | **필수** | 가계부 (OCR, 분석) |
| `/restaurants` | `app/restaurants/page.tsx` | 공개 | 맛집 상세 목록 |
| `/festival` | `app/festival/page.tsx` | 공개 | 축제 목록 |
| `/mypage` | `app/mypage/page.tsx` | **필수** | 사용자·사이트 설정 |

> 인증 필요 페이지는 미인증 시 `/login?next=<경로>`로 리다이렉트.

---

## 3. 디자인 시스템

### 3-1. 색상 토큰 (CSS 변수)

`app/globals.css` 에 정의. **Tailwind 임의 색상값(`text-[#...]`) 사용 금지** — 반드시 인라인 `style` 또는 클래스를 사용한다.

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
--accent-orange:  #EA580C   /* 맛집 */
--accent-purple:  #7C3AED   /* 블로그 */
```

라이트 테마는 `[data-theme="light"] :root { ... }` 블록에서 오버라이드.

---

### 3-2. 유틸 클래스

| 클래스 | 용도 |
|--------|------|
| `.bento-card` | 위젯 외곽 스타일 (border, shadow, hover 전환) |
| `.gradient-violet` | 블로그·주식 위젯 배경 |
| `.gradient-cyan` | 날씨 위젯 배경 |
| `.gradient-amber` | 쇼핑·축제 위젯 배경 |
| `.gradient-rose` | 공연·행사 위젯 배경 |
| `.gradient-emerald` | 여행 위젯 배경 |
| `.gradient-indigo` | 가계부 위젯 배경 |
| `.gradient-orange` | 맛집 위젯 배경 |
| `.accent-{color}` | 텍스트 액센트 색상 적용 |
| `.tag` | 뱃지/라벨 기본 스타일 (padding, border-radius) |
| `.pressable` | 클릭 피드백 (scale + brightness) |
| `.scrollbar-hide` | 스크롤바 숨김 |
| `.animate-pulse-glow` | 펄스 글로우 애니메이션 |
| `.animate-ticker` | 좌우 티커 스크롤 |
| `.blog-prose` | 블로그 콘텐츠 읽기 타이포그래피 |
| `.blog-editor-content` | TipTap 에디터 내부 스타일 |

---

### 3-3. 컴포넌트 스타일 규칙

```
1. 위젯 루트 → <div className="bento-card gradient-{color} h-full flex flex-col p-5 gap-4">
2. 위젯 헤더 → accent 색 라벨(uppercase tracking-widest) + h2 제목 + .tag 뱃지
3. 스크롤 영역 → overflow-x-auto scrollbar-hide
4. hover → hover:opacity-80 transition-opacity
5. 태그 배경 → style={{ background: `${ACCENT}22`, color: ACCENT }}
6. 비활성 태그 → style={{ background: `${ACCENT}18`, color: "var(--text-muted)" }}
```

---

## 4. BentoGrid 레이아웃

### 컨테이너: `components/home/DashboardShell.tsx`

```
Props: { initialBlogPosts: BlogPostSummary[] }
```

| 브레이크포인트 | 구성 |
|--------------|------|
| 모바일 `<640px` | 단일 컬럼 flex (위젯 순서대로 적층) |
| 태블릿 `640–1023px` | 2열 그리드, 위젯별 고정 높이 |
| 데스크톱 `≥1024px` | `grid-template-areas` 6-cell |

**데스크톱 grid-template-areas:**
```
"blog      blog      budget"   ← 460px 행
"festival  festival  festival" ← 420px 행
"restaurant restaurant restaurant" ← 380px 행
```

컬럼 비율: `1fr 1fr 1fr`

---

## 5. 위젯 컴포넌트

모든 위젯은 `"use client"` + Zustand 훅(필요 시). 루트는 반드시 `.bento-card` 적용.

---

### 5-1. BlogWidget

**파일**: `components/widgets/BlogWidget.tsx`  
**액센트**: `#7C3AED` (violet)  
**그라디언트**: `.gradient-violet`

```typescript
interface BlogPostSummary {
  id: string;
  slug: string;
  title: string;
  description: string;
  thumbnailUrl: string;
  authorName: string;
  publishedAt: string;
  updatedAt: string | null;
  viewCount: number;
  commentCount: number;
  latestCommentAt: string | null;
  category: string | null;
}

type Props = { initialPosts?: BlogPostSummary[] }
```

**기능 상세:**
- 로그인 여부 판단 → 비로그인 시 로그인 CTA 표시
- 최신 포스트 3개 카드형 표시
- 새 댓글 배지: `latestCommentAt`이 7일 이내면 "새 댓글" 오렌지 뱃지
- 썸네일 이미지 fallback: 이미지 로드 실패 시 emoji placeholder

---

### 5-2. BudgetWidget

**파일**: `components/widgets/BudgetWidget.tsx`  
**액센트**: `#6366F1` (indigo)  
**그라디언트**: `.gradient-indigo`

```typescript
interface Transaction {
  id: string;
  type: "income" | "expense";
  category: string;
  amount: number;
  note: string;
  date: string;
}
```

**기능 상세:**
- 로그인 필수 (비로그인 → CTA)
- 당월 수입 / 지출 / 잔액 표시
- 저축률 프로그레스 바
- "전체보기" → `/budget` 링크

---

### 5-3. FestivalWidget

**파일**: `components/widgets/FestivalWidget.tsx`  
**액센트**: `#F59E0B` (amber)  
**그라디언트**: `.gradient-amber`

```typescript
type FestivalStatus = "진행중" | "예정" | "종료";

interface FestivalItem {
  id: string;
  title: string;
  region: string;
  areaCode: number;
  startDate: string;   // YYYYMMDD
  endDate: string;
  status: FestivalStatus;
  thumbnail?: string;
  isFree: boolean | null;
  detailUrl: string;
}
```

**지역 필터:**
```
전체 | 서울 | 경기/인천 | 강원 | 충청 | 전라 | 경상 | 제주
```

**기능 상세:**
- 진행중: 에메랄드 펄스 뱃지
- 예정: D-day 카운트다운 (`D-n`)
- 무료 여부 표시
- 최대 10개 항목 (슬라이더 또는 리스트)

---

### 5-4. RestaurantWidget

**파일**: `components/widgets/RestaurantWidget.tsx`  
**액센트**: `#EA580C` (orange)  
**그라디언트**: `.gradient-orange`

```typescript
type RestaurantCategory =
  "한식" | "중식" | "양식" | "아시안" | "분식" | "주점" | "카페" | "퓨전";

interface NearbyRestaurant {
  id: string;
  name: string;
  address: string;
  rating: number;
  reviewCount: number;
  isOpen: boolean | null;
  photoRef: string | null;        // Google Places photo name (places/xxx/photos/xxx)
  mapUrl: string;                 // Google Maps search URL
  category: RestaurantCategory;
  distance: string;               // "250m" | "1.2km"
  sourceCategory: string;         // Google Places primaryTypeDisplayName
}
```

**카테고리별 색상:**
| 카테고리 | 색상 |
|---------|------|
| 한식 | `#F59E0B` |
| 중식 | `#EF4444` |
| 양식 | `#6366F1` |
| 아시안 | `#14B8A6` |
| 분식 | `#F97316` |
| 주점 | `#A855F7` |
| 카페 | `#A8A29E` |
| 퓨전 | `#8B5CF6` |

**카드 레이아웃:**
```
[ 배경: 실제 사진 | 이모지 그라디언트 ]
[ 카테고리 뱃지 (상단 좌) ]
[ 영업중/마감 뱃지 ]
[ 가게 이름 (bold) ]
[ ⭐ 평점  거리 ]
```

**데이터 플로우:**
```
Geolocation → /api/places/nearby?lat=&lng=
  → Google Places Nearby Search (2 batch 병렬)
  → 중복 제거 + 음식점 필터 + 거리순 정렬
  → 최대 30개 반환
```

---

### 5-5. TravelWidget

**파일**: `components/widgets/TravelWidget.tsx`  
**액센트**: `#10B981` (emerald)  
**그라디언트**: `.gradient-emerald`

**기능 상세:**
- Klook / KKday 액티비티 카드 표시
- 플랫폼 뱃지 (Klook: 빨강, KKday: 주황)
- 평점, 리뷰 수, 가격

---

### 5-6. StockWidget

**파일**: `components/widgets/StockWidget.tsx`  
**액센트**: `#7C3AED` (violet)  
**그라디언트**: `.gradient-violet`

**기능 상세:**
- 국내/해외 주식 시세 리스트
- 자동 티커 테이프 스크롤 (`.animate-ticker`)
- 상승: 에메랄드 / 하락: 로즈

---

### 5-7. WeatherWidget

**파일**: `components/widgets/WeatherWidget.tsx`  
**액센트**: `#06B6D4` (cyan)  
**그라디언트**: `.gradient-cyan`

**기능 상세:**
- 현재 날씨 (기온, 상태, 아이콘)
- 4일 예보 (요일, 최저/최고 기온)

---

### 5-8. ShoppingWidget

**파일**: `components/widgets/ShoppingWidget.tsx`  
**액센트**: `#F59E0B` (amber)  
**그라디언트**: `.gradient-amber`

**기능 상세:**
- 이벤트 특가 목록
- 할인율 뱃지 (로즈 계열)
- 만료일 표시

---

### 5-9. EventWidget

**파일**: `components/widgets/EventWidget.tsx`  
**액센트**: `#F43F5E` (rose)  
**그라디언트**: `.gradient-rose`

**기능 상세:**
- 영화 / 공연 / 전시 이벤트
- 날짜 범위, 장소 표시

---

## 6. 공통 컴포넌트

### 6-1. Header

**파일**: `components/Header.tsx`

**기능:**
- 시간대별 인사말 (새벽/아침/오후/저녁)
- 수동 인사말 편집 (Pencil 아이콘 → 인라인 편집 → 영구 저장)
- 인사말 삭제 시 기본 시간대별 문구 복원
- 실시간 시계
- 테마 토글 (Dark ↔ Light, `useThemeStore`)
- 로그인/로그아웃 버튼
- 알림 센터 (벨 아이콘, 최근 3개 인박스, 읽음 처리)
- 푸시 알림 구독/해제 (FCM 토큰 관리)
- 사용자 아바타 드롭다운 → `/mypage` 링크

```typescript
// 시간대 기준
새벽 (0–5시)   → "고요한 새벽이에요"
아침 (6–11시)  → "좋은 아침이에요"
오후 (12–17시) → "오후도 화이팅이에요"
저녁 (18–23시) → "오늘 하루 수고했어요"
```

---

### 6-2. PageHeader

**파일**: `components/PageHeader.tsx`

```typescript
interface Props {
  title: string;
  subtitle?: string;
  accentColor: string;   // hex 색상
  backHref?: string;     // 생략 시 뒤로가기 버튼 없음
  actions?: React.ReactNode;
}
```

**출력:**
```
← (backHref)   [타이틀]   [액션 버튼들]
               서브타이틀
```

---

### 6-3. Pagination

**파일**: `components/Pagination.tsx`

```typescript
interface Props {
  currentPage: number;
  totalPages: number;
  baseUrl: string;       // 쿼리 스트링 prefix
}
```

출력: `◀ 1 2 3 ... N ▶` 형태

---

### 6-4. OcrScanModal

**파일**: `components/OcrScanModal.tsx`

```typescript
interface Props {
  imageUrl: string;
  isDone: boolean;
  onClose: () => void;
}
```

영수증 이미지 미리보기 + 분석 중 로딩 오버레이 표시.

---

## 7. 상태 관리 (Zustand)

### 7-1. useThemeStore

**파일**: `store/useThemeStore.ts`  
**persist key**: `"daldidan-theme"`

```typescript
interface ThemeState {
  theme: "dark" | "light";
  toggle: () => void;
  setTheme: (t: "dark" | "light") => void;
}
```

`theme` 값에 따라 `<html data-theme="dark|light">` 속성 토글 (Header에서 처리).

---

### 7-2. useNotificationStore

**파일**: `store/useNotificationStore.ts`  
**persist key**: `"daldidan-notifications"`

```typescript
interface InboxNotification {
  id: string;
  title: string;
  body: string;
  url: string;
  createdAt: string;    // ISO 8601
  read: boolean;
}

interface NotificationState {
  enabled: boolean;                      // 푸시 알림 활성화 여부
  notifyNewPost: boolean;                // 새 글 알림 구독
  notifyComment: boolean;                // 댓글 알림 구독
  inbox: InboxNotification[];            // 최대 20개 보관
  unreadCount: number;                   // 미읽음 수

  setEnabled(enabled: boolean): void;
  setNotifyNewPost(v: boolean): void;
  setNotifyComment(v: boolean): void;
  addInboxNotification(n: InboxNotification): void;
  markInboxRead(id: string): void;
  markAllInboxRead(): void;
}
```

---

## 8. API 엔드포인트

### 8-1. 블로그

| 메서드 | 경로 | 설명 | 파라미터 |
|--------|------|------|---------|
| `GET` | `/api/blog/posts` | 발행된 포스트 목록 | `?limit=9&category=&offset=0` |
| `POST` | `/api/blog/posts` | 새 포스트 작성 | Body: PostPayload |
| `PATCH` | `/api/blog/posts/[slug]` | 포스트 수정 | Body: Partial<PostPayload> |
| `DELETE` | `/api/blog/posts/[slug]` | 포스트 삭제 | - |
| `POST` | `/api/blog/posts/[slug]/notify` | 댓글 알림 구독 | Body: `{ email }` |
| `GET` | `/api/blog/comments` | 댓글 조회 | `?post_id=` |
| `POST` | `/api/blog/comments` | 댓글 작성 | Body: CommentPayload |
| `PATCH` | `/api/blog/comments/[id]` | 댓글 수정 | Body: `{ content }` |
| `DELETE` | `/api/blog/comments/[id]` | 댓글 삭제 | - |
| `POST` | `/api/blog/images` | 이미지 업로드 | Form: `image` |
| `POST` | `/api/blog/views` | 조회수 증가 | Body: `{ slug }` |
| `GET` | `/api/blog/alarm` | 알림 구독 상태 | `?post_id=&email=` |

---

### 8-2. 가계부 / 거래

| 메서드 | 경로 | 설명 | 파라미터 |
|--------|------|------|---------|
| `GET` | `/api/transactions` | 월별 거래 목록 | `?month=YYYY-MM` |
| `POST` | `/api/transactions` | 거래 추가 | Body: TransactionPayload |
| `PATCH` | `/api/transactions/[id]` | 거래 수정 | Body: Partial<TransactionPayload> |
| `DELETE` | `/api/transactions/[id]` | 거래 삭제 | - |
| `POST` | `/api/transactions/images` | 영수증 이미지 업로드 | Form: `image` |
| `POST` | `/api/transactions/ocr` | 영수증 OCR 분석 | Form: `image` |

**TransactionPayload:**
```typescript
{
  type: "income" | "expense";
  category: string;
  buyer: string;           // "공동" | "봉준" | "달희" (사이트 설정)
  merchantName: string;
  location: string;
  amount: number;
  note: string;
  date: string;            // YYYY-MM-DD
  receiptImageUrl: string | null;
}
```

---

### 8-3. 위치 / 지도

| 메서드 | 경로 | 설명 | 파라미터 |
|--------|------|------|---------|
| `GET` | `/api/geocode/reverse` | 좌표 → 주소 | `?lat=&lng=` |
| `POST` | `/api/maps/place-search` | 장소 텍스트 검색 | Body: `{ query }` |
| `GET` | `/api/places/nearby` | 주변 맛집 (Google Places) | `?lat=&lng=` |
| `GET` | `/api/places/photo` | 장소 사진 프록시 | `?name=places/.../photos/...` |

**`/api/places/nearby` 응답:**
```typescript
{ restaurants: NearbyRestaurant[] }
// Google Places v1 Nearby Search 결과 (2 batch 병렬, 최대 30개)
```

---

### 8-4. 축제 / 여행

| 메서드 | 경로 | 설명 |
|--------|------|------|
| `GET` | `/api/festival` | 축제 목록 (캐시 1시간, TourAPI) |
| `GET` | `/api/travel/activities` | 여행 액티비티 추천 |

---

### 8-5. 사용자 / 설정

| 메서드 | 경로 | 설명 |
|--------|------|------|
| `GET` | `/api/me` | 현재 로그인 유저 `{ id, email }` |
| `GET/PATCH` | `/api/site-settings` | 사이트 전역 설정 |
| `GET/POST` | `/api/mypage` | 마이페이지 설정 (OG 이미지, 멤버 등) |

**site-settings 주요 키:**
```
logo_url            사이트 로고 이미지 URL
meta_title          <title> 태그
meta_description    <meta description>
og_image_url        OG 이미지
custom_greeting     수동 편집된 인사말
budget_members      JSON: ["공동", "봉준", "달희"]
budget_limits       JSON: { "식비": 300000, ... }
```

---

### 8-6. 푸시 알림

| 메서드 | 경로 | 설명 |
|--------|------|------|
| `POST` | `/api/push/subscribe` | FCM 토큰 등록 / 해제 |
| `GET` | `/api/push/debug` | 디버그 정보 |
| `GET` | `/api/firebase-messaging-sw` | Service Worker JS 반환 |

---

## 9. 주요 페이지 상세

### 9-1. 블로그 목록 (`/blog`)

```typescript
// searchParams
{
  category?: string;              // 카테고리 필터
  view?: "list" | "weekly" | "monthly";
  page?: string;                  // 숫자 (list 뷰에서만)
}
```

**카테고리:** 여행, 스윙, 일상, 육아, 재테크, 기타

**뷰 타입:**
- `list`: 카드 그리드 (9개/페이지, Pagination)
- `weekly`: 이번 주 7일 캘린더, 날짜별 포스트
- `monthly`: 이번 달 달력, 날짜별 점 표시

---

### 9-2. 가계부 (`/budget`)

**섹션 구성:**
```
[ 월 네비게이터 (← YYYY년 MM월 →) ]

[왼쪽: 입력 폼 + 내역 목록]         [오른쪽: 요약 + 차트]
  - 수입/지출 토글
  - 영수증 OCR 업로드
  - 카테고리 / 구매자 선택
  - 금액 / 날짜 / 매장명 / 위치
  - 메모
  - TransactionRow × N               - 월 요약 (잔액/수입/지출)
                                      - 저축률 바
                                      - 구매자 정산 (SettlementPanel)
                                      - 카테고리 예산 한도
                                      - 지출 카테고리 파이차트
                                      - 기간별 그래프 (일/월/연)
```

**TransactionRow:**
```typescript
interface Props {
  tx: Transaction;
  isEditing: boolean;
  isOwner: boolean;       // 본인 거래만 수정/삭제
  onEdit?: () => void;
  onDelete?: () => void;
  onViewReceipt?: () => void;
  onView?: () => void;    // 상세 모달 열기
}
```

- 삭제: 첫 클릭 → "삭제?" 확인 상태 (3초), 두 번째 클릭 → 실제 삭제
- 행 클릭: `TransactionDetailModal` 오픈

**OCR 플로우:**
```
파일 선택 → preprocessReceiptImage() (Sharp 전처리)
         → 병렬: uploadReceiptImage() + analyzeReceiptImage()
         → form 자동 채움 (매장명, 금액, 날짜, 카테고리 추천)
```

---

### 9-3. 맛집 상세 (`/restaurants`)

`RestaurantPageClient.tsx`에서 클라이언트 사이드 렌더링.

**기능:**
- Geolocation 허용 → 실시간 주변 검색
- 허용 거부 → 서울시청 좌표(37.5665, 126.978) 폴백
- 카테고리 필터 (수평 스크롤)
- 카드 클릭 → Google Maps 이동

---

### 9-4. 마이페이지 (`/mypage`)

**탭 구성:**
1. **프로필**: 표시명 변경, 이메일 확인
2. **사이트 설정**: 로고, 메타 타이틀, OG 이미지, 파비콘, 멤버 관리
3. **가계부 설정**: 구성원 편집, 카테고리 예산 한도
4. **알림 설정**: 푸시 알림 구독/해제

---

## 10. 라이브러리 / 유틸

### 10-1. blog.ts (주요 함수)

```typescript
// 발행된 포스트 조회 (카테고리, 오프셋 지원)
getPublishedBlogPosts(limit: number, category?: string, offset?: number): Promise<BlogPostSummary[]>

// 포스트 총 개수
getBlogPostCount(category?: string): Promise<number>

// 슬러그로 단일 포스트 조회
getBlogPostBySlug(slug: string): Promise<BlogPost | null>

// HTML에서 첫 번째 이미지 추출 (썸네일 자동 생성)
extractFirstImageFromHtml(html: string): string | null

// 슬러그 중복 검사 (중복 시 `-2`, `-3` 접미사)
ensureUniqueBlogSlug(slug: string): Promise<string>
```

---

### 10-2. data/festival.ts (주요 함수)

```typescript
// 축제 목록 조회 (TourAPI 우선, 실패 시 Seoul API)
getFestivalItems(): Promise<FestivalItem[]>

// 날짜 기반 상태 계산
getStatus(startDate: string, endDate: string): FestivalStatus

// D-day 계산 (진행 중: 음수, 시작 전: 양수)
getDday(startDate: string): number
```

**지역 코드 매핑:**
```
areaCode: 1=서울, 2=인천, 3=대전, 4=대구, 5=광주,
          6=부산, 7=울산, 8=세종, 31=경기, 32=강원,
          33=충북, 34=충남, 35=전북, 36=전남, 37=경북,
          38=경남, 39=제주
```

---

### 10-3. receipt-ocr.ts

```typescript
interface OcrResult {
  merchantName: string;
  amount: number;
  date: string;             // YYYY-MM-DD
  note: string;
  location: string;
  recommendedCategory: string;
}

analyzeReceiptImage(file: File): Promise<OcrResult>
// Google Vision API (TEXT_DETECTION) → 텍스트 파싱 → 카테고리 추론
```

---

### 10-4. image-upload.ts

```typescript
// Supabase Storage에 업로드, 공개 URL 반환
uploadImagesToStorage(
  file: File,
  bucket: string,
  path: string
): Promise<string>
```

---

### 10-5. push-notification.ts

```typescript
// FCM 토큰으로 단일 푸시 발송
sendPushToToken(token: string, payload: NotificationPayload): Promise<void>

// 모든 구독자에게 푸시 발송 (블로그 새 글 알림)
broadcastPushNotification(payload: NotificationPayload): Promise<void>
```

---

## 11. 데이터베이스 스키마

### 주요 테이블 (Supabase PostgreSQL)

```sql
-- 사용자 프로필
profiles (
  id          uuid PRIMARY KEY (= auth.users.id),
  email       text,
  display_name text
)

-- 블로그 포스트
blog_posts (
  id            uuid PRIMARY KEY,
  slug          text UNIQUE,
  title         text,
  content_html  text,
  content_json  jsonb,       -- TipTap JSON
  description   text,
  thumbnail_url text,
  author_id     uuid,
  author_name   text,
  category      text,
  is_published  boolean DEFAULT false,
  view_count    integer DEFAULT 0,
  published_at  timestamptz,
  updated_at    timestamptz,
  created_at    timestamptz
)

-- 블로그 댓글
blog_comments (
  id         uuid PRIMARY KEY,
  post_id    uuid REFERENCES blog_posts,
  user_id    uuid REFERENCES profiles,
  content    text,
  created_at timestamptz
)

-- 가계부 거래
transactions (
  id                uuid PRIMARY KEY,
  user_id           uuid REFERENCES profiles,
  type              text CHECK (type IN ('income','expense')),
  category          text,
  buyer             text,
  merchant_name     text,
  location          text,
  amount            integer,
  note              text,
  date              date,
  receipt_image_url text,
  created_at        timestamptz
)

-- 사이트 전역 설정
site_settings (
  key   text PRIMARY KEY,
  value text
)

-- FCM 토큰 (푸시 알림)
push_subscriptions (
  id         uuid PRIMARY KEY,
  token      text UNIQUE,
  user_id    uuid,
  created_at timestamptz
)
```

---

## 12. 인증 플로우

```
1. Supabase Auth (이메일 + 비밀번호)
2. 로그인 → Supabase 세션 쿠키 저장
3. 서버 컴포넌트: createServerClient() → getUser()
4. Route Handler: createServerClient() → getUser()
5. 보호 페이지: 미인증 시 redirect(`/login?next=${pathname}`)
6. 로그인 후: searchParams.next 경로로 redirect

로그아웃:
  lib/supabase/actions/auth.ts → signOut() 서버 액션
  → 세션 삭제 → / 로 redirect
```

---

## 13. 주요 기능 플로우

### 블로그 글쓰기
```
/blog/write → BlogWriteForm
  → 제목, 카테고리, 슬러그(자동 생성 + 중복 검사) 입력
  → TipTap 에디터로 본문 작성
  → 이미지 첨부: POST /api/blog/images → Supabase Storage
  → 임시저장 (로컬스토리지)
  → 발행: POST /api/blog/posts
    → 썸네일 자동 추출 (첫 이미지)
    → 발행 성공 → 구독자에게 푸시 알림 broadcast
    → /blog/[slug] 로 이동
```

### 영수증 OCR
```
파일 선택 (input[type=file])
  → preprocessReceiptImage(): Canvas API 그레이스케일 + 대비 강화
  → 병렬 실행:
      ① uploadReceiptImage() → POST /api/transactions/images → Supabase Storage
      ② analyzeReceiptImage() → Google Vision TEXT_DETECTION
          → 파싱: 매장명, 금액, 날짜, 메모, 위치
          → 카테고리 추론 (키워드 매칭)
  → form 자동 채움
  → OcrScanModal 결과 표시
```

### 주변 맛집
```
navigator.geolocation.getCurrentPosition()
  → 실패 시 fallback (서울시청 37.5665, 126.978)
  → GET /api/places/nearby?lat=&lng=
      → Google Places v1 Nearby Search (2 batch 병렬)
          batch1: restaurant, cafe, bar, meal_takeaway
          batch2: korean/japanese/chinese/italian/fast_food/bakery/coffee_shop
      → id 기반 중복 제거
      → 음식점 타입 필터 (FOOD_TYPES 목록)
      → 거리 계산 (Haversine)
      → 거리순 정렬, 최대 30개
  → RestaurantWidget 렌더링
  → 사진: GET /api/places/photo?name=places/.../photos/...
      → Google Places Photo API → HTTPS redirect
```

### 축제 정보
```
GET /api/festival (revalidate: 3600)
  → lib/data/festival.ts: getFestivalItems()
      → TourAPI (한국관광공사) 우선 호출
      → 실패 시 Seoul Open API 폴백
      → 진행중/예정/종료 상태 분류
      → 지역 코드 매핑
  → FestivalWidget 렌더링
  → 지역 필터 (클라이언트 측)
```

---

## 14. 외부 API 통합

| API | 용도 | 환경 변수 |
|-----|------|---------|
| Google Places v1 | 맛집 검색, 사진 | `GOOGLE_MAPS_API_KEY` |
| Google Vision | 영수증 OCR | `GOOGLE_MAPS_API_KEY` (동일 키) |
| Google Maps Embed | 지도 임베드 | `NEXT_PUBLIC_GOOGLE_MAPS_EMBED_API_KEY` |
| Supabase | DB, Auth, Storage | `NEXT_PUBLIC_SUPABASE_URL` 외 2개 |
| Firebase FCM | 푸시 알림 | `NEXT_PUBLIC_FIREBASE_*` 6개 |
| Naver Clova OCR | 영수증 OCR (보조) | `NAVER_CLOVA_OCR_*` 2개 |
| TourAPI | 축제 정보 | 코드에 직접 내장 |
| Resend | 이메일 알림 | `RESEND_API_KEY` |

---

## 15. PWA / 푸시 알림

### PWA 설정

```typescript
// app/manifest.ts
{
  name: "달디단",
  short_name: "달디단",
  display: "standalone",
  background_color: "#0F0F14",
  theme_color: "#6366F1",
  icons: [{ src, sizes, type }]
}
```

### 푸시 알림 아키텍처

```
[클라이언트]
  Firebase Messaging SDK
    → getToken(vapidKey) → FCM 토큰 발급
    → POST /api/push/subscribe (토큰 저장)

[서버]
  블로그 글 발행 / 댓글 작성 시
    → broadcastPushNotification()
    → Firebase Admin SDK → FCM → 각 구독 디바이스

[Service Worker]
  GET /api/firebase-messaging-sw → firebase-messaging-sw.js
  백그라운드 푸시 수신 → 브라우저 알림 표시
```

### 알림 인박스 플로우
```
푸시 수신 (foreground)
  → useNotificationStore.addInboxNotification()
  → Header 벨 아이콘 배지 업데이트
  → 클릭 시 → markInboxRead() + URL 이동
```

---

*최종 업데이트: 2026-04-17*
