export interface ReceiptOcrResult {
  merchantName: string;
  location: string;
  amount: number;
  date: string;
  note: string;
  recommendedCategory: string;
  rawText: string;
}

export async function analyzeReceiptImage(file: File): Promise<ReceiptOcrResult> {
  const formData = new FormData();
  formData.append("image", file, file.name);

  const response = await fetch("/api/transactions/ocr", {
    method: "POST",
    body: formData,
  });

  const payload = await response.json().catch(() => ({})) as ReceiptOcrResult & { error?: string };

  if (!response.ok) {
    throw new Error(payload.error ?? "영수증 OCR 처리에 실패했습니다.");
  }

  return {
    merchantName: payload.merchantName ?? "",
    location: payload.location ?? "",
    amount: Number(payload.amount ?? 0),
    date: payload.date ?? "",
    note: payload.note ?? "",
    recommendedCategory: payload.recommendedCategory ?? "기타",
    rawText: payload.rawText ?? "",
  };
}
