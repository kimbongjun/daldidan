const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

export async function filesToDataUrls(files: FileList | File[]) {
  const imageFiles = Array.from(files).filter((file) => file.type.startsWith("image/"));

  // 5MB 초과 파일은 거부
  for (const file of imageFiles) {
    if (file.size > MAX_IMAGE_SIZE_BYTES) {
      throw new Error(
        `"${file.name}" 파일이 5MB를 초과합니다 (${(file.size / 1024 / 1024).toFixed(1)}MB). 5MB 이하의 이미지를 사용해주세요.`,
      );
    }
  }

  return Promise.all(
    imageFiles.map(
      (file) =>
        new Promise<{ src: string; name: string }>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => {
            if (typeof reader.result !== "string") {
              reject(new Error("이미지를 읽지 못했습니다."));
              return;
            }
            resolve({ src: reader.result, name: file.name });
          };
          reader.onerror = () => reject(new Error("이미지를 읽지 못했습니다."));
          reader.readAsDataURL(file);
        }),
    ),
  );
}
