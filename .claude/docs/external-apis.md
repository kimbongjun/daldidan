# 달디단 — 외부 API 통합

## 환경 변수 목록

| 변수명 | 용도 | 접근 |
|--------|------|------|
| `GOOGLE_MAPS_API_KEY` | Google Vision OCR, Maps Embed | 서버 전용 |
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
| `CRON_SECRET` | Vercel Cron 인증 | 서버 전용 |

---

## 외부 API 목록

| API | 용도 | 환경 변수 |
|-----|------|---------|
| Google Vision | 영수증 OCR | `GOOGLE_MAPS_API_KEY` |
| Google Maps Embed | 지도 임베드 | `NEXT_PUBLIC_GOOGLE_MAPS_EMBED_API_KEY` |
| Google Maps Text Search | 블로그 장소 검색 | `GOOGLE_MAPS_API_KEY` |
| Supabase | DB, Auth, Storage | `NEXT_PUBLIC_SUPABASE_URL` 외 2개 |
| Firebase FCM | 푸시 알림 | `NEXT_PUBLIC_FIREBASE_*` 6개 |
| Naver Clova OCR | 영수증 OCR (보조) | `NAVER_CLOVA_OCR_*` 2개 |
| TourAPI | 축제 정보 | 코드에 직접 내장 |
| Resend | 이메일 알림 | `RESEND_API_KEY` |

---

## Google Maps Text Search (블로그 지도)

`/api/maps/place-search` — 블로그 MapInputBlock에서 사용:

```typescript
// POST body
{ query: string }

// 응답
{
  places: Array<{
    id: string;
    displayName: string;
    formattedAddress: string;
    location: { latitude: number; longitude: number };
  }>
}
```

---

## Naver 검색 API

헤더 인증 방식:
```typescript
headers: {
  "X-Naver-Client-Id": clientId,
  "X-Naver-Client-Secret": clientSecret,
}
```

로컬 검색: `GET https://openapi.naver.com/v1/search/local.json?query=...&display=5&sort=comment`

> ⚠️ Naver Cloud Platform(NCP) 엔드포인트는 별도 NCP 키가 필요. 현재 미설정 — 사용 금지.

---

## Vercel Cron 설정 (`vercel.json`)

```json
{
  "crons": [
    {
      "path": "/api/calendar/remind",
      "schedule": "0 0 * * *"
    }
  ]
}
```

`0 0 * * *` = 매일 UTC 00:00 (KST 09:00). `Authorization: Bearer {CRON_SECRET}` 헤더로 보호.
