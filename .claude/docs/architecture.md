# 달디단 — 아키텍처 & 라우트 맵

## 디렉토리 구조

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
│   │   ├── CalendarWidget.tsx    # 캘린더 위젯
│   │   ├── FestivalWidget.tsx    # 축제 위젯
│   │   ├── RealEstateWidget.tsx  # 부동산 위젯
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
│   │   └── festival.ts           # 축제 데이터 (TourAPI / Seoul API)
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

## 라우트 맵

| 경로 | 파일 | 인증 | 설명 |
|------|------|------|------|
| `/` | `app/page.tsx` | 공개 | 홈 대시보드 (BentoGrid) |
| `/login` | `app/login/page.tsx` | 공개 | Supabase Auth 로그인 |
| `/blog` | `app/blog/page.tsx` | 공개 | 블로그 목록 (카테고리, 뷰 전환) |
| `/blog/write` | `app/blog/write/page.tsx` | **필수** | 새 글 작성 |
| `/blog/[slug]` | `app/blog/[slug]/page.tsx` | 공개 | 글 상세 + 댓글 |
| `/blog/[slug]/edit` | `app/blog/[slug]/edit/page.tsx` | **필수** | 글 편집 |
| `/budget` | `app/budget/page.tsx` | **필수** | 가계부 (OCR, 분석) |
| `/festival` | `app/festival/page.tsx` | 공개 | 축제 목록 |
| `/mypage` | `app/mypage/page.tsx` | **필수** | 사용자·사이트 설정 |

> 인증 필요 페이지는 미인증 시 `/login?next=<경로>`로 리다이렉트.
