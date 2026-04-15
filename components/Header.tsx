"use client";

import { useEffect, useRef, useState } from "react";
import { Bell, BellOff, Check, LogOut, Pencil, Sparkles, Trash2, User, Moon, Sun, UserCircle, X } from "lucide-react";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { useThemeStore } from "@/store/useThemeStore";
import { useNotificationStore } from "@/store/useNotificationStore";
import { createClient } from "@/lib/supabase/client";
import {
  disableNativeNotifications,
  enableNativeNotifications,
  getNativeNotificationPermission,
  supportsNativeNotifications,
} from "@/lib/notifications";
import { signOut } from "@/lib/supabase/actions/auth";
import type { AuthUser as SupabaseUser } from "@supabase/supabase-js";
import Link from "next/link";

function getDefaultGreeting(hour: number): string {
  if (hour < 6)  return "새벽이에요";
  if (hour < 12) return "좋은 아침이에요";
  if (hour < 18) return "좋은 오후예요";
  return "좋은 저녁이에요";
}

export default function Header() {
  // now를 null로 초기화해 SSR hydration 불일치 방지
  const [now, setNow] = useState<Date | null>(null);
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [notificationMenuOpen, setNotificationMenuOpen] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">("unsupported");

  // 인사말 편집
  const [customGreeting, setCustomGreeting] = useState<string>("");
  const [logoUrl, setLogoUrl] = useState<string>("");
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const [editingGreeting, setEditingGreeting] = useState(false);
  const [greetingInput, setGreetingInput] = useState("");

  const dropdownRef = useRef<HTMLDivElement>(null);
  const notificationRef = useRef<HTMLDivElement>(null);
  const greetingInputRef = useRef<HTMLInputElement>(null);

  const { theme, toggle } = useThemeStore();
  const notificationEnabled = useNotificationStore((state) => state.enabled);

  // 시계 — 클라이언트에서만 시작
  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(id);
  }, []);

  // 저장된 커스텀 인사말 + 로고 로드 (site_settings API)
  useEffect(() => {
    fetch("/api/site-settings")
      .then((r) => r.json())
      .then((d: Record<string, string>) => {
        if (d.custom_greeting) setCustomGreeting(d.custom_greeting);
        if (d.logo_url) setLogoUrl(d.logo_url);
      })
      .catch(() => null)
      .finally(() => setSettingsLoaded(true));
  }, []);

  // 유저 세션 감지
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => setUser(data.user ?? null));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  // 드롭다운 외부 클릭 닫기
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
      if (notificationRef.current && !notificationRef.current.contains(e.target as Node)) {
        setNotificationMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    setPermission(getNativeNotificationPermission());
  }, []);

  // 편집 모드 진입 시 input 포커스
  useEffect(() => {
    if (editingGreeting) greetingInputRef.current?.focus();
  }, [editingGreeting]);

  const greeting = customGreeting || (now ? getDefaultGreeting(now.getHours()) : "");
  const isLight = theme === "light";
  const avatarLetter = user?.email?.[0]?.toUpperCase() ?? "U";
  const notificationSupported = supportsNativeNotifications();

  const handleNotificationToggle = async () => {
    if (notificationEnabled) {
      disableNativeNotifications();
      setPermission(getNativeNotificationPermission());
      return;
    }
    const result = await enableNativeNotifications();
    if (!result.ok) {
      setPermission(getNativeNotificationPermission());
      return;
    }
    setPermission(getNativeNotificationPermission());
  };

  const startEditGreeting = () => {
    setGreetingInput(customGreeting || (now ? getDefaultGreeting(now.getHours()) : ""));
    setEditingGreeting(true);
  };

  const saveGreeting = async () => {
    const trimmed = greetingInput.trim();
    if (!trimmed) return;
    setCustomGreeting(trimmed);
    setEditingGreeting(false);
    await fetch("/api/site-settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ custom_greeting: trimmed }),
    }).catch(() => null);
  };

  const deleteGreeting = async () => {
    setCustomGreeting("");
    setEditingGreeting(false);
    await fetch("/api/site-settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ custom_greeting: "" }),
    }).catch(() => null);
  };

  return (
    <header className="flex items-center justify-between py-6 px-1">
      {/* ── 로고 + 인사말 ── */}
      <div className="flex items-center gap-3">
        {/* 로고: 설정 로드 전 skeleton */}
        {!settingsLoaded ? (
          <div
            className="w-10 h-10 rounded-xl shrink-0 animate-pulse"
            style={{ background: "var(--border)" }}
          />
        ) : logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={logoUrl}
            alt="로고"
            className="w-10 h-10 rounded-xl object-cover shrink-0"
          />
        ) : (
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: "linear-gradient(135deg, #7C3AED, #06B6D4)" }}
          >
            <Sparkles size={18} className="text-white" />
          </div>
        )}
        <div>
          <h1 className="text-xl font-black tracking-tight" style={{ color: "var(--text-primary)" }}>달디단</h1>

          {/* 인사말: 설정 로드 전 skeleton */}
          {!settingsLoaded ? (
            <div
              className="h-3 w-28 rounded animate-pulse mt-1"
              style={{ background: "var(--border)" }}
            />
          ) : editingGreeting ? (
            <div className="flex items-center gap-1 mt-0.5">
              <input
                ref={greetingInputRef}
                value={greetingInput}
                onChange={(e) => setGreetingInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") saveGreeting();
                  if (e.key === "Escape") setEditingGreeting(false);
                }}
                maxLength={40}
                className="text-xs rounded-md px-2 py-0.5 outline-none"
                style={{
                  background: "var(--bg-card)",
                  border: "1px solid var(--border)",
                  color: "var(--text-primary)",
                  width: 160,
                }}
              />
              <button onClick={saveGreeting} title="저장" className="hover:opacity-70">
                <Check size={13} style={{ color: "#10B981" }} />
              </button>
              <button onClick={() => setEditingGreeting(false)} title="취소" className="hover:opacity-70">
                <X size={13} style={{ color: "var(--text-muted)" }} />
              </button>
              {customGreeting && (
                <button onClick={deleteGreeting} title="초기화" className="hover:opacity-70">
                  <Trash2 size={12} style={{ color: "#F43F5E" }} />
                </button>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-1">
              <p
                className="text-xs"
                style={{ color: "var(--text-muted)" }}
                suppressHydrationWarning
              >
                {greeting ? `${greeting} ✨` : ""}
              </p>
              {user && (
                <button
                  onClick={startEditGreeting}
                  title="인사말 편집"
                  className="opacity-40 hover:opacity-80 active:opacity-100 transition-opacity"
                >
                  <Pencil size={11} style={{ color: "var(--text-muted)" }} />
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── 우측 컨트롤 ── */}
      <div className="flex items-center gap-2">
        {/* 날짜/시간 — hydration mismatch 방지 */}
        <div className="text-right hidden sm:block mr-2" suppressHydrationWarning>
          {now && (
            <>
              <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                {format(now, "M월 d일 (E)", { locale: ko })}
              </p>
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>{format(now, "HH:mm")}</p>
            </>
          )}
        </div>

        {/* 다크/라이트 토글 */}
        <button
          onClick={toggle}
          aria-label={isLight ? "다크 모드로 전환" : "라이트 모드로 전환"}
          className="w-9 h-9 rounded-xl flex items-center justify-center transition-all hover:opacity-80"
          style={{
            background: isLight
              ? "linear-gradient(135deg, #FEF3C7, #FDE68A)"
              : "linear-gradient(135deg, #1E1B4B, #312E81)",
            border: "1px solid var(--border)",
          }}
        >
          {isLight
            ? <Sun  size={15} style={{ color: "#D97706" }} />
            : <Moon size={15} style={{ color: "#A5B4FC" }} />
          }
        </button>

        <div ref={notificationRef} style={{ position: "relative" }}>
          <button
            onClick={() => setNotificationMenuOpen((v) => !v)}
            className="w-9 h-9 rounded-xl flex items-center justify-center transition-colors hover:opacity-80"
            style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
            aria-label="알림 설정"
          >
            {notificationEnabled
              ? <Bell size={16} style={{ color: "#F59E0B" }} />
              : <BellOff size={16} style={{ color: "var(--text-muted)" }} />
            }
          </button>

          {notificationMenuOpen && (
            <div
              style={{
                position: "absolute", top: "calc(100% + 0.5rem)", right: 0,
                width: 250, background: "var(--bg-card)", border: "1px solid var(--border)",
                borderRadius: "0.875rem", boxShadow: "var(--shadow-card)", overflow: "hidden", zIndex: 50,
              }}
            >
              <div style={{ padding: "0.9rem 1rem", borderBottom: "1px solid var(--border)" }}>
                <p style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>콘텐츠 생성 알림</p>
                <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", margin: "0.35rem 0 0" }}>
                  가계부와 블로그를 작성하면 브라우저 네이티브 알림을 보냅니다.
                </p>
              </div>
              <div style={{ padding: "0.9rem 1rem", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.75rem" }}>
                  <div>
                    <p style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--text-primary)", margin: 0 }}>
                      {notificationEnabled ? "알림 허용됨" : "알림 비허용"}
                    </p>
                    <p style={{ fontSize: "0.72rem", color: "var(--text-muted)", margin: "0.25rem 0 0" }}>
                      {!notificationSupported
                        ? "현재 브라우저는 알림을 지원하지 않습니다."
                        : permission === "denied"
                          ? "브라우저에서 차단되어 있어 브라우저 설정에서 허용이 필요합니다."
                          : "필요할 때 언제든 on/off 할 수 있습니다."}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleNotificationToggle}
                    disabled={!notificationSupported || permission === "denied"}
                    className="px-3 py-2 rounded-lg text-xs font-semibold transition-opacity disabled:opacity-40"
                    style={{
                      background: notificationEnabled ? "rgba(244,63,94,0.12)" : "rgba(245,158,11,0.16)",
                      color: notificationEnabled ? "#F43F5E" : "#F59E0B",
                    }}
                  >
                    {notificationEnabled ? "끄기" : "켜기"}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 유저 아이콘 */}
        {user ? (
          <div ref={dropdownRef} style={{ position: "relative" }}>
            <button
              onClick={() => setDropdownOpen((v) => !v)}
              className="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm transition-all hover:opacity-80"
              style={{ background: "linear-gradient(135deg, #7C3AED, #06B6D4)", color: "#fff", border: "none", cursor: "pointer" }}
              aria-label="유저 메뉴"
            >
              {avatarLetter}
            </button>

            {dropdownOpen && (
              <div
                style={{
                  position: "absolute", top: "calc(100% + 0.5rem)", right: 0,
                  minWidth: 200, background: "var(--bg-card)", border: "1px solid var(--border)",
                  borderRadius: "0.875rem", boxShadow: "var(--shadow-card)", overflow: "hidden", zIndex: 50,
                }}
              >
                <div style={{ padding: "0.75rem 1rem", borderBottom: "1px solid var(--border)" }}>
                  <p style={{ fontSize: "0.7rem", color: "var(--text-muted)", margin: 0 }}>로그인 계정</p>
                  <p style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--text-primary)", margin: "0.15rem 0 0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {user.email}
                  </p>
                </div>
                <Link
                  href="/mypage"
                  onClick={() => setDropdownOpen(false)}
                  style={{
                    width: "100%", padding: "0.75rem 1rem", display: "flex", alignItems: "center",
                    gap: "0.5rem", fontSize: "0.85rem", color: "var(--text-primary)", borderBottom: "1px solid var(--border)",
                  }}
                >
                  <UserCircle size={14} />
                  마이페이지
                </Link>
                <form action={signOut}>
                  <button
                    type="submit"
                    style={{
                      width: "100%", padding: "0.75rem 1rem", display: "flex", alignItems: "center",
                      gap: "0.5rem", fontSize: "0.85rem", color: "#F43F5E",
                      background: "transparent", border: "none", cursor: "pointer", textAlign: "left",
                    }}
                  >
                    <LogOut size={14} />
                    로그아웃
                  </button>
                </form>
              </div>
            )}
          </div>
        ) : (
          <Link
            href="/login"
            className="w-9 h-9 rounded-xl flex items-center justify-center transition-colors hover:opacity-80"
            style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
            aria-label="로그인"
          >
            <User size={16} style={{ color: "var(--text-muted)" }} />
          </Link>
        )}
      </div>
    </header>
  );
}
