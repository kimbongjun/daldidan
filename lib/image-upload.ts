export async function filesToDataUrls(files: FileList | File[]) {
  const imageFiles = Array.from(files).filter((file) => file.type.startsWith("image/"));

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
