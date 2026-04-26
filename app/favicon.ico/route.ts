import { NextResponse } from "next/server";
import { readFile } from "fs/promises";
import path from "path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function fetchFaviconUrl(): Promise<string> {
  try {
    const { createAdminClient } = await import("@/lib/supabase/server");
    const admin = createAdminClient();
    const { data } = await admin
      .from("site_settings")
      .select("key, value")
      .in("key", ["favicon_url", "pwa_icon_url"]);

    const settings = Object.fromEntries((data ?? []).map((row) => [row.key, row.value]));
    return settings.favicon_url || settings.pwa_icon_url || "";
  } catch {
    return "";
  }
}

async function serveDefaultFavicon(): Promise<NextResponse> {
  try {
    const filePath = path.join(process.cwd(), "app", "favicon.ico");
    const buf = await readFile(filePath);
    return new NextResponse(buf, {
      status: 200,
      headers: {
        "Content-Type": "image/x-icon",
        "Cache-Control": "public, max-age=86400",
      },
    });
  } catch {
    return new NextResponse(null, { status: 204 });
  }
}

export async function GET() {
  const faviconUrl = await fetchFaviconUrl();

  if (!faviconUrl) {
    return serveDefaultFavicon();
  }

  try {
    const upstream = await fetch(faviconUrl, { next: { revalidate: 3600 } });
    if (!upstream.ok) return serveDefaultFavicon();

    const contentType = upstream.headers.get("content-type") ?? "image/png";
    const buf = await upstream.arrayBuffer();

    return new NextResponse(buf, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
      },
    });
  } catch {
    return serveDefaultFavicon();
  }
}
