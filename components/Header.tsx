"use client";

import { startTransition, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Bell, BellOff, CalendarDays, Check, Cloud, CloudFog, CloudLightning, CloudRain, LoaderCircle, LogOut, MapPin, Moon, Pencil, RefreshCw, Settings, Share, Snowflake, Sparkles, Sun, Thermometer, Trash2, User, UserCircle, Wind, X } from "lucide-react";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { useThemeStore } from "@/store/useThemeStore";
import { useWeatherStore, type WeatherCondition } from "@/store/useWeatherStore";
import { useNotificationStore } from "@/store/useNotificationStore";
import { createClient } from "@/lib/supabase/client";
import { getFirebaseMessaging } from "@/lib/firebase-client";
import { deleteToken, getToken, onMessage } from "firebase/messaging";
import { signOut } from "@/lib/supabase/actions/auth";
import type { AuthUser as SupabaseUser } from "@supabase/supabase-js";
import Link from "next/link";
import { useRouter } from "next/navigation";

// ── 디바이스 유틸 ──────────────────────────────────────────────
function isIOS(): boolean {
  if (typeof navigator === "undefined") return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent);
}
function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as { standalone?: boolean }).standalone === true
  );
}
function detectDevice(): "ios" | "android" | "web" {
  if (isIOS()) return "ios";
  if (typeof navigator !== "undefined" && /Android/.test(navigator.userAgent)) return "android";
  return "web";
}

const WEATHER_ICONS: Record<WeatherCondition, React.ReactNode> = {
  clear: <Sun size={14} />,
  cloudy: <Cloud size={14} />,
  rain: <CloudRain size={14} />,
  snow: <Snowflake size={14} />,
  hot: <Thermometer size={14} />,
  cold: <Thermometer size={14} />,
  windy: <Wind size={14} />,
  storm: <CloudLightning size={14} />,
  foggy: <CloudFog size={14} />,
};

const PUSH_STORAGE_KEY = "daldidan-push";
const PUSH_INSTALLATION_KEY = "daldidan-push-installation-id";

function getPushInstallationId() {
  if (typeof window === "undefined") return "";
  const existing = window.localStorage.getItem(PUSH_INSTALLATION_KEY);
  if (existing) return existing;

  const generated =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

  window.localStorage.setItem(PUSH_INSTALLATION_KEY, generated);
  return generated;
}

function extractNotificationPreview(payload: {
  notification?: { title?: string; body?: string; icon?: string };
  data?: Record<string, string | undefined>;
  fcmOptions?: { link?: string };
}) {
  const title = payload.data?.title ?? payload.notification?.title ?? "달디단";
  const body = payload.data?.body ?? payload.notification?.body ?? "새 글이 등록되었습니다";
  const url = payload.data?.url ?? payload.fcmOptions?.link ?? "/blog";
  const createdAt = new Date().toISOString();
  const id = payload.data?.url
    ? `${payload.data.url}:${title}`
    : `${url}:${title}:${createdAt}`;

  return { id, title, body, url, createdAt };
}

function getDefaultGreeting(hour: number): string {
  if (hour < 6)  return "새벽이에요";
  if (hour < 12) return "좋은 아침이에요";
  if (hour < 18) return "좋은 오후예요";
  return "좋은 저녁이에요";
}

