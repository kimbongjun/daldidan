import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

async function fetchFaviconUrl() {
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

export async function GET() {
  const faviconUrl = await fetchFaviconUrl();

  if (faviconUrl) {
    return NextResponse.redirect(faviconUrl, { status: 307 });
  }

  return new NextResponse(null, { status: 204 });
}
