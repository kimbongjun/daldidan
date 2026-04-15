import RestaurantPageClient from "./RestaurantPageClient";

export const metadata = {
  title: "주변 맛집",
  description: "현위치 기준 카테고리별 맛집 추천",
};

export default function RestaurantsPage() {
  return (
    <div
      style={{
        background: "var(--bg-base)",
        minHeight: "100vh",
        width: "100%",
      }}
    >
      <div
        style={{
          maxWidth: 1200,
          margin: "0 auto",
          padding: "2rem 1rem 4rem",
          width: "100%",
          boxSizing: "border-box",
        }}
      >
        <div style={{ marginBottom: "2rem" }}>
          <p
            className="text-xs font-semibold uppercase tracking-widest mb-1"
            style={{ color: "#EA580C" }}
          >
            맛집 추천
          </p>
          <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>
            주변 맛집
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
            현위치 기준 카테고리별 맛집을 확인하세요
          </p>
        </div>

        <RestaurantPageClient />
      </div>
    </div>
  );
}
