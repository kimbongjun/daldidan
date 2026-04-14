"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle, Save, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

const ACCENT = "#EA580C";

const inputStyle: React.CSSProperties = {
  background: "var(--bg-input)",
  border: "1px solid var(--border)",
  borderRadius: "0.75rem",
  padding: "0.65rem 0.875rem",
  fontSize: "0.9rem",
  color: "var(--text-primary)",
  outline: "none",
  width: "100%",
};

export default function MyPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) {
        router.replace("/login?next=/mypage");
        return;
      }
      setEmail(data.user.email ?? "");
      const res = await fetch("/api/mypage");
      if (res.ok) {
        const profile = await res.json() as { email: string; display_name: string };
        setDisplayName(profile.display_name);
      }
      setLoading(false);
    });
  }, [router]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSuccess(false);
    try {
      const res = await fetch("/api/mypage", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ display_name: displayName }),
      });
      const data = await res.json() as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "저장에 실패했습니다.");
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "저장에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoaderCircle size={24} className="animate-spin" style={{ color: ACCENT }} />
      </div>
    );
  }

  const avatarLetter = displayName?.[0]?.toUpperCase() || email?.[0]?.toUpperCase() || "U";

  return (
    <div style={{ maxWidth: 480, margin: "0 auto", padding: "2rem 1rem" }}>
      {/* 헤더 */}
      <div className="flex items-center gap-3 mb-8">
        <Link
          href="/"
          className="pressable p-2 rounded-xl"
          style={{ color: "var(--text-muted)", background: "var(--bg-card)", border: "1px solid var(--border)" }}
        >
          <ArrowLeft size={16} />
        </Link>
        <h1 className="text-xl font-black" style={{ color: "var(--text-primary)" }}>마이페이지</h1>
      </div>

      <div className="bento-card p-6 flex flex-col gap-6">
        {/* 프로필 아바타 */}
        <div className="flex items-center gap-4">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center font-bold text-xl shrink-0"
            style={{ background: "linear-gradient(135deg, #7C3AED, #06B6D4)", color: "#fff" }}
          >
            {avatarLetter}
          </div>
          <div className="min-w-0">
            <p className="font-bold truncate" style={{ color: "var(--text-primary)" }}>
              {displayName || "닉네임 없음"}
            </p>
            <p className="text-sm truncate" style={{ color: "var(--text-muted)" }}>{email}</p>
          </div>
        </div>

        <hr style={{ border: "none", borderTop: "1px solid var(--border)" }} />

        <form onSubmit={handleSave} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
              닉네임
            </label>
            <input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="블로그 글쓴이로 표시될 닉네임"
              maxLength={30}
              style={inputStyle}
            />
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>
              블로그 포스트의 작성자 이름으로 사용됩니다.
            </p>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
              이메일
            </label>
            <input
              value={email}
              disabled
              style={{ ...inputStyle, opacity: 0.5, cursor: "not-allowed" }}
            />
          </div>

          {error && (
            <p className="text-sm" style={{ color: "#F43F5E" }}>{error}</p>
          )}
          {success && (
            <p className="text-sm" style={{ color: "#10B981" }}>닉네임이 저장되었습니다.</p>
          )}

          <button
            type="submit"
            disabled={saving || !displayName.trim()}
            className="pressable py-2.5 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2 disabled:opacity-45"
            style={{ background: ACCENT }}
          >
            {saving ? <LoaderCircle size={14} className="animate-spin" /> : <Save size={14} />}
            {saving ? "저장 중..." : "저장하기"}
          </button>
        </form>
      </div>
    </div>
  );
}
