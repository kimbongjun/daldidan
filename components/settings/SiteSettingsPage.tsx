"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Bell,
  Image as ImageIcon,
  LoaderCircle,
  Moon,
  Plus,
  Save,
  Settings,
  Smartphone,
  Sun,
  Trash2,
  Users,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useThemeStore } from "@/store/useThemeStore";

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
  budget_members: string;
};

const DEFAULT_SETTINGS: SiteSettings = {
  meta_title: "",
  meta_description: "",
  meta_og_image: "",
  favicon_url: "",
  logo_url: "",
  custom_greeting: "",
  pwa_icon_url: "",
  pwa_splash_url: "",
  budget_members: '["공동","봉준","달희"]',
};

export default function SiteSettingsPage() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const ogFileRef = useRef<HTMLInputElement>(null);
  const faviconFileRef = useRef<HTMLInputElement>(null);
  const pwaIconFileRef = useRef<HTMLInputElement>(null);
  const pwaSplashFileRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState<SiteSettings>(DEFAULT_SETTINGS);
  const { theme, toggle: toggleTheme } = useThemeStore();
  const [newMemberInput, setNewMemberInput] = useState("");
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [settingsSuccess, setSettingsSuccess] = useState(false);
  const [logoUploading, setLogoUploading] = useState(false);
  const [ogUploading, setOgUploading] = useState(false);
  const [faviconUploading, setFaviconUploading] = useState(false);
  const [pwaIconUploading, setPwaIconUploading] = useState(false);
  const [pwaSplashUploading, setPwaSplashUploading] = useState(false);
  const [settingsUploadError, setSettingsUploadError] = useState("");

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) {
        window.location.href = "/login?next=/settings";
        return;
      }

      const settingsRes = await fetch("/api/site-settings");
      if (settingsRes.ok) {
        const loaded = (await settingsRes.json()) as SiteSettings;
        setSettings(loaded);
      }
      setLoading(false);
    });
  }, []);

  const handleSettingsSave = async () => {
    setSettingsSaving(true);
    setSettingsSuccess(false);
    try {
      await fetch("/api/site-settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      setSettingsSuccess(true);
      setTimeout(() => setSettingsSuccess(false), 3000);
    } finally {
      setSettingsSaving(false);
    }
  };

  const uploadImage = async (
    file: File,
    field: "logo_url" | "meta_og_image" | "favicon_url" | "pwa_icon_url" | "pwa_splash_url",
    setUploading: (value: boolean) => void,
  ) => {
    setUploading(true);
    setSettingsUploadError("");
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("field", field);
      const res = await fetch("/api/site-settings/upload", {
        method: "POST",
        body: formData,
      });
      if (!res.ok) {
        const json = (await res.json()) as { error?: string };
        throw new Error(json.error ?? "업로드 실패");
      }
      const { publicUrl } = (await res.json()) as { publicUrl: string };
      setSettings((prev) => ({ ...prev, [field]: publicUrl }));
    } catch (err) {
      setSettingsUploadError(
        err instanceof Error ? err.message : "이미지 업로드에 실패했습니다.",
      );
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoaderCircle size={24} className="animate-spin" style={{ color: ACCENT }} />
      </div>
    );
  }

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
        <div className="min-w-0">
          <h1 className="text-xl font-black" style={{ color: "var(--text-primary)" }}>사이트 옵션</h1>
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>브랜딩, 메타데이터, PWA 자산을 별도 페이지에서 관리합니다.</p>
        </div>
      </div>

      <Link
        href="/settings/push-logs"
        className="flex items-center gap-3 px-4 py-3 rounded-xl pressable mb-2"
        style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
      >
        <Bell size={15} style={{ color: "#7C3AED" }} />
        <div className="flex-1">
          <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>푸시 알림 로그</p>
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>전송 이력 · OS별 sent/failed 확인</p>
        </div>
        <ArrowLeft size={13} style={{ color: "var(--text-muted)", transform: "rotate(180deg)" }} />
      </Link>

      <Link
        href="/settings/push-devices"
        className="flex items-center gap-3 px-4 py-3 rounded-xl pressable mb-2"
        style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
      >
        <Smartphone size={15} style={{ color: "#7C3AED" }} />
        <div className="flex-1">
          <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>알림 허용 디바이스</p>
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>푸시 구독 중인 기기 목록 · 삭제 관리</p>
        </div>
        <ArrowLeft size={13} style={{ color: "var(--text-muted)", transform: "rotate(180deg)" }} />
      </Link>

      <div className="bento-card p-6 flex flex-col gap-5">
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
              width: 52,
              height: 28,
              borderRadius: 999,
              border: "none",
              cursor: "pointer",
              flexShrink: 0,
              position: "relative",
              transition: "background 0.2s",
              background: theme === "dark" ? "#312E81" : "#FDE68A",
            }}
          >
            <span
              style={{
                position: "absolute",
                top: 4,
                width: 20,
                height: 20,
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: theme === "dark" ? "#A5B4FC" : "#D97706",
                transition: "left 0.2s",
                left: theme === "dark" ? 28 : 4,
              }}
            >
              {theme === "dark"
                ? <Moon size={11} style={{ color: "#1E1B4B" }} />
                : <Sun size={11} style={{ color: "#fff" }} />
              }
            </span>
          </button>
        </div>

        <hr style={{ border: "none", borderTop: "1px solid var(--border)" }} />

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
              try {
                members = JSON.parse(settings.budget_members || "[]") as string[];
              } catch {}
              return members.map((member) => (
                <div
                  key={member}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold"
                  style={{ background: `${ACCENT}18`, color: ACCENT, border: `1px solid ${ACCENT}33` }}
                >
                  {member}
                  {member !== "공동" && (
                    <button
                      type="button"
                      aria-label={`${member} 삭제`}
                      onClick={() => {
                        let current: string[] = [];
                        try {
                          current = JSON.parse(settings.budget_members || "[]") as string[];
                        } catch {}
                        setSettings((prev) => ({
                          ...prev,
                          budget_members: JSON.stringify(current.filter((item) => item !== member)),
                        }));
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
                if (e.key !== "Enter") return;
                e.preventDefault();
                const name = newMemberInput.trim();
                if (!name) return;
                let current: string[] = [];
                try {
                  current = JSON.parse(settings.budget_members || "[]") as string[];
                } catch {}
                if (!current.includes(name)) {
                  setSettings((prev) => ({ ...prev, budget_members: JSON.stringify([...current, name]) }));
                }
                setNewMemberInput("");
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
                let current: string[] = [];
                try {
                  current = JSON.parse(settings.budget_members || "[]") as string[];
                } catch {}
                if (!current.includes(name)) {
                  setSettings((prev) => ({ ...prev, budget_members: JSON.stringify([...current, name]) }));
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

        <div className="flex flex-col gap-2">
          <label className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>사이트 로고</label>
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            헤더에 표시될 로고 이미지를 업로드하세요. (권장: 40×40px, PNG/WebP)
          </p>
          <div className="flex items-center gap-3">
            {settings.logo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={settings.logo_url} alt="로고" className="w-10 h-10 rounded-xl object-cover" />
            ) : (
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ background: "rgba(234,88,12,0.1)", color: ACCENT }}
              >
                <ImageIcon size={18} />
              </div>
            )}
            <input
              type="url"
              value={settings.logo_url}
              onChange={(e) => setSettings((prev) => ({ ...prev, logo_url: e.target.value }))}
              placeholder="이미지 URL 직접 입력"
              style={{ ...inputStyle, flex: 1 }}
            />
          </div>
          <div className="flex gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void uploadImage(file, "logo_url", setLogoUploading);
              }}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={logoUploading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold disabled:opacity-50"
              style={{ background: "rgba(234,88,12,0.12)", color: ACCENT }}
            >
              {logoUploading ? <LoaderCircle size={12} className="animate-spin" /> : <ImageIcon size={12} />}
              {logoUploading ? "업로드 중..." : "파일 선택"}
            </button>
            {settings.logo_url && (
              <button
                type="button"
                onClick={() => setSettings((prev) => ({ ...prev, logo_url: "" }))}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold"
                style={{ background: "rgba(244,63,94,0.1)", color: "#F43F5E" }}
              >
                <Trash2 size={12} /> 삭제
              </button>
            )}
          </div>
        </div>

        <hr style={{ border: "none", borderTop: "1px solid var(--border)" }} />

        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-1.5">
            <Smartphone size={14} style={{ color: ACCENT }} />
            <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>PWA 설정</p>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-xs font-semibold" style={{ color: "var(--text-muted)" }}>앱 아이콘</label>
            <div className="flex items-center gap-3">
              {settings.pwa_icon_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={settings.pwa_icon_url} alt="앱 아이콘" className="w-12 h-12 rounded-xl object-cover" />
              ) : (
                <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: "rgba(234,88,12,0.1)", color: ACCENT }}>
                  <Smartphone size={20} />
                </div>
              )}
              <input
                type="url"
                value={settings.pwa_icon_url}
                onChange={(e) => setSettings((prev) => ({ ...prev, pwa_icon_url: e.target.value }))}
                placeholder="이미지 URL 직접 입력"
                style={{ ...inputStyle, flex: 1 }}
              />
            </div>
            <div className="flex gap-2">
              <input
                ref={pwaIconFileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void uploadImage(file, "pwa_icon_url", setPwaIconUploading);
                }}
              />
              <button
                type="button"
                onClick={() => pwaIconFileRef.current?.click()}
                disabled={pwaIconUploading}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold disabled:opacity-50"
                style={{ background: "rgba(234,88,12,0.12)", color: ACCENT }}
              >
                {pwaIconUploading ? <LoaderCircle size={12} className="animate-spin" /> : <ImageIcon size={12} />}
                {pwaIconUploading ? "업로드 중..." : "파일 선택"}
              </button>
              {settings.pwa_icon_url && (
                <button
                  type="button"
                  onClick={() => setSettings((prev) => ({ ...prev, pwa_icon_url: "" }))}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold"
                  style={{ background: "rgba(244,63,94,0.1)", color: "#F43F5E" }}
                >
                  <Trash2 size={12} /> 삭제
                </button>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-xs font-semibold" style={{ color: "var(--text-muted)" }}>스플래시 화면 이미지</label>
            {settings.pwa_splash_url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={settings.pwa_splash_url} alt="스플래시 이미지" className="rounded-xl object-cover w-full" style={{ maxHeight: 120 }} />
            )}
            <input
              type="url"
              value={settings.pwa_splash_url}
              onChange={(e) => setSettings((prev) => ({ ...prev, pwa_splash_url: e.target.value }))}
              placeholder="https://..."
              style={inputStyle}
            />
            <div className="flex gap-2">
              <input
                ref={pwaSplashFileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void uploadImage(file, "pwa_splash_url", setPwaSplashUploading);
                }}
              />
              <button
                type="button"
                onClick={() => pwaSplashFileRef.current?.click()}
                disabled={pwaSplashUploading}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold disabled:opacity-50"
                style={{ background: "rgba(234,88,12,0.12)", color: ACCENT }}
              >
                {pwaSplashUploading ? <LoaderCircle size={12} className="animate-spin" /> : <ImageIcon size={12} />}
                {pwaSplashUploading ? "업로드 중..." : "파일 선택"}
              </button>
              {settings.pwa_splash_url && (
                <button
                  type="button"
                  onClick={() => setSettings((prev) => ({ ...prev, pwa_splash_url: "" }))}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold"
                  style={{ background: "rgba(244,63,94,0.1)", color: "#F43F5E" }}
                >
                  <Trash2 size={12} /> 삭제
                </button>
              )}
            </div>
          </div>
        </div>

        <hr style={{ border: "none", borderTop: "1px solid var(--border)" }} />

        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-1.5">
            <Settings size={14} style={{ color: ACCENT }} />
            <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>메타 태그</p>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold" style={{ color: "var(--text-muted)" }}>사이트 제목</label>
            <input
              value={settings.meta_title}
              onChange={(e) => setSettings((prev) => ({ ...prev, meta_title: e.target.value }))}
              placeholder="달디단 — 일상의 편리함"
              maxLength={80}
              style={inputStyle}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold" style={{ color: "var(--text-muted)" }}>사이트 설명</label>
            <textarea
              value={settings.meta_description}
              onChange={(e) => setSettings((prev) => ({ ...prev, meta_description: e.target.value }))}
              placeholder="날씨, 쇼핑, 영화, 여행, 가계부를 한 곳에서"
              maxLength={200}
              rows={2}
              style={{ ...inputStyle, resize: "vertical" }}
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-xs font-semibold" style={{ color: "var(--text-muted)" }}>파비콘</label>
            <div className="flex items-center gap-3">
              {settings.favicon_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={settings.favicon_url} alt="파비콘" className="w-10 h-10 rounded-lg object-contain" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }} />
              ) : (
                <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: "rgba(234,88,12,0.1)", color: ACCENT }}>
                  <ImageIcon size={16} />
                </div>
              )}
              <input
                type="url"
                value={settings.favicon_url}
                onChange={(e) => setSettings((prev) => ({ ...prev, favicon_url: e.target.value }))}
                placeholder="favicon URL 직접 입력"
                style={{ ...inputStyle, flex: 1 }}
              />
            </div>
            <div className="flex gap-2">
              <input
                ref={faviconFileRef}
                type="file"
                accept=".ico,image/x-icon"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void uploadImage(file, "favicon_url", setFaviconUploading);
                }}
              />
              <button
                type="button"
                onClick={() => faviconFileRef.current?.click()}
                disabled={faviconUploading}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold disabled:opacity-50"
                style={{ background: "rgba(234,88,12,0.12)", color: ACCENT }}
              >
                {faviconUploading ? <LoaderCircle size={12} className="animate-spin" /> : <ImageIcon size={12} />}
                {faviconUploading ? "업로드 중..." : "ICO 선택"}
              </button>
              {settings.favicon_url && (
                <button
                  type="button"
                  onClick={() => setSettings((prev) => ({ ...prev, favicon_url: "" }))}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold"
                  style={{ background: "rgba(244,63,94,0.1)", color: "#F43F5E" }}
                >
                  <Trash2 size={12} /> 삭제
                </button>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-xs font-semibold" style={{ color: "var(--text-muted)" }}>OG 이미지</label>
            {settings.meta_og_image && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={settings.meta_og_image} alt="OG 이미지" className="rounded-xl object-cover w-full" style={{ maxHeight: 120 }} />
            )}
            <input
              type="url"
              value={settings.meta_og_image}
              onChange={(e) => setSettings((prev) => ({ ...prev, meta_og_image: e.target.value }))}
              placeholder="https://..."
              style={inputStyle}
            />
            <div className="flex gap-2">
              <input
                ref={ogFileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void uploadImage(file, "meta_og_image", setOgUploading);
                }}
              />
              <button
                type="button"
                onClick={() => ogFileRef.current?.click()}
                disabled={ogUploading}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold disabled:opacity-50"
                style={{ background: "rgba(234,88,12,0.12)", color: ACCENT }}
              >
                {ogUploading ? <LoaderCircle size={12} className="animate-spin" /> : <ImageIcon size={12} />}
                {ogUploading ? "업로드 중..." : "파일 선택"}
              </button>
              {settings.meta_og_image && (
                <button
                  type="button"
                  onClick={() => setSettings((prev) => ({ ...prev, meta_og_image: "" }))}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold"
                  style={{ background: "rgba(244,63,94,0.1)", color: "#F43F5E" }}
                >
                  <Trash2 size={12} /> 삭제
                </button>
              )}
            </div>
          </div>
        </div>

        {settingsUploadError && (
          <p className="text-sm" style={{ color: "#F43F5E" }}>{settingsUploadError}</p>
        )}
        {settingsSuccess && (
          <p className="text-sm text-center" style={{ color: "#10B981" }}>옵션이 저장되었습니다. 새로고침 후 적용됩니다.</p>
        )}
        <button
          type="button"
          onClick={handleSettingsSave}
          disabled={settingsSaving}
          className="pressable py-2.5 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2 disabled:opacity-45"
          style={{ background: ACCENT }}
        >
          {settingsSaving ? <LoaderCircle size={14} className="animate-spin" /> : <Save size={14} />}
          {settingsSaving ? "저장 중..." : "옵션 저장"}
        </button>
      </div>
    </div>
  );
}
