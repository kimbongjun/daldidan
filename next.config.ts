import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      // Supabase Storage (블로그 썸네일 등)
      { protocol: "https", hostname: "*.supabase.co" },
      // 한국관광공사 TourAPI 이미지
      { protocol: "https", hostname: "*.visitkorea.or.kr" },
      { protocol: "https", hostname: "tong.visitkorea.or.kr" },
      // 기타 공공 이미지 CDN
      { protocol: "https", hostname: "*.gstatic.com" },
    ],
  },
};

export default nextConfig;
