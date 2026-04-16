/**
 * 클라이언트 사이드 영수증 이미지 전처리
 * - 최대 해상도 제한 (1920px)
 * - 그레이스케일 변환
 * - 대비 강화 (텍스트 선명도 향상)
 * - JPEG 0.92 품질로 재출력
 */
export async function preprocessReceiptImage(file: File): Promise<File> {
  if (typeof window === "undefined") return file;

  return new Promise((resolve) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);

      // 1920px 초과 시 비율 유지하며 축소
      const MAX_DIM = 1920;
      let { width, height } = img;
      if (width > MAX_DIM || height > MAX_DIM) {
        const ratio = Math.min(MAX_DIM / width, MAX_DIM / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) { resolve(file); return; }

      ctx.drawImage(img, 0, 0, width, height);

      const imageData = ctx.getImageData(0, 0, width, height);
      const d = imageData.data;

      // 대비 강화 계수 (0~255, 높을수록 대비 강함 — 45 ≈ 체감 +18%)
      const CONTRAST_LEVEL = 45;
      const factor = (259 * (CONTRAST_LEVEL + 255)) / (255 * (259 - CONTRAST_LEVEL));

      for (let i = 0; i < d.length; i += 4) {
        // 루미넌스 기반 그레이스케일
        const gray = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
        // 대비 스트레치
        const enhanced = Math.max(0, Math.min(255, factor * (gray - 128) + 128));
        d[i] = enhanced;
        d[i + 1] = enhanced;
        d[i + 2] = enhanced;
        // alpha 유지
      }

      ctx.putImageData(imageData, 0, 0);

      canvas.toBlob(
        (blob) => {
          if (!blob) { resolve(file); return; }
          const newName = file.name.replace(/\.[^.]+$/, "_ocr.jpg");
          resolve(new File([blob], newName, { type: "image/jpeg" }));
        },
        "image/jpeg",
        0.92,
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(file); // 실패 시 원본 파일 그대로 사용
    };

    img.src = objectUrl;
  });
}
