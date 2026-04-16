import type { MetadataRoute } from "next";

export const revalidate = 0;

async function fetchPwaIconUrl(): Promise<string> {
  try {
    const { createAdminClient } = await import("@/lib/supabase/server");
    const admin = createAdminClient();
    const { data } = await admin
      .from("site_settings")
      .select("value")
      .eq("key", "pwa_icon_url")
      .single();
    return data?.value ?? "";
  } catch {
    return "";
  }
}

export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const iconUrl = await fetchPwaIconUrl();

  const icons: MetadataRoute.Manifest["icons"] = [
    { src: "/favicon.ico", sizes: "any", type: "image/x-icon" },
  ];

  if (iconUrl) {
    icons.push(
      { src: iconUrl, sizes: "192x192", type: "image/png", purpose: "any" },
      { src: iconUrl, sizes: "512x512", type: "image/png", purpose: "maskable" },
    );
  }

  return {
    name: "달디단",
    short_name: "달디단",
    description: "일상의 편리함을 제공하는 웹앱",
    start_url: "/",
    display: "standalone",
    background_color: "#0F0F14",
    theme_color: "#6366F1",
    orientation: "portrait",
    icons,
  };
}
