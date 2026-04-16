import { NextRequest, NextResponse } from "next/server";

interface GooglePhotoMediaResponse {
  photoUri?: string;
}

const SVG_HEADERS = {
  "Content-Type": "image/svg+xml; charset=utf-8",
  "Cache-Control": "public, max-age=300, s-maxage=300",
};

function fallbackImage() {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300">
      <defs>
        <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#2a241d" />
          <stop offset="100%" stop-color="#4a2a14" />
        </linearGradient>
      </defs>
      <rect width="400" height="300" fill="url(#bg)" />
      <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-size="72">🍽️</text>
    </svg>
  `.trim();

  return new NextResponse(svg, { status: 200, headers: SVG_HEADERS });
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const name = searchParams.get("name");

  if (!name) {
    return fallbackImage();
  }

  const apiKey = process.env.GOOGLE_MAPS_API_KEY?.trim();
  if (!apiKey) {
    return fallbackImage();
  }

  if (!name.startsWith("places/")) {
    return fallbackImage();
  }

  try {
    // skipHttpRedirect=true -> JSON with photoUri (CDN URL, no API key exposed)
    const metaRes = await fetch(
      `https://places.googleapis.com/v1/${name}/media?key=${apiKey}&maxWidthPx=400&skipHttpRedirect=true`,
      {
        next: { revalidate: 86400 },
        signal: AbortSignal.timeout(5000),
      },
    );

    if (!metaRes.ok) {
      return fallbackImage();
    }

    const meta = (await metaRes.json()) as GooglePhotoMediaResponse;
    const photoUri = meta.photoUri;

    if (!photoUri) {
      return fallbackImage();
    }

    // Redirect to Google CDN URL (always HTTPS, no API key in URL)
    return NextResponse.redirect(photoUri);
  } catch {
    return fallbackImage();
  }
}
