import { NextRequest, NextResponse } from "next/server";

interface GooglePlaceSearchResponse {
  places?: Array<{
    id?: string;
    displayName?: { text?: string };
    formattedAddress?: string;
    location?: {
      latitude?: number;
      longitude?: number;
    };
  }>;
}

export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.GOOGLE_MAPS_API_KEY?.trim();
    if (!apiKey) {
      return NextResponse.json({ error: "GOOGLE_MAPS_API_KEY가 설정되지 않았습니다." }, { status: 500 });
    }

    const body = await request.json() as { query?: string };
    const query = body.query?.trim() ?? "";

    if (!query) {
      return NextResponse.json({ error: "장소명을 입력해주세요." }, { status: 400 });
    }

    const response = await fetch("https://places.googleapis.com/v1/places:searchText", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": "places.id,places.displayName,places.formattedAddress,places.location",
      },
      body: JSON.stringify({
        textQuery: query,
        languageCode: "ko",
        maxResultCount: 5,
      }),
      cache: "no-store",
    });

    if (!response.ok) {
      const message = await response.text();
      return NextResponse.json({ error: message || "Google Places 검색에 실패했습니다." }, { status: 500 });
    }

    const data = await response.json() as GooglePlaceSearchResponse;
    const places = (data.places ?? [])
      .filter((place) => place.displayName?.text && place.formattedAddress && place.location?.latitude !== undefined && place.location?.longitude !== undefined)
      .map((place) => ({
        id: place.id ?? `${place.displayName?.text}-${place.formattedAddress}`,
        name: place.displayName?.text ?? "",
        formattedAddress: place.formattedAddress ?? "",
        lat: place.location?.latitude ?? 0,
        lng: place.location?.longitude ?? 0,
      }));

    return NextResponse.json({ places });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Google Places 검색에 실패했습니다." },
      { status: 500 },
    );
  }
}
