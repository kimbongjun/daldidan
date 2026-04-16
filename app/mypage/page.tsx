"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, ChevronDown, ChevronUp, Image as ImageIcon,
  LoaderCircle, Save, Settings, Smartphone, Trash2,
} from "lucide-react";
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

type SiteSettings = {
  meta_title: string;
  meta_description: string;
  meta_og_image: string;
  logo_url: string;
  custom_greeting: string;
  pwa_icon_url: string;
  pwa_splash_url: string;
};

export default function MyPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const ogFileRef = useRef<HTMLInputElement>(null);
  const pwaIconFileRef = useRef<HTMLInputElement>(null);
  const pwaSplashFileRef = useRef<HTMLInputElement>(null);

  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  // 옵션 메뉴
  const [optionsOpen, setOptionsOpen] = useState(false);
  const [settings, setSettings] = useState<SiteSettings>({
    meta_title: "", meta_description: "", meta_og_image: "", logo_url: "", custom_greeting: "",
    pwa_icon_url: "", pwa_splash_url: "",
  });
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [settingsSuccess, setSettingsSuccess] = useState(false);
  const [logoUploading, setLogoUploading] = useState(false);
  const [ogUploading, setOgUploading] = useState(false);
  const [pwaIconUploading, setPwaIconUploading] = useState(false);
  const [pwaSplashUploading, setPwaSplashUploading] = useState(false);

  // ?settings=open 파라미터로 옵션 패널 자동 전개
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("settings") === "open") setOptionsOpen(true);
  }, []);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) { router.replace("/login?next=/mypage"); return; }
      setEmail(data.user.email ?? "");
      const [profileRes, settingsRes] = await Promise.all([
        fetch("/api/mypage"),
        fetch("/api/site-settings"),
      ]);
      if (profileRes.ok) {
        const p = await profileRes.json() as { display_name: string };
        setDisplayName(p.display_name);
      }
      if (settingsRes.ok) {
        const s = await settingsRes.json() as SiteSettings;
        setSettings(s);
      }
      setLoading(false);
    });
  }, [router]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true); setError(""); setSuccess(false);
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
    } finally { setSaving(false); }
  };

  const handleSettingsSave = async () => {
    setSettingsSaving(true); setSettingsSuccess(false);
    try {
      await fetch("/api/site-settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      setSettingsSuccess(true);
      setTimeout(() => setSettingsSuccess(false), 3000);
    } finally { setSettingsSaving(false); }
  };

  const uploadImage = async (
    file: File,
    field: "logo_url" | "meta_og_image" | "pwa_icon_url" | "pwa_splash_url",
    setUploading: (v: boolean) => void
  ) => {
    setUploading(true);
    try {
      const supabase = createClient();
      const ext = file.name.split(".").pop() ?? "jpg";
      const path = `site/${field}_${Date.now()}.${ext}`;
      const { data, error } = await supabase.storage
        .from("blog-images")
        .upload(path, file, { upsert: true });
      if (error) throw error;
      const { data: { publicUrl } } = supabase.storage.from("blog-images").getPublicUrl(data.path);
      setSettings((prev) => ({ ...prev, [field]: publicUrl }));
    } catch (err) {
      console.error("이미지 업로드 실패:", err);
    } finally { setUploading(false); }
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

      {/* ── 프로필 카드 ── */}
      <div className="bento-card p-6 flex flex-col gap-6">
        <div className="flex items-center gap-4">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center font-bold text-xl shrink-0"
            style={{ background: "linear-gradient(135deg, #7C3AED, #06B6D4)", color: "#fff" }}
          >
            {avatarLetter}
          </div>
          <div className="min-w-0">
            <p className="font-bold truncate" style={{ color: "var(--text-primary)" }}>{displayName || "닉네임 없음"}</p>
            <p className="text-sm truncate" style={{ color: "var(--text-muted)" }}>{email}</p>
          </div>
        </div>

        <hr style={{ border: "none", borderTop: "1px solid var(--border)" }} />

        <form onSubmit={handleSave} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>닉네임</label>
            <input value={displayName} onChange={(e) => setDisplayName(e.target.value)}
              placeholder="블로그 글쓴이로 표시될 닉네임" maxLength={30} style={inputStyle} />
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>블로그 포스트의 작성자 이름으로 사용됩니다.</p>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>이메일</label>
            <input value={email} disabled style={{ ...inputStyle, opacity: 0.5, cursor: "not-allowed" }} />
          </div>
          {error && <p className="text-sm" style={{ color: "#F43F5E" }}>{error}</p>}
          {success && <p className="text-sm" style={{ color: "#10B981" }}>닉네임이 저장되었습니다.</p>}
          <button type="submit" disabled={saving || !displayName.trim()}
            className="pressable py-2.5 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2 disabled:opacity-45"
            style={{ background: ACCENT }}>
            {saving ? <LoaderCircle size={14} className="animate-spin" /> : <Save size={14} />}
            {saving ? "저장 중..." : "저장하기"}
          </button>
        </form>
      </div>

      {/* ── 옵션 메뉴 ── */}
      <div className="bento-card mt-4 overflow-hidden">
        <button
          onClick={() => setOptionsOpen((v) => !v)}
          className="w-full flex items-center justify-between p-5 transition-opacity hover:opacity-80"
          style={{ background: "transparent", border: "none", cursor: "pointer" }}
        >
          <div className="flex items-center gap-2">
            <Settings size={16} style={{ color: ACCENT }} />
            <span className="font-bold text-sm" style={{ color: "var(--text-primary)" }}>사이트 옵션</span>
          </div>
          {optionsOpen
            ? <ChevronUp size={16} style={{ color: "var(--text-muted)" }} />
            : <ChevronDown size={16} style={{ color: "var(--text-muted)" }} />
          }
        </button>

        {optionsOpen && (
          <div className="flex flex-col gap-5 px-5 pb-6 pt-1">
            <hr style={{ border: "none", borderTop: "1px solid var(--border)", marginTop: 0 }} />

            {/* 로고 이미지 */}
            <div className="flex flex-col gap-2">
              <label className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                사이트 로고
              </label>
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                헤더에 표시될 로고 이미지를 업로드하세요. (권장: 40×40px, PNG/WebP)
              </p>
              <div className="flex items-center gap-3">
                {settings.logo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={settings.logo_url} alt="로고" className="w-10 h-10 rounded-xl object-cover" />
                ) : (
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                    style={{ background: "rgba(234,88,12,0.1)", color: ACCENT }}>
                    <ImageIcon size={18} />
                  </div>
                )}
                <input type="url" value={settings.logo_url}
                  onChange={(e) => setSettings((p) => ({ ...p, logo_url: e.target.value }))}
                  placeholder="이미지 URL 직접 입력" style={{ ...inputStyle, flex: 1 }} />
              </div>
              <div className="flex gap-2">
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) uploadImage(f, "logo_url", setLogoUploading);
                  }} />
                <button type="button" onClick={() => fileInputRef.current?.click()}
                  disabled={logoUploading}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold disabled:opacity-50"
                  style={{ background: "rgba(234,88,12,0.12)", color: ACCENT }}>
                  {logoUploading ? <LoaderCircle size={12} className="animate-spin" /> : <ImageIcon size={12} />}
                  {logoUploading ? "업로드 중..." : "파일 선택"}
                </button>
                {settings.logo_url && (
                  <button type="button" onClick={() => setSettings((p) => ({ ...p, logo_url: "" }))}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold"
                    style={{ background: "rgba(244,63,94,0.1)", color: "#F43F5E" }}>
                    <Trash2 size={12} /> 삭제
                  </button>
                )}
              </div>
            </div>

            <hr style={{ border: "none", borderTop: "1px solid var(--border)" }} />

            {/* PWA 설정 */}
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-1.5">
                <Smartphone size={14} style={{ color: ACCENT }} />
                <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>PWA 설정</p>
              </div>

              {/* 앱 아이콘 */}
              <div className="flex flex-col gap-2">
                <label className="text-xs font-semibold" style={{ color: "var(--text-muted)" }}>
                  앱 아이콘 (홈 화면 아이콘)
                </label>
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                  홈 화면에 설치될 아이콘을 업로드하세요. (권장: 512×512px, PNG)
                </p>
                <div className="flex items-center gap-3">
                  {settings.pwa_icon_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={settings.pwa_icon_url} alt="앱 아이콘" className="w-12 h-12 rounded-xl object-cover" />
                  ) : (
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center"
                      style={{ background: "rgba(234,88,12,0.1)", color: ACCENT }}>
                      <Smartphone size={20} />
                    </div>
                  )}
                  <input type="url" value={settings.pwa_icon_url}
                    onChange={(e) => setSettings((p) => ({ ...p, pwa_icon_url: e.target.value }))}
                    placeholder="이미지 URL 직접 입력" style={{ ...inputStyle, flex: 1 }} />
                </div>
                <div className="flex gap-2">
                  <input ref={pwaIconFileRef} type="file" accept="image/*" className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) uploadImage(f, "pwa_icon_url", setPwaIconUploading);
                    }} />
                  <button type="button" onClick={() => pwaIconFileRef.current?.click()}
                    disabled={pwaIconUploading}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold disabled:opacity-50"
                    style={{ background: "rgba(234,88,12,0.12)", color: ACCENT }}>
                    {pwaIconUploading ? <LoaderCircle size={12} className="animate-spin" /> : <ImageIcon size={12} />}
                    {pwaIconUploading ? "업로드 중..." : "파일 선택"}
                  </button>
                  {settings.pwa_icon_url && (
                    <button type="button" onClick={() => setSettings((p) => ({ ...p, pwa_icon_url: "" }))}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold"
                      style={{ background: "rgba(244,63,94,0.1)", color: "#F43F5E" }}>
                      <Trash2 size={12} /> 삭제
                    </button>
                  )}
                </div>
              </div>

              {/* 스플래시 이미지 */}
              <div className="flex flex-col gap-2">
                <label className="text-xs font-semibold" style={{ color: "var(--text-muted)" }}>
                  스플래시 화면 이미지 (앱 시작 화면)
                </label>
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                  PWA 앱 시작 시 표시되는 이미지입니다. iOS 권장 크기: 2048×2732px, PNG
                </p>
                {settings.pwa_splash_url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={settings.pwa_splash_url} alt="스플래시 이미지" className="rounded-xl object-cover w-full"
                    style={{ maxHeight: 120 }} />
                )}
                <input type="url" value={settings.pwa_splash_url}
                  onChange={(e) => setSettings((p) => ({ ...p, pwa_splash_url: e.target.value }))}
                  placeholder="https://..." style={inputStyle} />
                <div className="flex gap-2">
                  <input ref={pwaSplashFileRef} type="file" accept="image/*" className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) uploadImage(f, "pwa_splash_url", setPwaSplashUploading);
                    }} />
                  <button type="button" onClick={() => pwaSplashFileRef.current?.click()}
                    disabled={pwaSplashUploading}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold disabled:opacity-50"
                    style={{ background: "rgba(234,88,12,0.12)", color: ACCENT }}>
                    {pwaSplashUploading ? <LoaderCircle size={12} className="animate-spin" /> : <ImageIcon size={12} />}
                    {pwaSplashUploading ? "업로드 중..." : "파일 선택"}
                  </button>
                  {settings.pwa_splash_url && (
                    <button type="button" onClick={() => setSettings((p) => ({ ...p, pwa_splash_url: "" }))}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold"
                      style={{ background: "rgba(244,63,94,0.1)", color: "#F43F5E" }}>
                      <Trash2 size={12} /> 삭제
                    </button>
                  )}
                </div>
              </div>
            </div>

            <hr style={{ border: "none", borderTop: "1px solid var(--border)" }} />

            {/* 메타 태그 */}
            <div className="flex flex-col gap-4">
              <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>메타 태그 (SEO)</p>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold" style={{ color: "var(--text-muted)" }}>사이트 제목 (title)</label>
                <input value={settings.meta_title}
                  onChange={(e) => setSettings((p) => ({ ...p, meta_title: e.target.value }))}
                  placeholder="달디단 — 일상의 편리함" maxLength={80} style={inputStyle} />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold" style={{ color: "var(--text-muted)" }}>사이트 설명 (description)</label>
                <textarea value={settings.meta_description}
                  onChange={(e) => setSettings((p) => ({ ...p, meta_description: e.target.value }))}
                  placeholder="날씨, 쇼핑, 영화, 여행, 가계부를 한 곳에서" maxLength={200} rows={2}
                  style={{ ...inputStyle, resize: "vertical" }} />
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-xs font-semibold" style={{ color: "var(--text-muted)" }}>OG 이미지 (og:image)</label>
                {settings.meta_og_image && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={settings.meta_og_image} alt="OG 이미지" className="rounded-xl object-cover w-full"
                    style={{ maxHeight: 120 }} />
                )}
                <input type="url" value={settings.meta_og_image}
                  onChange={(e) => setSettings((p) => ({ ...p, meta_og_image: e.target.value }))}
                  placeholder="https://..." style={inputStyle} />
                <div className="flex gap-2">
                  <input ref={ogFileRef} type="file" accept="image/*" className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) uploadImage(f, "meta_og_image", setOgUploading);
                    }} />
                  <button type="button" onClick={() => ogFileRef.current?.click()}
                    disabled={ogUploading}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold disabled:opacity-50"
                    style={{ background: "rgba(234,88,12,0.12)", color: ACCENT }}>
                    {ogUploading ? <LoaderCircle size={12} className="animate-spin" /> : <ImageIcon size={12} />}
                    {ogUploading ? "업로드 중..." : "파일 선택"}
                  </button>
                  {settings.meta_og_image && (
                    <button type="button" onClick={() => setSettings((p) => ({ ...p, meta_og_image: "" }))}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold"
                      style={{ background: "rgba(244,63,94,0.1)", color: "#F43F5E" }}>
                      <Trash2 size={12} /> 삭제
                    </button>
                  )}
                </div>
              </div>
            </div>

            <hr style={{ border: "none", borderTop: "1px solid var(--border)" }} />

            {settingsSuccess && (
              <p className="text-sm text-center" style={{ color: "#10B981" }}>옵션이 저장되었습니다. 새로고침 후 적용됩니다.</p>
            )}
            <button type="button" onClick={handleSettingsSave} disabled={settingsSaving}
              className="pressable py-2.5 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2 disabled:opacity-45"
              style={{ background: ACCENT }}>
              {settingsSaving ? <LoaderCircle size={14} className="animate-spin" /> : <Save size={14} />}
              {settingsSaving ? "저장 중..." : "옵션 저장"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
