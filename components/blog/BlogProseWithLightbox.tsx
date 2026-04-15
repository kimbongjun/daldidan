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

    // 각 이미지에 직접 리스너를 바인딩:
    // - 이벤트 위임(컨테이너) 방식은 <a> 래퍼가 있을 때 iOS가 앵커 네비게이션을
    //   우선 처리해 touchend가 유실되는 문제가 있음
    // - 픽셀 임계값(10px)으로 손가락 미세 떨림을 스크롤로 오판하지 않도록 처리
    const cleanups: Array<() => void> = [];

    images.forEach((img, index) => {
      img.style.cursor = 'pointer';

      let startX = 0;
      let startY = 0;
      let moved = false;

      const onTouchStart = (e: TouchEvent) => {
        startX = e.touches[0].clientX;
        startY = e.touches[0].clientY;
        moved = false;
      };

      const onTouchMove = (e: TouchEvent) => {
        const dx = Math.abs(e.touches[0].clientX - startX);
        const dy = Math.abs(e.touches[0].clientY - startY);
        if (dx > 10 || dy > 10) moved = true;
      };

      // iOS/Android: touchend로 즉각 처리 (300ms 클릭 딜레이 없음)
      // stopPropagation으로 <a> 래퍼의 앵커 이동 차단
      const onTouchEnd = (e: TouchEvent) => {
        if (moved) return;
        e.preventDefault();
        e.stopPropagation();
        setLightboxIndex(index);
      };

      // 데스크톱 fallback
      const onClick = (e: MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setLightboxIndex(index);
      };

      img.addEventListener('touchstart', onTouchStart, { passive: true });
      img.addEventListener('touchmove', onTouchMove, { passive: true });
      img.addEventListener('touchend', onTouchEnd);
      img.addEventListener('click', onClick);

      cleanups.push(() => {
        img.removeEventListener('touchstart', onTouchStart);
        img.removeEventListener('touchmove', onTouchMove);
        img.removeEventListener('touchend', onTouchEnd);
        img.removeEventListener('click', onClick);
      });
    });

    return () => {
      cleanups.forEach((fn) => fn());
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
