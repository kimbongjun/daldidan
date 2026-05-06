import PageHeader from "@/components/PageHeader";
import StockFullView from "@/components/stock/StockFullView";

const ACCENT = "#F05C6E";

export default function StockPage() {
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
          maxWidth: 720,
          margin: "0 auto",
          padding: "0 1rem 4rem",
          width: "100%",
          boxSizing: "border-box",
        }}
      >
        <PageHeader
          title="국내 증시 포털"
          subtitle="관심종목 · 랭킹 · 신규 상장"
          accentColor={ACCENT}
          backHref="/"
        />
        <StockFullView />
      </div>
    </div>
  );
}
