# 달디단 — 주요 기능 플로우 & 라이브러리

## 주요 기능 플로우

### 블로그 글쓰기
```
/blog/write → BlogWriteForm
  → 제목, 카테고리, 슬러그(자동 생성 + 중복 검사) 입력
  → TipTap 에디터로 본문 작성
  → 이미지 첨부: POST /api/blog/images → Supabase Storage
  → 임시저장 (로컬스토리지)
  → 발행: POST /api/blog/posts
    → 썸네일 자동 추출 (첫 이미지)
    → 발행 성공 → after() 비동기:
        1) 이미지 없으면 generateAutoThumbnail(title, html, slug):
           - Pollinations.ai AI 이미지 (28s timeout)
           - Unsplash Source 스톡 사진 (12s timeout)
           - Picsum Photos 슬러그 seed 폴백 (항상 성공)
           - 성공 시 Supabase Storage 업로드 → DB 업데이트
        2) 구독자에게 이메일 + 푸시 알림 broadcast
    → /blog/[slug] 로 이동
```

### 기존 글 썸네일 일괄 생성
```
/blog 페이지 → ThumbnailBatchButton (로그인 시에만 표시)
  → GET /api/blog/thumbnails/batch → remaining 카운트
  → 버튼 클릭 → POST /api/blog/thumbnails/batch (batchSize=3) 반복
    → thumbnail_url IS NULL인 글 최대 3개 처리
    → extractFirstImageFromHtml → generateAutoThumbnail 순으로 시도
    → DB 업데이트 + revalidatePath
    → remaining=0 까지 루프 반복
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

### 캘린더 D-1 알림
```
Vercel Cron (0 0 * * * UTC = KST 09:00)
  → POST /api/calendar/remind (Authorization: Bearer {CRON_SECRET})
  → Supabase: start_date = tomorrow AND remind_sent = false 조회
  → sendPushToAllSubscribers() × 각 이벤트
  → remind_sent = true 업데이트
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

## 가계부 페이지 (`/budget`)

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

삭제: 첫 클릭 → "삭제?" 확인 상태 (3초), 두 번째 클릭 → 실제 삭제

---

## 주요 라이브러리 함수

### blog.ts
```typescript
getPublishedBlogPosts(limit: number, category?: string, offset?: number): Promise<BlogPostSummary[]>
getBlogPostCount(category?: string): Promise<number>
getBlogPostBySlug(slug: string): Promise<BlogPost | null>
extractFirstImageFromHtml(html: string): string | null
ensureUniqueBlogSlug(slug: string): Promise<string>
```

### data/festival.ts
```typescript
getFestivalItems(): Promise<FestivalItem[]>
getStatus(startDate: string, endDate: string): FestivalStatus
getDday(startDate: string): number
```

지역 코드: `1=서울, 2=인천, 3=대전, 4=대구, 5=광주, 6=부산, 7=울산, 8=세종, 31=경기, 32=강원, 33=충북, 34=충남, 35=전북, 36=전남, 37=경북, 38=경남, 39=제주`

### receipt-ocr.ts
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
```

### push-notification.ts
```typescript
sendPushToToken(token: string, payload: NotificationPayload): Promise<void>
sendPushToAllSubscribers(payload: NotificationPayload): Promise<{ sent: number; failed: number }>
broadcastPushNotification(payload: NotificationPayload): Promise<void>
```

---

## PWA & 푸시 알림 아키텍처

### PWA 설정
```typescript
// app/manifest.ts
{
  name: "달디단",
  short_name: "달디단",
  display: "standalone",
  background_color: "#0F0F14",
  theme_color: "#6366F1",
}
```

### 푸시 알림 플로우
```
[클라이언트]
  Firebase Messaging SDK
    → getToken(vapidKey) → FCM 토큰 발급
    → POST /api/push/subscribe (토큰 저장)

[서버]
  블로그 글 발행 / 댓글 작성 / 캘린더 D-1 시
    → sendPushToAllSubscribers() or broadcastPushNotification()
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
