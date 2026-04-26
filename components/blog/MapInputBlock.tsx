"use client";

import { useState } from "react";
import { Node } from "@tiptap/core";
import { NodeViewWrapper, ReactNodeViewRenderer } from "@tiptap/react";
import type { NodeViewProps } from "@tiptap/react";
import { parseNaverMapEmbedUrl } from "@/lib/blog-embeds";

function MapInputView({ editor, node, getPos, deleteNode }: NodeViewProps) {
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");
  const [embedSrc, setEmbedSrc] = useState<string | null>(null);

  const handlePreview = () => {
    setError("");
    const src = parseNaverMapEmbedUrl(url);
    if (!src) {
      setError("유효한 네이버 지도 링크가 아닙니다. (map.naver.com 또는 naver.me 링크를 붙여넣으세요)");
      setEmbedSrc(null);
      return;
    }
    setEmbedSrc(src);
  };

  const handleInsert = () => {
    if (!embedSrc) return;
    const from = typeof getPos === "function" ? getPos() : undefined;
    if (from === undefined) return;
    const to = from + node.nodeSize;
    editor
      .chain()
      .focus()
      .deleteRange({ from, to })
      .insertContentAt(from, {
        type: "embedBlock",
        attrs: { src: embedSrc, kind: "map", title: "네이버 지도" },
      })
      .run();
  };

  return (
    <NodeViewWrapper>
      <div
        className="rounded-2xl p-4 flex flex-col gap-3 my-2"
        style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
      >
        <p className="text-sm font-semibold" style={{ color: "var(--text-muted)" }}>
          네이버 지도 삽입
        </p>
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="text"
            value={url}
            onChange={(e) => {
              // iframe 코드 붙여넣기 시 src만 자동 추출
              const pasted = e.target.value;
              const iframeSrcMatch = pasted.match(/src=["']([^"']+)["']/i);
              setUrl(iframeSrcMatch?.[1] ?? pasted);
            }}
            onKeyDown={(e) => {
              e.stopPropagation();
              if (e.key === "Enter") { e.preventDefault(); handlePreview(); }
            }}
            placeholder="URL 또는 iframe 코드를 붙여넣으세요"
            className="min-w-0 flex-1 rounded-xl px-3 h-10 text-sm outline-none"
            style={{
              background: "var(--bg-input)",
              border: "1px solid var(--border)",
              color: "var(--text-primary)",
            }}
          />
          <button
            type="button"
            onClick={handlePreview}
            className="pressable px-4 h-10 rounded-xl text-sm font-semibold shrink-0 w-full sm:w-auto"
            style={{
              background: "rgba(234,88,12,0.15)",
              color: "#EA580C",
              border: "1px solid rgba(234,88,12,0.3)",
            }}
          >
            미리보기
          </button>
        </div>

        {error && (
          <p className="text-xs" style={{ color: "#F43F5E" }}>{error}</p>
        )}

        {embedSrc && (
          <div
            className="w-full rounded-xl overflow-hidden"
            style={{ aspectRatio: "4/3", border: "1px solid var(--border)" }}
          >
            <iframe
              src={embedSrc}
              title="네이버 지도 미리보기"
              className="w-full h-full"
              loading="lazy"
              allowFullScreen
              referrerPolicy="no-referrer-when-downgrade"
            />
          </div>
        )}

        <div className="flex flex-col-reverse sm:flex-row gap-2 sm:justify-end">
          <button
            type="button"
            onClick={() => deleteNode()}
            className="pressable px-4 h-10 rounded-xl text-sm font-semibold w-full sm:w-auto"
            style={{
              background: "var(--bg-input)",
              color: "var(--text-muted)",
              border: "1px solid var(--border)",
            }}
          >
            취소
          </button>
          <button
            type="button"
            onClick={handleInsert}
            disabled={!embedSrc}
            className="pressable px-4 h-10 rounded-xl text-sm font-semibold w-full sm:w-auto"
            style={{
              background: embedSrc ? "#EA580C" : "var(--bg-input)",
              color: embedSrc ? "#fff" : "var(--text-muted)",
              border: `1px solid ${embedSrc ? "#EA580C" : "var(--border)"}`,
              opacity: embedSrc ? 1 : 0.5,
              cursor: embedSrc ? "pointer" : "not-allowed",
            }}
          >
            삽입
          </button>
        </div>
      </div>
    </NodeViewWrapper>
  );
}

export const MapInputBlock = Node.create({
  name: "mapInputBlock",
  group: "block",
  atom: true,

  addAttributes() {
    return {};
  },

  parseHTML() {
    return [{ tag: 'div[data-map-input-block="true"]' }];
  },

  renderHTML() {
    return ["div", { "data-map-input-block": "true" }];
  },

  addNodeView() {
    return ReactNodeViewRenderer(MapInputView);
  },
});
