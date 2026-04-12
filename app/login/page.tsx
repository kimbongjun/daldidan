import { signIn } from "@/lib/supabase/actions/auth";
import { Sparkles, LogIn } from "lucide-react";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string }>;
}) {
  const params = await searchParams;
  const errorMessage = params.error;
  const next = params.next ?? "/";

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--bg-base)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "1rem",
      }}
    >
      <div style={{ width: "100%", maxWidth: 400 }}>
        {/* 로고 */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "2rem", justifyContent: "center" }}>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: "0.875rem",
              background: "linear-gradient(135deg, #7C3AED, #06B6D4)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Sparkles size={20} color="#fff" />
          </div>
          <div>
            <h1 style={{ fontSize: "1.4rem", fontWeight: 900, color: "var(--text-primary)", margin: 0 }}>달디단</h1>
            <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", margin: 0 }}>개인 대시보드</p>
          </div>
        </div>

        {/* 카드 */}
        <div
          className="bento-card gradient-violet"
          style={{ padding: "2rem" }}
        >
          <h2 style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--text-primary)", margin: "0 0 0.25rem" }}>로그인</h2>
          <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", margin: "0 0 1.5rem" }}>
            관리자로부터 발급받은 계정으로 로그인하세요.
          </p>

          {errorMessage && (
            <div
              style={{
                background: "rgba(244,63,94,0.12)",
                border: "1px solid rgba(244,63,94,0.3)",
                borderRadius: "0.6rem",
                padding: "0.75rem 1rem",
                marginBottom: "1rem",
                fontSize: "0.8rem",
                color: "#F43F5E",
              }}
            >
              {errorMessage}
            </div>
          )}

          <form action={signIn} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <input type="hidden" name="next" value={next} />

            <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
              <label style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--text-muted)" }}>이메일</label>
              <input
                type="email"
                name="email"
                required
                autoComplete="email"
                placeholder="user@example.com"
                style={{
                  background: "var(--bg-input)",
                  border: "1px solid var(--border)",
                  borderRadius: "0.625rem",
                  padding: "0.625rem 0.875rem",
                  fontSize: "0.9rem",
                  color: "var(--text-primary)",
                  outline: "none",
                  width: "100%",
                  boxSizing: "border-box",
                }}
              />
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
              <label style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--text-muted)" }}>비밀번호</label>
              <input
                type="password"
                name="password"
                required
                autoComplete="current-password"
                placeholder="••••••••"
                style={{
                  background: "var(--bg-input)",
                  border: "1px solid var(--border)",
                  borderRadius: "0.625rem",
                  padding: "0.625rem 0.875rem",
                  fontSize: "0.9rem",
                  color: "var(--text-primary)",
                  outline: "none",
                  width: "100%",
                  boxSizing: "border-box",
                }}
              />
            </div>

            <button
              type="submit"
              style={{
                marginTop: "0.5rem",
                background: "#7C3AED",
                color: "#fff",
                border: "none",
                borderRadius: "0.625rem",
                padding: "0.75rem",
                fontSize: "0.9rem",
                fontWeight: 700,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "0.5rem",
                transition: "opacity 0.2s",
              }}
            >
              <LogIn size={16} />
              로그인
            </button>
          </form>
        </div>

        <p style={{ textAlign: "center", fontSize: "0.72rem", color: "var(--text-muted)", marginTop: "1.25rem" }}>
          계정이 없으신가요? 관리자에게 문의하세요.
        </p>
      </div>
    </div>
  );
}
