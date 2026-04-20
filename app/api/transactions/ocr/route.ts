import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const MAX_INPUT_BYTES = 20 * 1024 * 1024;
const OCR_TIMEOUT_MS = 15_000;

// ── 응답 타입 ────────────────────────────────────────────────────
type Vertex = { x?: number; y?: number };

type ClovaField = {
  inferText?: string;
  inferConfidence?: number;
  lineBreak?: boolean;
  boundingPoly?: { vertices?: Vertex[] };
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
    invokeUrl: invokeUrl.replace(/\/+$/, ""),
    secretKey: process.env.NAVER_CLOVA_OCR_SECRET_KEY?.trim(),
  };
}

function diagnoseInvokeUrl(url: string): string {
  if (!url) return "NAVER_CLOVA_OCR_INVOKE_URL 환경 변수가 비어 있습니다.";
  if (url.startsWith("http://"))
    return "Invoke URL이 http:// 로 시작합니다. NCP VPC 내부 전용 주소입니다. https:// 외부 Invoke URL을 사용하세요.";
  if (!url.startsWith("https://"))
    return "Invoke URL 형식이 올바르지 않습니다. https:// 로 시작하는 Invoke URL을 확인하세요.";
  return "CLOVA OCR 서버에 연결하지 못했습니다. Invoke URL과 네트워크 상태를 확인해 주세요.";
}

// ── 위치 기반 필드 분류 ─────────────────────────────────────────
/**
 * boundingPoly의 Y 좌표 중앙값을 반환.
 * 없으면 순서 기반 비율(index / total)을 fallback으로 사용.
 */
function fieldYRatio(field: ClovaField, index: number, total: number): number {
  const verts = field.boundingPoly?.vertices;
  if (verts && verts.length >= 4) {
    const ys = verts.map((v) => v.y ?? 0);
    const yCenter = (Math.min(...ys) + Math.max(...ys)) / 2;
    // 최대 Y로 정규화 (같은 이미지 내 다른 필드의 최대와 비교)
    return yCenter;
  }
  return (index / Math.max(total - 1, 1));
}

interface PositionedField {
  text: string;
  yRatio: number; // 0~1 (상단=0, 하단=1) 또는 절대 Y px
  isAbsolute: boolean;
}

const CONFIDENCE_THRESHOLD = 0.6;

function buildPositionedFields(image: ClovaImage): PositionedField[] {
  const allFields = image.fields ?? [];

  // inferConfidence 기반 저신뢰도 필드 제외
  // 단, 필터 후 30% 미만 남으면 원본 사용 (어두운 영수증 등 전반적으로 낮은 경우)
  const confidentFields = allFields.filter((f) => (f.inferConfidence ?? 1) >= CONFIDENCE_THRESHOLD);
  const fields = confidentFields.length >= Math.ceil(allFields.length * 0.3)
    ? confidentFields
    : allFields;

  const total = fields.length;

  // 절대 Y 좌표가 있는지 확인
  const hasAbsoluteY = fields.some(
    (f) => (f.boundingPoly?.vertices?.length ?? 0) >= 2 && (f.boundingPoly?.vertices?.[0]?.y ?? -1) >= 0,
  );

  if (hasAbsoluteY) {
    // 절대 좌표 → 최대 Y 계산 후 정규화
    let maxY = 1;
    fields.forEach((f) => {
      const verts = f.boundingPoly?.vertices ?? [];
      verts.forEach((v) => { if ((v.y ?? 0) > maxY) maxY = v.y ?? 0; });
    });
    return fields
      .map((f) => {
        const verts = f.boundingPoly?.vertices ?? [];
        const ys = verts.map((v) => v.y ?? 0);
        const yCenter = ys.length ? (Math.min(...ys) + Math.max(...ys)) / 2 : 0;
        return {
          text: f.inferText?.trim() ?? "",
          yRatio: yCenter / maxY,
          isAbsolute: true,
        };
      })
      .filter((f) => f.text.length > 0);
  }

  // fallback: 순서 기반 비율
  return fields
    .map((f, i) => ({
      text: f.inferText?.trim() ?? "",
      yRatio: fieldYRatio(f, i, total),
      isAbsolute: false,
    }))
    .filter((f) => f.text.length > 0);
}

// ── 숫자 정규화 ─────────────────────────────────────────────────
/** "12,500원" / "12 500" / "12500" 모두 → 12500 */
function toNumber(text: string): number {
  const stripped = text
    .replace(/[,\s]/g, "")   // 천단위 쉼표·공백 제거
    .replace(/원$/, "")       // 원 단위 제거
    .replace(/[^\d]/g, "");  // 나머지 비숫자 제거
  return stripped ? Number(stripped) : 0;
}

