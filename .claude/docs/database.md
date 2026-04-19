# 달디단 — 데이터베이스 & 인증

## Supabase PostgreSQL 주요 테이블

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

-- 캘린더 이벤트
calendar_events (
  id           uuid PRIMARY KEY,
  user_id      uuid REFERENCES profiles,
  title        text,
  event_type   text CHECK (event_type IN ('schedule','anniversary')),
  start_date   date,
  start_time   time,
  end_date     date,
  end_time     time,
  location     text,
  description  text,
  is_recurring boolean DEFAULT false,
  recurrence   text,
  remind_sent  boolean DEFAULT false,
  created_at   timestamptz
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

## 인증 플로우

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

## Row Level Security (RLS) 정책

- `calendar_events`: `user_id = auth.uid()` 또는 같은 가족(커플) 그룹 공유
- `transactions`: `user_id = auth.uid()` (본인만 수정/삭제, 조회는 멤버 공유)
- `blog_posts`: 발행된 글은 공개, 초안은 author_id만 접근
- `push_subscriptions`: user_id 기반 본인만 접근
