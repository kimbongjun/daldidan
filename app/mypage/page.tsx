"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  LoaderCircle,
  Save,
  Settings,
  Sparkles,
  Trash2,
  Upload,
} from "lucide-react";
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
  const avatarFileRef = useRef<HTMLInputElement>(null);
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [birthYear, setBirthYear] = useState("");
  const [gender, setGender] = useState("");
  const [birthHour, setBirthHour] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [avatarUploadError, setAvatarUploadError] = useState("");

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) {
        router.replace("/login?next=/mypage");
        return;
      }

      setEmail(data.user.email ?? "");
      const profileRes = await fetch("/api/mypage");
      if (profileRes.ok) {
        const profile = await profileRes.json() as {
          display_name: string;
          avatar_url: string | null;
          birth_year: number | null;
          gender: string | null;
          birth_hour: number | null;
        };

        setDisplayName(profile.display_name);
        setAvatarUrl(profile.avatar_url ?? "");
        if (profile.birth_year) setBirthYear(String(profile.birth_year));
        if (profile.gender) setGender(profile.gender);
        if (profile.birth_hour != null) setBirthHour(String(profile.birth_hour));
      }
      setLoading(false);
    });
  }, [router]);

  const persistProfile = async (body: Record<string, unknown>) => {
    const res = await fetch("/api/mypage", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json() as { error?: string };
    if (!res.ok) {
      throw new Error(data.error ?? "저장에 실패했습니다.");
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSuccess(false);
    try {
      await persistProfile({
        display_name: displayName,
        avatar_url: avatarUrl.trim() || null,
        birth_year: birthYear ? Number(birthYear) : null,
        gender: gender || null,
        birth_hour: birthHour !== "" ? Number(birthHour) : null,
      });
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "저장에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  };

  const uploadAvatar = async (file: File) => {
    setAvatarUploading(true);
    setAvatarUploadError("");
    setError("");
    setSuccess(false);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const uploadRes = await fetch("/api/mypage/avatar", {
        method: "POST",
        body: formData,
      });
      const uploadData = await uploadRes.json() as { error?: string; url?: string };
      if (!uploadRes.ok || !uploadData.url) {
        throw new Error(uploadData.error ?? "아바타 업로드에 실패했습니다.");
      }

      setAvatarUrl(uploadData.url);
      await persistProfile({ avatar_url: uploadData.url });
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setAvatarUploadError(err instanceof Error ? err.message : "아바타 업로드에 실패했습니다.");
    } finally {
      setAvatarUploading(false);
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
    <div style={{ maxWidth: 560, margin: "0 auto", padding: "2rem 1rem" }}>
      <div className="flex items-center gap-3 mb-8">
        <Link
          href="/"
          className="pressable p-2 rounded-xl"
          style={{ color: "var(--text-muted)", background: "var(--bg-card)", border: "1px solid var(--border)" }}
        >
          <ArrowLeft size={16} />
        </Link>
        <div className="min-w-0 flex-1">
          <h1 className="text-xl font-black" style={{ color: "var(--text-primary)" }}>마이페이지</h1>
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>프로필과 개인 설정만 별도 페이지에서 관리합니다.</p>
        </div>
        <Link
          href="/settings"
          className="pressable px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5"
          style={{ background: "var(--bg-card)", color: "var(--text-primary)", border: "1px solid var(--border)" }}
        >
          <Settings size={14} />
          사이트 옵션
        </Link>
      </div>

      <div id="profile-avatar" className="bento-card p-6 flex flex-col gap-6 scroll-mt-24">
        <div className="flex flex-wrap gap-2">
          <span
            className="px-3 py-1.5 rounded-full text-xs font-semibold"
            style={{ background: "rgba(234,88,12,0.12)", color: ACCENT }}
          >
            프로필 편집
          </span>
          <Link
            href="/settings"
            className="pressable px-3 py-1.5 rounded-full text-xs font-semibold"
            style={{ background: "var(--bg-input)", color: "var(--text-primary)", border: "1px solid var(--border)" }}
          >
            사이트 옵션으로 이동
          </Link>
        </div>

        <div
          className="rounded-3xl p-5 flex flex-col gap-4"
          style={{ background: "linear-gradient(135deg, rgba(234,88,12,0.14), rgba(14,165,233,0.08))", border: "1px solid var(--border)" }}
        >
          <div className="flex items-center gap-4">
            {avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={avatarUrl}
                alt="프로필 아바타"
                className="w-20 h-20 rounded-3xl object-cover shrink-0"
                style={{ border: "1px solid var(--border)" }}
              />
            ) : (
              <div
                className="w-20 h-20 rounded-3xl flex items-center justify-center font-bold text-2xl shrink-0"
                style={{ background: "linear-gradient(135deg, #7C3AED, #06B6D4)", color: "#fff" }}
              >
                {avatarLetter}
              </div>
            )}
            <div className="min-w-0">
              <p className="font-bold truncate" style={{ color: "var(--text-primary)" }}>{displayName || "닉네임 없음"}</p>
              <p className="text-sm truncate" style={{ color: "var(--text-muted)" }}>{email}</p>             
            </div>
          </div>

          <div className="rounded-2xl p-4 flex flex-col gap-3" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid var(--border)" }}>
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>아바타 이미지 업로드</p>                
              </div>
              <button
                type="button"
                onClick={() => avatarFileRef.current?.click()}
                disabled={avatarUploading}
                className="pressable px-3 py-2 rounded-xl text-xs font-semibold disabled:opacity-50 flex items-center gap-1.5"
                style={{ background: `${ACCENT}18`, color: ACCENT, border: `1px solid ${ACCENT}33` }}
              >
                {avatarUploading ? <LoaderCircle size={12} className="animate-spin" /> : <Upload size={12} />}
                {avatarUploading ? "업로드 중..." : "이미지 업로드"}
              </button>
            </div>

            <input
              ref={avatarFileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void uploadAvatar(file);
                e.currentTarget.value = "";
              }}
            />

            <div className="flex items-center gap-3">
              <input
                type="url"
                value={avatarUrl}
                onChange={(e) => setAvatarUrl(e.target.value)}
                placeholder="아바타 이미지 URL 직접 입력"
                style={{ ...inputStyle, flex: 1 }}
              />
              {avatarUrl && (
                <button
                  type="button"
                  onClick={() => setAvatarUrl("")}
                  className="pressable px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5"
                  style={{ background: "rgba(244,63,94,0.1)", color: "#F43F5E" }}
                >
                  <Trash2 size={12} />
                  제거
                </button>
              )}
            </div>

            {avatarUploadError && (
              <p className="text-sm" style={{ color: "#F43F5E" }}>{avatarUploadError}</p>
            )}
          </div>
        </div>

        <form onSubmit={handleSave} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>닉네임</label>
            <input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="블로그 글쓴이로 표시될 닉네임"
              maxLength={30}
              style={inputStyle}
            />
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>블로그 포스트의 작성자 이름으로 사용됩니다.</p>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>이메일</label>
            <input value={email} disabled style={{ ...inputStyle, opacity: 0.5, cursor: "not-allowed" }} />
          </div>

          <hr style={{ border: "none", borderTop: "1px solid var(--border)" }} />

          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-1.5">
              <Sparkles size={14} style={{ color: ACCENT }} />
              <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>운세 정보</p>
            </div>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>
              AI 운세 분석에 사용됩니다. 입력하지 않으면 운세 위젯을 사용할 수 없어요.
            </p>
            <div className="flex gap-2">
              <div className="flex flex-col gap-1.5 flex-1">
                <label className="text-xs font-semibold" style={{ color: "var(--text-muted)" }}>출생 연도</label>
                <input
                  type="number"
                  value={birthYear}
                  onChange={(e) => setBirthYear(e.target.value)}
                  placeholder="예: 1993"
                  min={1900}
                  max={2100}
                  style={inputStyle}
                />
              </div>
              <div className="flex flex-col gap-1.5 flex-1">
                <label className="text-xs font-semibold" style={{ color: "var(--text-muted)" }}>성별</label>
                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                  style={{ ...inputStyle, appearance: "none" }}
                >
                  <option value="">선택</option>
                  <option value="남성">남성</option>
                  <option value="여성">여성</option>
                  <option value="기타">기타</option>
                </select>
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold" style={{ color: "var(--text-muted)" }}>태어난 시 (0~23시)</label>
              <input
                type="number"
                value={birthHour}
                onChange={(e) => setBirthHour(e.target.value)}
                placeholder="예: 14 (오후 2시)"
                min={0}
                max={23}
                style={inputStyle}
              />
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>24시간제 기준. 모르는 경우 비워두세요.</p>
            </div>
          </div>

          {error && <p className="text-sm" style={{ color: "#F43F5E" }}>{error}</p>}
          {success && <p className="text-sm" style={{ color: "#10B981" }}>저장되었습니다.</p>}

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
