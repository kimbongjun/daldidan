"use client";

import { useState } from "react";
import { LoaderCircle, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";

interface Props {
  id: string;
}

export default function BlogDeleteButton({ id }: Props) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  const handleDelete = async () => {
    if (deleting) return;
    if (!window.confirm("정말 이 글을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.")) return;

    setDeleting(true);
    setError("");

    try {
      const response = await fetch("/api/blog/posts", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error ?? "글을 삭제하지 못했습니다.");
      }

      router.push("/blog");
      router.refresh();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "글을 삭제하지 못했습니다.");
      setDeleting(false);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={handleDelete}
        disabled={deleting}
        className="w-full py-3 rounded-xl text-center font-semibold transition-opacity disabled:opacity-60 flex items-center justify-center gap-2"
        style={{ background: "rgba(244,63,94,0.12)", color: "#F43F5E", border: "1px solid rgba(244,63,94,0.25)" }}
      >
        {deleting ? <LoaderCircle size={16} className="animate-spin" /> : <Trash2 size={16} />}
        글 삭제
      </button>
      {error ? (
        <p className="text-xs" style={{ color: "#F43F5E", margin: 0 }}>
          {error}
        </p>
      ) : null}
    </div>
  );
}
