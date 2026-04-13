/**
 * 이미지를 Supabase Storage에 업로드하여 URL을 반환합니다.
 * - 모든 이미지 확장자 지원 (JPEG, PNG, GIF, HEIC, HEIF, AVIF, TIFF, BMP, WebP, SVG 등)
 * - WebP 변환은 서버(sharp)에서 처리하므로 클라이언트는 원본 파일을 그대로 전송
 * - FormData로 전송하므로 JSON body 크기 제한과 무관
 * - 업로드 완료 시 영구 URL을 반환하여 에디터에 <img src="url"> 로 삽입
 */

export async function uploadImagesToStorage(
  files: FileList | File[],
  onProgress?: (current: number, total: number) => void,
): Promise<{ url: string; name: string }[]> {
  const imageFiles = Array.from(files).filter((f) => f.type.startsWith("image/"));
  if (imageFiles.length === 0) return [];

  const results: { url: string; name: string }[] = [];

  for (let i = 0; i < imageFiles.length; i++) {
    const file = imageFiles[i];
    onProgress?.(i, imageFiles.length);

    const form = new FormData();
    form.append("image", file, file.name);

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
    onProgress?.(i + 1, imageFiles.length);
  }

  return results;
}
