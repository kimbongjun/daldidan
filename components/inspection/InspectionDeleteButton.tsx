"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Loader2 } from "lucide-react";

export default function InspectionDeleteButton({ id }: { id: string }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    setLoading(true);
    const res = await fetch(`/api/inspection/${id}`, { method: "DELETE" });
    if (res.ok) {
      router.push("/inspection");
    } else {
      setLoading(false);
      setConfirming(false);
      alert("삭제에 실패했습니다.");
    }
  };

  if (confirming) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-xs" style={{ color: "var(--text-muted)" }}>삭제하시겠어요?</span>
        <button type="button" onClick={() => setConfirming(false)}
          className="text-xs px-2.5 py-1.5 rounded-lg"
          style={{ background: "rgba(255,255,255,0.06)", color: "var(--text-muted)", border: "1px solid var(--border)" }}>
          취소
        </button>
        <button type="button" onClick={handleDelete} disabled={loading}
          className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg font-bold"
          style={{ background: "#F43F5E", color: "#fff" }}>
          {loading ? <Loader2 size={11} className="animate-spin" /> : <Trash2 size={11} />}
          확인
        </button>
      </div>
    );
  }

  return (
    <button type="button" onClick={() => setConfirming(true)}
      className="flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-lg transition-opacity hover:opacity-80"
      style={{ background: "rgba(244,63,94,0.15)", color: "#F43F5E", border: "1px solid rgba(244,63,94,0.3)" }}>
      <Trash2 size={12} /> 삭제
    </button>
  );
}
