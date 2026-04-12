"use client";

import { useEffect, useRef, useState } from "react";
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
  X,
  ListOrdered,
  MapPinned,
  Quote,
  Redo2,
  Undo2,
  Video,
} from "lucide-react";
import { EmbedBlock, parseYouTubeEmbedUrl } from "@/lib/blog-embeds";
import { MapInputBlock } from "@/components/blog/MapInputBlock";
import { uploadImagesToStorage } from "@/lib/image-upload";

export const DEFAULT_EDITOR_HTML = `
  <p>블로그 본문을 작성해주세요.</p>
`;

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
  const [uploadingImages, setUploadingImages] = useState(false);
  const [uploadError, setUploadError] = useState("");

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
      MapInputBlock,
      Image.configure({
        inline: false,
        allowBase64: true,
      }),
    ],
    content: value.html,
    editorProps: {
      attributes: {
        class: "blog-editor-content",
      },
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

  const insertFiles = async (files: FileList | File[]) => {
    if (!editor) return;
    setUploadingImages(true);
    setUploadError("");
    try {
      const items = await uploadImagesToStorage(files);
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
      setUploadingImages(false);
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

  const insertMapBlock = () => {
    editor.chain().focus().insertContent({ type: "mapInputBlock" }).run();
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
        <ToolbarButton label="지도" onClick={insertMapBlock} active={false}>
          <MapPinned size={15} />
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
          이미지는 드래그/업로드, 유튜브와 지도는 툴바 버튼으로 바로 삽입하세요
        </div>

        {uploadingImages ? (
          <div
            className="absolute inset-x-0 top-[53px] z-10 px-5 py-2 text-xs font-semibold flex items-center gap-2"
            style={{ background: "rgba(234,88,12,0.12)", color: "#EA580C" }}
          >
            <LoaderCircle size={12} className="animate-spin" />
            WebP 변환 후 업로드 중...
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
            onClick={insertYouTube}
            className="pressable blog-editor-dock-button"
          >
            유튜브
          </button>
          <button
            type="button"
            onClick={insertMapBlock}
            className="pressable blog-editor-dock-button"
          >
            지도
          </button>
        </div>
      </div>
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
