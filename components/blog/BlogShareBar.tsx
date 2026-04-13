"use client";

import { useState, useEffect } from "react";
import { Link2, Check } from "lucide-react";

const ACCENT = "#EA580C";

interface Props {
  title: string;
}

function XIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.75l7.73-8.835L1.254 2.25H8.08l4.26 5.632 5.9-5.632zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

function FacebookIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  );
}

function LinkedInIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
    </svg>
  );
}

function ThreadsIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 192 192" fill="currentColor" aria-hidden="true">
      <path d="M141.537 88.988a66.667 66.667 0 0 0-2.518-1.143c-1.482-27.307-16.403-42.94-41.457-43.1h-.34c-14.986 0-27.449 6.396-35.12 18.05l13.74 9.418c5.73-8.695 14.724-10.548 21.386-10.548h.229c8.27.054 14.497 2.464 18.492 7.165 2.952 3.446 4.925 8.211 5.897 14.157-7.357-1.249-15.347-1.63-23.896-1.14-24.067 1.389-39.549 15.403-38.596 34.923.482 9.907 5.464 18.44 14.016 24.018 7.141 4.716 16.33 7.027 25.895 6.52 12.625-.678 22.523-5.506 29.415-14.348 5.258-6.71 8.589-15.394 10.068-26.317 6.04 3.644 10.52 8.509 13.027 14.472 4.515 10.806 4.782 28.597-9.353 42.733-12.473 12.473-27.481 17.848-50.176 18.017-25.148-.185-44.209-8.427-56.666-24.505-11.795-15.245-17.976-37.498-18.34-66.217.363-28.718 6.544-50.971 18.34-66.217C68.574 30.909 87.635 22.667 112.783 22.48c25.31.189 44.751 8.47 57.824 24.618 6.547 8.158 11.481 18.436 14.695 30.611l16.146-4.317c-3.81-14.028-9.837-26.22-17.997-36.321C166.708 17.73 143.271 7.247 112.8 7.016h-.034C82.338 7.247 58.993 17.73 42.389 37.092 27.619 54.395 20.171 78.734 19.686 108.609v.042c.485 29.875 7.933 54.214 22.703 71.517 16.604 19.363 40.05 29.847 70.47 30.077h.034c27.126-.2 46.231-7.286 61.916-22.971 20.671-20.671 20.07-46.696 13.246-62.79-4.969-11.902-14.374-21.537-26.518-27.496z M100.65 124.617c-10.528.6-21.467-4.133-21.98-14.283-.383-7.404 5.272-15.208 22.28-16.193 1.952-.113 3.869-.168 5.754-.168 6.405 0 12.404.62 17.886 1.817-2.037 25.386-13.434 28.279-23.94 28.827z" />
    </svg>
  );
}

export default function BlogShareBar({ title }: Props) {
  const [copied, setCopied] = useState(false);
  const [url, setUrl] = useState("");

  useEffect(() => {
    setUrl(window.location.href);
  }, []);

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
      label: "X (Twitter)",
      href: `https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(url)}`,
      icon: <XIcon />,
    },
    {
      label: "Facebook",
      href: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
      icon: <FacebookIcon />,
    },
    {
      label: "LinkedIn",
      href: `https://www.linkedin.com/shareArticle?mini=true&url=${encodeURIComponent(url)}&title=${encodeURIComponent(title)}`,
      icon: <LinkedInIcon />,
    },
    {
      label: "Threads",
      href: `https://www.threads.net/intent/post?text=${encodeURIComponent(title + "\n" + url)}`,
      icon: <ThreadsIcon />,
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
        {socialLinks.map((item) => (
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
        ))}
      </div>
    </div>
  );
}
