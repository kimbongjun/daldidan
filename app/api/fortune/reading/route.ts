import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import Groq from "groq-sdk";

export type FortuneType = "daily" | "card";
export type CardCategory = "meal" | "travel" | "drink" | "snack";

export interface FortuneRequest {
  type: FortuneType;
  card_category?: CardCategory;
}

export interface FortuneReading {
  type: "daily";
  overall: string;
  love: string;
  work: string;
  health: string;
  lucky_color: string;
  lucky_number: number;
}

export interface CardResult {
  category: CardCategory;
  category_label: string;
  result: string;
  result_emoji: string;
  emoji: string;
}

export interface FortuneResponse {
  type: FortuneType;
  reading?: FortuneReading;
  card?: CardResult;
  birth_year: number;
  gender: string;
  birth_hour: number;
}

const CARD_POOLS: Record<CardCategory, { items: { name: string; emoji: string }[]; emoji: string; label: string }> = {
  meal: {
    label: "오늘의 식사",
    emoji: "🍽️",
    items: [
      { name: "삼겹살 & 된장찌개", emoji: "🥩" },
      { name: "치킨 & 맥주",       emoji: "🍗" },
      { name: "초밥 & 미소시루",    emoji: "🍣" },
      { name: "짜장면 & 탕수육",    emoji: "🍜" },
      { name: "파스타 & 샐러드",    emoji: "🍝" },
      { name: "갈비탕 & 깍두기",    emoji: "🦴" },
      { name: "순두부찌개 & 공기밥", emoji: "🫕" },
      { name: "라멘 & 교자",        emoji: "🥟" },
      { name: "피자 & 콜라",        emoji: "🍕" },
      { name: "냉면 & 제육볶음",    emoji: "🥢" },
      { name: "돈까스 & 미소국",    emoji: "🍱" },
      { name: "마라탕 & 마라샹궈",  emoji: "🌶️" },
      { name: "버거 & 감자튀김",    emoji: "🍔" },
      { name: "카레 & 밥",          emoji: "🍛" },
      { name: "보쌈 & 굴전",        emoji: "🥬" },
      { name: "해물파전 & 막걸리",  emoji: "🥞" },
    ],
  },
  travel: {
    label: "이번 여행지",
    emoji: "✈️",
    items: [
      { name: "제주도 — 성산일출봉",      emoji: "🏝️" },
      { name: "강릉 — 경포대 해변",       emoji: "🏖️" },
      { name: "부산 — 해운대·광안리",     emoji: "🌊" },
      { name: "경주 — 불국사·첨성대",     emoji: "🏛️" },
      { name: "전주 — 한옥마을",          emoji: "🏯" },
      { name: "여수 — 밤바다·돌산도",     emoji: "🌃" },
      { name: "속초 — 설악산·아바이마을", emoji: "⛰️" },
      { name: "통영 — 케이블카·미륵도",   emoji: "🚡" },
      { name: "제천 — 청풍호반",          emoji: "🏞️" },
      { name: "남해 — 독일마을·다랭이마을", emoji: "🌿" },
      { name: "담양 — 메타세쿼이아길",    emoji: "🌲" },
      { name: "순천 — 순천만 국가정원",   emoji: "🌾" },
      { name: "인천 — 월미도·차이나타운", emoji: "🎡" },
      { name: "춘천 — 남이섬·닭갈비골목", emoji: "🍁" },
      { name: "포항 — 호미곶",            emoji: "🌅" },
      { name: "거제 — 외도·해금강",       emoji: "🪸" },
    ],
  },
  drink: {
    label: "오늘의 술",
    emoji: "🍺",
    items: [
      { name: "시원한 생맥주",         emoji: "🍺" },
      { name: "소주 (참이슬)",         emoji: "🥃" },
      { name: "소맥 황금비율",         emoji: "🍻" },
      { name: "막걸리 한 사발",        emoji: "🍶" },
      { name: "IPA 크래프트 맥주",     emoji: "🫗" },
      { name: "하이볼 (위스키+소다)",  emoji: "🥃" },
      { name: "레드 와인 한 잔",       emoji: "🍷" },
      { name: "화이트 와인 한 잔",     emoji: "🥂" },
      { name: "봉평 메밀막걸리",       emoji: "🍶" },
      { name: "감자주 (감자소주)",     emoji: "🥔" },
      { name: "오미자청 칵테일",       emoji: "🍹" },
      { name: "복분자주",              emoji: "🫐" },
      { name: "사케 (일본 청주)",      emoji: "🍶" },
      { name: "진토닉",               emoji: "🍸" },
      { name: "모히토",               emoji: "🌿" },
      { name: "오렌지 에이드 (무알코올)", emoji: "🍊" },
    ],
  },
  snack: {
    label: "오늘의 안주",
    emoji: "🍖",
    items: [
      { name: "닭발 (간장 or 불닭)", emoji: "🦶" },
      { name: "오돌뼈 볶음",         emoji: "🦴" },
      { name: "족발 & 보쌈 세트",    emoji: "🐷" },
      { name: "감자전",              emoji: "🥔" },
      { name: "두부김치",            emoji: "🥬" },
      { name: "골뱅이 무침",         emoji: "🐌" },
      { name: "쭈꾸미 볶음",         emoji: "🦑" },
      { name: "먹태 & 아몬드",       emoji: "🐟" },
      { name: "치즈 플래터",         emoji: "🧀" },
      { name: "소시지 구이",         emoji: "🌭" },
      { name: "꼴뚜기 볶음",         emoji: "🐙" },
      { name: "순대 & 떡볶이",       emoji: "🌶️" },
      { name: "과카몰리 & 나초",     emoji: "🥑" },
      { name: "계란말이",            emoji: "🥚" },
      { name: "참치 김치찌개",       emoji: "🐟" },
      { name: "군만두",              emoji: "🥟" },
    ],
  },
};