// ── 금액 파싱 ───────────────────────────────────────────────────
const STRONG_AMOUNT_KEYWORDS = [
  "합계금액",
  "총결제금액",
  "총 결제금액",
  "결제금액",
  "총금액",
  "최종금액",
  "최종 결제금액",
  "최종결제금액",
  "실결제",
  "실 결제금액",
  "청구금액",
  "청구 금액",
  "총합계",
  "금액합계",
  "합계",
  "총액",
  "grand total",
  "payment total",
  "total amount",
  "total",
];
const WEAK_AMOUNT_KEYWORDS = [
  "금액",
  "sum",
  "amount",
];
const AMOUNT_NOISE = [
  "부가세", "vat", "봉사료", "할인", "쿠폰", "포인트",
  "적립", "사용", "공급가액", "과세", "면세", "세액",
  "잔액", "거스름돈", "받은금액", "입금", "출금",
  "단가", "수량", "개수", "ea",
];

function parseAmount(fields: PositionedField[]): number {
  const texts = fields.map((f) => f.text);
  const candidates = fields
    .map((field, index) => ({
      index,
      amount: toNumber(field.text),
      field,
    }))
    .filter((candidate) => candidate.amount >= 100 && !Number.isNaN(candidate.amount));

  const strongestKeywordStrength = (text: string): number => {
    const lower = text.toLowerCase();
    if (STRONG_AMOUNT_KEYWORDS.some((keyword) => lower.includes(keyword))) return 3;
    if (WEAK_AMOUNT_KEYWORDS.some((keyword) => lower.includes(keyword))) return 1;
    if (AMOUNT_NOISE.some((keyword) => lower.includes(keyword))) return -2;
    return 0;
  };

  const scoreCandidate = (candidateIndex: number, amount: number): number => {
    const candidate = fields[candidateIndex];
    let score = 0;
    let strongestKeyword = 0;
    let noiseHits = 0;

    for (let i = Math.max(0, candidateIndex - 2); i <= Math.min(fields.length - 1, candidateIndex + 2); i++) {
      const field = fields[i];
      const keywordStrength = strongestKeywordStrength(field.text);
      const distance = Math.abs(candidateIndex - i);
      const distanceWeight = distance === 0 ? 1.3 : distance === 1 ? 1 : 0.7;

      if (keywordStrength > 0) {
        strongestKeyword = Math.max(strongestKeyword, keywordStrength);
        score += keywordStrength * 40 * distanceWeight;
      }

      if (keywordStrength < 0) {
        noiseHits += 1;
        score += keywordStrength * 28 * distanceWeight;
      }
    }

    if (candidate.yRatio >= 0.75) score += 35;
    else if (candidate.yRatio >= 0.6) score += 20;
    else if (candidate.yRatio <= 0.25) score -= 15;

    score += Math.min(amount / 5000, 30);

    if (strongestKeyword >= 3) score += 70;
    if (strongestKeyword === 0 && noiseHits > 0) score -= 45;

    return score;
  };

  const scoredCandidates = candidates
    .map((candidate) => ({
      ...candidate,
      score: scoreCandidate(candidate.index, candidate.amount),
    }))
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      if (b.field.yRatio !== a.field.yRatio) return b.field.yRatio - a.field.yRatio;
      return b.amount - a.amount;
    });

  if (scoredCandidates.length > 0 && scoredCandidates[0].score > 0) {
    return scoredCandidates[0].amount;
  }

  // 2차: 하단 40% 필드에서 가장 큰 숫자 (합계는 보통 영수증 하단)
  const bottomFields = fields.filter((f) => f.yRatio >= 0.6);
  const bottomCandidates = bottomFields
    .map((f) => toNumber(f.text))
    .filter((n) => n >= 100 && !isNaN(n));
  if (bottomCandidates.length) return Math.max(...bottomCandidates);

  // 3차: 노이즈 필드 제외 후 전체에서 가장 큰 숫자
  const allCandidates = texts
    .filter((t) => !AMOUNT_NOISE.some((k) => t.toLowerCase().includes(k)))
    .map((t) => toNumber(t))
    .filter((n) => n >= 100);
  return allCandidates.length ? Math.max(...allCandidates) : 0;
}

