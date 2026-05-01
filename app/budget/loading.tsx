import { SkeletonBlock, SkeletonInput } from "@/components/ui/Skeleton";

export default function BudgetLoading() {
  return (
    <div className="min-h-screen" style={{ background: "var(--bg-base)" }}>
      <div className="max-w-[1100px] mx-auto px-4 sm:px-6 pb-16">

        {/* PageHeader */}
        <div style={{ paddingTop: "2rem", paddingBottom: "1.5rem" }}>
          <SkeletonBlock width={80} height={12} radius={6} />
          <SkeletonBlock width={120} height={28} radius={8} style={{ marginTop: 8 }} />
          <SkeletonBlock width={200} height={14} radius={6} style={{ marginTop: 6 }} />
        </div>

        {/* 월 선택 네비게이터 */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "1rem", marginBottom: "1.25rem" }}>
          <SkeletonBlock width={32} height={32} radius={8} />
          <SkeletonBlock width={110} height={22} radius={6} />
          <SkeletonBlock width={32} height={32} radius={8} />
        </div>

        {/* 2컬럼 그리드 — lg:grid-cols-[1fr_360px] */}
        <style>{`
          @media (min-width: 1024px) {
            .budget-sk-grid { grid-template-columns: 1fr 360px; }
          }
        `}</style>
        <div className="budget-sk-grid" style={{ display: "grid", gap: "1.5rem" }}>

          {/* 왼쪽: 입력 폼 + 거래 목록 */}
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>

            {/* 입력 폼 카드 */}
            <div className="bento-card" style={{ padding: "1.25rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
              {/* 폼 제목 */}
              <SkeletonBlock width={80} height={14} radius={6} />
              {/* 수입/지출 토글 */}
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <SkeletonBlock height={38} radius={8} style={{ flex: 1 }} />
                <SkeletonBlock height={38} radius={8} style={{ flex: 1 }} />
              </div>
              {/* OCR 업로더 */}
              <SkeletonBlock height={48} radius={10} />
              {/* 카테고리 + 구매자 */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                <div>
                  <SkeletonBlock width={55} height={12} radius={6} style={{ marginBottom: 6 }} />
                  <SkeletonInput />
                </div>
                <div>
                  <SkeletonBlock width={55} height={12} radius={6} style={{ marginBottom: 6 }} />
                  <SkeletonInput />
                </div>
              </div>
              {/* 금액 + 날짜 */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                <div>
                  <SkeletonBlock width={55} height={12} radius={6} style={{ marginBottom: 6 }} />
                  <SkeletonInput />
                </div>
                <div>
                  <SkeletonBlock width={40} height={12} radius={6} style={{ marginBottom: 6 }} />
                  <SkeletonInput />
                </div>
              </div>
              {/* 매장명 + 위치 */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                <div>
                  <SkeletonBlock width={48} height={12} radius={6} style={{ marginBottom: 6 }} />
                  <SkeletonInput />
                </div>
                <div>
                  <SkeletonBlock width={36} height={12} radius={6} style={{ marginBottom: 6 }} />
                  <SkeletonInput />
                </div>
              </div>
              {/* 메모 */}
              <div>
                <SkeletonBlock width={36} height={12} radius={6} style={{ marginBottom: 6 }} />
                <SkeletonInput />
              </div>
              {/* 추가 버튼 */}
              <SkeletonBlock height={44} radius={10} />
            </div>

            {/* 거래 내역 목록 카드 */}
            <div className="bento-card" style={{ padding: "1.25rem" }}>
              <SkeletonBlock width={80} height={14} radius={6} style={{ marginBottom: "0.75rem" }} />
              <div style={{ display: "flex", flexDirection: "column", gap: "0.375rem" }}>
                {Array.from({ length: 7 }).map((_, i) => (
                  <div
                    key={i}
                    style={{
                      display: "flex", alignItems: "center", gap: "0.625rem",
                      padding: "0.625rem 0.75rem", borderRadius: "0.75rem",
                      background: "rgba(255,255,255,0.025)",
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <SkeletonBlock width="52%" height={14} radius={6} />
                      <div style={{ display: "flex", gap: "0.375rem", marginTop: 4 }}>
                        <SkeletonBlock width={44} height={16} radius={4} />
                        <SkeletonBlock width={44} height={16} radius={4} />
                        <SkeletonBlock width={70} height={12} radius={6} />
                      </div>
                    </div>
                    <SkeletonBlock width={72} height={14} radius={6} />
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 오른쪽: 요약 + 정산 + 예산한도 + 차트 */}
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>

            {/* 요약 카드 */}
            <div className="bento-card" style={{ padding: "1.25rem" }}>
              <SkeletonBlock width={80} height={14} radius={6} style={{ marginBottom: "0.75rem" }} />
              <SkeletonBlock width={130} height={32} radius={8} style={{ marginBottom: "0.75rem" }} />
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                {["수입", "지출"].map((_, i) => (
                  <div key={i}>
                    <SkeletonBlock width={36} height={12} radius={6} />
                    <SkeletonBlock width={80} height={20} radius={6} style={{ marginTop: 4 }} />
                  </div>
                ))}
              </div>
            </div>

            {/* 정산 패널 */}
            <div className="bento-card" style={{ padding: "1.25rem" }}>
              <SkeletonBlock width={80} height={14} radius={6} style={{ marginBottom: "0.75rem" }} />
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <SkeletonBlock width={56} height={14} radius={6} />
                    <SkeletonBlock width={80} height={14} radius={6} />
                  </div>
                ))}
              </div>
            </div>

            {/* 예산 한도 패널 */}
            <div className="bento-card" style={{ padding: "1.25rem" }}>
              <SkeletonBlock width={100} height={14} radius={6} style={{ marginBottom: "0.75rem" }} />
              <div style={{ display: "flex", flexDirection: "column", gap: "0.625rem" }}>
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <SkeletonBlock width={40} height={12} radius={6} />
                    <div style={{ flex: 1, height: 6, borderRadius: 3, background: "var(--border)" }} />
                    <SkeletonBlock width={52} height={12} radius={6} />
                  </div>
                ))}
              </div>
            </div>

            {/* 차트 카드 */}
            <div className="bento-card" style={{ padding: "1.25rem" }}>
              <SkeletonBlock width={80} height={14} radius={6} style={{ marginBottom: "0.75rem" }} />
              <SkeletonBlock height={180} radius={10} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
