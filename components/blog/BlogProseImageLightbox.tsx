"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createRoot, type Root } from "react-dom/client";
import ImageLightbox from "@/components/blog/ImageLightbox";
import CloudflareStreamPlayer from "@/components/blog/CloudflareStreamPlayer";

interface Props {
  html: string;
}

export default function BlogProseImageLightbox({ html }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [lightbox, setLightbox] = useState<{ urls: string[]; index: number } | null>(null);

  const onPrev = useCallback(() =>
    setLightbox((prev) => prev ? { ...prev, index: (prev.index - 1 + prev.urls.length) % prev.urls.length } : prev), []);
  const onNext = useCallback(() =>
    setLightbox((prev) => prev ? { ...prev, index: (prev.index + 1) % prev.urls.length } : prev), []);
  const onClose = useCallback(() => setLightbox(null), []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const playerRoots: Root[] = [];

    const streamBlocks = Array.from(container.querySelectorAll<HTMLElement>('div[data-stream-video="true"]'));
    streamBlocks.forEach((block) => {
      const uid = block.dataset.videoUid?.trim();
      if (!uid) return;

      const mountNode = document.createElement("div");
      mountNode.className = "blog-stream-video-react";
      block.replaceChildren(mountNode);

      const root = createRoot(mountNode);
      root.render(
        <CloudflareStreamPlayer
          uid={uid}
          title={block.dataset.videoTitle || "업로드한 동영상"}
          posterTime={block.dataset.posterTime || "1s"}
        />,
      );
      playerRoots.push(root);
    });

    // 본문 내 모든 img src 수집
    const imgs = Array.from(container.querySelectorAll<HTMLImageElement>("img"))
      .filter((img) => !img.closest('[data-stream-video="true"]'));
    const urls = imgs.map((img) => img.src).filter(Boolean);

    if (urls.length === 0) return;

    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName !== "IMG") return;
      if (target.closest('[data-stream-video="true"]')) return;
      const clickedSrc = (target as HTMLImageElement).src;
      const index = urls.indexOf(clickedSrc);
      if (index === -1) return;
      setLightbox({ urls, index });
    };

    container.addEventListener("click", handleClick);
    return () => {
      container.removeEventListener("click", handleClick);
      playerRoots.forEach((root) => root.unmount());
    };
  }, [html]);

  return (
    <>
      <div
        ref={containerRef}
        className="blog-prose"
        dangerouslySetInnerHTML={{ __html: html }}
      />
      {lightbox && (
        <ImageLightbox
          urls={lightbox.urls}
          index={lightbox.index}
          onClose={onClose}
          onPrev={onPrev}
          onNext={onNext}
        />
      )}
    </>
  );
}
