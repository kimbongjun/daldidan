import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const MAX_INPUT_BYTES = 20 * 1024 * 1024;
const OCR_TIMEOUT_MS = 15_000;

// ── 일반 OCR 응답 타입 ──────────────────────────────────────────
type ClovaField = {
  inferText?: string;
  inferConfidence?: number;
  lineBreak?: boolean;
};

type ClovaImage = {
  inferResult?: string;
  message?: string;
  fields?: ClovaField[];
};

type ClovaResponse = {
  images?: ClovaImage[];
};

// ── 환경변수 ────────────────────────────────────────────────────
function getEnv() {
  const invokeUrl = process.env.NAVER_CLOVA_OCR_INVOKE_URL?.trim() ?? "";
  return {
    invokeUrl: invokeUrl.replace(/\/+$/, ""), // 후행 슬래시 제거
    secretKey: process.env.NAVER_CLOVA_OCR_SECRET_KEY?.trim(),
  };
}

function diagnoseInvokeUrl(url: string): string {
  if (!url) return "NAVER_CLOVA_OCR_INVOKE_URL 환경 변수가 비어 있습니다.";
  if (url.startsWith("http://")) {
    return "Invoke URL이 http:// 로 시작합니다. NCP VPC 내부 전용 주소입니다. CLOVA OCR 콘솔에서 발급한 https:// 외부 Invoke URL을 사용하세요.";
  }
  if (!url.startsWith("https://")) {
    return "Invoke URL 형식이 올바르지 않습니다. https:// 로 시작하는 Invoke URL을 확인하세요.";
  }
  return "CLOVA OCR 서버에 연결하지 못했습니다. Invoke URL과 네트워크 상태를 확인해 주세요.";
}

// ── 텍스트 추출 ─────────────────────────────────────────────────
function extractTexts(image: ClovaImage): string[] {
  return (image.fields ?? [])
    .map((f) => f.inferText?.trim() ?? "")
    .filter(Boolean);
}

// ── 금액 파싱 ───────────────────────────────────────────────────
function parseAmount(texts: string[]): number {
  const keywords = ["합계", "총액", "결제금액", "청구금액", "받을금액", "total", "sum", "소계", "지불금액"];
  for (let i = 0; i < texts.length; i++) {
    const lower = texts[i].toLowerCase();
    if (keywords.some((k) => lower.includes(k))) {
      for (let j = i; j <= Math.min(i + 2, texts.length - 1); j++) {
        const numeric = texts[j].replace(/[^\d]/g, "");
        if (numeric.length >= 3) return Number(numeric);
      }
    }
  }
  // 키워드 없으면 3자리 이상 숫자 중 최댓값
  const candidates = texts
    .map((t) => Number(t.replace(/[^\d]/g, "")))
    .filter((n) => n >= 100);
  return candidates.length ? Math.max(...candidates) : 0;
}

// ── 날짜 파싱 ───────────────────────────────────────────────────
function parseDate(texts: string[]): string {
  const patterns = [
    /(\d{4})[.\-/](\d{1,2})[.\-/](\d{1,2})/,
    /(\d{2})[.\-/](\d{1,2})[.\-/](\d{1,2})/,
  ];
  for (const text of texts) {
    for (const pattern of patterns) {
      const m = text.match(pattern);
      if (m) {
        const year = m[1].length === 2 ? `20${m[1]}` : m[1];
        const month = m[2].padStart(2, "0");
        const day = m[3].padStart(2, "0");
        return `${year}-${month}-${day}`;
      }
    }
  }
  return "";
}

// ── 매장명 파싱 ─────────────────────────────────────────────────
// 영수증 상단에 위치하는 한글/영문 2자 이상의 첫 번째 텍스트
function parseMerchantName(texts: string[]): string {
  for (const text of texts.slice(0, 10)) {
    if (/[가-힣a-zA-Z]{2,}/.test(text) && !/^\d+$/.test(text)) {
      return text;
    }
  }
  return texts[0] ?? "";
}

