"use client";

import Image from "next/image";
import { useState } from "react";

const AUTO_THUMB_WINDOW_MS = 5 * 60 * 1000;

function makePicsumUrl(slug: string): string {
  const seed = slug.replace(/[^a-z0-9]/gi, "").slice(0, 24) || "blog";
  return `https://picsum.photos/seed/${seed}/1200/630`;
}

interface Props {
  src: string | null;
  alt: string;
  sizes: string;
  slug: string;
  publishedAt: string;
}

export default function BlogThumbnailImage({ src, alt, sizes, slug, publishedAt }: Props) {
  const [errored, setErrored] = useState(false);
  const isGenerating = !src && Date.now() - new Date(publishedAt).getTime() < AUTO_THUMB_WINDOW_MS;
  const imgSrc = errored || !src ? makePicsumUrl(slug) : src;

  if (!src && !errored) {
    // 아직 생성 안 된 경우
    return (
      <div
        className="w-full h-full flex flex-col items-center justify-center gap-2"
        style={{
          background: isGenerating
            ? "linear-gradient(135deg, rgba(99,102,241,0.12), rgba(234,88,12,0.08))"
            : "linear-gradient(135deg, rgba(234,88,12,0.08), rgba(234,88,12,0.02))",
        }}
      >
        {isGenerating ? (
          <>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="rgba(99,102,241,0.6)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2a10 10 0 1 0 10 10" /><path d="M12 6v6l4 2" />
            </svg>
            <span style={{ fontSize: "0.65rem", color: "rgba(99,102,241,0.7)", fontWeight: 700 }}>썸네일 생성 중...</span>
          </>
        ) : (
          <Image
            src={makePicsumUrl(slug)}
            alt={alt}
            fill
            sizes={sizes}
            className="object-cover"
            unoptimized
          />
        )}
      </div>
    );
  }

  return (
    <Image
      src={imgSrc}
      alt={alt}
      fill
      sizes={sizes}
      className="object-cover"
      unoptimized
      onError={() => setErrored(true)}
    />
  );
}
