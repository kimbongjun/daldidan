/**
 * 이미지를 WebP로 변환 후 Supabase Storage에 업로드하여 URL을 반환합니다.
 * - Canvas API로 클라이언트에서 WebP 변환 (Sharp 불필요)
 * - Safari/macOS에서 WebP 인코딩이 지원되지 않을 경우 JPEG로 자동 폴백
 * - FormData로 전송하므로 JSON body 크기 제한과 무관
 * - 업로드 완료 시 영구 URL을 반환하여 에디터에 <img src="url"> 로 삽입
 */

const WEBP_QUALITY = 0.82;
const MAX_DIMENSION = 2400; // 긴 쪽 최대 픽셀 (이 이상이면 비율 유지하며 축소)

interface OptimizedBlob {
  blob: Blob;
  mimeType: string;
  ext: string;
}

async function fileToOptimizedBlob(file: File): Promise<OptimizedBlob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);

      let { naturalWidth: w, naturalHeight: h } = img;
      if (w > MAX_DIMENSION || h > MAX_DIMENSION) {
        const ratio = MAX_DIMENSION / Math.max(w, h);
        w = Math.round(w * ratio);
        h = Math.round(h * ratio);
      }

      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Canvas를 초기화하지 못했습니다."));
        return;
      }
      ctx.drawImage(img, 0, 0, w, h);

      // WebP 변환 시도
      canvas.toBlob(
        (webpBlob) => {
          if (webpBlob) {
            resolve({ blob: webpBlob, mimeType: "image/webp", ext: "webp" });
            return;
          }

          // Safari/macOS에서 WebP 인코딩을 지원하지 않는 경우 JPEG로 폴백
          canvas.toBlob(
            (jpegBlob) => {
              if (jpegBlob) {
                resolve({ blob: jpegBlob, mimeType: "image/jpeg", ext: "jpg" });
              } else {
                reject(new Error("이미지 변환에 실패했습니다. 다른 이미지를 시도해 주세요."));
              }
            },
            "image/jpeg",
            WEBP_QUALITY,
          );
        },
        "image/webp",
        WEBP_QUALITY,
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("이미지를 불러오지 못했습니다."));
    };

    img.src = objectUrl;
  });
}

export async function uploadImagesToStorage(
  files: FileList | File[],
  onProgress?: (current: number, total: number) => void,
): Promise<{ url: string; name: string }[]> {
  const imageFiles = Array.from(files).filter((f) => f.type.startsWith("image/"));
  if (imageFiles.length === 0) return [];

  const results: { url: string; name: string }[] = [];

  for (let i = 0; i < imageFiles.length; i++) {
    const file = imageFiles[i];
    onProgress?.(i + 1, imageFiles.length);

    // 1. 최적화 변환 (WebP 우선, 실패 시 JPEG 폴백)
    const { blob, ext } = await fileToOptimizedBlob(file);

    // 2. FormData로 업로드 (blob.type에 실제 mimeType이 포함됨)
    const form = new FormData();
    form.append("image", blob, file.name.replace(/\.[^.]+$/, `.${ext}`));

    const res = await fetch("/api/blog/images", {
      method: "POST",
      body: form,
    });

    if (!res.ok) {
      const json = await res.json().catch(() => ({})) as { error?: string };
      throw new Error(`"${file.name}" 업로드 실패: ${json.error ?? "서버 오류"}`);
    }

    const { url } = await res.json() as { url: string };
    results.push({ url, name: file.name });
  }

  return results;
}
