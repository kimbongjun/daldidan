export async function uploadImagesToStorage(
  files: FileList | File[],
  onProgress?: (current: number, total: number) => void,
  endpoint = "/api/blog/images",
): Promise<{ url: string; name: string }[]> {
  const imageFiles = Array.from(files).filter((f) => f.type.startsWith("image/"));
  if (imageFiles.length === 0) return [];

  const results: { url: string; name: string }[] = [];

  for (let i = 0; i < imageFiles.length; i++) {
    const file = imageFiles[i];
    onProgress?.(i, imageFiles.length);

    const form = new FormData();
    form.append("image", file, file.name);

    let res: Response;
    try {
      res = await fetch(endpoint, { method: "POST", body: form });
    } catch {
      throw new Error(`"${file.name}" 업로드 실패: 네트워크 오류`);
    }

    // Content-Type이 JSON이 아니면 서버가 HTML 에러 페이지를 반환한 것
    const ct = res.headers.get("content-type") ?? "";
    if (!ct.includes("application/json")) {
      throw new Error(
        `"${file.name}" 업로드 실패: 서버 오류 (HTTP ${res.status})`,
      );
    }

    const json = await res.json().catch(() => ({}) as Record<string, unknown>);

    if (!res.ok) {
      const msg = (json as { error?: string }).error ?? "서버 오류";
      throw new Error(`"${file.name}" 업로드 실패: ${msg}`);
    }

    const { url } = json as { url: string };
    if (!url) throw new Error(`"${file.name}" 업로드 실패: URL을 받지 못했습니다.`);

    results.push({ url, name: file.name });
    onProgress?.(i + 1, imageFiles.length);
  }

  return results;
}
