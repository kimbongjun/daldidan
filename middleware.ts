import { NextRequest, NextResponse } from "next/server";
import { createMiddlewareClient } from "@/lib/supabase/server";

export async function middleware(request: NextRequest) {
  const response = NextResponse.next({
    request: { headers: request.headers },
  });

  const supabase = createMiddlewareClient(request, response);

  // 페이지 진입 시 세션을 한 번 갱신한다. getUser()는 access token이 만료됐으면
  // refresh를 수행하고, 갱신된 쿠키는 createMiddlewareClient.setAll 을 통해
  // response 에 기록된다. 이렇게 미리 갱신해두면 홈(/)이 동시에 쏘는 인증 API
  // (/api/me·/api/watchlist·/api/travel 등)가 만료 토큰으로 동시에 refresh를
  // 시도하다 일부가 401(refresh token 회전 경쟁)을 받는 문제를 예방한다.
  // 인증 서버 장애가 페이지를 막지 않도록 fail-open.
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
  // 세션 갱신이 실제로 필요한 라우트로만 한정한다.
  //  - "/"      : 홈 진입 시 토큰 선갱신(동시 인증 API의 401 회전 경쟁 예방)
  //  - "/login" : 로그인 유저를 홈으로 리다이렉트
  //  - 보호 페이지(/budget·/mypage·/blog/write·/blog/*/edit): 비로그인 차단
  // 그 외 페이지(travel·stock·blog 목록/상세·inspection·settings 등)와 그
  // 프리페치 요청에는 미들웨어를 태우지 않아, Next.js <Link> 프리페치마다
  // Supabase Auth 왕복이 발생하던 전역 속도 저하를 제거한다. (각 페이지/Route
  // Handler는 자체 getUser로 보안을 검증하므로 라우팅 미들웨어 축소는 안전하다.)
  matcher: [
    "/",
    "/login",
    "/budget",
    "/budget/:path*",
    "/mypage",
    "/mypage/:path*",
    "/blog/write",
    "/blog/write/:path*",
    "/blog/:path*/edit",
    "/blog/:path*/edit/:path*",
  ],
};
