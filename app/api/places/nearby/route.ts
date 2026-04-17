import { NextRequest, NextResponse } from "next/server";

type RestaurantCategory = "한식" | "중식" | "양식" | "아시안" | "분식" | "주점" | "카페" | "퓨전";

// Google Places API v1 response types
interface GooglePlace {
  id?: string;
  displayName?: { text?: string; languageCode?: string };
  formattedAddress?: string;
  rating?: number;
  userRatingCount?: number;
  currentOpeningHours?: { openNow?: boolean };
  regularOpeningHours?: { openNow?: boolean };
  photos?: Array<{ name?: string }>;
  location?: { latitude?: number; longitude?: number };
  primaryTypeDisplayName?: { text?: string };
  types?: string[];
}

interface GoogleNearbySearchResponse {
  places?: GooglePlace[];
}

type NearbyRestaurant = {
  id: string;
  name: string;
  address: string;
  rating: number;
  reviewCount: number;
  isOpen: boolean | null;
  photoRef: string | null;
  mapUrl: string;
  category: RestaurantCategory;
  distance: string;
  sourceCategory: string;
};

// Google Places type → 우리 카테고리 매핑
const TYPE_TO_CATEGORY: Array<{ types: string[]; category: RestaurantCategory }> = [
  { types: ["cafe", "coffee_shop", "bakery", "dessert_shop", "donut_shop"], category: "카페" },
  { types: ["bar", "pub", "wine_bar", "night_club"], category: "주점" },
  { types: ["ramen_restaurant", "sushi_restaurant", "japanese_restaurant"], category: "아시안" },
  { types: ["chinese_restaurant", "dim_sum_restaurant"], category: "중식" },
  { types: ["korean_restaurant"], category: "한식" },
  {
    types: [
      "vietnamese_restaurant", "thai_restaurant", "indian_restaurant",
      "asian_restaurant", "indonesian_restaurant",
    ],
    category: "아시안",
  },
  {
    types: [
      "italian_restaurant", "french_restaurant", "american_restaurant",
      "hamburger_restaurant", "pizza_restaurant", "steak_house", "sandwich_shop",
      "fast_food_restaurant",
    ],
    category: "양식",
  },
  { types: ["meal_takeaway", "meal_delivery"], category: "분식" },
];

const KEYWORD_HINTS: Array<{ keywords: string[]; category: RestaurantCategory }> = [
  { keywords: ["카페", "커피", "베이커리", "디저트", "도넛"], category: "카페" },
  { keywords: ["술집", "포차", "이자카야", "호프", "맥주", "와인", "바", "펍"], category: "주점" },
  { keywords: ["분식", "떡볶이", "김밥", "순대", "라면"], category: "분식" },
  { keywords: ["중식", "중국", "짜장", "짬뽕", "마라", "양꼬치"], category: "중식" },
  { keywords: ["일식", "일본", "쌀국수", "베트남", "태국", "인도", "스시", "라멘"], category: "아시안" },
  { keywords: ["양식", "파스타", "피자", "프렌치", "햄버거", "스테이크", "브런치"], category: "양식" },
  { keywords: ["퓨전", "오마카세", "다이닝", "코스"], category: "퓨전" },
  { keywords: ["한식", "국밥", "백반", "고기", "냉면", "찌개", "삼겹살"], category: "한식" },
];

function inferCategory(types: string[], displayName: string, primaryTypeDisplay: string): RestaurantCategory {
  // 1. Google type으로 카테고리 추론
  for (const { types: matchTypes, category } of TYPE_TO_CATEGORY) {
    if (types.some((t) => matchTypes.includes(t))) return category;
  }
  // 2. 이름/타입 텍스트 키워드로 추론
  const source = `${displayName} ${primaryTypeDisplay}`.toLowerCase();
  for (const { keywords, category } of KEYWORD_HINTS) {
    if (keywords.some((kw) => source.includes(kw))) return category;
  }
  return "한식"; // 기본값
}

function calcDistance(lat1: number, lng1: number, lat2: number, lng2: number): string {
  const R = 6371000; // meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  const d = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return d < 1000 ? `${Math.round(d)}m` : `${(d / 1000).toFixed(1)}km`;
}

function distanceToMeters(distance: string): number {
  if (distance.endsWith("km")) return parseFloat(distance) * 1000;
  if (distance.endsWith("m")) return parseFloat(distance);
  return Number.POSITIVE_INFINITY;
}

