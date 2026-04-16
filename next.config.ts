import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        // /firebase-messaging-sw.js 요청을 동적 API 라우트로 매핑
        // → 서버에서 Firebase 설정을 주입한 서비스워커 스크립트 제공
        source: "/firebase-messaging-sw.js",
        destination: "/api/firebase-messaging-sw",
      },
    ];
  },
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