// ── 카테고리 추천 ───────────────────────────────────────────────
function recommendCategory(source: string): string {
  const normalized = source.toLowerCase();
  const rules: Array<{ category: string; keywords: string[] }> = [
    { category: "식비", keywords: ["카페", "coffee", "스타벅스", "이디야", "투썸", "메가", "빽다방", "버거", "치킨", "피자", "식당", "restaurant", "배달", "맥도날드", "롯데리아", "편의점", "cu", "gs25", "세븐일레븐", "베이커리"] },
    { category: "교통", keywords: ["주유", "주유소", "택시", "카카오t", "우버", "톨게이트", "버스", "지하철", "korail", "srt", "철도"] },
    { category: "쇼핑", keywords: ["마트", "이마트", "홈플러스", "롯데마트", "다이소", "올리브영", "무신사", "쿠팡", "스토어", "백화점"] },
    { category: "문화", keywords: ["영화", "cgv", "메가박스", "롯데시네마", "공연", "전시", "서점", "교보문고"] },
    { category: "의료", keywords: ["약국", "병원", "의원", "치과", "한의원"] },
    { category: "통신", keywords: ["skt", "kt", "lg u+", "통신", "요금제", "휴대폰"] },
    { category: "공과금", keywords: ["전기", "수도", "가스", "관리비"] },
    { category: "구독비", keywords: ["netflix", "youtube", "spotify", "apple", "구독", "멤버십"] },
    { category: "급여", keywords: ["급여", "월급", "상여"] },
    { category: "대출", keywords: ["이자", "대출"] },
  ];
  for (const rule of rules) {
    if (rule.keywords.some((k) => normalized.includes(k.toLowerCase()))) return rule.category;
  }
  return "기타";
}

// ── 핸들러 ──────────────────────────────────────────────────────
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { invokeUrl, secretKey } = getEnv();
  if (!invokeUrl || !secretKey) {
    return NextResponse.json(
      { error: "CLOVA OCR 환경 변수가 설정되지 않았습니다. NAVER_CLOVA_OCR_INVOKE_URL, NAVER_CLOVA_OCR_SECRET_KEY를 확인해 주세요." },
      { status: 500 },
    );
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "이미지 데이터를 읽지 못했습니다." }, { status: 400 });
  }

  const file = formData.get("image");
  if (!(file instanceof Blob)) {
    return NextResponse.json({ error: "이미지 파일이 없습니다." }, { status: 400 });
  }

  if (file.size > MAX_INPUT_BYTES) {
    return NextResponse.json({ error: "파일 크기가 너무 큽니다. 20MB 이하 이미지를 사용해 주세요." }, { status: 413 });
  }

  const fileName = "name" in file && typeof file.name === "string" && file.name
    ? file.name
    : `receipt-${Date.now()}.jpg`;
  const fileFormat = fileName.includes(".")
    ? (fileName.split(".").pop()?.toLowerCase() ?? "jpg")
    : "jpg";

  const outbound = new FormData();
  outbound.append("message", JSON.stringify({
    version: "V2",
    requestId: randomUUID(),
    timestamp: Date.now(),
    images: [{ format: fileFormat, name: fileName }],
  }));
  outbound.append("file", file, fileName);

  let response: Response;
  try {
    response = await fetch(invokeUrl, {
      method: "POST",
      headers: { "X-OCR-SECRET": secretKey },
      body: outbound,
      cache: "no-store",
      signal: AbortSignal.timeout(OCR_TIMEOUT_MS),
    });
  } catch (err) {
    const isTimeout = err instanceof Error && err.name === "TimeoutError";
    const msg = isTimeout
      ? `CLOVA OCR 요청이 ${OCR_TIMEOUT_MS / 1000}초 안에 응답하지 않았습니다.`
      : diagnoseInvokeUrl(invokeUrl);
    return NextResponse.json({ error: msg }, { status: 502 });
  }

  const raw = await response.text();
  let json: ClovaResponse = {};
  if (raw) {
    try {
      json = JSON.parse(raw) as ClovaResponse;
    } catch {
      if (!response.ok) {
        return NextResponse.json(
          { error: "CLOVA OCR 응답을 해석하지 못했습니다. Invoke URL이 올바른지 확인해 주세요." },
          { status: 502 },
        );
      }
    }
  }

  if (!response.ok) {
    const errBody = json as { message?: string };
    const detail = errBody.message ? `: ${errBody.message}` : "";
    return NextResponse.json(
      { error: `CLOVA OCR 오류 (${response.status})${detail}` },
      { status: response.status },
    );
  }

  const image = json.images?.[0];
  if (!image || image.inferResult === "ERROR") {
    return NextResponse.json(
      { error: `CLOVA OCR 분석 실패${image?.message ? `: ${image.message}` : ""}` },
      { status: 422 },
    );
  }

  const texts = extractTexts(image);
  if (texts.length === 0) {
    return NextResponse.json({ error: "이미지에서 텍스트를 인식하지 못했습니다." }, { status: 422 });
  }

  const merchantName = parseMerchantName(texts);
  const amount = parseAmount(texts);
  const date = parseDate(texts);
  const rawText = texts.join(" | ");
  const recommendedCategory = recommendCategory(rawText);
  const note = merchantName ? `${merchantName} 영수증` : "영수증 자동입력";

  return NextResponse.json({
    merchantName,
    location: "",
    amount,
    date,
    note,
    recommendedCategory,
    rawText,
  });
}
