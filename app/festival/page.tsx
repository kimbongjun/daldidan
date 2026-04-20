import { getFestivalItems } from "@/lib/data/festival";
import PageHeader from "@/components/PageHeader";
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
          padding: "0 1rem 4rem",
          width: "100%",
          boxSizing: "border-box",
        }}
      >
        <PageHeader
          title="국내 행사·축제"
          subtitle="축제 / 행사"
          accentColor="#10B981"
          backHref="/"
        />

        <FestivalPageClient items={items} source={source} />
      </div>
    </div>
  );
}
