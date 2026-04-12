import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";
import ThemeProvider from "@/components/ThemeProvider";

export const metadata: Metadata = {
  title: "달디단 — 일상의 편리함",
  description: "날씨, 쇼핑, 영화, 여행, 가계부를 한 곳에서",
};

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
