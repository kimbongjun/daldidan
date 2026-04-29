"use client";

import { useEffect, useState } from "react";
import { ImagePlus, Loader2, CheckCircle } from "lucide-react";

type Phase = "idle" | "checking" | "running" | "done" | "hidden";

export default function ThumbnailBatchButton() {
  const [phase, setPhase] = useState<Phase>("checking");
  const [remaining, setRemaining] = useState(0);
  const [completed, setCompleted] = useState(0);

  useEffect(() => {
    fetch("/api/blog/thumbnails/batch")
      .then((r) => {
        if (r.status === 401) { setPhase("hidden"); return null; }
        return r.json();
      })
      .then((data) => {
        if (!data) return;
        if (data.remaining === 0) { setPhase("hidden"); return; }
        setRemaining(data.remaining);
        setPhase("idle");
      })
      .catch(() => setPhase("hidden"));
  }, []);

  async function run() {
    setPhase("running");
    let rem = remaining;

    while (rem > 0) {
      const res = await fetch("/api/blog/thumbnails/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ batchSize: 3 }),
      });
      if (!res.ok) break;
      const data = await res.json() as { processed: string[]; failed: number; remaining: number };
      const done = data.processed.length;
      setCompleted((c) => c + done);
      rem = data.remaining;
      setRemaining(rem);
      if (done === 0) break;
    }

    setPhase("done");
  }

  if (phase === "hidden" || phase === "checking") return null;

  if (phase === "done") {
    return (
      <span
        className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold"
        style={{ background: "rgba(16,185,129,0.15)", color: "#10B981" }}
      >
        <CheckCircle size={15} />
        {completed}개 완료
      </span>
    );
  }

  if (phase === "running") {
    return (
      <span
        className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold"
        style={{ background: "rgba(99,102,241,0.15)", color: "#6366F1" }}
      >
        <Loader2 size={15} className="animate-spin" />
        생성 중... ({remaining}개 남음)
      </span>
    );
  }

  return (
    <button
      onClick={run}
      className="pressable flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold transition-opacity hover:opacity-80"
      style={{ background: "rgba(99,102,241,0.15)", color: "#6366F1", border: "1px solid rgba(99,102,241,0.3)" }}
    >
      <ImagePlus size={15} />
      썸네일 {remaining}개 자동 생성
    </button>
  );
}
