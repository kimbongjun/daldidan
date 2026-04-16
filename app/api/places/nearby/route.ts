import { NextRequest, NextResponse } from "next/server";

type RestaurantCategory = "한식" | "중식" | "양식" | "아시안" | "분식" | "주점" | "카페" | "퓨전";

function calcDistance(lat1: number, lng1: number, lat2: number, lng2: number): string {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  const d = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return d < 1 ? `${Math.round(d * 1000)}m` : `${d.toFixed(1)}km`;
}

interface NaverReverseGeocodeResponse {
  results?: Array<{
    region?: {
      area1?: { name?: string };
      area2?: { name?: string };
      area3?: { name?: string };
    };
  }>;
}

interface NaverLocalItem {
  title?: string;
  link?: string;
  category?: string;
  description?: string;
  telephone?: string;
  address?: string;
  roadAddress?: string;
}

interface NaverLocalResponse {
  items?: NaverLocalItem[];
}

interface NaverGeocodeResponse {
  addresses?: Array<{
    x?: string;
    y?: string;
    distance?: number;
    roadAddress?: string;
    jibunAddress?: string;
  }>;
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

const CATEGORY_SEARCH_TERMS: Record<RestaurantCategory, string[]> = {
  한식: ["한식", "백반"],
  중식: ["중식", "짜장면"],
  양식: ["양식", "파스타"],
  아시안: ["아시안", "쌀국수", "일식"],
  분식: ["분식", "떡볶이"],
  주점: ["술집", "이자카야"],
  카페: ["카페", "커피"],
  퓨전: ["퓨전", "오마카세"],
};

const CATEGORY_HINTS: Array<{ category: RestaurantCategory; keywords: string[] }> = [
  { category: "카페", keywords: ["카페", "커피", "베이커리", "디저트", "도넛"] },
  { category: "주점", keywords: ["술집", "포차", "이자카야", "호프", "맥주", "와인", "바", "펍"] },
  { category: "분식", keywords: ["분식", "떡볶이", "김밥", "순대", "라면", "오뎅"] },
  { category: "중식", keywords: ["중식", "중국", "짜장면", "짬뽕", "마라", "양꼬치"] },
  { category: "한식", keywords: ["한식", "국밥", "백반", "고기", "냉면", "찌개"] },
  { category: "아시안", keywords: ["아시아", "일식", "일본", "쌀국수", "베트남", "태국", "인도", "스시", "라멘"] },
  { category: "양식", keywords: ["양식", "이탈리아", "파스타", "피자", "프렌치", "햄버거", "스테이크", "브런치"] },
  { category: "퓨전", keywords: ["퓨전", "오마카세", "다이닝", "코스"] },
];

function stripMarkup(value: string) {
  return value
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, "\"")
    .trim();
}

function inferCategory(title: string, categoryText: string, fallback: RestaurantCategory): RestaurantCategory {
  const source = `${title} ${categoryText}`.toLowerCase();
  const matched = CATEGORY_HINTS.find(({ keywords }) =>
    keywords.some((keyword) => source.includes(keyword.toLowerCase())),
  );
  return matched?.category ?? fallback;
}

function formatDistanceFromMeters(meters?: number | null) {
  if (typeof meters !== "number" || !Number.isFinite(meters)) return "";
  return meters < 1000 ? `${Math.round(meters)}m` : `${(meters / 1000).toFixed(1)}km`;
}

function distanceToMeters(distance: string) {
  if (distance.endsWith("m")) return parseFloat(distance);
  if (distance.endsWith("km")) return parseFloat(distance) * 1000;
  return Number.POSITIVE_INFINITY;
}

function buildNaverMapUrl(name: string, address: string) {
  return `https://map.naver.com/p/search/${encodeURIComponent(`${name} ${address}`.trim())}`;
}

async function reverseRegion(lat: number, lng: number, clientId: string, clientSecret: string) {
  const url = new URL("https://naveropenapi.apigw-pub.fin-ntruss.com/map-reversegeocode/v2/gc");
  url.searchParams.set("coords", `${lng},${lat}`);
  url.searchParams.set("sourcecrs", "epsg:4326");
  url.searchParams.set("orders", "legalcode,admcode");
  url.searchParams.set("output", "json");

  const response = await fetch(url, {
    cache: "no-store",
    headers: {
      "X-NCP-APIGW-API-KEY-ID": clientId,
      "X-NCP-APIGW-API-KEY": clientSecret,
    },
  });

  if (!response.ok) return null;
  const data = await response.json() as NaverReverseGeocodeResponse;
  const region = data.results?.[0]?.region;
  const area1 = region?.area1?.name ?? "";
  const area2 = region?.area2?.name ?? "";
  const area3 = region?.area3?.name ?? "";
  return { area1, area2, area3 };
}

