import { getFestivalItems } from "@/lib/data/festival";
import FestivalPageClient from "./FestivalPageClient";

export const revalidate = 3600;

export default async function FestivalPage() {
  const { items, source } = await getFestivalItems();

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
        {/* 페이지 헤더 */}
        <div style={{ marginBottom: "2rem" }}>
          <p
            className="text-xs font-semibold uppercase tracking-widest mb-1"
            style={{ color: "#10B981" }}
          >
            축제 / 행사
          </p>
          <h1
            className="text-2xl font-bold"
            style={{ color: "var(--text-primary)" }}
          >
            국내 행사·축제
          </h1>
        </div>

        <FestivalPageClient items={items} source={source} />
      </div>
    </div>
  );
}
