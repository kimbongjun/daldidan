import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const MAX_INPUT_BYTES = 20 * 1024 * 1024;

type ClovaReceiptField = {
  text?: string;
  formatted?: { value?: string };
  confidenceScore?: number;
};

type ClovaReceiptItem = {
  name?: ClovaReceiptField;
};

type ClovaReceiptResult = {
  storeInfo?: {
    name?: ClovaReceiptField;
    subName?: ClovaReceiptField;
    addresses?: ClovaReceiptField[];
  };
  paymentInfo?: {
    date?: ClovaReceiptField;
    time?: ClovaReceiptField;
  };
  totalPrice?: {
    price?: ClovaReceiptField;
  };
  subResults?: Array<{
    items?: ClovaReceiptItem[];
  }>;
};

type ClovaResponse = {
  images?: Array<{
    inferResult?: string;
    message?: string;
    receipt?: {
      result?: ClovaReceiptResult;
    };
  }>;
};

const OCR_TIMEOUT_MS = 15_000;

function getEnv() {
  const rawInvokeUrl = process.env.NAVER_CLOVA_OCR_INVOKE_URL?.trim();
  const invokeUrl = rawInvokeUrl
    ? (rawInvokeUrl.endsWith("/receipt") ? rawInvokeUrl : `${rawInvokeUrl.replace(/\/+$/, "")}/receipt`)
    : "";

  return {
    invokeUrl,
    secretKey: process.env.NAVER_CLOVA_OCR_SECRET_KEY?.trim(),
  };
}

function diagnoseInvokeUrl(url: string): string {
  if (!url) return "NAVER_CLOVA_OCR_INVOKE_URL 환경 변수가 비어 있습니다.";
  if (url.startsWith("http://")) {
    return "Invoke URL이 http:// 로 시작합니다. NCP VPC 내부 전용 주소입니다. CLOVA OCR 콘솔 → 도메인 → APIGW 연동에서 발급한 https:// 외부 Invoke URL을 사용하세요.";
  }
  if (!url.startsWith("https://")) {
    return "Invoke URL 형식이 올바르지 않습니다. https:// 로 시작하는 APIGW Invoke URL을 확인하세요.";
  }
  return "CLOVA OCR 서버에 연결하지 못했습니다. Invoke URL, VPC 접근 정책, 외부 통신 가능 여부를 확인해 주세요.";
}

function pickFieldValue(field?: ClovaReceiptField | null) {
  return field?.formatted?.value?.trim() || field?.text?.trim() || "";
}

function normalizeDate(raw: string) {
  const digits = raw.replace(/[^\d]/g, "");
  if (digits.length < 8) return "";

  const year = digits.slice(0, 4);
  const month = digits.slice(4, 6);
  const day = digits.slice(6, 8);
  return `${year}-${month}-${day}`;
}

function parseAmount(raw: string) {
  const numeric = raw.replace(/[^\d]/g, "");
  return numeric ? Number(numeric) : 0;
}

function summarizeNote(merchantName: string, firstItemName: string) {
  if (merchantName && firstItemName) return `${merchantName} · ${firstItemName}`;
  if (merchantName) return `${merchantName} 영수증`;
  if (firstItemName) return firstItemName;
  return "영수증 자동입력";
}

function recommendCategory(source: string) {
  const normalized = source.toLowerCase();

  const rules: Array<{ category: string; keywords: string[] }> = [
    { category: "식비", keywords: ["카페", "coffee", "스타벅스", "이디야", "투썸", "메가", "빽다방", "버거", "치킨", "피자", "식당", "restaurant", "배달", "요기요", "쿠팡이츠", "맥도날드", "롯데리아", "편의점", "cu", "gs25", "세븐일레븐", "베이커리"] },
    { category: "교통", keywords: ["주유", "주유소", "택시", "카카오t", "우버", "톨게이트", "버스", "지하철", "korail", "srt", "철도"] },
    { category: "쇼핑", keywords: ["마트", "이마트", "홈플러스", "롯데마트", "다이소", "올리브영", "무신사", "쿠팡", "네이버", "shopping", "스토어", "백화점"] },
    { category: "문화", keywords: ["영화", "cgv", "메가박스", "롯데시네마", "공연", "전시", "서점", "교보문고", "yes24", "알라딘"] },
    { category: "의료", keywords: ["약국", "병원", "의원", "치과", "한의원", "약제"] },
    { category: "통신", keywords: ["skt", "kt", "lg u+", "엘지유플러스", "통신", "요금제", "휴대폰"] },
    { category: "공과금", keywords: ["전기", "수도", "가스", "관리비", "공과금"] },
    { category: "구독비", keywords: ["netflix", "youtube", "spotify", "apple", "구독", "멤버십"] },
    { category: "급여", keywords: ["salary", "급여", "월급", "상여", "입금"] },
    { category: "대출", keywords: ["이자", "대출", "loan"] },
  ];

  for (const rule of rules) {
    if (rule.keywords.some((keyword) => normalized.includes(keyword.toLowerCase()))) {
      return rule.category;
    }
  }

  return "기타";
}

