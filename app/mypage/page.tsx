"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, ChevronDown, ChevronUp, Image as ImageIcon,
  LoaderCircle, Moon, Plus, Save, Settings, Smartphone, Sparkles, Sun, Trash2, Users,
} from "lucide-react";
import { useThemeStore } from "@/store/useThemeStore";
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
  favicon_url: string;
  logo_url: string;
  custom_greeting: string;
  pwa_icon_url: string;
  pwa_splash_url: string;
  budget_members: string; // JSON 배열 문자열
};

export default function MyPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const ogFileRef = useRef<HTMLInputElement>(null);
  const faviconFileRef = useRef<HTMLInputElement>(null);
  const pwaIconFileRef = useRef<HTMLInputElement>(null);
  const pwaSplashFileRef = useRef<HTMLInputElement>(null);

  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [birthYear, setBirthYear] = useState<string>("");
  const [gender, setGender] = useState<string>("");
  const [birthHour, setBirthHour] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  // 옵션 메뉴
  const [optionsOpen, setOptionsOpen] = useState(false);
  const [settings, setSettings] = useState<SiteSettings>({
    meta_title: "", meta_description: "", meta_og_image: "", favicon_url: "", logo_url: "", custom_greeting: "",
    pwa_icon_url: "", pwa_splash_url: "", budget_members: '["공동","봉준","달희"]',
  });
  const { theme, toggle: toggleTheme } = useThemeStore();
  const [newMemberInput, setNewMemberInput] = useState("");
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [settingsSuccess, setSettingsSuccess] = useState(false);
  const [logoUploading, setLogoUploading] = useState(false);
  const [ogUploading, setOgUploading] = useState(false);
  const [faviconUploading, setFaviconUploading] = useState(false);
  const [pwaIconUploading, setPwaIconUploading] = useState(false);
  const [pwaSplashUploading, setPwaSplashUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");

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
        const p = await profileRes.json() as {
          display_name: string;
          birth_year: number | null;
          gender: string | null;
          birth_hour: number | null;
        };
        setDisplayName(p.display_name);
        if (p.birth_year) setBirthYear(String(p.birth_year));
        if (p.gender) setGender(p.gender);
        if (p.birth_hour != null) setBirthHour(String(p.birth_hour));
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
      const body: Record<string, unknown> = { display_name: displayName };
      if (birthYear) body.birth_year = Number(birthYear);
      else body.birth_year = null;
      if (gender) body.gender = gender;
      else body.gender = null;
      if (birthHour !== "") body.birth_hour = Number(birthHour);
      else body.birth_hour = null;

      const res = await fetch("/api/mypage", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
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
    field: "logo_url" | "meta_og_image" | "favicon_url" | "pwa_icon_url" | "pwa_splash_url",
    setUploading: (v: boolean) => void
  ) => {
    setUploading(true);
    setUploadError("");
    try {
      const supabase = createClient();
      const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
      const path = `site/${field}_${Date.now()}.${ext}`;
      const { data, error } = await supabase.storage
        .from("blog-images")
        .upload(path, file, {
          upsert: true,
          contentType: file.type || (ext === "ico" ? "image/x-icon" : undefined),
        });
      if (error) throw error;
      const { data: { publicUrl } } = supabase.storage.from("blog-images").getPublicUrl(data.path);
      setSettings((prev) => ({ ...prev, [field]: publicUrl }));
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "이미지 업로드에 실패했습니다.");
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

          <hr style={{ border: "none", borderTop: "1px solid var(--border)" }} />

          {/* 운세 정보 */}
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
              <label className="text-xs font-semibold" style={{ color: "var(--text-muted)" }}>
                태어난 시 (0~23시)
              </label>
              <input
                type="number"
                value={birthHour}
                onChange={(e) => setBirthHour(e.target.value)}
                placeholder="예: 14 (오후 2시)"
                min={0}
                max={23}
                style={inputStyle}
              />
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                24시간제 기준. 모르는 경우 비워두세요.
              </p>
            </div>
          </div>

          {error && <p className="text-sm" style={{ color: "#F43F5E" }}>{error}</p>}
          {success && <p className="text-sm" style={{ color: "#10B981" }}>저장되었습니다.</p>}
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

            {/* 화면 테마 */}
            <div className="flex items-center justify-between gap-4">
              <div className="flex flex-col gap-0.5">
                <div className="flex items-center gap-1.5">
                  {theme === "dark"
                    ? <Moon size={14} style={{ color: ACCENT }} />
                    : <Sun size={14} style={{ color: ACCENT }} />
                  }
                  <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>화면 테마</p>
                </div>
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                  {theme === "dark" ? "다크 모드" : "라이트 모드"}
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={theme === "dark"}
                onClick={toggleTheme}
                style={{
                  width: 52, height: 28, borderRadius: 999, border: "none", cursor: "pointer",
                  flexShrink: 0, position: "relative", transition: "background 0.2s",
                  background: theme === "dark" ? "#312E81" : "#FDE68A",
                }}
              >
                <span style={{
                  position: "absolute", top: 4, width: 20, height: 20, borderRadius: "50%",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  background: theme === "dark" ? "#A5B4FC" : "#D97706",
                  transition: "left 0.2s",
                  left: theme === "dark" ? 28 : 4,
                }}>
                  {theme === "dark"
                    ? <Moon size={11} style={{ color: "#1E1B4B" }} />
                    : <Sun size={11} style={{ color: "#fff" }} />
                  }
                </span>
              </button>
            </div>

            <hr style={{ border: "none", borderTop: "1px solid var(--border)" }} />

            {/* 가계부 구성원 관리 */}
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-1.5">
                <Users size={14} style={{ color: ACCENT }} />
                <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>가계부 구성원</p>
              </div>
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                가계부 입력 시 선택하는 구매자 목록입니다. &quot;공동&quot;은 삭제할 수 없습니다.
              </p>
              <div className="flex flex-wrap gap-2">
                {(() => {
                  let members: string[] = ["공동", "봉준", "달희"];
                  try { members = JSON.parse(settings.budget_members || "[]") as string[]; } catch {}
                  return members.map((m) => (
                    <div key={m} className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold"
                      style={{ background: `${ACCENT}18`, color: ACCENT, border: `1px solid ${ACCENT}33` }}>
                      {m}
                      {m !== "공동" && (
                        <button
                          type="button"
                          aria-label={`${m} 삭제`}
                          onClick={() => {
                            let cur: string[] = [];
                            try { cur = JSON.parse(settings.budget_members || "[]") as string[]; } catch {}
                            setSettings((p) => ({ ...p, budget_members: JSON.stringify(cur.filter((x) => x !== m)) }));
                          }}
                          className="ml-0.5 opacity-60 hover:opacity-100 transition-opacity"
                        >
                          <Trash2 size={10} />
                        </button>
                      )}
                    </div>
                  ));
                })()}
              </div>
              <div className="flex gap-2">
                <input
                  value={newMemberInput}
                  onChange={(e) => setNewMemberInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      const name = newMemberInput.trim();
                      if (!name) return;
                      let cur: string[] = [];
                      try { cur = JSON.parse(settings.budget_members || "[]") as string[]; } catch {}
                      if (!cur.includes(name)) {
                        setSettings((p) => ({ ...p, budget_members: JSON.stringify([...cur, name]) }));
                      }
                      setNewMemberInput("");
                    }
                  }}
                  placeholder="이름 입력 후 Enter 또는 추가"
                  maxLength={10}
                  style={{ ...inputStyle, flex: 1 }}
                />
                <button
                  type="button"
                  onClick={() => {
                    const name = newMemberInput.trim();
                    if (!name) return;
                    let cur: string[] = [];
                    try { cur = JSON.parse(settings.budget_members || "[]") as string[]; } catch {}
                    if (!cur.includes(name)) {
                      setSettings((p) => ({ ...p, budget_members: JSON.stringify([...cur, name]) }));
                    }
                    setNewMemberInput("");
                  }}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold"
                  style={{ background: `${ACCENT}18`, color: ACCENT, border: `1px solid ${ACCENT}33` }}
                >
                  <Plus size={12} /> 추가
                </button>
              </div>
            </div>

            <hr style={{ border: "none", borderTop: "1px solid var(--border)" }} />

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
                <label className="text-xs font-semibold" style={{ color: "var(--text-muted)" }}>파비콘 (favicon.ico)</label>
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                  {`.ico 파일을 업로드하면 <link rel="icon" type="image/x-icon">로 적용됩니다.`}
                </p>
                <div className="flex items-center gap-3">
                  {settings.favicon_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={settings.favicon_url} alt="파비콘" className="w-10 h-10 rounded-lg object-contain"
                      style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }} />
                  ) : (
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center"
                      style={{ background: "rgba(234,88,12,0.1)", color: ACCENT }}>
                      <ImageIcon size={16} />
                    </div>
                  )}
                  <input type="url" value={settings.favicon_url}
                    onChange={(e) => setSettings((p) => ({ ...p, favicon_url: e.target.value }))}
                    placeholder="favicon URL 직접 입력" style={{ ...inputStyle, flex: 1 }} />
                </div>
                <div className="flex gap-2">
                  <input ref={faviconFileRef} type="file" accept=".ico,image/x-icon" className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) uploadImage(f, "favicon_url", setFaviconUploading);
                    }} />
                  <button type="button" onClick={() => faviconFileRef.current?.click()}
                    disabled={faviconUploading}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold disabled:opacity-50"
                    style={{ background: "rgba(234,88,12,0.12)", color: ACCENT }}>
                    {faviconUploading ? <LoaderCircle size={12} className="animate-spin" /> : <ImageIcon size={12} />}
                    {faviconUploading ? "업로드 중..." : "ICO 선택"}
                  </button>
                  {settings.favicon_url && (
                    <button type="button" onClick={() => setSettings((p) => ({ ...p, favicon_url: "" }))}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold"
                      style={{ background: "rgba(244,63,94,0.1)", color: "#F43F5E" }}>
                      <Trash2 size={12} /> 삭제
                    </button>
                  )}
                </div>
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

            {uploadError && (
              <p className="text-sm" style={{ color: "#F43F5E" }}>{uploadError}</p>
            )}
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
