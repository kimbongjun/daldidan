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
  Link2,
  List,
  ListOrdered,
  MapPinned,
  Quote,
  Redo2,
  Undo2,
  Video,
} from "lucide-react";
import { EmbedBlock, createGoogleMapEmbedSrc, parseYouTubeEmbedUrl } from "@/lib/blog-embeds";
import { filesToDataUrls } from "@/lib/image-upload";

export const DEFAULT_EDITOR_HTML = `
  <h2>한눈에 보는 요약</h2>
  <p>이 글에서 가장 먼저 전달하고 싶은 핵심을 짧게 정리해보세요.</p>
  <ul>
    <li>배경과 맥락</li>
    <li>핵심 포인트</li>
    <li>실행 팁 또는 체크리스트</li>
  </ul>
  <blockquote>중요한 메시지나 인상 깊은 문장을 남겨보세요.</blockquote>
  <p>본문을 이어서 작성해보세요.</p>
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
      Image.configure({
        inline: false,
        allowBase64: true,
      }),
    ],
    content: value.html || DEFAULT_EDITOR_HTML,
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

    try {
      const items = await filesToDataUrls(files);
      const chain = editor.chain().focus();

      items.forEach(({ src, name }) => {
        chain.setImage({ src, alt: name });
        chain.createParagraphNear();
      });

      chain.run();
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
      attrs: {
        kind: "youtube",
        src,
        title: "YouTube video",
      },
    }).run();
  };

  const insertGoogleMap = () => {
    const place = window.prompt("지역명 또는 장소명을 입력하세요");
    if (!place?.trim()) return;

    const src = createGoogleMapEmbedSrc(place);
    if (!src) {
      window.alert("지도를 삽입하려면 NEXT_PUBLIC_GOOGLE_MAPS_EMBED_API_KEY 환경 변수가 필요합니다.");
      return;
    }

    editor.chain().focus().insertContent({
      type: "embedBlock",
      attrs: {
        kind: "map",
        src,
        title: `${place.trim()} 지도`,
      },
    }).run();
  };

  return (
    <div className="flex flex-col gap-3">
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
        <ToolbarButton label="지도" onClick={insertGoogleMap} active={false}>
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

      <div
        className="rounded-[1.75rem] overflow-hidden relative"
        style={{
          border: `1px solid ${isDragging ? "rgba(234,88,12,0.4)" : "var(--border)"}`,
          background: "var(--bg-card)",
        }}
        onDragEnter={(event) => {
          event.preventDefault();
          setIsDragging(true);
        }}
        onDragOver={(event) => {
          event.preventDefault();
          setIsDragging(true);
        }}
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
          Notion-like template · 이미지는 드래그/업로드, 유튜브와 지도는 링크/지역명으로 삽입하세요
        </div>
        {uploadingImages ? (
          <div
            className="absolute inset-x-0 top-[53px] z-10 px-5 py-2 text-xs font-semibold"
            style={{ background: "rgba(234,88,12,0.12)", color: "#EA580C" }}
          >
            이미지를 업로드하는 중입니다...
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
      </div>
    </div>
  );
}

function ToolbarButton({
  active,
  children,
  label,
  onClick,
}: {
  active: boolean;
  children: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="pressable w-9 h-9 rounded-xl flex items-center justify-center transition-colors"
      style={{
        background: active ? "rgba(234,88,12,0.16)" : "var(--bg-input)",
        color: active ? "#EA580C" : "var(--text-muted)",
        border: `1px solid ${active ? "rgba(234,88,12,0.35)" : "var(--border)"}`,
      }}
    >
      {children}
    </button>
  );
}
