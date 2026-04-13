"use client";

import { useEffect } from "react";

// 블로그 상세 페이지 마운트 시 조회수를 1 증가시킵니다.
// view_count 컬럼과 increment_view_count RPC가 DB에 존재하면 실제로 반영됩니다.
export default function BlogViewCounter({ postId }: { postId: string }) {
  useEffect(() => {
    fetch("/api/blog/views", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ post_id: postId }),
    }).catch(() => {
      // 네트워크 오류 등은 조용히 무시
    });
  }, [postId]);

  return null;
}
