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

    images.forEach((img) => {
      img.style.cursor = 'pointer';
    });

    // touchmove 감지 — 스와이프(스크롤)와 탭을 구분
    let touchMoved = false;
    const onTouchStart = () => { touchMoved = false; };
    const onTouchMove = () => { touchMoved = true; };

    // iOS/Android: touchend로 즉각 처리 (300ms 클릭 딜레이 없음)
    // <a> 래퍼가 있어도 preventDefault()로 앵커 이동 차단
    const onTouchEnd = (e: TouchEvent) => {
      if (touchMoved) return;
      const target = e.target as HTMLElement;
      if (target.tagName !== 'IMG') return;
      e.preventDefault();
      const index = images.indexOf(target as HTMLImageElement);
      if (index !== -1) setLightboxIndex(index);
    };

    // 데스크톱 fallback
    const onClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName !== 'IMG') return;
      e.preventDefault();
      const index = images.indexOf(target as HTMLImageElement);
      if (index !== -1) setLightboxIndex(index);
    };

    container.addEventListener('touchstart', onTouchStart, { passive: true });
    container.addEventListener('touchmove', onTouchMove, { passive: true });
    container.addEventListener('touchend', onTouchEnd);
    container.addEventListener('click', onClick);

    return () => {
      container.removeEventListener('touchstart', onTouchStart);
      container.removeEventListener('touchmove', onTouchMove);
      container.removeEventListener('touchend', onTouchEnd);
      container.removeEventListener('click', onClick);
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