// ── 날짜 파싱 ───────────────────────────────────────────────────
function parseDate(texts: string[]): string {
  // 패턴 목록 — 우선순위 순
  const patterns: Array<{ re: RegExp; parse: (m: RegExpMatchArray) => string }> = [
    // YYYY-MM-DD HH:mm (시간 포함)
    {
      re: /(\d{4})[.\-/](\d{1,2})[.\-/](\d{1,2})[\sT]\d{1,2}:\d{2}/,
      parse: (m) => `${m[1]}-${m[2].padStart(2, "0")}-${m[3].padStart(2, "0")}`,
    },
    // YYYY-MM-DD
    {
      re: /(\d{4})[.\-/](\d{1,2})[.\-/](\d{1,2})/,
      parse: (m) => `${m[1]}-${m[2].padStart(2, "0")}-${m[3].padStart(2, "0")}`,
    },
    // YY-MM-DD
    {
      re: /(\d{2})[.\-/](\d{1,2})[.\-/](\d{1,2})/,
      parse: (m) => `20${m[1]}-${m[2].padStart(2, "0")}-${m[3].padStart(2, "0")}`,
    },
    // 20241016 (8자리 연속 숫자)
    {
      re: /(20\d{2})(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])/,
      parse: (m) => `${m[1]}-${m[2]}-${m[3]}`,
    },
    // 2024년 10월 16일
    {
      re: /(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일/,
      parse: (m) => `${m[1]}-${m[2].padStart(2, "0")}-${m[3].padStart(2, "0")}`,
    },
    // 24년 10월 16일
    {
      re: /(\d{2})년\s*(\d{1,2})월\s*(\d{1,2})일/,
      parse: (m) => `20${m[1]}-${m[2].padStart(2, "0")}-${m[3].padStart(2, "0")}`,
    },
  ];

  for (const text of texts) {
    for (const { re, parse } of patterns) {
      const m = text.match(re);
      if (m) {
        const result = parse(m);
        // 유효한 날짜인지 검증
        const d = new Date(result);
        if (!isNaN(d.getTime()) && d.getFullYear() >= 2000 && d.getFullYear() <= 2099) {
          return result;
        }
      }
    }
  }
  return "";
}

// ── 매장명 파싱 ─────────────────────────────────────────────────

// 상호명이 아닌 텍스트 패턴 (주소·전화·사업자번호·일반 문구)
const MERCHANT_NOISE_RE = [
  /^\d{2,4}-\d{3,4}-\d{4}$/,                         // 전화번호
  /^\d{3}-\d{2}-\d{5}$/,                              // 사업자번호
  /\d+층/,                                              // 주소 층수
  /^서울|^경기|^인천|^부산|^대구|^대전|^광주|^울산/,      // 광역시·도
  /영수증|receipt|합계|total|감사합니다|고맙습니다|안녕/i,
  /tel|fax|사업자|대표자|주소|팩스/i,
  /^\d{5}$/,                                           // 우편번호
];

/**
 * 후보 텍스트의 매장명 적합도 점수.
 * - 상단(yRatio 낮을수록) 가중치 우선
 * - 2~15자 길이 선호
 * - 한글·영문 비율 높을수록 보너스
 * - 숫자·특수문자 비율 높을수록 감점
 */
