import { NextRequest, NextResponse } from "next/server";

interface KakaoPlaceDocument {
  id: string;
  place_name: string;
  road_address_name: string;
  address_name: string;
  x: string; // longitude
  y: string; // latitude
}

interface KakaoLocalSearchResponse {
  documents: KakaoPlaceDocument[];
  meta: {
    total_count: number;
    pageable_count: number;
    is_end: boolean;
  };
}

export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.KAKAO_REST_API_KEY?.trim();
    if (!apiKey) {
      return NextResponse.json({ error: "KAKAO_REST_API_KEY가 설정되지 않았습니다." }, { status: 500 });
    }

    const body = await request.json() as { query?: string };
    const query = body.query?.trim() ?? "";

    if (!query) {
      return NextResponse.json({ error: "장소명을 입력해주세요." }, { status: 400 });
    }

    const params = new URLSearchParams({ query, size: "5" });
    const response = await fetch(`https://dapi.kakao.com/v2/local/search/keyword.json?${params}`, {
      headers: {
        Authorization: `KakaoAK ${apiKey}`,
      },
      cache: "no-store",
    });

    if (!response.ok) {
      const message = await response.text();
      return NextResponse.json({ error: message || "카카오 장소 검색에 실패했습니다." }, { status: 500 });
    }

    const data = await response.json() as KakaoLocalSearchResponse;
    const places = data.documents.map((doc) => ({
      id: doc.id,
      name: doc.place_name,
      formattedAddress: doc.road_address_name || doc.address_name,
      lat: parseFloat(doc.y),
      lng: parseFloat(doc.x),
    }));

    return NextResponse.json({ places });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "카카오 장소 검색에 실패했습니다." },
      { status: 500 },
    );
  }
}
