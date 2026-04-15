import { NextRequest, NextResponse } from "next/server";

type RestaurantCategory = "한식" | "중식" | "양식" | "퓨전";

const KOREAN_TYPES = ["korean_restaurant"];
const CHINESE_TYPES = ["chinese_restaurant"];
const WESTERN_TYPES = [
  "american_restaurant",
  "italian_restaurant",
  "pizza_restaurant",
  "hamburger_restaurant",
  "french_restaurant",
  "european_restaurant",
  "seafood_restaurant",
  "greek_restaurant",
  "mediterranean_restaurant",
  "spanish_restaurant",
  "steak_house",
];

function mapCategory(types: string[]): RestaurantCategory {
  if (types.some((t) => KOREAN_TYPES.includes(t))) return "한식";
  if (types.some((t) => CHINESE_TYPES.includes(t))) return "중식";
  if (types.some((t) => WESTERN_TYPES.includes(t))) return "양식";
  return "퓨전";
}

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

interface GooglePlace {
  id?: string;
  displayName?: { text?: string };
  formattedAddress?: string;
  rating?: number;
  userRatingCount?: number;
  currentOpeningHours?: { openNow?: boolean };
  photos?: Array<{ name?: string }>;
  location?: { latitude?: number; longitude?: number };
  googleMapsUri?: string;
  types?: string[];
  businessStatus?: string;
}

interface GoogleNearbyResponse {
  places?: GooglePlace[];
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

  const response = await fetch("https://places.googleapis.com/v1/places:searchNearby", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask":
        "places.id,places.displayName,places.formattedAddress,places.rating,places.userRatingCount,places.currentOpeningHours,places.photos,places.location,places.googleMapsUri,places.types,places.businessStatus",
    },
    body: JSON.stringify({
      includedTypes: ["restaurant"],
      maxResultCount: 20,
      locationRestriction: {
        circle: {
          center: { latitude: lat, longitude: lng },
          radius: 1500,
        },
      },
      languageCode: "ko",
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    const text = await response.text();
    return NextResponse.json({ error: text }, { status: 500 });
  }

  const data = (await response.json()) as GoogleNearbyResponse;
  const restaurants = (data.places ?? [])
    .filter((p) => p.businessStatus !== "CLOSED_PERMANENTLY")
    .map((p) => ({
      id: p.id ?? "",
      name: p.displayName?.text ?? "",
      address: p.formattedAddress ?? "",
      rating: p.rating ?? 0,
      reviewCount: p.userRatingCount ?? 0,
      isOpen: p.currentOpeningHours?.openNow ?? null,
      photoRef: p.photos?.[0]?.name ?? null,
      googleMapsUri:
        p.googleMapsUri ??
        `https://www.google.com/maps/search/${encodeURIComponent(p.displayName?.text ?? "")}`,
      types: p.types ?? [],
      category: mapCategory(p.types ?? []),
      distance: calcDistance(lat, lng, p.location?.latitude ?? lat, p.location?.longitude ?? lng),
    }));

  return NextResponse.json({ restaurants });
}
