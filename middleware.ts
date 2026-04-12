import { NextRequest, NextResponse } from "next/server";
import { createMiddlewareClient } from "@/lib/supabase/server";

export async function middleware(request: NextRequest) {
  const response = NextResponse.next({
    request: { headers: request.headers },
  });

  const supabase = createMiddlewareClient(request, response);
  const { data: { session } } = await supabase.auth.getSession();

  const { pathname } = request.nextUrl;

  // 로그인 유저가 /login 접근 → 홈으로
  if (session && pathname === "/login") {
    return NextResponse.redirect(new URL("/", request.url));
  }

  // 비로그인 유저가 /budget 접근 → 로그인으로
  if (!session && pathname.startsWith("/budget")) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return response;
}

export const config = {
  matcher: ["/login", "/budget", "/budget/:path*"],
};
