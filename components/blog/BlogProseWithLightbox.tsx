'use client';

import { useEffect, useRef, useState } from 'react';
import Lightbox from 'yet-another-react-lightbox';
import Zoom from 'yet-another-react-lightbox/plugins/zoom';
import 'yet-another-react-lightbox/styles.css';

interface Slide {
  src: string;
  alt?: string;
}

interface Props {
  contentHtml: string;
}

export default function BlogProseWithLightbox({ contentHtml }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [lightboxIndex, setLightboxIndex] = useState(-1);
  const [slides, setSlides] = useState<Slide[]>([]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const images = Array.from(container.querySelectorAll<HTMLImageElement>('img'));
    setSlides(images.map((img) => ({ src: img.src, alt: img.alt || undefined })));

    const handlers = images.map((img, index) => {
      img.style.cursor = 'pointer'; // iOS Safari: cursor:pointer 없으면 touch→click 미발생
      const handler = () => setLightboxIndex(index);
      img.addEventListener('click', handler);
      return handler;
    });

    return () => {
      images.forEach((img, index) => {
        img.removeEventListener('click', handlers[index]);
      });
    };
  }, [contentHtml]);

  return (
    <>
      <div
        ref={containerRef}
        className="blog-prose"
        dangerouslySetInnerHTML={{ __html: contentHtml }}
      />
      <Lightbox
        open={lightboxIndex >= 0}
        index={lightboxIndex}
        close={() => setLightboxIndex(-1)}
        slides={slides}
        plugins={[Zoom]}
        zoom={{ maxZoomPixelRatio: 3 }}
      />
    </>
  );
}
