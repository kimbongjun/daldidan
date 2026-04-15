import type { Metadata, Viewport } from "next";
import Script from "next/script";
import "./globals.css";
import ThemeProvider from "@/components/ThemeProvider";

export const dynamic = "force-dynamic";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

async function fetchSiteSettings(): Promise<Record<string, string>> {
  try {
    // 서버 사이드에서 직접 Supabase에서 읽기
    const { createAdminClient } = await import("@/lib/supabase/server");
    const admin = createAdminClient();
    const { data } = await admin.from("site_settings").select("key, value");
    const settings: Record<string, string> = {};
    for (const row of data ?? []) settings[row.key] = row.value;
    return settings;
  } catch {
    return {};
  }
}

export async function generateMetadata(): Promise<Metadata> {
  const s = await fetchSiteSettings();

  const title = s.meta_title || "달디단 — 일상의 편리함";
  const description = s.meta_description || "날씨, 쇼핑, 영화, 여행, 가계부를 한 곳에서";
  const ogImage = s.meta_og_image || undefined;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      ...(ogImage ? { images: [{ url: ogImage }] } : {}),
    },
  };
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" data-theme="dark" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <Script id="theme-init" strategy="beforeInteractive">
          {`
            try {
              var raw = localStorage.getItem('daldidan-theme');
              var parsed = raw ? JSON.parse(raw) : null;
              var theme = parsed && parsed.state && parsed.state.theme ? parsed.state.theme : 'dark';
              document.documentElement.setAttribute('data-theme', theme);
            } catch (error) {
              document.documentElement.setAttribute('data-theme', 'dark');
            }
          `}
        </Script>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
