import { NextRequest, NextResponse } from "next/server";
import { createMiddlewareClient } from "@/lib/supabase/server";

export async function middleware(request: NextRequest) {
  const response = NextResponse.next({
    request: { headers: request.headers },
  });

  const supabase = createMiddlewareClient(request, response);

  // 페이지 진입(및 soft-nav RSC 요청)마다 세션을 한 번 갱신한다.
  // getUser()는 access token이 만료됐으면 refresh를 수행하고, 갱신된 쿠키는
  // createMiddlewareClient.setAll 을 통해 response 에 기록된다.
  // 이렇게 페이지 시점에 토큰을 미리 갱신해두면, 홈에서 동시에 발생하는 여러
  // 인증 API 요청(/api/me·/api/watchlist·/api/travel 등)이 만료된 토큰으로
  // 동시에 refresh를 시도하다 일부가 401(refresh token 회전 경쟁)을 받는
  // 문제를 예방한다. 인증 서버 장애가 페이지를 막지 않도록 fail-open.
  let user: { id: string } | null = null;
  try {
    const { data } = await supabase.auth.getUser();
    user = data.user ?? null;
  } catch {
    /* 인증 서버 장애 시 갱신을 생략하고 그대로 통과 */
  }

  const { pathname } = request.nextUrl;

  // 갱신된 Set-Cookie 를 리다이렉트 응답으로도 그대로 전달한다.
  const redirectWithCookies = (url: URL) => {
    const redirect = NextResponse.redirect(url);
    for (const cookie of response.headers.getSetCookie()) {
      redirect.headers.append("Set-Cookie", cookie);
    }
    return redirect;
  };

  // 로그인 유저가 /login 접근 → 홈으로
  if (user && pathname === "/login") {
    return redirectWithCookies(new URL("/", request.url));
  }

  // 비로그인 유저가 보호된 작성/개인 페이지 접근 → 로그인으로
  if (!user && (pathname.startsWith("/budget") || pathname.startsWith("/blog/write") || pathname.startsWith("/mypage") || /^\/blog\/.+\/edit(?:\/.*)?$/.test(pathname))) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return redirectWithCookies(loginUrl);
  }

  return response;
}

export const config = {
  // /api/* 와 정적 자산을 제외한 모든 페이지 라우트에서 세션을 갱신한다.
  // (/api 는 제외 — 페이지 진입 시 이미 갱신되므로 API마다 getUser 왕복을 피한다.)
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|json|js|txt|xml|webmanifest)$).*)",
  ],
};
