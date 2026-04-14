import { BANGKOK_ITEMS, BANGKOK_CATEGORIES } from "@/lib/data/bangkok";
import BangkokPageClient from "./BangkokPageClient";

export const metadata = {
  title: "방콕 여행 정보 | 달디단",
  description: "방콕 관광지·음식·쇼핑·마켓·술집·스파·호텔 정보를 한눈에",
};

export default function BangkokPage() {
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
            style={{ color: "#F59E0B" }}
          >
            Bangkok · 태국 🇹🇭
          </p>
          <h1
            className="text-2xl font-bold"
            style={{ color: "var(--text-primary)" }}
          >
            방콕 여행 정보
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
            총{" "}
            <span style={{ color: "var(--text-primary)", fontWeight: 700 }}>
              {BANGKOK_ITEMS.length}
            </span>
            개 장소 · {BANGKOK_CATEGORIES.length}개 카테고리
          </p>
        </div>

        <BangkokPageClient items={BANGKOK_ITEMS} categories={BANGKOK_CATEGORIES} />
      </div>
    </div>
  );
}
