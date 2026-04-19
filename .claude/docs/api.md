# 달디단 — API 엔드포인트

## 블로그

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

## 가계부 / 거래

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

## 캘린더

| 메서드 | 경로 | 설명 | 파라미터 |
|--------|------|------|---------|
| `GET` | `/api/calendar` | 캘린더 이벤트 목록 | `?year=&month=` |
| `POST` | `/api/calendar` | 이벤트 추가 | Body: CalendarEventPayload |
| `DELETE` | `/api/calendar/[id]` | 이벤트 삭제 | - |
| `POST` | `/api/calendar/remind` | D-1 푸시 발송 (Vercel Cron) | `Authorization: Bearer {CRON_SECRET}` |

---

## 위치 / 지도

| 메서드 | 경로 | 설명 | 파라미터 |
|--------|------|------|---------|
| `GET` | `/api/geocode/reverse` | 좌표 → 주소 | `?lat=&lng=` |
| `POST` | `/api/maps/place-search` | 장소 텍스트 검색 | Body: `{ query }` |

---

## 축제 / 여행

| 메서드 | 경로 | 설명 |
|--------|------|------|
| `GET` | `/api/festival` | 축제 목록 (캐시 1시간, TourAPI) |
| `GET` | `/api/travel/activities` | 여행 액티비티 추천 |

---

## 사용자 / 설정

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

## 푸시 알림

| 메서드 | 경로 | 설명 |
|--------|------|------|
| `POST` | `/api/push/subscribe` | FCM 토큰 등록 / 해제 |
| `GET` | `/api/push/debug` | 디버그 정보 |
| `GET` | `/api/firebase-messaging-sw` | Service Worker JS 반환 |