function mapClovaError(status: number, body: unknown) {
  const message = typeof body === "object" && body !== null && "message" in body
    ? String((body as { message?: unknown }).message ?? "")
    : "";

  if (status === 401 || status === 403) {
    return "CLOVA OCR 인증에 실패했습니다. Secret Key와 Invoke URL 연결 상태를 확인해 주세요.";
  }

  if (status === 404) {
    return "CLOVA OCR Invoke URL을 찾지 못했습니다. Receipt 도메인의 APIGW Invoke URL인지 확인해 주세요.";
  }

  if (status === 429) {
    return "CLOVA OCR 요청 한도를 초과했습니다. 잠시 후 다시 시도해 주세요.";
  }

  if (message) return `CLOVA OCR 오류: ${message}`;
  return "CLOVA OCR 요청에 실패했습니다.";
}

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

  const fileName = "name" in file && typeof file.name === "string" && file.name ? file.name : `receipt-${Date.now()}.jpg`;
  const fileFormat = fileName.includes(".") ? fileName.split(".").pop()?.toLowerCase() ?? "jpg" : "jpg";

  const outbound = new FormData();
  outbound.append("message", JSON.stringify({
    version: "V2",
    requestId: randomUUID(),
    timestamp: Date.now(),
    images: [
      {
        format: fileFormat,
        name: fileName,
      },
    ],
  }));
  outbound.append("file", file, fileName);

  let response: Response;
  try {
    response = await fetch(invokeUrl, {
      method: "POST",
      headers: {
        "X-OCR-SECRET": secretKey,
      },
      body: outbound,
      cache: "no-store",
      signal: AbortSignal.timeout(OCR_TIMEOUT_MS),
    });
  } catch (err) {
    const isTimeout = err instanceof Error && err.name === "TimeoutError";
    const msg = isTimeout
      ? `CLOVA OCR 요청이 ${OCR_TIMEOUT_MS / 1000}초 안에 응답하지 않았습니다. Invoke URL과 네트워크 상태를 확인해 주세요.`
      : diagnoseInvokeUrl(invokeUrl);
    return NextResponse.json({ error: msg }, { status: 502 });
  }

  const raw = await response.text();
  let json: ClovaResponse & { message?: string } = {};
  if (raw) {
    try {
      json = JSON.parse(raw) as ClovaResponse & { message?: string };
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
    return NextResponse.json({ error: mapClovaError(response.status, json) }, { status: response.status });
  }

  const image = json.images?.[0];
  if (!image || image.inferResult === "ERROR") {
    return NextResponse.json(
      { error: `CLOVA OCR 분석 실패${image?.message ? `: ${image.message}` : ""}` },
      { status: 422 },
    );
  }

  const result = image.receipt?.result;
  if (!result) {
    return NextResponse.json(
      { error: "영수증 응답 형식을 해석하지 못했습니다. Receipt 특화 도메인인지 확인해 주세요." },
      { status: 422 },
    );
  }

  const merchantName = [
    pickFieldValue(result.storeInfo?.name),
    pickFieldValue(result.storeInfo?.subName),
  ].filter(Boolean).join(" ").trim();
  const location = result.storeInfo?.addresses?.map((address) => pickFieldValue(address)).find(Boolean) ?? "";
  const amount = parseAmount(pickFieldValue(result.totalPrice?.price));
  const date = normalizeDate(pickFieldValue(result.paymentInfo?.date));
  const firstItemName = result.subResults?.flatMap((subResult) => subResult.items ?? []).map((item) => pickFieldValue(item.name)).find(Boolean) ?? "";
  const note = summarizeNote(merchantName, firstItemName);
  const rawText = [merchantName, location, firstItemName].filter(Boolean).join(" | ");
  const recommendedCategory = recommendCategory([merchantName, firstItemName, location].filter(Boolean).join(" "));

  return NextResponse.json({
    merchantName,
    location,
    amount,
    date,
    note,
    recommendedCategory,
    rawText,
  });
}
