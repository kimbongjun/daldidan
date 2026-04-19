const BLOG_MAX_DIM = 2400;     // 블로그 이미지 최대 해상도
const BLOG_MAX_BYTES = 4 * 1024 * 1024;  // 4 MB — Vercel 4.5 MB 제한 이내
const BLOG_QUALITY_INIT = 0.85;

/**
 * 블로그 이미지 전처리 — 업로드 전 클라이언트에서 리사이즈·압축
 * - 2400px 초과 시 비율 유지 축소
 * - WebP 변환 (미지원 브라우저는 JPEG 폴백)
 * - 4 MB 초과 시 품질을 낮춰가며 반복 압축
 * - SVG / GIF는 원본 그대로 반환
 */
export async function preprocessBlogImage(file: File): Promise<File> {
  if (typeof window === "undefined") return file;

  // SVG는 변환 불가, GIF는 애니메이션 유지 위해 그대로
  if (file.type === "image/svg+xml" || file.type === "image/gif") return file;

  // 이미 작으면 압축 없이 반환
  if (file.size <= BLOG_MAX_BYTES) {
    return new Promise((resolve) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        URL.revokeObjectURL(url);
        if (img.width <= BLOG_MAX_DIM && img.height <= BLOG_MAX_DIM) {
          resolve(file);
          return;
        }
        resizeAndCompress(img, file).then(resolve);
      };
      img.onerror = () => { URL.revokeObjectURL(url); resolve(file); };
      img.src = url;
    });
  }

  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => { URL.revokeObjectURL(url); resizeAndCompress(img, file).then(resolve); };
    img.onerror = () => { URL.revokeObjectURL(url); resolve(file); };
    img.src = url;
  });
}

async function resizeAndCompress(img: HTMLImageElement, original: File): Promise<File> {
  const supportsWebP = await checkWebPSupport();
  const mime = supportsWebP ? "image/webp" : "image/jpeg";
  const ext  = supportsWebP ? "webp" : "jpg";

  let { width, height } = img;
  if (width > BLOG_MAX_DIM || height > BLOG_MAX_DIM) {
    const ratio = Math.min(BLOG_MAX_DIM / width, BLOG_MAX_DIM / height);
    width  = Math.round(width  * ratio);
    height = Math.round(height * ratio);
  }

  const canvas = document.createElement("canvas");
  canvas.width  = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return original;
  ctx.drawImage(img, 0, 0, width, height);

  // 4 MB 이하가 될 때까지 품질 감소
  let quality = BLOG_QUALITY_INIT;
  let blob: Blob | null = null;
  while (quality >= 0.4) {
    blob = await canvasToBlob(canvas, mime, quality);
    if (blob && blob.size <= BLOG_MAX_BYTES) break;
    quality -= 0.1;
  }

  if (!blob || blob.size > BLOG_MAX_BYTES) {
    // 품질을 최소로 내려도 초과하면 해상도를 절반으로
    canvas.width  = Math.round(width  / 2);
    canvas.height = Math.round(height / 2);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    blob = await canvasToBlob(canvas, mime, 0.7) ?? new Blob([await original.arrayBuffer()]);
  }

  const newName = original.name.replace(/\.[^.]+$/, `.${ext}`);
  return new File([blob], newName, { type: mime });
}

function canvasToBlob(canvas: HTMLCanvasElement, mime: string, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, mime, quality));
}

let _webpCache: boolean | null = null;
async function checkWebPSupport(): Promise<boolean> {
  if (_webpCache !== null) return _webpCache;
  return new Promise((resolve) => {
    const img = new Image();
    img.onload  = () => { _webpCache = true;  resolve(true); };
    img.onerror = () => { _webpCache = false; resolve(false); };
    img.src = "data:image/webp;base64,UklGRiIAAABXRUJQVlA4IBYAAAAwAQCdASoBAAEADsD+JaQAA3AAAAAA";
  });
}

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
