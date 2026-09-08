import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  compress: true,
  experimental: {
    serverActions: {
      bodySizeLimit: "30mb",
    },
    optimizePackageImports: [
      "lucide-react",
      "date-fns",
      "@tiptap/react",
      "@tiptap/starter-kit",
      "@dnd-kit/core",
      "@dnd-kit/sortable",
    ],
  },
  async rewrites() {
    return [
      {
        source: "/firebase-messaging-sw.js",
        destination: "/api/firebase-messaging-sw",
      },
    ];
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
        ],
      },
    ];
  },
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      { protocol: "https", hostname: "*.supabase.co" },
      { protocol: "https", hostname: "*.visitkorea.or.kr" },
      { protocol: "https", hostname: "tong.visitkorea.or.kr" },
      { protocol: "http", hostname: "*.visitkorea.or.kr" },
      { protocol: "http", hostname: "tong.visitkorea.or.kr" },
      { protocol: "http", hostname: "*.seoul.go.kr" },
      { protocol: "https", hostname: "*.seoul.go.kr" },
      { protocol: "https", hostname: "*.gstatic.com" },
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "*.picsum.photos" },
      { protocol: "https", hostname: "picsum.photos" },
    ],
  },
};

export default nextConfig;
