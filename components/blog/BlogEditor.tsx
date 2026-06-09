"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import {
  Bold,
  Code2,
  Heading1,
  Heading2,
  Italic,
  LoaderCircle,
  Link2,
  List,
  MapPin,
  X,
  ListOrdered,
  Quote,
  Redo2,
  Undo2,
  Video,
} from "lucide-react";
import { EmbedBlock, parseYouTubeEmbedUrl } from "@/lib/blog-embeds";
import { StreamVideoBlock } from "@/lib/blog-stream-video";
import { MapInputBlock } from "@/components/blog/MapInputBlock";
import CloudflareVideoUploader from "@/components/blog/CloudflareVideoUploader";
import { uploadImagesToStorage } from "@/lib/image-upload";
import { ImageGalleryExtension } from "@/lib/blog-image-gallery";
import type { GalleryImage } from "@/lib/blog-image-gallery";

export const DEFAULT_EDITOR_HTML = "";

interface EditorValue {
  html: string;
  json: unknown;
}

export default function BlogEditor({
  value,
  onChange,
}: {
  value: EditorValue;
  onChange: (value: EditorValue) => void;
}) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ current: number; total: number } | null>(null);
  const [uploadError, setUploadError] = useState("");
  const [videoUploaderOpen, setVideoUploaderOpen] = useState(false);
  const activeDragRef = useRef<{ src: string; alt: string } | null>(null);
  const lastDragOverRef = useRef<HTMLImageElement | null>(null);

  const handleDropGallery = useCallback((
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    view: any,
    event: DragEvent,
    _slice: unknown,
    moved: boolean,
  ): boolean => {
    if (!moved || !activeDragRef.current) return false;
    const target = event.target as HTMLElement;
    const targetImg = target.tagName === "IMG" ? (target as HTMLImageElement) : null;
    if (!targetImg?.src) return false;
    if (targetImg.src === activeDragRef.current.src) return false;
    if (targetImg.closest('[data-type="image-gallery"]')) return false;

    const draggedSrc = activeDragRef.current.src;
    const draggedAlt = activeDragRef.current.alt;
    const targetSrc = targetImg.src;
    const targetAlt = targetImg.alt ?? "";

    let targetFrom = -1, targetTo = -1;
    let draggedFrom = -1, draggedTo = -1;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    view.state.doc.descendants((node: any, pos: number) => {
      if (node.type.name === "image") {
        if (node.attrs.src === targetSrc && targetFrom === -1) {
          targetFrom = pos; targetTo = pos + node.nodeSize;
        }
        if (node.attrs.src === draggedSrc && draggedFrom === -1) {
          draggedFrom = pos; draggedTo = pos + node.nodeSize;
        }
      }
      return targetFrom === -1 || draggedFrom === -1;
    });

    if (targetFrom === -1 || draggedFrom === -1) return false;

    const galleryType = view.state.schema.nodes.imageGallery;
    if (!galleryType) return false;

    const galleryImages: GalleryImage[] = [
      { src: targetSrc, alt: targetAlt },
      { src: draggedSrc, alt: draggedAlt },
    ];
    const galleryNode = galleryType.create({ images: galleryImages });
    const tr = view.state.tr;

    if (draggedFrom > targetFrom) {
      tr.delete(draggedFrom, draggedTo);
      tr.replaceWith(targetFrom, targetTo, galleryNode);
    } else {
      tr.delete(draggedFrom, draggedTo);
      const shift = -(draggedTo - draggedFrom);
      tr.replaceWith(targetFrom + shift, targetTo + shift, galleryNode);
    }

    view.dispatch(tr);
    activeDragRef.current = null;
    return true;
  }, []);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Placeholder.configure({
        placeholder: "제목 아래에 자연스럽게 이어질 본문을 써보세요.",
      }),
      Link.configure({
        openOnClick: false,
        autolink: true,
        defaultProtocol: "https",
      }),
      EmbedBlock,
      StreamVideoBlock,
      MapInputBlock,
      Image.configure({
        inline: false,
        allowBase64: true,
      }),
      ImageGalleryExtension,
    ],
    content: value.html,
    editorProps: {
      attributes: {
        class: "blog-editor-content",
      },
      handleDrop: (view, event, slice, moved) =>
        handleDropGallery(view, event as DragEvent, slice, moved),
    },
    onUpdate: ({ editor: currentEditor }) => {
      onChange({
        html: currentEditor.getHTML(),
        json: currentEditor.getJSON(),
      });
    },
  });

  useEffect(() => {
    if (!editor) return;
    if (value.html) return;
    onChange({
      html: editor.getHTML(),
      json: editor.getJSON(),
    });
  }, [editor, onChange, value.html]);

  useEffect(() => {
    if (!editor) return;
    const dom = editor.view.dom;

    const onDragStart = (e: Event) => {
      const target = (e as DragEvent).target as HTMLElement;
      if (target.tagName === "IMG") {
        const img = target as HTMLImageElement;
        activeDragRef.current = { src: img.src, alt: img.alt };
      } else {
        activeDragRef.current = null;
      }
    };
    const onDragEnd = () => {
      lastDragOverRef.current?.classList.remove("blog-image-drop-target");
      lastDragOverRef.current = null;
      activeDragRef.current = null;
    };
    const onDragOver = (e: Event) => {
      if (!activeDragRef.current) return;
      const target = (e as DragEvent).target as HTMLElement;
      if (target.tagName === "IMG" && target !== lastDragOverRef.current) {
        lastDragOverRef.current?.classList.remove("blog-image-drop-target");
        target.classList.add("blog-image-drop-target");
        lastDragOverRef.current = target as HTMLImageElement;
      }
    };
    const onDragLeave = (e: Event) => {
      const target = (e as DragEvent).target as HTMLElement;
      if (target.tagName === "IMG") {
        target.classList.remove("blog-image-drop-target");
        if (lastDragOverRef.current === target) lastDragOverRef.current = null;
      }
    };

    dom.addEventListener("dragstart", onDragStart);
    dom.addEventListener("dragend", onDragEnd);
    dom.addEventListener("dragover", onDragOver);
    dom.addEventListener("dragleave", onDragLeave);
    return () => {
      dom.removeEventListener("dragstart", onDragStart);
      dom.removeEventListener("dragend", onDragEnd);
      dom.removeEventListener("dragover", onDragOver);
      dom.removeEventListener("dragleave", onDragLeave);
    };
  }, [editor]);

  const insertFiles = async (files: FileList | File[]) => {
    if (!editor) return;
    setUploadProgress({ current: 0, total: Array.from(files).filter((f) => f.type.startsWith("image/")).length });
    setUploadError("");
    try {
      const items = await uploadImagesToStorage(files, (current, total) => {
        setUploadProgress({ current, total });
      });
      if (items.length === 0) return;
      const chain = editor.chain().focus();
      items.forEach(({ url, name }) => {
        chain.setImage({ src: url, alt: name });
        chain.createParagraphNear();
      });
      chain.run();
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "이미지 업로드에 실패했습니다.");
    } finally {
      setUploadProgress(null);
    }
  };

  if (!editor) {
    return (
      <div
        className="rounded-[1.5rem]"
        style={{ minHeight: 380, background: "var(--bg-input)", border: "1px solid var(--border)" }}
      />
    );
  }

  const setLink = () => {
    const previousUrl = editor.getAttributes("link").href as string | undefined;
    const url = window.prompt("링크 URL을 입력하세요", previousUrl ?? "https://");
    if (url === null) return;
    if (!url.trim()) {
      editor.chain().focus().unsetLink().run();
      return;
    }

    const selectedText = editor.state.doc.textBetween(
      editor.state.selection.from,
      editor.state.selection.to,
      " ",
    ).trim();

    if (!selectedText) {
      const label = window.prompt("링크 텍스트를 입력하세요", url.trim());
      if (label === null || !label.trim()) return;
      editor
        .chain()
        .focus()
        .insertContent(`<a href="${url.trim()}">${label.trim()}</a>`)
        .run();
      return;
    }

    editor.chain().focus().extendMarkRange("link").setLink({ href: url.trim() }).run();
  };

  const insertMap = () => {
    editor.chain().focus().insertContent({ type: "mapInputBlock" }).run();
  };

  const insertYouTube = () => {
    const url = window.prompt("유튜브 링크를 입력하세요");
    if (!url?.trim()) return;

    const src = parseYouTubeEmbedUrl(url);
    if (!src) {
      window.alert("유효한 유튜브 링크 형식이 아닙니다.");
      return;
    }

    editor.chain().focus().insertContent({
      type: "embedBlock",
      attrs: { kind: "youtube", src, title: "YouTube video" },
    }).run();
  };

  const insertCloudflareVideo = (video: { uid: string; title: string; posterTime: string }) => {
    editor.chain().focus().insertContent({
      type: "streamVideoBlock",
      attrs: {
        uid: video.uid,
        title: video.title,
        posterTime: video.posterTime,
      },
    }).createParagraphNear().run();
  };

  return (
    <div className="flex flex-col gap-3">
      {uploadError && (
        <div
          className="rounded-xl px-4 py-2.5 text-sm flex items-center justify-between gap-3"
          style={{ background: "rgba(244,63,94,0.1)", border: "1px solid rgba(244,63,94,0.3)", color: "#F43F5E" }}
        >
          <span>{uploadError}</span>
          <button
            type="button"
            onClick={() => setUploadError("")}
            style={{ background: "transparent", border: "none", cursor: "pointer", color: "#F43F5E", padding: 0, flexShrink: 0 }}
          >
            <X size={14} />
          </button>
        </div>
      )}
      {/* 툴바 */}
      <div
        className="rounded-[1.5rem] p-3 flex flex-wrap gap-2"
        style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
      >
        <ToolbarButton label="실행 취소" onClick={() => editor.chain().focus().undo().run()} active={false}>
          <Undo2 size={15} />
        </ToolbarButton>
        <ToolbarButton label="다시 실행" onClick={() => editor.chain().focus().redo().run()} active={false}>
          <Redo2 size={15} />
        </ToolbarButton>
        <ToolbarButton label="제목 1" onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} active={editor.isActive("heading", { level: 1 })}>
          <Heading1 size={15} />
        </ToolbarButton>
        <ToolbarButton label="제목 2" onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive("heading", { level: 2 })}>
          <Heading2 size={15} />
        </ToolbarButton>
        <ToolbarButton label="굵게" onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive("bold")}>
          <Bold size={15} />
        </ToolbarButton>
        <ToolbarButton label="기울임" onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive("italic")}>
          <Italic size={15} />
        </ToolbarButton>
        <ToolbarButton label="불릿" onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive("bulletList")}>
          <List size={15} />
        </ToolbarButton>
        <ToolbarButton label="번호" onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive("orderedList")}>
          <ListOrdered size={15} />
        </ToolbarButton>
        <ToolbarButton label="인용" onClick={() => editor.chain().focus().toggleBlockquote().run()} active={editor.isActive("blockquote")}>
          <Quote size={15} />
        </ToolbarButton>
        <ToolbarButton label="코드" onClick={() => editor.chain().focus().toggleCodeBlock().run()} active={editor.isActive("codeBlock")}>
          <Code2 size={15} />
        </ToolbarButton>
        <ToolbarButton label="링크" onClick={setLink} active={editor.isActive("link")}>
          <Link2 size={15} />
        </ToolbarButton>
        <ToolbarButton label="유튜브" onClick={insertYouTube} active={false}>
          <Video size={15} />
        </ToolbarButton>
        <button
          type="button"
          onClick={() => setVideoUploaderOpen(true)}
          className="pressable px-3 h-9 rounded-xl text-xs font-semibold transition-colors"
          style={{
            background: "rgba(234,88,12,0.12)",
            color: "#EA580C",
            border: "1px solid rgba(234,88,12,0.22)",
          }}
        >
          동영상 업로드
        </button>
        <ToolbarButton label="네이버 지도" onClick={insertMap} active={false}>
          <MapPin size={15} />
        </ToolbarButton>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="pressable px-3 h-9 rounded-xl text-xs font-semibold transition-colors"
          style={{
            background: "var(--bg-input)",
            color: "var(--text-muted)",
            border: "1px solid var(--border)",
          }}
        >
          파일 업로드
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={async (event) => {
            if (!event.target.files?.length) return;
            await insertFiles(event.target.files);
            event.target.value = "";
          }}
        />
      </div>

      {/* 에디터 본문 */}
      <div
        className="rounded-[1.75rem] overflow-hidden relative"
        style={{
          border: `1px solid ${isDragging ? "rgba(234,88,12,0.4)" : "var(--border)"}`,
          background: "var(--bg-card)",
        }}
        onDragEnter={(event) => { event.preventDefault(); setIsDragging(true); }}
        onDragOver={(event) => { event.preventDefault(); setIsDragging(true); }}
        onDragLeave={(event) => {
          event.preventDefault();
          const related = event.relatedTarget as Node | null;
          if (related && event.currentTarget.contains(related)) return;
          setIsDragging(false);
        }}
        onDrop={async (event) => {
          event.preventDefault();
          setIsDragging(false);
          if (!event.dataTransfer.files?.length) return;
          await insertFiles(event.dataTransfer.files);
        }}
      >
        <div
          className="px-5 py-4 text-xs font-semibold"
          style={{ color: "var(--text-muted)", borderBottom: "1px solid var(--border)", background: "rgba(234,88,12,0.08)" }}
        >
          이미지는 드래그/업로드, 동영상은 Cloudflare Stream, 유튜브·네이버 지도는 툴바 버튼으로 삽입하세요
        </div>

        {uploadProgress ? (
          <div
            className="absolute inset-x-0 top-[53px] z-10 px-5 py-2 flex flex-col gap-1.5"
            style={{ background: "rgba(234,88,12,0.12)" }}
          >
            <div className="flex items-center gap-2 text-xs font-semibold" style={{ color: "#EA580C" }}>
              <LoaderCircle size={12} className="animate-spin" />
              {uploadProgress.total > 1
                ? `이미지 업로드 중 (${uploadProgress.current}/${uploadProgress.total})`
                : "이미지 변환 및 업로드 중..."}
            </div>
            <div className="h-1 rounded-full overflow-hidden" style={{ background: "rgba(234,88,12,0.2)" }}>
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{
                  background: "#EA580C",
                  width: uploadProgress.total > 0
                    ? `${Math.round((uploadProgress.current / uploadProgress.total) * 100)}%`
                    : "0%",
                }}
              />
            </div>
          </div>
        ) : null}

        {isDragging ? (
          <div
            className="absolute inset-0 z-10 flex items-center justify-center text-sm font-semibold"
            style={{ background: "rgba(234,88,12,0.12)", color: "#EA580C", pointerEvents: "none" }}
          >
            이미지를 놓으면 본문에 바로 삽입됩니다
          </div>
        ) : null}

        <EditorContent editor={editor} />

        {/* 모바일 하단 퀵 버튼 */}
        <div className="blog-editor-dock">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="pressable blog-editor-dock-button"
          >
            이미지
          </button>
          <button
            type="button"
            onClick={() => setVideoUploaderOpen(true)}
            className="pressable blog-editor-dock-button"
          >
            동영상
          </button>
          <button
            type="button"
            onClick={insertYouTube}
            className="pressable blog-editor-dock-button"
          >
            유튜브
          </button>
          <button
            type="button"
            onClick={insertMap}
            className="pressable blog-editor-dock-button"
          >
            지도
          </button>
        </div>
      </div>
      <CloudflareVideoUploader
        open={videoUploaderOpen}
        onClose={() => setVideoUploaderOpen(false)}
        onUploaded={insertCloudflareVideo}
      />
    </div>
  );
}

function ToolbarButton({
  children,
  onClick,
  active,
  label,
}: {
  children: React.ReactNode;
  onClick: () => void;
  active: boolean;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      className="pressable w-9 h-9 rounded-xl flex items-center justify-center transition-colors"
      style={{
        background: active ? "rgba(234,88,12,0.15)" : "var(--bg-input)",
        color: active ? "#EA580C" : "var(--text-muted)",
        border: `1px solid ${active ? "rgba(234,88,12,0.3)" : "var(--border)"}`,
      }}
    >
      {children}
    </button>
  );
}