async function searchLocal(query: string, clientId: string, clientSecret: string) {
  const url = new URL("https://openapi.naver.com/v1/search/local.json");
  url.searchParams.set("query", query);
  url.searchParams.set("display", "5");
  url.searchParams.set("start", "1");
  url.searchParams.set("sort", "comment");

  const response = await fetch(url, {
    cache: "no-store",
    headers: {
      "X-Naver-Client-Id": clientId,
      "X-Naver-Client-Secret": clientSecret,
    },
  });

  if (!response.ok) return [];
  const data = await response.json() as NaverLocalResponse;
  return data.items ?? [];
}

async function geocodeAddress(address: string, lng: number, lat: number, clientId: string, clientSecret: string) {
  const url = new URL("https://naveropenapi.apigw-pub.fin-ntruss.com/map-geocode/v2/geocode");
  url.searchParams.set("query", address);
  url.searchParams.set("coordinate", `${lng},${lat}`);

  const response = await fetch(url, {
    cache: "no-store",
    headers: {
      "X-NCP-APIGW-API-KEY-ID": clientId,
      "X-NCP-APIGW-API-KEY": clientSecret,
    },
  });

  if (!response.ok) return null;
  const data = await response.json() as NaverGeocodeResponse;
  return data.addresses?.[0] ?? null;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const lat = parseFloat(searchParams.get("lat") ?? "");
  const lng = parseFloat(searchParams.get("lng") ?? "");

  if (isNaN(lat) || isNaN(lng)) {
    return NextResponse.json({ error: "lat, lng 파라미터가 필요합니다." }, { status: 400 });
  }

  const clientId = process.env.NAVER_CLIENT_ID?.trim();
  const clientSecret = process.env.NAVER_CLIENT_SECRET?.trim();

  if (!clientId || !clientSecret) {
    return NextResponse.json({ error: "NAVER_CLIENT_ID / NAVER_CLIENT_SECRET가 설정되지 않았습니다." }, { status: 500 });
  }

  const region = await reverseRegion(lat, lng, clientId, clientSecret);
  const areaQuery = [region?.area2, region?.area3].filter(Boolean).join(" ").trim()
    || region?.area2
    || region?.area1
    || "현재 위치";

  const entries = await Promise.all(
    (Object.entries(CATEGORY_SEARCH_TERMS) as Array<[RestaurantCategory, string[]]>).map(
      async ([category, terms]) => {
        const results = await Promise.all(
          terms.map((term) => searchLocal(`${areaQuery} ${term}`, clientId, clientSecret)),
        );
        return results.flat().map((item) => ({ item, fallbackCategory: category }));
      },
    ),
  );

  const uniqueMap = new Map<string, { item: NaverLocalItem; fallbackCategory: RestaurantCategory }>();
  for (const result of entries.flat()) {
    const title = stripMarkup(result.item.title ?? "");
    const address = result.item.roadAddress || result.item.address || "";
    if (!title || !address) continue;
    const key = `${title}::${address}`;
    if (!uniqueMap.has(key)) {
      uniqueMap.set(key, result);
    }
  }

  const restaurants = (await Promise.all(
    Array.from(uniqueMap.values()).map(async ({ item, fallbackCategory }) => {
      const name = stripMarkup(item.title ?? "");
      const sourceCategory = item.category ?? "";
      const category = inferCategory(name, sourceCategory, fallbackCategory);
      const address = item.roadAddress || item.address || "";
      const geocoded = address
        ? await geocodeAddress(address, lng, lat, clientId, clientSecret)
        : null;
      const targetLng = geocoded?.x ? parseFloat(geocoded.x) : NaN;
      const targetLat = geocoded?.y ? parseFloat(geocoded.y) : NaN;
      const geocodeDistance = formatDistanceFromMeters(geocoded?.distance);
      const fallbackDistance =
        Number.isFinite(targetLat) && Number.isFinite(targetLng)
          ? calcDistance(lat, lng, targetLat, targetLng)
          : "";

      const roadAddress = geocoded?.roadAddress || item.roadAddress || item.address || "";

      const restaurant: NearbyRestaurant = {
        id: `${category}-${name}-${roadAddress}`.replace(/\s+/g, "-"),
        name,
        address: roadAddress,
        rating: 0,
        reviewCount: 0,
        isOpen: null,
        photoRef: null,
        mapUrl: buildNaverMapUrl(name, roadAddress),
        category,
        distance: geocodeDistance || fallbackDistance || "근처",
        sourceCategory,
      };

      return restaurant;
    }),
  ))
    .filter((restaurant) => !!restaurant.name && !!restaurant.address)
    .sort((a, b) => {
      return distanceToMeters(a.distance) - distanceToMeters(b.distance);
    })
    .slice(0, 30);

  return NextResponse.json({ restaurants });
}
