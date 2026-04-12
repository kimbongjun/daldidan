// 서버 컴포넌트 / Route Handler / Server Action에서 사용
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Server Component에서 set 호출 시 무시 (미들웨어에서 처리)
          }
        },
      },
    },
  );
}

// 미들웨어 전용 — NextResponse 쿠키 쓰기 지원
export function createMiddlewareClient(
  request: Request,
  response: { headers: Headers },
) {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.headers
            .get("cookie")
            ?.split(";")
            .map((c) => {
              const [name, ...rest] = c.trim().split("=");
              return { name: name.trim(), value: rest.join("=") };
            }) ?? [];
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            const cookieVal = `${name}=${value}; Path=${options?.path ?? "/"}${options?.maxAge !== undefined ? `; Max-Age=${options.maxAge}` : ""}${options?.sameSite ? `; SameSite=${options.sameSite}` : ""}${options?.secure ? "; Secure" : ""}${options?.httpOnly ? "; HttpOnly" : ""}`;
            response.headers.append("Set-Cookie", cookieVal);
          });
        },
      },
    },
  );
}

// Service Role — RLS 우회, 서버 전용
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}