function getZodiacAnimal(year: number): string {
  const animals = ["쥐", "소", "호랑이", "토끼", "용", "뱀", "말", "양", "원숭이", "닭", "개", "돼지"];
  return animals[(year - 4) % 12];
}

function getBirthHourLabel(hour: number): string {
  const HOURS: Record<number, string> = {
    23: "자시(子時)", 0: "자시(子時)", 1: "축시(丑時)", 2: "축시(丑時)",
    3: "인시(寅時)", 4: "인시(寅時)", 5: "묘시(卯時)", 6: "묘시(卯時)",
    7: "진시(辰時)", 8: "진시(辰時)", 9: "사시(巳時)", 10: "사시(巳時)",
    11: "오시(午時)", 12: "오시(午時)", 13: "미시(未時)", 14: "미시(未時)",
    15: "신시(申時)", 16: "신시(申時)", 17: "유시(酉時)", 18: "유시(酉時)",
    19: "술시(戌時)", 20: "술시(戌時)", 21: "해시(亥時)", 22: "해시(亥時)",
  };
  return HOURS[hour] ?? "자시(子時)";
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("birth_year, gender, birth_hour")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile?.birth_year || !profile?.gender || profile?.birth_hour == null) {
    return NextResponse.json(
      { error: "마이페이지에서 생년, 성별, 태어난 시를 먼저 입력해주세요." },
      { status: 422 }
    );
  }

  const body = await request.json() as FortuneRequest;
  const { type, card_category } = body;

  if (type === "card") {
    const category = card_category ?? "meal";
    const pool = CARD_POOLS[category];
    const item = pool.items[Math.floor(Math.random() * pool.items.length)];
    return NextResponse.json({
      type: "card",
      card: {
        category,
        category_label: pool.label,
        result: item.name,
        result_emoji: item.emoji,
        emoji: pool.emoji,
      },
      birth_year: profile.birth_year,
      gender: profile.gender,
      birth_hour: profile.birth_hour,
    } satisfies FortuneResponse);
  }

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "GROQ_API_KEY가 설정되지 않았습니다." }, { status: 500 });
  }

  const groq = new Groq({ apiKey });

  const zodiac = getZodiacAnimal(profile.birth_year);
  const hourLabel = getBirthHourLabel(profile.birth_hour);
  const today = new Date().toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric" });

  const prompt = `오늘(${today}) 운세를 봐주세요.
대상: ${profile.birth_year}년생(${zodiac}띠) ${profile.gender}, ${hourLabel} 출생
형식: 아래 JSON만 반환하세요. 다른 텍스트는 절대 포함하지 마세요.
{
  "overall": "종합 운세 2~3문장",
  "love": "애정운 1~2문장",
  "work": "직업·학업운 1~2문장",
  "health": "건강운 1~2문장",
  "lucky_color": "오늘의 행운 색 (한글 1단어)",
  "lucky_number": 1자리 또는 2자리 숫자
}`;

  try {
    const completion = await groq.chat.completions.create({
      model: "llama-3.1-8b-instant",
      messages: [
        { role: "system", content: "당신은 한국 전통 사주 기반 운세 전문가입니다. 요청된 JSON 형식만 반환하고 다른 텍스트는 절대 포함하지 마세요." },
        { role: "user", content: prompt },
      ],
      temperature: 0.8,
      max_tokens: 512,
    });
    const text = (completion.choices[0]?.message?.content ?? "").trim();
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("JSON 파싱 실패");
    const parsed = JSON.parse(jsonMatch[0]) as Omit<FortuneReading, "type">;

    return NextResponse.json({
      type: "daily",
      reading: { type: "daily", ...parsed },
      birth_year: profile.birth_year,
      gender: profile.gender,
      birth_hour: profile.birth_hour,
    } satisfies FortuneResponse);
  } catch {
    return NextResponse.json({ error: "운세 생성에 실패했습니다. 잠시 후 다시 시도해주세요." }, { status: 500 });
  }
}
