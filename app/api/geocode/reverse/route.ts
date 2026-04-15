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

  // Google Maps API 시도 (키가 설정된 경우)
  if (apiKey) {
    try {
      const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${apiKey}&language=ko`;
      const response = await fetch(url, { cache: "no-store" });
      const data = await response.json() as GeocodingResponse;

      if (data.status === "OK" && data.results.length) {
        const components = data.results[0].address_components;

        const getComp = (...types: string[]) =>
          components.find((c) => types.some((t) => c.types.includes(t)))?.long_name ?? "";

        const countryCode =
          components.find((c) => c.types.includes("country"))?.short_name ?? "";

        if (countryCode === "KR") {
          const city = getComp("locality", "administrative_area_level_1");
          const district = getComp("sublocality_level_1");
          const location = [city, district].filter(Boolean).join(" ");
          if (location) return NextResponse.json({ location, countryCode });
        } else {
          const country = getComp("country");
          const city = getComp("locality", "administrative_area_level_1");
          const location = [country, city].filter(Boolean).join(", ");
          if (location) return NextResponse.json({ location, countryCode });
        }
      }
    } catch {
      // Google API 실패 시 Nominatim으로 폴백
    }
  }

  // Nominatim(OpenStreetMap) 폴백 — API 키 불필요
  try {
    interface NominatimAddress {
      city?: string;
      town?: string;
      village?: string;
      city_district?: string;
      suburb?: string;
      state?: string;
      country?: string;
      country_code?: string;
    }
    interface NominatimResponse {
      address?: NominatimAddress;
      error?: string;
    }

    const nominatimUrl = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&accept-language=ko`;
    const res = await fetch(nominatimUrl, {
      cache: "no-store",
      headers: { "User-Agent": "daldidan-app/1.0" },
    });
    const data = await res.json() as NominatimResponse;

    if (!data.address) return NextResponse.json({ location: null });

    const addr = data.address;
    const countryCode = addr.country_code?.toUpperCase() ?? "";
    const city = addr.city ?? addr.town ?? addr.village ?? addr.state ?? "";
    const district = addr.city_district ?? addr.suburb ?? "";

    let location: string;
    if (countryCode === "KR") {
      location = [city, district].filter(Boolean).join(" ");
    } else {
      location = [addr.country, city].filter(Boolean).join(", ");
    }

    return NextResponse.json({ location: location || null, countryCode });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "위치 정보를 가져오지 못했습니다." },
      { status: 500 },
    );
  }
}
