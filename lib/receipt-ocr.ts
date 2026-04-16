"use client";

let workerPromise: Promise<{
  recognize: (image: string | File | Blob) => Promise<{ data: { text: string } }>;
}> | null = null;

interface ReceiptOcrResult {
  merchantName: string;
  location: string;
  amount: number;
  date: string;
  note: string;
  recommendedCategory: string;
  rawText: string;
}

function scoreTextQuality(text: string) {
  const normalized = text.replace(/\s+/g, "");
  if (!normalized) return 0;

  const hangulMatches = normalized.match(/[가-힣]/g)?.length ?? 0;
  const digitMatches = normalized.match(/\d/g)?.length ?? 0;
  const lineBreaks = text.split("\n").filter((line) => line.trim().length > 0).length;
  return hangulMatches * 3 + digitMatches * 2 + lineBreaks;
}

function normalizeOcrText(text: string) {
  return text
    .replace(/[Oo]/g, "0")
    .replace(/[Il|]/g, "1")
    .replace(/[Ss]/g, "5")
    .replace(/[B]/g, "8")
    .replace(/[,，]/g, ",")
    .replace(/[.．]/g, ".")
    .replace(/[^\S\r\n]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function normalizeDateToken(token: string) {
  const digits = token.replace(/[^\d]/g, "");
  if (digits.length < 8) return "";

  const year = digits.slice(0, 4);
  const month = digits.slice(4, 6);
  const day = digits.slice(6, 8);
  return `${year}-${month}-${day}`;
}

function parseAmount(text: string) {
  const prioritizedPatterns = [
    /(?:합계|총액|총금액|결제금액|받을금액|카드금액|승인금액)[^\d]{0,12}(\d{1,3}(?:[,\s]\d{3})+|\d{3,})/i,
    /(?:금액|판매합계|청구금액)[^\d]{0,12}(\d{1,3}(?:[,\s]\d{3})+|\d{3,})/i,
  ];

  for (const pattern of prioritizedPatterns) {
    const match = text.match(pattern);
    if (match?.[1]) {
      return Number(match[1].replace(/[^\d]/g, ""));
    }
  }

  const candidates = Array.from(text.matchAll(/(\d{1,3}(?:[,\s]\d{3})+|\d{4,})\s*(?:원|KRW)?/g))
    .map((match) => Number(match[1].replace(/[^\d]/g, "")))
    .filter((value) => Number.isFinite(value) && value > 0);

  return candidates.length > 0 ? Math.max(...candidates) : 0;
}

function parseDate(text: string) {
  const datePatterns = [
    /\b(20\d{2}[./-]\d{1,2}[./-]\d{1,2})\b/,
    /\b(20\d{2}\s*년\s*\d{1,2}\s*월\s*\d{1,2}\s*일)\b/,
    /\b(20\d{6})\b/,
  ];

  for (const pattern of datePatterns) {
    const match = text.match(pattern);
    if (match?.[1]) {
      return normalizeDateToken(match[1]);
    }
  }

  return "";
}

function pickMerchantName(lines: string[]) {
  const blacklist = [
    "사업자", "카드", "전화", "현금영수증", "승인", "매출", "합계", "금액", "대표", "주소", "영수증", "거래", "품목",
  ];

  return (
    lines.find((line) => {
      const trimmed = line.trim();
      if (trimmed.length < 2 || trimmed.length > 30) return false;
      if (/\d{4,}/.test(trimmed)) return false;
      return !blacklist.some((word) => trimmed.includes(word));
    }) ?? ""
  );
}

function pickLocation(lines: string[]) {
  return (
    lines.find((line) => {
      const trimmed = line.trim();
      return /(점|로|길|동|구|시|군|읍|면|층|빌딩)/.test(trimmed) && trimmed.length >= 4;
    }) ?? ""
  );
}

function summarizeNote(merchantName: string, amount: number) {
  if (merchantName && amount > 0) return `${merchantName} 영수증`;
  if (merchantName) return `${merchantName} 결제`;
  return "영수증 자동입력";
}

function recommendCategory(merchantName: string, rawText: string) {
  const source = `${merchantName} ${rawText}`.toLowerCase();

  const rules: Array<{ category: string; keywords: string[] }> = [
    { category: "식비", keywords: ["카페", "coffee", "스타벅스", "이디야", "투썸", "메가", "빽다방", "버거", "치킨", "pizza", "피자", "식당", "restaurant", "배달", "요기요", "쿠팡이츠", "맥도날드", "롯데리아", "편의점", "cu", "gs25", "세븐일레븐"] },
    { category: "교통", keywords: ["주유", "주유소", "택시", "카카오t", "우버", "톨게이트", "버스", "지하철", "korail", "srt", "철도", "교통"] },
    { category: "쇼핑", keywords: ["마트", "이마트", "홈플러스", "롯데마트", "다이소", "올리브영", "무신사", "쿠팡", "네이버", "shopping", "스토어", "백화점"] },
    { category: "문화", keywords: ["영화", "cgv", "메가박스", "롯데시네마", "공연", "전시", "서점", "교보문고", "yes24", "알라딘"] },
    { category: "의료", keywords: ["약국", "병원", "의원", "치과", "한의원", "약제", "medical"] },
    { category: "통신", keywords: ["skt", "kt", "lg u+", "엘지유플러스", "통신", "요금제", "휴대폰"] },
    { category: "공과금", keywords: ["전기", "수도", "가스", "관리비", "공과금"] },
    { category: "구독비", keywords: ["netflix", "youtube", "spotify", "apple", "구독", "멤버십"] },
    { category: "급여", keywords: ["salary", "급여", "월급", "상여", "입금"] },
    { category: "대출", keywords: ["이자", "대출", "loan"] },
  ];

  for (const rule of rules) {
    if (rule.keywords.some((keyword) => source.includes(keyword.toLowerCase()))) {
      return rule.category;
    }
  }

  return "기타";
}

async function preprocessReceiptImage(file: File) {
  const imageUrl = URL.createObjectURL(file);
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("영수증 이미지를 불러오지 못했습니다."));
      img.src = imageUrl;
    });

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("브라우저 캔버스를 초기화하지 못했습니다.");

    const maxWidth = 1800;
    const scale = Math.min(1, maxWidth / image.width);
    canvas.width = Math.max(1, Math.round(image.width * scale));
    canvas.height = Math.max(1, Math.round(image.height * scale));

    const renderVariant = (filter: string, threshold: { low: number; high: number }) => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.filter = filter;
      ctx.drawImage(image, 0, 0, canvas.width, canvas.height);

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;

      for (let i = 0; i < data.length; i += 4) {
        const value = data[i];
        const normalized = value > threshold.high
          ? 255
          : value < threshold.low
            ? 0
            : Math.round((value - threshold.low) * (255 / Math.max(1, threshold.high - threshold.low)));
        data[i] = normalized;
        data[i + 1] = normalized;
        data[i + 2] = normalized;
      }

      ctx.putImageData(imageData, 0, 0);
      return canvas.toDataURL("image/png");
    };

    return [
      renderVariant("grayscale(1) contrast(1.35) brightness(1.08)", { low: 110, high: 170 }),
      renderVariant("grayscale(1) contrast(1.6) brightness(1.12)", { low: 95, high: 160 }),
    ];
  } finally {
    URL.revokeObjectURL(imageUrl);
  }
}

async function getWorker() {
  if (!workerPromise) {
    workerPromise = import("tesseract.js").then(async ({ createWorker }) => (
      createWorker("kor+eng", 1)
    ));
  }

  return workerPromise;
}

export async function analyzeReceiptImage(file: File): Promise<ReceiptOcrResult> {
  const worker = await getWorker();
  const preprocessedImages = await preprocessReceiptImage(file);
  const results = await Promise.all([
    worker.recognize(file),
    ...preprocessedImages.map((image) => worker.recognize(image)),
  ]);
  const rawText = normalizeOcrText(
    results
      .map((result) => result.data.text ?? "")
      .sort((left, right) => scoreTextQuality(right) - scoreTextQuality(left))[0] ?? "",
  );
  const lines = rawText
    .split("\n")
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean);

  const merchantName = pickMerchantName(lines);
  const location = pickLocation(lines);
  const amount = parseAmount(rawText);
  const date = parseDate(rawText);
  const note = summarizeNote(merchantName, amount);
  const recommendedCategory = recommendCategory(merchantName, rawText);

  return {
    merchantName,
    location,
    amount,
    date,
    note,
    recommendedCategory,
    rawText,
  };
}
