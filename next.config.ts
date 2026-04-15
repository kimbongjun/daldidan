import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      // Supabase Storage (블로그 썸네일 등)
      { protocol: "https", hostname: "*.supabase.co" },
      // 한국관광공사 TourAPI 이미지 (https)
      { protocol: "https", hostname: "*.visitkorea.or.kr" },
      { protocol: "https", hostname: "tong.visitkorea.or.kr" },
      // 한국관광공사 TourAPI 이미지 (http — mixed content 대응)
      { protocol: "http", hostname: "*.visitkorea.or.kr" },
      { protocol: "http", hostname: "tong.visitkorea.or.kr" },
      // 서울 열린데이터 이미지
      { protocol: "http", hostname: "*.seoul.go.kr" },
      { protocol: "https", hostname: "*.seoul.go.kr" },
      // 기타 공공 이미지 CDN
      { protocol: "https", hostname: "*.gstatic.com" },
      // Unsplash (fallback 이미지)
      { protocol: "https", hostname: "images.unsplash.com" },
    ],
  },
};

export default nextConfig;