// restaurant 타입 포함 Google Places 타입들
const FOOD_TYPES = [
  "restaurant",
  "food",
  "cafe",
  "coffee_shop",
  "bakery",
  "bar",
  "pub",
  "meal_takeaway",
  "meal_delivery",
  "korean_restaurant",
  "japanese_restaurant",
  "chinese_restaurant",
  "italian_restaurant",
  "american_restaurant",
  "fast_food_restaurant",
  "ramen_restaurant",
  "sushi_restaurant",
  "pizza_restaurant",
  "hamburger_restaurant",
  "steak_house",
  "dim_sum_restaurant",
  "vietnamese_restaurant",
  "thai_restaurant",
  "indian_restaurant",
  "asian_restaurant",
  "french_restaurant",
  "sandwich_shop",
  "dessert_shop",
  "donut_shop",
  "night_club",
  "wine_bar",
];

async function searchNearbyPlaces(
  lat: number,
  lng: number,
  apiKey: string,
  includedTypes: string[],
): Promise<GooglePlace[]> {
  const res = await fetch("https://places.googleapis.com/v1/places:searchNearby", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask": [
        "places.id",
        "places.displayName",
        "places.formattedAddress",
        "places.rating",
        "places.userRatingCount",
        "places.currentOpeningHours.openNow",
        "places.regularOpeningHours.openNow",
        "places.photos",
        "places.location",
        "places.primaryTypeDisplayName",
        "places.types",
      ].join(","),
    },
    body: JSON.stringify({
      includedTypes,
      maxResultCount: 20,
      locationRestriction: {
        circle: {
          center: { latitude: lat, longitude: lng },
          radius: 1500, // 1.5km
        },
      },
      languageCode: "ko",
      rankPreference: "POPULARITY",
    }),
    signal: AbortSignal.timeout(8000),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    console.error("[places/nearby] Google API error:", res.status, text.slice(0, 300));
    return [];
  }

  const data = (await res.json()) as GoogleNearbySearchResponse;
  return data.places ?? [];
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const lat = parseFloat(searchParams.get("lat") ?? "");
  const lng = parseFloat(searchParams.get("lng") ?? "");

  if (isNaN(lat) || isNaN(lng)) {
    return NextResponse.json({ error: "lat, lng 파라미터가 필요합니다." }, { status: 400 });
  }

  const apiKey = process.env.GOOGLE_MAPS_API_KEY?.trim();
  if (!apiKey) {
    return NextResponse.json({ error: "GOOGLE_MAPS_API_KEY가 설정되지 않았습니다." }, { status: 500 });
  }

  // 음식 관련 타입을 두 배치로 나눠 요청 (API maxResultCount=20 제한 우회)
  const [batch1, batch2] = await Promise.allSettled([
    searchNearbyPlaces(lat, lng, apiKey, ["restaurant", "cafe", "bar", "meal_takeaway"]),
    searchNearbyPlaces(lat, lng, apiKey, [
      "korean_restaurant", "japanese_restaurant", "chinese_restaurant",
      "italian_restaurant", "fast_food_restaurant", "bakery", "coffee_shop",
    ]),
  ]);

  const allPlaces = [
    ...(batch1.status === "fulfilled" ? batch1.value : []),
    ...(batch2.status === "fulfilled" ? batch2.value : []),
  ];

  // 중복 제거 (place id 기준)
  const seen = new Set<string>();
  const unique = allPlaces.filter((p) => {
    const key = p.id ?? `${p.displayName?.text}-${p.formattedAddress}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  // 음식점이 아닌 타입 필터링 (병원, 주유소 등)
  const foodPlaces = unique.filter((p) => {
    if (!p.types || p.types.length === 0) return true;
    return p.types.some((t) => FOOD_TYPES.includes(t));
  });

  const restaurants: NearbyRestaurant[] = foodPlaces
    .map((p): NearbyRestaurant | null => {
      const name = p.displayName?.text ?? "";
      if (!name) return null;

      const placeLat = p.location?.latitude ?? lat;
      const placeLng = p.location?.longitude ?? lng;
      const distance = calcDistance(lat, lng, placeLat, placeLng);
      const types = p.types ?? [];
      const primaryTypeDisplay = p.primaryTypeDisplayName?.text ?? "";
      const category = inferCategory(types, name, primaryTypeDisplay);

      return {
        id: p.id ?? `${name}-${p.formattedAddress}`,
        name,
        address: p.formattedAddress ?? "",
        rating: p.rating ?? 0,
        reviewCount: p.userRatingCount ?? 0,
        isOpen: p.currentOpeningHours?.openNow ?? p.regularOpeningHours?.openNow ?? null,
        photoRef: p.photos?.[0]?.name ?? null,
        mapUrl: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(name)}&query_place_id=${p.id ?? ""}`,
        category,
        distance,
        sourceCategory: primaryTypeDisplay,
      };
    })
    .filter((r): r is NearbyRestaurant => r !== null)
    .sort((a, b) => distanceToMeters(a.distance) - distanceToMeters(b.distance))
    .slice(0, 30);

  return NextResponse.json({ restaurants });
}