export default function Header({
  currentLocation,
  locationLoading = false,
}: {
  currentLocation?: string | null;
  locationLoading?: boolean;
}) {
  const router = useRouter();
  type UserProfile = {
    avatarUrl: string | null;
    displayName: string | null;
    email: string | null;
  };
  // now를 null로 초기화해 SSR hydration 불일치 방지
  const [now, setNow] = useState<Date | null>(null);
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [notificationMenuOpen, setNotificationMenuOpen] = useState(false);

  // FCM 구독 상태
  type PushStatus = "idle" | "loading" | "subscribed" | "error";
  const [pushStatus, setPushStatus] = useState<PushStatus>("idle");
  const [pushToken, setPushToken] = useState<string | null>(null);
  const [pushErrorMsg, setPushErrorMsg] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  // 인사말 편집
  const [customGreeting, setCustomGreeting] = useState<string>("");
  const [logoUrl, setLogoUrl] = useState<string>("");
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const [editingGreeting, setEditingGreeting] = useState(false);
  const [greetingInput, setGreetingInput] = useState("");
  const [greetingSaveError, setGreetingSaveError] = useState(false);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const notificationRef = useRef<HTMLDivElement>(null);
  const greetingInputRef = useRef<HTMLInputElement>(null);

  const { theme, toggle: toggleTheme } = useThemeStore();
  const { condition: weatherCondition, temp: weatherTemp, fetchWeather, isLoading: weatherLoading } = useWeatherStore();
  const inbox = useNotificationStore((state) => state.inbox);
  const notifyNewPost = useNotificationStore((state) => state.notifyNewPost);
  const notifyComment = useNotificationStore((state) => state.notifyComment);
  const setNotifyNewPost = useNotificationStore((state) => state.setNotifyNewPost);
  const setNotifyComment = useNotificationStore((state) => state.setNotifyComment);
  const addInboxNotification = useNotificationStore((state) => state.addInboxNotification);
  const markAllInboxRead = useNotificationStore((state) => state.markAllInboxRead);
  const markInboxRead = useNotificationStore((state) => state.markInboxRead);
  const unreadInboxCount = inbox.filter((item) => !item.read).length;

  // 시계 — 클라이언트에서만 시작
  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(id);
  }, []);

  // 날씨 초기 로드
  useEffect(() => {
    fetchWeather();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 1시간 단위 자동 갱신
  useEffect(() => {
    const id = setInterval(() => {
      fetchWeather();
      startTransition(() => { router.refresh(); });
    }, 3600000);
    return () => clearInterval(id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
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

  useEffect(() => {
    if (!user) {
      setUserProfile(null);
      return;
    }

    let active = true;

    fetch("/api/me", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error("failed");
        return response.json() as Promise<UserProfile>;
      })
      .then((profile) => {
        if (active) setUserProfile(profile);
      })
      .catch(() => {
        if (!active) return;
        setUserProfile({
          avatarUrl: null,
          displayName: null,
          email: user.email ?? null,
        });
      });

    return () => {
      active = false;
    };
  }, [user]);

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

  // localStorage에서 FCM 구독 상태 복원
  useEffect(() => {
    try {
      const raw = localStorage.getItem(PUSH_STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as { status?: string; token?: string; linkedUserId?: string | null };
      if (parsed.status === "subscribed" && parsed.token) {
        setPushStatus("subscribed");
        setPushToken(parsed.token);
      }
    } catch { /* ignore */ }
  }, []);

  // 로그인 감지 → 익명 구독(user_id=null)된 FCM 토큰에 user_id 재연결
  // Samsung Browser/Safari에서 비로그인 구독 후 로그인 시 댓글 알림 누락 방지
  useEffect(() => {
    if (!user?.id || pushStatus !== "subscribed" || !pushToken) return;
    try {
      const raw = localStorage.getItem(PUSH_STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as { status?: string; token?: string; linkedUserId?: string | null };
      if (parsed.linkedUserId === user.id) return;
    } catch { return; }

    fetch("/api/push/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        token: pushToken,
        deviceType: detectDevice(),
        installationId: getPushInstallationId(),
      }),
    }).then((res) => {
      if (!res.ok) return;
      localStorage.setItem(PUSH_STORAGE_KEY, JSON.stringify({
        status: "subscribed",
        token: pushToken,
        linkedUserId: user.id,
      }));
    }).catch(() => {});
  }, [user?.id, pushStatus, pushToken]);

  // SW 사전 등록 — 구독 버튼 클릭 전에 SW를 활성화해 iOS APNS 연결 지연 최소화
  useEffect(() => {
    if (!process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID) return;
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker
      .register("/firebase-messaging-sw.js", { scope: "/" })
      .catch(() => { /* 사전 등록 실패는 무시 */ });
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

    const handleMessage = (event: MessageEvent<{ type?: string; payload?: {
      title?: string;
      body?: string;
      url?: string;
      createdAt?: string;
    } }>) => {
      if (event.data?.type !== "blog-notification" || !event.data.payload) return;
      addInboxNotification({
        id: `${event.data.payload.url ?? "/blog"}:${event.data.payload.title ?? "달디단"}`,
        title: event.data.payload.title ?? "달디단",
        body: event.data.payload.body ?? "새 글이 등록되었습니다",
        url: event.data.payload.url ?? "/blog",
        createdAt: event.data.payload.createdAt ?? new Date().toISOString(),
      });
    };

    navigator.serviceWorker.addEventListener("message", handleMessage);
    return () => navigator.serviceWorker.removeEventListener("message", handleMessage);
  }, [addInboxNotification]);

  useEffect(() => {
    let active = true;
    let unsubscribe: (() => void) | undefined;

    (async () => {
      const messaging = await getFirebaseMessaging();
      if (!messaging || !active) return;

      unsubscribe = onMessage(messaging, (payload) => {
        addInboxNotification(extractNotificationPreview(payload));
      });
    })();

    return () => {
      active = false;
      unsubscribe?.();
    };
  }, [addInboxNotification]);

  // 편집 모드 진입 시 input 포커스
  useEffect(() => {
    if (editingGreeting) greetingInputRef.current?.focus();
  }, [editingGreeting]);

  const greeting = customGreeting || (now ? getDefaultGreeting(now.getHours()) : "");
  const isLight = theme === "light";

  const WEATHER_ICON_MAP = WEATHER_ICONS;
  const weatherDisplay = weatherCondition ? WEATHER_ICON_MAP[weatherCondition] : null;
  const weatherBadgeStyle = isLight
    ? { color: "#334155", bg: "var(--bg-card)" }
    : { color: "#E2E8F0", bg: "var(--bg-card)" };
  const avatarLetter = userProfile?.displayName?.[0]?.toUpperCase() ?? user?.email?.[0]?.toUpperCase() ?? "U";
  const userAvatarUrl = userProfile?.avatarUrl ?? null;
  const firebaseConfigured = Boolean(process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID);
  const pushSupported = firebaseConfigured && typeof window !== "undefined" && "Notification" in window && "serviceWorker" in navigator;
  // iOS Safari + 브라우저 모드에서는 PWA 홈 화면 추가 후에만 구독 가능
  const iosNotStandalone = isIOS() && !isStandalone();

  const handlePushSubscribe = async () => {
    setPushStatus("loading");
    setPushErrorMsg("");
    try {
      const messaging = await getFirebaseMessaging();
      if (!messaging || !process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY) {
        setPushErrorMsg("Firebase가 설정되지 않았습니다.");
        setPushStatus("error");
        return;
      }

      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setPushStatus("idle");
        return;
      }

      // SW 등록 후 반드시 .ready로 activated 대기 (iOS 포함 모든 환경)
      await navigator.serviceWorker.register("/firebase-messaging-sw.js", { scope: "/" });
      const swReg = await navigator.serviceWorker.ready;

      // stale 구독 제거 — Android Chrome에서 이전 구독과 FCM 기록이 불일치하면
      // getToken이 무한 hang 하는 원인이 됨. 항상 먼저 정리하고 새 토큰 발급.
      try { await deleteToken(messaging); } catch { /* 기존 토큰 없으면 무시 */ }

      // 타임아웃: iOS APNS 연결 지연 대비 (Android는 보통 2~3초 내 완료)
      const token = await Promise.race<string | null>([
        getToken(messaging, {
          vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
          serviceWorkerRegistration: swReg,
        }),
        new Promise<null>((_, rej) => setTimeout(() => rej(new Error("timeout")), 15000)),
      ]);

      if (!token) {
        setPushErrorMsg("토큰을 가져오지 못했습니다. 잠시 후 다시 시도해주세요.");
        setPushStatus("error");
        return;
      }

      const res = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          deviceType: detectDevice(),
          installationId: getPushInstallationId(),
        }),
      });
      if (!res.ok) {
        setPushErrorMsg("구독 정보 저장에 실패했습니다.");
        setPushStatus("error");
        return;
      }

      localStorage.setItem(PUSH_STORAGE_KEY, JSON.stringify({ status: "subscribed", token, linkedUserId: user?.id ?? null }));
      setPushToken(token);
      setPushStatus("subscribed");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      setPushErrorMsg(msg === "timeout" ? "시간 초과. 잠시 후 다시 시도해주세요." : "알림 설정 중 오류가 발생했습니다.");
      setPushStatus("error");
    }
  };

  const handlePushUnsubscribe = async () => {
    try {
      const messaging = await getFirebaseMessaging();
      if (messaging) await deleteToken(messaging).catch(() => {});
    } catch { /* ignore */ }
    if (pushToken) {
      fetch("/api/push/subscribe", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: pushToken }),
      }).catch(() => {});
    }
    localStorage.removeItem(PUSH_STORAGE_KEY);
    setPushToken(null);
    setPushStatus("idle");
  };

  const handleNotifyToggle = async (type: "newPost" | "comment", value: boolean) => {
    if (type === "newPost") setNotifyNewPost(value);
    else setNotifyComment(value);

    if (!user) return;
    fetch("/api/push/subscribe", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(
        type === "newPost" ? { notifyNewPost: value } : { notifyComment: value },
      ),
    }).catch(() => {});
  };

  const handleRefresh = () => {
    setRefreshing(true);
    startTransition(() => {
      router.refresh();
    });
    window.setTimeout(() => setRefreshing(false), 900);
  };

  const handleOpenNotificationMenu = () => {
    setNotificationMenuOpen((prev) => {
      const next = !prev;
      if (next) markAllInboxRead();
      return next;
    });
  };

  const handleNotificationClick = (id: string, url: string) => {
    markInboxRead(id);
    setNotificationMenuOpen(false);
    router.push(url);
  };

  const startEditGreeting = () => {
    setGreetingInput(customGreeting || (now ? getDefaultGreeting(now.getHours()) : ""));
    setEditingGreeting(true);
  };

  const saveGreeting = async () => {
    const trimmed = greetingInput.trim();
    if (!trimmed) return;
    setGreetingSaveError(false);
    setCustomGreeting(trimmed);
    setEditingGreeting(false);
    try {
      const res = await fetch("/api/site-settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ custom_greeting: trimmed }),
      });
      if (!res.ok) throw new Error();
    } catch {
      setCustomGreeting(customGreeting);
      setGreetingSaveError(true);
      setTimeout(() => setGreetingSaveError(false), 3000);
    }
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
    <header className="flex flex-col gap-3 py-6 px-1">
      <div className="flex items-center justify-between gap-4">
        {/* ── 로고 + 인사말 ── */}
        <div className="flex items-center gap-3 min-w-0">
        {/* 로고: 설정 로드 전 skeleton */}
        {!settingsLoaded ? (
          <div
            className="w-10 h-10 rounded-xl shrink-0 skeleton-shimmer"
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
        <div className="min-w-0">
          <h1 className="text-xl font-black tracking-tight" style={{ color: "var(--text-primary)" }}>달디단</h1>

          {/* 인사말: 설정 로드 전 skeleton */}
          {!settingsLoaded ? (
            <div
              className="h-3 w-28 rounded skeleton-shimmer mt-1"
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
              <button onClick={saveGreeting} title="저장" aria-label="인사말 저장" className="hover:opacity-70">
                <Check size={13} style={{ color: "#10B981" }} />
              </button>
              <button onClick={() => setEditingGreeting(false)} title="취소" aria-label="편집 취소" className="hover:opacity-70">
                <X size={13} style={{ color: "var(--text-muted)" }} />
              </button>
              {customGreeting && (
                <button onClick={deleteGreeting} title="초기화" aria-label="인사말 초기화" className="hover:opacity-70">
                  <Trash2 size={12} style={{ color: "#F43F5E" }} />
                </button>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-1">
              <p
                className="text-xs"
                style={{ color: greetingSaveError ? "#F43F5E" : "var(--text-muted)" }}
                suppressHydrationWarning
              >
                {greetingSaveError ? "저장에 실패했습니다" : (greeting ? `${greeting} ✨` : "")}
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

        {/* 날짜/시간 — 클릭 시 데이터 갱신, hydration mismatch 방지 */}
        <button
          onClick={handleRefresh}
          aria-label="날짜 데이터 새로고침"
          title="클릭해서 데이터 갱신 (1시간마다 자동 갱신)"
          className="text-right hidden sm:flex flex-col items-end shrink-0 transition-opacity hover:opacity-70 active:opacity-50 group"
          suppressHydrationWarning
        >
          {now && (
            <>
              <div className="flex items-center gap-1.5">
                <CalendarDays
                  size={13}
                  style={{
                    color: refreshing ? "#7C3AED" : "var(--text-muted)",
                    transition: "color 0.3s",
                  }}
                  className="group-hover:opacity-100 opacity-60"
                />
                <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                  {format(now, "M월 d일 (E)", { locale: ko })}
                </p>
              </div>
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>{format(now, "HH:mm")}</p>
            </>
          )}
        </button>
      </div>

      <div className="flex justify-end">
        <div className="flex flex-col items-end gap-1.5">

        <div className="flex items-center gap-1.5 shrink-0">
        {/* 테마 토글 */}
        <button
          onClick={toggleTheme}
          aria-label={isLight ? "다크 모드로 전환" : "라이트 모드로 전환"}
          className="w-9 h-9 rounded-xl flex items-center justify-center transition-all hover:opacity-80"
          style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
        >
          {isLight
            ? <Moon size={15} style={{ color: "var(--text-muted)" }} />
            : <Sun size={15} style={{ color: "var(--text-muted)" }} />
          }
        </button>

        {/* 새로고침 */}
        <button
          onClick={handleRefresh}
          aria-label="최근 정보 새로고침"
          className="w-9 h-9 rounded-xl flex items-center justify-center transition-all hover:opacity-80"
          style={{
            background: "var(--bg-card)",
            border: "1px solid var(--border)",
          }}
        >
          <RefreshCw
            size={15}
            style={{
              color: "var(--text-muted)",
              animation: refreshing ? "spin 0.8s linear infinite" : undefined,
            }}
          />
        </button>

        {/* 날씨 아이콘 + 온도 버튼 */}
        <button
          onClick={() => fetchWeather(true)}
          aria-label="날씨 새로고침"
          title={weatherCondition ? `${weatherCondition} · 클릭해서 즉시 새로고침` : "위치 기반 날씨 불러오는 중"}
          className="h-9 px-2.5 rounded-xl flex items-center gap-1.5 transition-all hover:opacity-80"
          style={{
            background: weatherBadgeStyle.bg,
            border: "1px solid var(--border)",
            minWidth: 36,
          }}
        >
          {weatherLoading
            ? <LoaderCircle size={14} style={{ color: "var(--text-muted)", animation: "spin 0.8s linear infinite" }} />
            : weatherDisplay
              ? <span style={{ color: weatherBadgeStyle.color, display: "flex", alignItems: "center" }}>{weatherDisplay}</span>
              : <MapPin size={14} style={{ color: "var(--text-muted)" }} />
          }
          {weatherTemp !== null && (
            <span className="text-xs font-bold" style={{ color: weatherBadgeStyle.color }}>
              {weatherTemp}°
            </span>
          )}
        </button>

        {firebaseConfigured && (
          <div ref={notificationRef} style={{ position: "relative" }}>
            <button
              onClick={handleOpenNotificationMenu}
              className="w-9 h-9 rounded-xl flex items-center justify-center transition-colors hover:opacity-80"
              style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
              aria-label="푸시 알림 설정"
            >
              {pushStatus === "loading"
                ? <LoaderCircle size={16} style={{ color: "#F59E0B", animation: "spin 0.8s linear infinite" }} />
                : pushStatus === "subscribed"
                  ? <Bell size={16} style={{ color: "#F59E0B" }} />
                  : <BellOff size={16} style={{ color: "var(--text-muted)" }} />
              }
              {unreadInboxCount > 0 && (
                <span
                  style={{
                    position: "absolute",
                    top: 6,
                    right: 6,
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    background: "#F43F5E",
                    boxShadow: "0 0 0 2px var(--bg-card)",
                  }}
                />
              )}
            </button>

            <AnimatePresence>
            {notificationMenuOpen && (
              <motion.div
                initial={{ opacity: 0, y: -8, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8, scale: 0.96 }}
                transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
                style={{
                  position: "absolute", top: "calc(100% + 0.5rem)", right: 0,
                  width: 260, background: "var(--bg-card)", border: "1px solid var(--border)",
                  borderRadius: "0.875rem", boxShadow: "var(--shadow-card)", overflow: "hidden", zIndex: 50,
                }}
              >
                <div style={{ padding: "0.9rem 1rem", borderBottom: "1px solid var(--border)" }}>
                  <p style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>새 글 알림</p>
                  <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", margin: "0.35rem 0 0" }}>
                    블로그 새 글 발행 시 푸시 알림을 받습니다.
                  </p>
                </div>

                <div style={{ padding: "0.9rem 1rem", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                  {/* iOS + 브라우저 모드 안내 */}
                  {iosNotStandalone ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
                      <p style={{ fontSize: "0.78rem", color: "var(--text-muted)", margin: 0, lineHeight: 1.5 }}>
                        iPhone에서는 홈 화면에 추가한 뒤 이용할 수 있습니다.
                      </p>
                      <div style={{ display: "flex", flexDirection: "column", gap: "0.45rem" }}>
                        {[
                          { icon: <Share size={13} color="#6366F1" />, text: "Safari 하단 공유(□↑) 탭" },
                          { icon: <span style={{ fontSize: 13, color: "#6366F1" }}>+</span>, text: "홈 화면에 추가 선택" },
                          { icon: <Bell size={13} color="#6366F1" />, text: "앱 아이콘으로 열어 알림 허용" },
                        ].map(({ icon, text }, i) => (
                          <div key={i} style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                            <div style={{ width: 24, height: 24, borderRadius: "50%", background: "rgba(99,102,241,0.12)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                              {icon}
                            </div>
                            <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", margin: 0 }}>{text}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : !pushSupported ? (
                    <p style={{ fontSize: "0.78rem", color: "var(--text-muted)", margin: 0 }}>
                      현재 브라우저는 푸시 알림을 지원하지 않습니다.
                    </p>
                  ) : (
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.75rem" }}>
                      <div>
                        <p style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--text-primary)", margin: 0 }}>
                          {pushStatus === "subscribed" ? "구독 중" : pushStatus === "loading" ? "처리 중…" : "구독 안 됨"}
                        </p>
                        {pushStatus === "error" && (
                          <p style={{ fontSize: "0.72rem", color: "#F43F5E", margin: "0.25rem 0 0" }}>{pushErrorMsg}</p>
                        )}
                        {pushStatus === "idle" && (
                          <p style={{ fontSize: "0.72rem", color: "var(--text-muted)", margin: "0.25rem 0 0" }}>
                            {typeof window !== "undefined" && Notification.permission === "denied"
                              ? "브라우저에서 차단됨 — 브라우저 설정에서 허용하세요."
                              : "구독하면 새 글 발행 시 바로 알림을 받습니다."}
                          </p>
                        )}
                      </div>
                      {pushStatus !== "loading" && (
                        <button
                          type="button"
                          onClick={pushStatus === "subscribed" ? handlePushUnsubscribe : handlePushSubscribe}
                          disabled={typeof window !== "undefined" && Notification.permission === "denied" && pushStatus !== "subscribed"}
                          className="px-3 py-2 rounded-lg text-xs font-semibold transition-opacity disabled:opacity-40 shrink-0"
                          style={{
                            background: pushStatus === "subscribed" ? "rgba(244,63,94,0.12)" : "rgba(245,158,11,0.16)",
                            color: pushStatus === "subscribed" ? "#F43F5E" : "#F59E0B",
                          }}
                        >
                          {pushStatus === "subscribed" ? "해지" : "구독"}
                        </button>
                      )}
                    </div>
                  )}

                  {/* 알림 유형 설정 토글 (구독 중일 때만 표시) */}
                  {pushStatus === "subscribed" && (
                    <div style={{ borderTop: "1px solid var(--border)", paddingTop: "0.75rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                      <p style={{ fontSize: "0.78rem", fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>알림 설정</p>
                      {[
                        { label: "새 글 알림", desc: "새 블로그 글 발행 시 알림", value: notifyNewPost, type: "newPost" as const },
                        { label: "댓글 알림", desc: "내 글·댓글에 새 댓글 달릴 때 알림", value: notifyComment, type: "comment" as const },
                      ].map((item) => (
                        <div key={item.type} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.5rem" }}>
                          <div>
                            <p style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--text-primary)", margin: 0 }}>{item.label}</p>
                            <p style={{ fontSize: "0.68rem", color: "var(--text-muted)", margin: "0.1rem 0 0" }}>{item.desc}</p>
                          </div>
                          <button
                            type="button"
                            role="switch"
                            aria-checked={item.value}
                            onClick={() => handleNotifyToggle(item.type, !item.value)}
                            style={{
                              width: 36, height: 20, borderRadius: 999, border: "none", cursor: "pointer",
                              flexShrink: 0, position: "relative", transition: "background 0.2s",
                              background: item.value ? "#F59E0B" : "var(--border)",
                            }}
                          >
                            <span style={{
                              position: "absolute", top: 3, width: 14, height: 14, borderRadius: "50%",
                              background: "#fff", transition: "left 0.2s",
                              left: item.value ? 19 : 3,
                            }} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  <div style={{ borderTop: "1px solid var(--border)", paddingTop: "0.75rem", display: "flex", flexDirection: "column", gap: "0.55rem" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.5rem" }}>
                      <p style={{ fontSize: "0.78rem", fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>
                        최근 알림
                      </p>
                      <p style={{ fontSize: "0.7rem", color: "var(--text-muted)", margin: 0 }}>
                        최대 3개
                      </p>
                    </div>

                    {inbox.length === 0 ? (
                      <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", margin: 0, lineHeight: 1.5 }}>
                        아직 받은 새 글 알림이 없습니다.
                      </p>
                    ) : (
                      <div style={{ display: "flex", flexDirection: "column", gap: "0.45rem" }}>
                        {inbox.map((item) => (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => handleNotificationClick(item.id, item.url)}
                            className="pressable"
                            style={{
                              width: "100%",
                              textAlign: "left",
                              padding: "0.7rem 0.75rem",
                              borderRadius: "0.8rem",
                              background: item.read ? "var(--bg-input)" : "rgba(245,158,11,0.12)",
                              border: "1px solid var(--border)",
                              display: "flex",
                              flexDirection: "column",
                              gap: "0.2rem",
                            }}
                          >
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.5rem" }}>
                              <p style={{ fontSize: "0.76rem", fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>
                                {item.title}
                              </p>
                              {!item.read && (
                                <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#F59E0B", flexShrink: 0 }} />
                              )}
                            </div>
                            <p style={{ fontSize: "0.72rem", color: "var(--text-muted)", margin: 0, lineHeight: 1.45 }}>
                              {item.body}
                            </p>
                            <p style={{ fontSize: "0.68rem", color: "var(--text-muted)", margin: 0 }}>
                              {format(new Date(item.createdAt), "M/d HH:mm")}
                            </p>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            )}
            </AnimatePresence>
          </div>
        )}

        {/* 유저 아이콘 */}
        {user ? (
          <div ref={dropdownRef} style={{ position: "relative" }}>
            <button
              onClick={() => setDropdownOpen((v) => !v)}
              className="w-9 h-9 rounded-xl flex items-center justify-center overflow-hidden font-bold text-sm transition-all hover:opacity-80"
              style={{
                background: userAvatarUrl ? "var(--bg-card)" : "linear-gradient(135deg, #7C3AED, #06B6D4)",
                color: "#fff",
                border: userAvatarUrl ? "1px solid var(--border)" : "none",
                cursor: "pointer",
              }}
              aria-label="유저 메뉴"
            >
              {userAvatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={userAvatarUrl}
                  alt="유저 아바타"
                  className="w-full h-full object-cover"
                />
              ) : (
                avatarLetter
              )}
            </button>

            <AnimatePresence>
            {dropdownOpen && (
              <motion.div
                initial={{ opacity: 0, y: -8, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8, scale: 0.96 }}
                transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
                style={{
                  position: "absolute", top: "calc(100% + 0.5rem)", right: 0,
                  minWidth: 200, background: "var(--bg-card)", border: "1px solid var(--border)",
                  borderRadius: "0.875rem", boxShadow: "var(--shadow-card)", overflow: "hidden", zIndex: 50,
                }}
              >
                <div style={{ padding: "0.75rem 1rem", borderBottom: "1px solid var(--border)" }}>
                  <p style={{ fontSize: "0.7rem", color: "var(--text-muted)", margin: 0 }}>로그인 계정</p>
                  <p style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--text-primary)", margin: "0.15rem 0 0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {userProfile?.email ?? user.email}
                  </p>
                </div>
                <Link
                  href="/settings"
                  onClick={() => setDropdownOpen(false)}
                  style={{
                    width: "100%", padding: "0.75rem 1rem", display: "flex", alignItems: "center",
                    gap: "0.5rem", fontSize: "0.85rem", color: "var(--text-primary)", borderBottom: "1px solid var(--border)",
                  }}
                >
                  <Settings size={14} />
                  사이트 옵션
                </Link>
                <Link
                  href="/mypage"
                  onClick={() => setDropdownOpen(false)}
                  style={{
                    width: "100%", padding: "0.75rem 1rem", display: "flex", alignItems: "center",
                    gap: "0.5rem", fontSize: "0.85rem", color: "var(--text-primary)", borderBottom: "1px solid var(--border)",
                  }}
                >
                  <UserCircle size={14} />
                  프로필 편집
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
              </motion.div>
            )}
            </AnimatePresence>
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
      </div>
      </div>
      {/* 위치 정보 — 유틸리티 navigation 하단 */}
        <div className="min-h-[1rem] flex justify-end">
          {locationLoading ? (
            <div className="flex items-center gap-1.5">
              <div
                className="w-3 h-3 rounded-full skeleton-shimmer shrink-0"
              />
              <div
                className="h-3 w-32 rounded skeleton-shimmer"
              />
            </div>
          ) : currentLocation ? (
            <div className="flex items-center gap-1.5 min-w-0">
              <MapPin size={12} style={{ color: "var(--text-muted)" }} />
              <p className="text-xs truncate" style={{ color: "var(--text-muted)" }}>
                {currentLocation}
              </p>
            </div>
          ) : null}
        </div>
    </header>
    
  );
}
