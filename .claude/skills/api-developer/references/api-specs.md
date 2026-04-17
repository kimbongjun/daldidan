# API 스펙 레퍼런스

## 환경 변수 전체 목록

| 변수명 | 용도 | 접근 |
|--------|------|------|
| `GOOGLE_MAPS_API_KEY` | Google Places, Vision OCR | 서버 전용 |
| `NEXT_PUBLIC_GOOGLE_MAPS_EMBED_API_KEY` | 지도 임베드 | 클라이언트 노출 가능 |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase URL | 클라이언트 노출 가능 |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase 공개 키 | 클라이언트 노출 가능 |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase 관리자 키 | **서버 전용, 절대 노출 금지** |
| `NAVER_CLIENT_ID` | Naver 검색 API | 서버 전용 |
| `NAVER_CLIENT_SECRET` | Naver 검색 API | 서버 전용 |
| `NAVER_CLOVA_OCR_SECRET_KEY` | Clova OCR | 서버 전용 |
| `NAVER_CLOVA_OCR_INVOKE_URL` | Clova OCR 엔드포인트 | 서버 전용 |
| `NEXT_PUBLIC_FIREBASE_*` | Firebase FCM | 클라이언트 노출 가능 |
| `FIREBASE_ADMIN_*` | Firebase Admin | 서버 전용 |
| `RESEND_API_KEY` | 이메일 발송 | 서버 전용 |

---

## 기존 API 엔드포인트 응답 형식

### GET /api/transactions?month=YYYY-MM
```typescript
// 응답: TransactionApiResponse[]
interface TransactionApiResponse {
  id: string;
  user_id: string;
  type: "income" | "expense";
  category: string;
  buyer?: string;
  merchant_name?: string;
  location?: string;
  receipt_image_url?: string | null;
  amount: number;
  note: string;
  date: string;
  profiles?: { display_name: string | null } | null;
}
```

### GET /api/places/nearby?lat=&lng=
```typescript
// 응답
interface NearbyResponse {
  restaurants: NearbyRestaurant[];
}

interface NearbyRestaurant {
  id: string;
  name: string;
  address: string;
  rating: number;
  reviewCount: number;
  isOpen: boolean | null;
  photoRef: string | null;
  mapUrl: string;
  category: RestaurantCategory;
  distance: string;
  sourceCategory: string;
}
```

### GET /api/festival
```typescript
interface FestivalItem {
  id: string;
  title: string;
  region: string;
  areaCode: number;
  startDate: string;  // YYYYMMDD
  endDate: string;
  status: "진행중" | "예정" | "종료";
  thumbnail?: string;
  isFree: boolean | null;
  detailUrl: string;
}
// 응답: FestivalItem[]
```

---

## Naver 검색 API (openapi.naver.com)

헤더 인증 방식:
```typescript
headers: {
  "X-Naver-Client-Id": clientId,
  "X-Naver-Client-Secret": clientSecret,
}
```

로컬 검색: `GET https://openapi.naver.com/v1/search/local.json?query=...&display=5&sort=comment`

> ⚠️ Naver Cloud Platform(NCP) 엔드포인트(`naveropenapi.apigw-pub.fin-ntruss.com`)는
> 별도 NCP 키가 필요하다. 현재 `.env.local`에는 NCP 키 미설정 — 사용 금지.

---

## Google Places Photo 프록시 패턴

```typescript
// photoRef 형식: "places/PLACE_ID/photos/PHOTO_ID"
// 프록시 URL: /api/places/photo?name=places/...

// 실제 Google API 호출
const metaRes = await fetch(
  `https://places.googleapis.com/v1/${photoRef}/media?key=${apiKey}&maxWidthPx=400&skipHttpRedirect=true`,
  { next: { revalidate: 86400 }, signal: AbortSignal.timeout(5000) }
);
// skipHttpRedirect=true → JSON { photoUri: "https://..." } 반환
// → NextResponse.redirect(photoUri)
```
