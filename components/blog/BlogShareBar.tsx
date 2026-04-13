"use client";

import { useState, useEffect, useRef } from "react";
import { Link2, Check } from "lucide-react";

const ACCENT = "#EA580C";

// ─── 카카오 SDK 타입 선언 ──────────────────────────────────────────────
declare global {
  interface Window {
    Kakao?: {
      isInitialized: () => boolean;
      init: (key: string) => void;
      Share: {
        sendDefault: (options: {
          objectType: string;
          content: {
            title: string;
            description: string;
            imageUrl: string;
            link: { mobileWebUrl: string; webUrl: string };
          };
          buttons: Array<{ title: string; link: { mobileWebUrl: string; webUrl: string } }>;
        }) => void;
      };
    };
  }
}

interface Props {
  title: string;
}

function FacebookIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  );
}

function KakaoIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 3C6.477 3 2 6.477 2 10.8c0 2.7 1.713 5.076 4.32 6.52-.19.705-.693 2.56-.794 2.957-.12.49.18.483.378.352.156-.104 2.48-1.684 3.487-2.368.518.073 1.051.11 1.609.11 5.523 0 10-3.477 10-7.77C21.999 6.476 17.523 3 12 3z"/>
    </svg>
  );
}

export default function BlogShareBar({ title }: Props) {
  const [copied, setCopied] = useState(false);
  const [url, setUrl] = useState("");
  const kakaoReady = useRef(false);

  useEffect(() => {
    setUrl(window.location.href);
  }, []);

  // 카카오 SDK 동적 로드 및 초기화
  useEffect(() => {
    const kakaoKey = process.env.NEXT_PUBLIC_KAKAO_JS_KEY;
    if (!kakaoKey) return;

    if (window.Kakao?.isInitialized()) {
      kakaoReady.current = true;
      return;
    }

    const script = document.createElement("script");
    script.src = "https://t1.kakaocdn.net/kakao_js_sdk/2.7.2/kakao.min.js";
    script.integrity = "sha384-TiCUE00h649CAMonG018J2ujOgDKW/kVWlChEuu4jK2vxfAAD0eZxzCKakxg55G4";
    script.crossOrigin = "anonymous";
    script.async = true;
    script.onload = () => {
      if (window.Kakao && !window.Kakao.isInitialized()) {
        window.Kakao.init(kakaoKey);
      }
      kakaoReady.current = true;
    };
    document.head.appendChild(script);
  }, []);

  const handleKakaoShare = () => {
    if (!url) return;
    if (kakaoReady.current && window.Kakao?.Share) {
      window.Kakao.Share.sendDefault({
        objectType: "feed",
        content: {
          title,
          description: url,
          imageUrl: `${window.location.origin}/og-default.png`,
          link: { mobileWebUrl: url, webUrl: url },
        },
        buttons: [{ title: "글 읽기", link: { mobileWebUrl: url, webUrl: url } }],
      });
    } else {
      // SDK 미초기화 시 카카오톡 앱 스킴 fallback (모바일)
      window.open(
        `https://sharer.kakao.com/talk/friends/picker/link?app_key=${process.env.NEXT_PUBLIC_KAKAO_JS_KEY ?? ""}&url=${encodeURIComponent(url)}`,
        "_blank",
        "noopener,noreferrer",
      );
    }
  };

  const handleCopy = async () => {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      const el = document.createElement("input");
      el.value = url;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2200);
  };

  const socialLinks = [
    {
      label: "Facebook",
      href: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
      icon: <FacebookIcon />,
      onClick: undefined as (() => void) | undefined,
    },
    {
      label: "카카오톡",
      href: undefined as string | undefined,
      icon: <KakaoIcon />,
      onClick: handleKakaoShare,
    },
  ];

  return (
    <div className="bento-card p-5 flex flex-col gap-4">
      <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: ACCENT }}>
        Share
      </p>

      <div className="flex flex-wrap items-center gap-2">
        {/* 링크 복사 버튼 */}
        <button
          onClick={handleCopy}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all"
          style={{
            background: copied ? "rgba(234,88,12,0.15)" : "rgba(255,255,255,0.05)",
            color: copied ? ACCENT : "var(--text-primary)",
            border: `1px solid ${copied ? "rgba(234,88,12,0.35)" : "rgba(255,255,255,0.08)"}`,
          }}
          aria-label="링크 복사"
        >
          {copied ? <Check size={16} /> : <Link2 size={16} />}
          <span>{copied ? "복사됨!" : "링크 복사"}</span>
        </button>

        {/* 구분선 */}
        <div
          className="hidden sm:block h-6 w-px mx-1"
          style={{ background: "var(--border)" }}
        />

        {/* SNS 공유 버튼들 */}
        {socialLinks.map((item) =>
          item.onClick ? (
            <button
              key={item.label}
              type="button"
              onClick={item.onClick}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium hover:opacity-75 transition-opacity"
              style={{
                background: item.label === "카카오톡" ? "#FEE500" : "rgba(255,255,255,0.05)",
                color: item.label === "카카오톡" ? "#3C1E1E" : "var(--text-primary)",
                border: item.label === "카카오톡" ? "none" : "1px solid rgba(255,255,255,0.08)",
              }}
              aria-label={`${item.label}에 공유`}
            >
              {item.icon}
              <span>{item.label}</span>
            </button>
          ) : (
            <a
              key={item.label}
              href={item.href}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium hover:opacity-75 transition-opacity"
              style={{
                background: "rgba(255,255,255,0.05)",
                color: "var(--text-primary)",
                border: "1px solid rgba(255,255,255,0.08)",
              }}
              aria-label={`${item.label}에 공유`}
            >
              {item.icon}
              <span>{item.label}</span>
            </a>
          )
        )}
      </div>
    </div>
  );
}