function scoreMerchant(f: PositionedField, poolIndex: number): number {
  const t = f.text;
  const len = t.length;
  let score = 0;

  // 위치 점수: 상단일수록 높음
  score += (1 - f.yRatio) * 60;
  // 풀 내 순서 보너스
  score += Math.max(0, 30 - poolIndex * 4);
  // 길이 점수: 2~10자 이상적
  if (len >= 2 && len <= 10) score += 25;
  else if (len > 10 && len <= 18) score += 10;
  else score -= 10;
  // 한글·영문 비율 보너스
  const letterCount = (t.match(/[가-힣a-zA-Z]/g) ?? []).length;
  score += (letterCount / Math.max(len, 1)) * 20;
  // 숫자·특수문자 비율 감점
  const noisyCount = (t.match(/[\d!@#$%^&*()_+={}[\]|\\:;"'<>,.?/~`]/g) ?? []).length;
  score -= (noisyCount / Math.max(len, 1)) * 30;

  return score;
}

function parseMerchantName(fields: PositionedField[]): string {
  if (fields.length === 0) return "";

  // 상단 25% 필드 우선 — 없으면 앞 12개
  const topFields = fields.filter((f) => f.yRatio <= 0.25);
  const pool = topFields.length >= 1 ? topFields : fields.slice(0, 12);

  // 노이즈 필터
  const valid = pool.filter((f) => {
    const t = f.text;
    if (t.length < 2) return false;
    if (!/[가-힣a-zA-Z]/.test(t)) return false;
    if (/^\d+$/.test(t)) return false;
    if (MERCHANT_NOISE_RE.some((re) => re.test(t))) return false;
    return true;
  });

  if (!valid.length) return pool[0]?.text ?? "";

  // 점수 기반 최상위 후보 선정
  const best = valid
    .map((f, i) => ({ f, score: scoreMerchant(f, i) }))
    .sort((a, b) => b.score - a.score)[0].f;

  // 인접 라인 병합: 바로 아래 줄이 지점명인 경우 합치기
  // 예) "스타벅스" + "홍대점" → "스타벅스 홍대점"
  const bestIdx = valid.indexOf(best);
  const next = valid[bestIdx + 1];
  if (next) {
    const yDiff = Math.abs(next.yRatio - best.yRatio);
    const combined = `${best.text} ${next.text}`;
    if (
      yDiff < 0.07 &&
      best.text.length <= 12 &&
      next.text.length <= 12 &&
      combined.length <= 22 &&
      !/^\d/.test(next.text) &&
      !MERCHANT_NOISE_RE.some((re) => re.test(next.text))
    ) {
      return combined;
    }
  }

  return best.text;
}

// ── 카테고리 추천 ───────────────────────────────────────────────
const CATEGORY_RULES: Array<{ category: string; keywords: string[] }> = [
  {
    category: "식비",
    keywords: [
      "카페", "coffee", "café", "스타벅스", "이디야", "투썸", "메가커피", "빽다방",
      "버거", "치킨", "피자", "식당", "음식", "restaurant", "배달", "쿠팡이츠",
      "맥도날드", "롯데리아", "버거킹", "편의점", "cu", "gs25", "세븐일레븐",
      "이마트24", "베이커리", "빵집", "분식", "국밥", "삼겹살", "한식", "중식", "일식",
    ],
  },
  {
    category: "교통",
    keywords: [
      "주유", "주유소", "sk에너지", "gs칼텍스", "택시", "카카오t", "우버", "티머니",
      "톨게이트", "하이패스", "버스", "지하철", "korail", "srt", "철도", "ktx", "항공",
    ],
  },
  {
    category: "쇼핑",
    keywords: [
      "마트", "이마트", "홈플러스", "롯데마트", "코스트코", "다이소", "올리브영",
      "무신사", "쿠팡", "네이버쇼핑", "11번가", "g마켓", "옥션", "백화점", "롯데", "신세계",
    ],
  },
  {
    category: "문화",
    keywords: [
      "영화", "cgv", "메가박스", "롯데시네마", "공연", "콘서트", "전시", "박물관",
      "서점", "교보문고", "yes24", "알라딘", "게임",
    ],
  },
  {
    category: "의료",
    keywords: ["약국", "병원", "의원", "치과", "한의원", "약제", "의약품", "클리닉"],
  },
  {
    category: "통신",
    keywords: ["skt", "kt", "lg u+", "lg유플러스", "통신", "요금제", "데이터", "휴대폰"],
  },
  {
    category: "공과금",
    keywords: ["전기", "수도", "가스", "관리비", "한전", "도시가스"],
  },
  {
    category: "구독비",
    keywords: ["netflix", "넷플릭스", "youtube", "spotify", "apple", "구글", "구독", "멤버십"],
  },
  { category: "급여",  keywords: ["급여", "월급", "상여", "임금"] },
  { category: "대출",  keywords: ["이자", "대출", "원리금"] },
];

function recommendCategory(source: string): string {
  const normalized = source.toLowerCase();
  for (const { category, keywords } of CATEGORY_RULES) {
    if (keywords.some((k) => normalized.includes(k.toLowerCase()))) return category;
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
      { error: "CLOVA OCR 환경 변수가 설정되지 않았습니다." },
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
  if (!(file instanceof Blob))
    return NextResponse.json({ error: "이미지 파일이 없습니다." }, { status: 400 });
  if (file.size > MAX_INPUT_BYTES)
    return NextResponse.json({ error: "파일 크기가 너무 큽니다. 20MB 이하 이미지를 사용해 주세요." }, { status: 413 });

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
      if (!response.ok)
        return NextResponse.json(
          { error: "CLOVA OCR 응답을 해석하지 못했습니다. Invoke URL을 확인해 주세요." },
          { status: 502 },
        );
    }
  }

  if (!response.ok) {
    const detail = (json as { message?: string }).message;
    return NextResponse.json(
      { error: `CLOVA OCR 오류 (${response.status})${detail ? `: ${detail}` : ""}` },
      { status: response.status },
    );
  }

  const image = json.images?.[0];
  if (!image || image.inferResult === "ERROR")
    return NextResponse.json(
      { error: `CLOVA OCR 분석 실패${image?.message ? `: ${image.message}` : ""}` },
      { status: 422 },
    );

  const posFields = buildPositionedFields(image);
  if (posFields.length === 0)
    return NextResponse.json({ error: "이미지에서 텍스트를 인식하지 못했습니다." }, { status: 422 });

  const texts = posFields.map((f) => f.text);
  const merchantName = parseMerchantName(posFields);
  const amount = parseAmount(posFields);
  const date = parseDate(texts);
  const rawText = texts.join(" | ");
  const recommendedCategory = recommendCategory(rawText);
  const note = merchantName ? `${merchantName} 영수증` : "영수증 자동입력";

  return NextResponse.json({ merchantName, location: "", amount, date, note, recommendedCategory, rawText });
}
