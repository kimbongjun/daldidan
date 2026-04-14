import { NextResponse } from "next/server";

export interface TravelActivity {
  id: string;
  platform: "klook" | "kkday";
  name: string;
  location: string;
  category: string;
  rating: number;
  reviewCount: number;
  price: string;
  originalPrice?: string;
  discountPct?: number;
  tag?: string;
  url: string;
}

const ACTIVITIES: TravelActivity[] = [
  {
    id: "k1",
    platform: "klook",
    name: "제주도 ATV & 승마 체험",
    location: "제주 · 한국",
    category: "액티비티",
    rating: 4.8,
    reviewCount: 2341,
    price: "₩45,000",
    originalPrice: "₩60,000",
    discountPct: 25,
    tag: "베스트셀러",
    url: "https://www.klook.com/ko/search/?query=제주도",
  },
  {
    id: "k2",
    platform: "klook",
    name: "방콕 차오프라야 디너 크루즈",
    location: "방콕 · 태국",
    category: "크루즈",
    rating: 4.7,
    reviewCount: 5823,
    price: "₩79,000",
    tag: "인기",
    url: "https://www.klook.com/ko/search/?query=방콕",
  },
  {
    id: "k3",
    platform: "klook",
    name: "싱가포르 유니버설 스튜디오 입장권",
    location: "싱가포르",
    category: "테마파크",
    rating: 4.9,
    reviewCount: 12034,
    price: "₩89,000",
    tag: "HOT",
    url: "https://www.klook.com/ko/search/?query=싱가포르",
  },
  {
    id: "d1",
    platform: "kkday",
    name: "도쿄 디즈니랜드 당일 입장권",
    location: "도쿄 · 일본",
    category: "테마파크",
    rating: 4.9,
    reviewCount: 9102,
    price: "₩109,000",
    tag: "즉시 확정",
    url: "https://www.kkday.com/ko/search?q=도쿄",
  },
  {
    id: "d2",
    platform: "kkday",
    name: "발리 우붓 라이스 테라스 & 문화 투어",
    location: "발리 · 인도네시아",
    category: "문화투어",
    rating: 4.8,
    reviewCount: 3210,
    price: "₩55,000",
    originalPrice: "₩68,000",
    discountPct: 19,
    url: "https://www.kkday.com/ko/search?q=발리",
  },
];

export async function GET() {
  // TODO: Replace with real Klook/KKDay API calls when API keys are configured.
  // const KLOOK_API_KEY = process.env.KLOOK_API_KEY;
  // const KKDAY_API_KEY = process.env.KKDAY_API_KEY;
  return NextResponse.json(ACTIVITIES);
}
