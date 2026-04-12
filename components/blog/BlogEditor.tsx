"use client";

import { useEffect, useRef, useState } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import {
  ArrowLeft,
  CheckCircle2,
  Bold,
  Code2,
  Heading1,
  Heading2,
  Italic,
  LoaderCircle,
  Link2,
  List,
  ListOrdered,
  MapPinned,
  MapPin,
  Quote,
  Redo2,
  Search,
  Undo2,
  Video,
  X,
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

interface PlaceCandidate {
  id: string;
  name: string;
  formattedAddress: string;
  lat: number;
  lng: number;
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
  const [mapModalOpen, setMapModalOpen] = useState(false);
  const [mapQuery, setMapQuery] = useState("");
  const [mapCandidates, setMapCandidates] = useState<PlaceCandidate[]>([]);
  const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(null);
  const [mapSearching, setMapSearching] = useState(false);
  const [mapError, setMapError] = useState("");
  const [isCompactMapLayout, setIsCompactMapLayout] = useState(false);
  const [mapView, setMapView] = useState<"search" | "preview">("search");
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

  useEffect(() => {
    if (typeof window === "undefined") return;

    const mediaQuery = window.matchMedia("(max-width: 1023px)");
    const syncLayout = () => setIsCompactMapLayout(mediaQuery.matches);

    syncLayout();
    mediaQuery.addEventListener("change", syncLayout);
    return () => mediaQuery.removeEventListener("change", syncLayout);
  }, []);

  useEffect(() => {
    if (!mapModalOpen || typeof document === "undefined") return;

    const previousOverflow = document.body.style.overflow;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMapModalOpen(false);
        setMapSearching(false);
        setMapError("");
        setMapCandidates([]);
        setSelectedPlaceId(null);
        setMapView("search");
      }
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [mapModalOpen]);

  const selectedPlace = mapCandidates.find((place) => place.id === selectedPlaceId) ?? null;
  const selectedMapPreview = selectedPlace ? createGoogleMapEmbedSrc(selectedPlace.formattedAddress) : null;
  const selectedCoordinates = selectedPlace
    ? `${selectedPlace.lat.toFixed(6)}, ${selectedPlace.lng.toFixed(6)}`
    : null;

  const insertFiles = async (files: FileList | File[]) => {
    if (!editor) return;

    editor.chain().focus().run();
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

  const openMapModal = () => {
    setMapModalOpen(true);
    setMapError("");
    setMapView("search");
  };

  const closeMapModal = () => {
    setMapModalOpen(false);
    setMapSearching(false);
    setMapError("");
    setMapCandidates([]);
    setSelectedPlaceId(null);
    setMapView("search");
  };

  const searchPlaceCandidates = async () => {
    const query = mapQuery.trim();
    if (!query) {
      setMapError("장소명을 입력해주세요.");
      return;
    }

    setMapSearching(true);
    setMapError("");
    setSelectedPlaceId(null);
    setMapView("search");

    try {
      const response = await fetch("/api/maps/place-search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      });

      const payload = await response.json() as { places?: PlaceCandidate[]; error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? "장소 검색에 실패했습니다.");
      }

      const places = payload.places ?? [];
      setMapCandidates(places);
      setSelectedPlaceId(places[0]?.id ?? null);
      if (places.length === 0) {
        setMapError("검색된 장소가 없습니다. 장소명을 조금 더 구체적으로 입력해보세요.");
      }
    } catch (error) {
      setMapCandidates([]);
      setSelectedPlaceId(null);
      setMapError(error instanceof Error ? error.message : "장소 검색에 실패했습니다.");
    } finally {
      setMapSearching(false);
    }
  };

  const insertSelectedMap = () => {
    if (!selectedPlace) return;
    if (!selectedMapPreview) {
      setMapError("지도를 삽입하려면 NEXT_PUBLIC_GOOGLE_MAPS_EMBED_API_KEY 환경 변수가 필요합니다.");
      return;
    }

    editor?.chain().focus().insertContent({
      type: "embedBlock",
      attrs: {
        kind: "map",
        src: selectedMapPreview,
        title: `${selectedPlace.name} 지도`,
      },
    }).run();

    closeMapModal();
  };

  const renderSearchResults = (compact = false) => (
    <div className={`flex flex-col gap-2 ${compact ? "" : "min-h-0 overflow-auto scrollbar-hide"}`}>
      {mapSearching ? (
        <div className="rounded-2xl p-4 flex items-center gap-3" style={{ background: "var(--bg-input)", color: "var(--text-muted)" }}>
          <LoaderCircle size={16} className="animate-spin" />
          <span className="text-sm">좌표를 찾고 있어요...</span>
        </div>
      ) : mapCandidates.length === 0 ? (
        <div className="rounded-2xl p-4 text-sm" style={{ background: "var(--bg-input)", color: "var(--text-muted)" }}>
          검색 결과가 여기에 표시됩니다.
        </div>
      ) : (
        mapCandidates.map((place) => {
          const selected = place.id === selectedPlaceId;
          return (
            <button
              key={place.id}
              type="button"
              onClick={() => setSelectedPlaceId(place.id)}
              className="pressable text-left rounded-2xl p-4"
              style={{
                background: selected ? "rgba(234,88,12,0.12)" : "var(--bg-input)",
                border: `1px solid ${selected ? "rgba(234,88,12,0.35)" : "var(--border)"}`,
              }}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>{place.name}</p>
                    {selected ? (
                      <span
                        className="px-2 py-1 rounded-full text-[0.68rem] font-semibold"
                        style={{ background: "rgba(234,88,12,0.12)", color: "#EA580C" }}
                      >
                        선택됨
                      </span>
                    ) : null}
                  </div>
                  <p className="text-xs mt-1 leading-relaxed" style={{ color: "var(--text-muted)" }}>{place.formattedAddress}</p>
                  <p className="text-xs mt-2" style={{ color: selected ? "#EA580C" : "var(--text-muted)" }}>
                    좌표: {place.lat.toFixed(6)}, {place.lng.toFixed(6)}
                  </p>
                </div>
                {selected ? <CheckCircle2 size={16} style={{ color: "#EA580C" }} /> : <MapPin size={16} style={{ color: "var(--text-muted)" }} />}
              </div>
            </button>
          );
        })
      )}
    </div>
  );

  const renderPreviewSurface = (heightClassName: string) => (
    <div className="rounded-2xl overflow-hidden" style={{ background: "var(--bg-input)", border: "1px solid var(--border)" }}>
      <div className="px-4 py-3 text-sm font-semibold" style={{ color: "var(--text-primary)", borderBottom: "1px solid var(--border)" }}>
        지도 미리보기
      </div>
      <div className={heightClassName} style={{ background: "var(--bg-input)" }}>
        {selectedPlace && selectedMapPreview ? (
          <iframe
            src={selectedMapPreview}
            title={`${selectedPlace.name} 지도 미리보기`}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            className="w-full h-full"
            style={{ border: 0 }}
          />
        ) : (
          <div className="h-full min-h-[260px] flex items-center justify-center text-sm text-center px-6" style={{ color: "var(--text-muted)" }}>
            검색 후 장소를 선택하면 이 영역에 실제 구글 지도가 표시됩니다.
          </div>
        )}
      </div>
    </div>
  );

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
        <ToolbarButton label="지도" onClick={openMapModal} active={false}>
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
          이미지는 드래그/업로드, 유튜브와 지도는 링크/지역명으로 삽입하세요
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
            onClick={openMapModal}
            className="pressable blog-editor-dock-button"
          >
            지도
          </button>
        </div>
      </div>

      {mapModalOpen ? (
        <div
          className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center p-0 sm:p-4"
          style={{ background: "rgba(15,15,20,0.7)", backdropFilter: "blur(10px)" }}
          onClick={closeMapModal}
        >
          <div
            className="w-full max-w-[1040px] overflow-hidden rounded-t-[1.75rem] sm:rounded-[1.75rem] h-[100dvh] sm:h-auto sm:max-h-[92vh] flex flex-col"
            style={{ background: "var(--bg-card)", border: "1px solid var(--border)", boxShadow: "var(--shadow-card)" }}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="blog-map-modal-header flex items-center justify-between gap-3 px-4 sm:px-5 py-4 shrink-0" style={{ borderBottom: "1px solid var(--border)" }}>
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: "#EA580C" }}>Google Map Search</p>
                <h3 className="text-base sm:text-lg font-black" style={{ color: "var(--text-primary)" }}>장소 검색 후 지도를 확인하고 삽입하세요</h3>
                {isCompactMapLayout ? (
                  <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
                    {mapView === "search" ? "1단계: 장소 선택" : "2단계: 지도 확인 후 삽입"}
                  </p>
                ) : null}
              </div>
              <button
                type="button"
                onClick={closeMapModal}
                className="pressable w-10 h-10 rounded-2xl flex items-center justify-center"
                style={{ background: "var(--bg-input)", color: "var(--text-muted)", border: "1px solid var(--border)" }}
              >
                <X size={16} />
              </button>
            </div>

            {isCompactMapLayout ? (
              mapView === "search" ? (
                <div className="flex-1 min-h-0 overflow-auto px-4 sm:px-5 pt-4 pb-[calc(6rem+env(safe-area-inset-bottom))]">
                  <div className="flex flex-col gap-4">
                    <div className="rounded-[1.5rem] p-4 flex flex-col gap-4" style={{ background: "var(--bg-input)", border: "1px solid var(--border)" }}>
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: "#EA580C" }}>Step 1</p>
                        <h4 className="text-base font-black mt-1" style={{ color: "var(--text-primary)" }}>장소를 먼저 고르세요</h4>
                      </div>

                      <div className="flex flex-col gap-2">
                        <input
                          value={mapQuery}
                          onChange={(event) => setMapQuery(event.target.value)}
                          onKeyDown={(event) => {
                            if (event.key === "Enter") {
                              event.preventDefault();
                              void searchPlaceCandidates();
                            }
                          }}
                          placeholder="예: 성수동 서울숲, 부산 해운대"
                          className="w-full"
                          style={{
                            background: "var(--bg-card)",
                            border: "1px solid var(--border)",
                            borderRadius: "1rem",
                            padding: "0.95rem 1rem",
                            fontSize: "0.95rem",
                            color: "var(--text-primary)",
                            outline: "none",
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => void searchPlaceCandidates()}
                          className="pressable h-12 rounded-2xl font-semibold text-white flex items-center justify-center gap-2"
                          style={{ background: "#EA580C" }}
                        >
                          {mapSearching ? <LoaderCircle size={16} className="animate-spin" /> : <Search size={16} />}
                          <span>장소 검색</span>
                        </button>
                      </div>

                      <div className="rounded-2xl p-3" style={{ background: "rgba(234,88,12,0.08)", color: "var(--text-muted)" }}>
                        <p className="text-xs leading-relaxed">
                          검색 결과 중 하나를 고른 뒤 다음 단계에서 지도를 크게 확인하고 본문에 넣을 수 있어요.
                        </p>
                      </div>

                      {selectedPlace ? (
                        <div className="rounded-2xl p-4" style={{ background: "var(--bg-card)", border: "1px solid rgba(234,88,12,0.22)" }}>
                          <p className="text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: "#EA580C" }}>Selected</p>
                          <p className="text-sm font-semibold mt-2" style={{ color: "var(--text-primary)" }}>{selectedPlace.name}</p>
                          <p className="text-xs mt-1 leading-relaxed" style={{ color: "var(--text-muted)" }}>{selectedPlace.formattedAddress}</p>
                        </div>
                      ) : null}

                      {mapError ? (
                        <div className="rounded-2xl p-3 text-sm" style={{ background: "rgba(244,63,94,0.12)", color: "#F43F5E" }}>
                          {mapError}
                        </div>
                      ) : null}
                    </div>

                    <div className="flex flex-col gap-3">
                      <div className="px-1 flex items-center justify-between gap-3">
                        <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>검색 결과</p>
                        <p className="text-xs" style={{ color: "var(--text-muted)" }}>{mapCandidates.length}개 장소</p>
                      </div>
                      {renderSearchResults(true)}
                    </div>
                  </div>

                  <div className="blog-map-modal-mobile-action">
                    <div className="min-w-0">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: "#EA580C" }}>Next</p>
                      <p className="text-sm font-semibold truncate" style={{ color: "var(--text-primary)" }}>
                        {selectedPlace ? selectedPlace.name : "미리볼 장소를 선택하세요"}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setMapView("preview")}
                      disabled={!selectedPlace}
                      className="pressable px-4 py-3 rounded-2xl font-semibold text-white disabled:opacity-45"
                      style={{ background: "#EA580C" }}
                    >
                      지도 확인
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex-1 min-h-0 overflow-auto px-4 sm:px-5 pt-4 pb-[calc(6rem+env(safe-area-inset-bottom))]">
                  <div className="flex flex-col gap-4">
                    <div className="rounded-[1.5rem] p-4 flex items-start gap-3" style={{ background: "var(--bg-input)", border: "1px solid var(--border)" }}>
                      <button
                        type="button"
                        onClick={() => setMapView("search")}
                        className="pressable w-10 h-10 rounded-2xl shrink-0 flex items-center justify-center"
                        style={{ background: "var(--bg-card)", color: "var(--text-muted)", border: "1px solid var(--border)" }}
                      >
                        <ArrowLeft size={16} />
                      </button>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: "#EA580C" }}>Step 2</p>
                        <h4 className="text-base font-black mt-1" style={{ color: "var(--text-primary)" }}>
                          {selectedPlace ? selectedPlace.name : "선택된 장소 없음"}
                        </h4>
                        <p className="text-xs mt-1 leading-relaxed" style={{ color: "var(--text-muted)" }}>
                          {selectedPlace ? selectedPlace.formattedAddress : "검색 결과로 돌아가 장소를 선택해 주세요."}
                        </p>
                      </div>
                    </div>

                    {renderPreviewSurface("min-h-[48svh]")}

                    <div className="rounded-[1.5rem] p-4 flex flex-col gap-2" style={{ background: "var(--bg-input)", border: "1px solid var(--border)" }}>
                      <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>선택 정보</p>
                      <p className="text-xs leading-relaxed" style={{ color: "var(--text-muted)" }}>
                        {selectedPlace ? selectedPlace.formattedAddress : "선택된 장소가 없습니다."}
                      </p>
                      <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                        {selectedCoordinates ? `좌표: ${selectedCoordinates}` : "좌표 정보가 여기에 표시됩니다."}
                      </p>
                    </div>
                  </div>

                  <div className="blog-map-modal-mobile-action blog-map-modal-mobile-action-double">
                    <button
                      type="button"
                      onClick={() => setMapView("search")}
                      className="pressable px-4 py-3 rounded-2xl font-semibold"
                      style={{ background: "var(--bg-input)", color: "var(--text-primary)", border: "1px solid var(--border)" }}
                    >
                      다른 장소 보기
                    </button>
                    <button
                      type="button"
                      onClick={insertSelectedMap}
                      disabled={!selectedPlace || !selectedMapPreview}
                      className="pressable px-4 py-3 rounded-2xl font-semibold text-white disabled:opacity-45"
                      style={{ background: "#EA580C" }}
                    >
                      지도 삽입
                    </button>
                  </div>
                </div>
              )
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-[360px_minmax(0,1fr)] gap-0 flex-1 min-h-0 overflow-hidden">
                <div className="blog-map-modal-results p-4 sm:p-5 flex flex-col gap-4 min-h-0 overflow-auto">
                  <div className="rounded-[1.5rem] p-4 flex flex-col gap-4" style={{ background: "var(--bg-input)", border: "1px solid var(--border)" }}>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: "#EA580C" }}>Search</p>
                      <h4 className="text-base font-black mt-1" style={{ color: "var(--text-primary)" }}>후보 장소를 고르고 오른쪽에서 확인하세요</h4>
                    </div>

                    <div className="flex gap-2">
                      <input
                        value={mapQuery}
                        onChange={(event) => setMapQuery(event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter") {
                            event.preventDefault();
                            void searchPlaceCandidates();
                          }
                        }}
                        placeholder="예: 성수동 서울숲, 부산 해운대"
                        className="flex-1"
                        style={{
                          background: "var(--bg-card)",
                          border: "1px solid var(--border)",
                          borderRadius: "1rem",
                          padding: "0.9rem 1rem",
                          fontSize: "0.95rem",
                          color: "var(--text-primary)",
                          outline: "none",
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => void searchPlaceCandidates()}
                        className="pressable px-4 rounded-2xl font-semibold text-white flex items-center justify-center gap-2"
                        style={{ background: "#EA580C" }}
                      >
                        {mapSearching ? <LoaderCircle size={16} className="animate-spin" /> : <Search size={16} />}
                        <span>검색</span>
                      </button>
                    </div>

                    <div className="rounded-2xl p-3" style={{ background: "rgba(234,88,12,0.08)", color: "var(--text-muted)" }}>
                      <p className="text-xs leading-relaxed">
                        장소명을 입력하면 후보 장소와 좌표를 확인할 수 있어요. 원하는 장소를 선택한 뒤 오른쪽 미리보기에서 지도를 삽입하세요.
                      </p>
                    </div>

                    {mapError ? (
                      <div className="rounded-2xl p-3 text-sm" style={{ background: "rgba(244,63,94,0.12)", color: "#F43F5E" }}>
                        {mapError}
                      </div>
                    ) : null}
                  </div>

                  {renderSearchResults()}
                </div>

                <div className="blog-map-modal-preview p-4 sm:p-5 flex flex-col gap-4 min-h-0 overflow-auto">
                  {renderPreviewSurface("min-h-[320px]")}

                  <div className="rounded-[1.5rem] p-4 flex flex-col gap-4" style={{ background: "var(--bg-input)", border: "1px solid var(--border)" }}>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: "#EA580C" }}>Selected Place</p>
                      <p className="text-sm font-semibold mt-2" style={{ color: "var(--text-primary)" }}>
                        {selectedPlace ? selectedPlace.name : "선택된 장소 없음"}
                      </p>
                      <p className="text-xs mt-1 leading-relaxed" style={{ color: "var(--text-muted)" }}>
                        {selectedPlace ? selectedPlace.formattedAddress : "왼쪽에서 검색 결과를 선택해 주세요."}
                      </p>
                    </div>

                    <div className="rounded-2xl p-3" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
                      <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                        {selectedCoordinates ? `좌표: ${selectedCoordinates}` : "좌표 정보가 여기에 표시됩니다."}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={insertSelectedMap}
                      disabled={!selectedPlace || !selectedMapPreview}
                      className="pressable w-full px-4 py-3 rounded-2xl font-semibold text-white disabled:opacity-45"
                      style={{ background: "#EA580C" }}
                    >
                      지도 삽입
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : null}
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
