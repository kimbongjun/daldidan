import { NextRequest, NextResponse } from "next/server";

interface AddressComponent {
  long_name: string;
  short_name: string;
  types: string[];
}

interface GeocodingResponse {
  results: Array<{
    address_components: AddressComponent[];
  }>;
  status: string;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const lat = searchParams.get("lat");
  const lng = searchParams.get("lng");

  if (!lat || !lng) {
    return NextResponse.json({ error: "lat, lng 파라미터가 필요합니다." }, { status: 400 });
  }

  const apiKey = process.env.GOOGLE_MAPS_API_KEY?.trim();
  if (!apiKey) {
    return NextResponse.json({ error: "GOOGLE_MAPS_API_KEY가 설정되지 않았습니다." }, { status: 500 });
  }

  try {
    const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${apiKey}&language=ko`;
    const response = await fetch(url, { cache: "no-store" });
    const data = await response.json() as GeocodingResponse;

    if (data.status !== "OK" || !data.results.length) {
      return NextResponse.json({ location: null });
    }

    const components = data.results[0].address_components;

    const getComp = (...types: string[]) =>
      components.find((c) => types.some((t) => c.types.includes(t)))?.long_name ?? "";

    const countryCode =
      components.find((c) => c.types.includes("country"))?.short_name ?? "";

    if (countryCode === "KR") {
      // 한국: 시(locality) + 구(sublocality_level_1)
      const city = getComp("locality", "administrative_area_level_1");
      const district = getComp("sublocality_level_1");
      const location = [city, district].filter(Boolean).join(" ");
      return NextResponse.json({ location, countryCode });
    } else {
      // 해외: 국가 + 도시
      const country = getComp("country");
      const city = getComp("locality", "administrative_area_level_1");
      const location = [country, city].filter(Boolean).join(", ");
      return NextResponse.json({ location, countryCode });
    }
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "위치 정보를 가져오지 못했습니다." },
      { status: 500 },
    );
  }
}
