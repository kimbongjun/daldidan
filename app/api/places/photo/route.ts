import { NextRequest, NextResponse } from "next/server";

interface GooglePhotoMediaResponse {
  photoUri?: string;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const name = searchParams.get("name");

  if (!name) {
    return new NextResponse(null, { status: 400 });
  }

  const apiKey = process.env.GOOGLE_MAPS_API_KEY?.trim();
  if (!apiKey) {
    return new NextResponse(null, { status: 500 });
  }

  // skipHttpRedirect=true → JSON with photoUri (CDN URL, no API key exposed)
  const metaRes = await fetch(
    `https://places.googleapis.com/v1/${name}/media?key=${apiKey}&maxWidthPx=400&skipHttpRedirect=true`,
    { next: { revalidate: 86400 } },
  );

  if (!metaRes.ok) {
    return new NextResponse(null, { status: 404 });
  }

  const meta = (await metaRes.json()) as GooglePhotoMediaResponse;
  const photoUri = meta.photoUri;

  if (!photoUri) {
    return new NextResponse(null, { status: 404 });
  }

  // Redirect to Google CDN URL (always HTTPS, no API key in URL)
  return NextResponse.redirect(photoUri);
}
