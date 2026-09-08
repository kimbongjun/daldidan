# 달디단 — 외부 API 통합

## 환경 변수 목록

| 변수명 | 용도 | 접근 |
|--------|------|------|
| `NEXT_PUBLIC_SITE_URL` | 이메일 링크·알림톡 딥링크 기본 URL | 클라이언트 노출 가능 |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase URL | 클라이언트 노출 가능 |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase 공개 키 | 클라이언트 노출 가능 |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase 관리자 키 | **서버 전용, 절대 노출 금지** |
| `GOOGLE_MAPS_API_KEY` | Google Vision OCR, Maps Text Search | 서버 전용 |
| `NAVER_CLIENT_ID` | Naver 검색 API (장소·블로그) | 서버 전용 |
| `NAVER_CLIENT_SECRET` | Naver 검색 API | 서버 전용 |
| `NAVER_CLOVA_OCR_INVOKE_URL` | Clova OCR Receipt 엔드포인트 | 서버 전용 |
| `NAVER_CLOVA_OCR_SECRET_KEY` | Clova OCR 인증 | 서버 전용 |
| `KAKAO_REST_API_KEY` | 카카오 장소 검색 (블로그 지도) | 서버 전용 |
| `NEXT_PUBLIC_KAKAO_JS_KEY` | 카카오 공유 버튼 SDK | 클라이언트 노출 가능 |
| `KAKAO_ALIMTALK_API_KEY` | 카카오 알림톡 발송 (미설정 시 스킵) | 서버 전용 |
| `KAKAO_ALIMTALK_SENDER` | 알림톡 발신 채널 | 서버 전용 |
| `KAKAO_ALIMTALK_TEMPLATE` | 알림톡 템플릿 코드 | 서버 전용 |
| `REALESTATE_API_KEY` | 국토부 아파트 실거래가 API (미설정 시 mock) | 서버 전용 |
| `REALESTATE_REGION_CODE` | 실거래 조회 법정동 코드 (미설정 시 서울 10개 구) | 서버 전용 |
| `KRX_OPENAPI_KEY` | 한국거래소 KRX Open API (주식 위젯) | 서버 전용 |
| `KRX_OPENAPI_BASE_URL` | KRX API 기본 URL (기본: data-dbg.krx.co.kr) | 서버 전용 |
| `KRX_DEFAULT_SYMBOLS` | 기본 관심 종목 코드 목록 | 서버 전용 |
| `NEXT_PUBLIC_FIREBASE_*` | Firebase FCM 웹 푸시 (6개 키) | 클라이언트 노출 가능 |
| `FIREBASE_ADMIN_PROJECT_ID` | Firebase Admin | 서버 전용 |
| `FIREBASE_ADMIN_CLIENT_EMAIL` | Firebase Admin | 서버 전용 |
| `FIREBASE_ADMIN_PRIVATE_KEY` | Firebase Admin | 서버 전용 |
| `ANTHROPIC_API_KEY` | Anthropic Claude (블로그 AI 요약, 미설정 시 규칙 기반 폴백) | 서버 전용 |
| `ANTHROPIC_BLOG_SUMMARY_MODEL` | 요약 모델 (기본: claude-haiku-4-5-20251001) | 서버 전용 |
| `MAGNIFIC_API_KEY` | Magnific AI 블로그 썸네일 생성 (1순위) | 서버 전용 |
| `UNSPLASH_ACCESS_KEY` | Unsplash 이미지 (Magnific 한도 초과 시 폴백) | 서버 전용 |
| `CLOUDFLARE_STREAM_ACCOUNT_ID` | Cloudflare Stream 동영상 업로드 | 서버 전용 |
| `CLOUDFLARE_STREAM_API_TOKEN` | Cloudflare Stream 인증 | 서버 전용 |
| `NEXT_PUBLIC_CLOUDFLARE_STREAM_CUSTOMER_CODE` | 스트림 플레이어 도메인 코드 | 클라이언트 노출 가능 |
| `RESEND_API_KEY` | 블로그 발행 이메일 알림 (미설정 시 스킵) | 서버 전용 |
| `RESEND_FROM_EMAIL` | 발신 이메일 주소 | 서버 전용 |
| `COMMENT_PASSWORD_SECRET` | 댓글 비밀번호 HMAC-SHA256 시크릿 | 서버 전용 |
| `CRON_SECRET` | Vercel Cron 보호 토큰 (**미설정 시 크론 라우트가 무인증 개방 — 프로덕션 필수**) | 서버 전용 |
| `WEBAUTHN_RP_ID` / `WEBAUTHN_ORIGIN` | WebAuthn 생체 로그인 도메인 설정 | 서버 전용 |
| `NEXT_PUBLIC_APP_NAME` | WebAuthn RP 표시 이름 | 클라이언트 노출 가능 |

---

## 외부 API 목록

| API | 용도 | 환경 변수 |
|-----|------|---------|
| Google Vision | 영수증 OCR | `GOOGLE_MAPS_API_KEY` |
| Google Maps Text Search | 블로그 장소 검색 | `GOOGLE_MAPS_API_KEY` |
| Supabase | DB, Auth, Storage | `NEXT_PUBLIC_SUPABASE_URL` 외 2개 |
| Firebase FCM | 푸시 알림 | `NEXT_PUBLIC_FIREBASE_*` 6개 |
| Naver Clova OCR | 영수증 OCR (보조) | `NAVER_CLOVA_OCR_*` 2개 |
| 동행복권 + 네이버 검색 | 로또 당첨번호 (키 불필요, DB 캐시 우선) | — |
| KRX Open API + 네이버 시세 | 국내 증시 | `KRX_OPENAPI_KEY` |
| 국토부 실거래가 | 부동산 위젯 | `REALESTATE_API_KEY` |
| Anthropic Claude | 블로그 AI 요약 | `ANTHROPIC_API_KEY` |
| Cloudflare Stream | 블로그 동영상 | `CLOUDFLARE_STREAM_*` |
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
      "schedule": "0 9 * * *"
    },
    {
      "path": "/api/lotto/crawl",
      "schedule": "10 12 * * 6"
    }
  ]
}
```

- `/api/calendar/remind` — 매일 UTC 09:00 (KST 18:00). 하루 1회 실행이므로 라우트는
  "알림 예정 시각이 24시간 이내"인 일정을 몰아서 발송한다 (15분 주기로 바꾸면 look-ahead 축소).
- `/api/lotto/crawl` — 매주 토요일 UTC 12:10 (KST 21:10, 추첨 직후). 최신·직전 회차를
  크롤링해 `lotto_results` 테이블에 upsert한다.
- **Vercel Cron은 항상 GET으로 호출**하므로 크론 대상 라우트는 반드시 GET 핸들러에서
  실제 작업을 수행해야 한다. `Authorization: Bearer {CRON_SECRET}` 헤더로 보호.

## 로또 데이터 흐름

`/api/lotto/latest` — ① Supabase `lotto_results`에서 최신 회차 조회 → ② 최신 회차가
없거나 뒤처졌을 때만 동행복권 API(타임아웃 2.5초) → 네이버 검색 크롤링(4초) 순서로
라이브 폴백 → ③ 라이브 성공 시 DB upsert, 실패 시 저장된 직전 회차를 즉시 반환.
평상시에는 주간 크론이 채워둔 DB만 읽으므로 외부 API 장애가 위젯에 전파되지 않는다.
