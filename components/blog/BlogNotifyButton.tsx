"use client";

import { useState } from "react";
import { Bell, LoaderCircle } from "lucide-react";

interface Props {
  slug: string;
}

export default function BlogNotifyButton({ slug }: Props) {
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState("");
  const [messageTone, setMessageTone] = useState<"idle" | "success" | "error">("idle");

  const handleNotify = async () => {
    if (sending) return;
    setSending(true);
    setMessage("");
    setMessageTone("idle");

    try {
      const response = await fetch(`/api/blog/posts/${encodeURIComponent(slug)}/notify`, {
        method: "POST",
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error ?? "알림 발송에 실패했습니다.");
      }

      setMessage(`알림 발송 완료 · 성공 ${payload.result?.sent ?? 0}건`);
      setMessageTone("success");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "알림 발송에 실패했습니다.");
      setMessageTone("error");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={handleNotify}
        disabled={sending}
        className="w-full py-3 rounded-xl text-center font-semibold transition-opacity disabled:opacity-60 flex items-center justify-center gap-2"
        style={{ background: "rgba(245,158,11,0.16)", color: "#F59E0B" }}
      >
        {sending ? <LoaderCircle size={16} className="animate-spin" /> : <Bell size={16} />}
        글 알림 보내기
      </button>
      {message ? (
        <p
          className="text-xs"
          style={{ color: messageTone === "error" ? "#F43F5E" : "var(--text-muted)", margin: 0 }}
        >
          {message}
        </p>
      ) : null}
    </div>
  );
}
