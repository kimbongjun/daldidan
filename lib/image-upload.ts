/**
 * 이미지를 WebP로 변환 후 Supabase Storage에 업로드하여 URL을 반환합니다.
 * - Canvas API로 클라이언트에서 WebP 변환 (Sharp 불필요)
 * - FormData로 전송하므로 JSON body 크기 제한과 무관
 * - 업로드 완료 시 영구 URL을 반환하여 에디터에 <img src="url"> 로 삽입
 */

const WEBP_QUALITY = 0.82;
const MAX_DIMENSION = 2400; // 긴 쪽 최대 픽셀 (이 이상이면 비율 유지하며 축소)

async function fileToWebPBlob(file: File): Promise<Blob> {
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

      canvas.toBlob(
        (blob) => {
          if (blob) resolve(blob);
          else reject(new Error("WebP 변환에 실패했습니다."));
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
): Promise<{ url: string; name: string }[]> {
  const imageFiles = Array.from(files).filter((f) => f.type.startsWith("image/"));
  if (imageFiles.length === 0) return [];

  return Promise.all(
    imageFiles.map(async (file) => {
      // 1. WebP 변환
      const blob = await fileToWebPBlob(file);

      // 2. FormData로 업로드
      const form = new FormData();
      form.append("image", blob, file.name.replace(/\.[^.]+$/, ".webp"));

      const res = await fetch("/api/blog/images", {
        method: "POST",
        body: form,
      });

      if (!res.ok) {
        const json = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(json.error ?? "이미지 업로드에 실패했습니다.");
      }

      const { url } = await res.json() as { url: string };
      return { url, name: file.name };
    }),
  );
}
