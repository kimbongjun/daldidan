"use client";

import { Node, mergeAttributes } from "@tiptap/core";
import { NodeViewWrapper, ReactNodeViewRenderer } from "@tiptap/react";
import type { NodeViewProps } from "@tiptap/react";
import { X } from "lucide-react";

export interface GalleryImage {
  src: string;
  alt: string;
}

function ImageGalleryNodeView({ node, editor, getPos, deleteNode }: NodeViewProps) {
  const images: GalleryImage[] = Array.isArray(node.attrs.images) ? (node.attrs.images as GalleryImage[]) : [];

  const removeImage = (index: number) => {
    if (!editor.isEditable) return;
    const pos = typeof getPos === "function" ? getPos() : undefined;
    if (pos === undefined) return;

    const newImages = images.filter((_, i) => i !== index);

    if (newImages.length === 0) {
      deleteNode();
      return;
    }

    if (newImages.length === 1) {
      editor.commands.command(({ tr, state }) => {
        const nodePos = typeof getPos === "function" ? getPos() : undefined;
        if (nodePos === undefined) return false;
        const imageNode = state.schema.nodes.image?.create({
          src: newImages[0].src,
          alt: newImages[0].alt,
        });
        if (!imageNode) return false;
        tr.replaceWith(nodePos, nodePos + node.nodeSize, imageNode);
        return true;
      });
      return;
    }

    editor.commands.command(({ tr }) => {
      const nodePos = typeof getPos === "function" ? getPos() : undefined;
      if (nodePos === undefined) return false;
      tr.setNodeMarkup(nodePos, undefined, { ...node.attrs, images: newImages });
      return true;
    });
  };

  return (
    <NodeViewWrapper>
      <div
        data-type="image-gallery"
        className="blog-image-gallery-editor"
        contentEditable={false}
      >
        <div className="blog-image-gallery-grid">
          {images.map((img, i) => (
            <div key={`${img.src}-${i}`} className="blog-image-gallery-item">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={img.src} alt={img.alt} draggable={false} />
              {editor.isEditable && (
                <button
                  type="button"
                  className="blog-image-gallery-remove"
                  onClick={(e) => { e.stopPropagation(); removeImage(i); }}
                  title="갤러리에서 제거"
                >
                  <X size={12} />
                </button>
              )}
            </div>
          ))}
        </div>
        {editor.isEditable && (
          <p className="blog-image-gallery-label">
            갤러리 — 이미지 {images.length}장 · 이미지를 다른 이미지 위로 드래그하면 갤러리에 추가됩니다
          </p>
        )}
      </div>
    </NodeViewWrapper>
  );
}

export const ImageGalleryExtension = Node.create({
  name: "imageGallery",
  group: "block",
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      images: {
        default: [] as GalleryImage[],
        parseHTML: (el) => {
          try {
            const raw = el.getAttribute("data-gallery-images");
            if (!raw) return [];
            return JSON.parse(raw) as GalleryImage[];
          } catch {
            return [];
          }
        },
        renderHTML: (attrs: { images?: GalleryImage[] }) => ({
          "data-gallery-images": JSON.stringify(attrs.images ?? []),
        }),
      },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-type="image-gallery"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    const raw = HTMLAttributes["data-gallery-images"] as string | undefined;
    const images: GalleryImage[] = (() => {
      try { return raw ? (JSON.parse(raw) as GalleryImage[]) : []; }
      catch { return []; }
    })();

    const imgNodes = images.map((img): [string, Record<string, string>] => [
      "img", { src: img.src, alt: img.alt ?? "" },
    ]);

    return [
      "div",
      mergeAttributes(HTMLAttributes, {
        "data-type": "image-gallery",
        class: "blog-image-gallery",
      }),
      ...imgNodes,
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(ImageGalleryNodeView);
  },
});
