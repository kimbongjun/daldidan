import { SkeletonBlock } from "@/components/ui/Skeleton";

export default function BlogLoading() {
  return (
    <div className="min-h-screen" style={{ background: "var(--bg-base)" }}>
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 pb-12">

        {/* PageHeader: accent 라벨 + 제목 + 부제목 + 글쓰기 버튼 */}
        <div style={{ paddingTop: "2rem", paddingBottom: "1.5rem", display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: "1rem" }}>
          <div>
            <SkeletonBlock width={60} height={12} radius={6} />
            <SkeletonBlock width={100} height={28} radius={8} style={{ marginTop: 8 }} />
            <SkeletonBlock width={200} height={14} radius={6} style={{ marginTop: 6 }} />
          </div>
          {/* 글쓰기 버튼 */}
          <SkeletonBlock width={80} height={38} radius={10} />
        </div>

        {/* 카테고리 필터 + 뷰 토글 행 */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "0.75rem", marginBottom: "1.25rem" }}>
          {/* 카테고리 필터 pills */}
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
            {[46, 52, 52, 52, 52, 46].map((w, i) => (
              <SkeletonBlock key={i} width={w} height={30} radius={999} />
            ))}
          </div>
          {/* 뷰 토글 (list / weekly / monthly) */}
          <div style={{ display: "flex", gap: "0.375rem" }}>
            {[28, 28, 28].map((_, i) => (
              <SkeletonBlock key={i} width={32} height={32} radius={8} />
            ))}
          </div>
        </div>

        {/* 블로그 카드 그리드 — md:2열 xl:3열, 9개 */}
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 9 }).map((_, i) => (
            <div key={i} className="bento-card overflow-hidden">
              {/* 썸네일 영역 16:10 */}
              <div style={{ aspectRatio: "16/10", background: "var(--border)" }} />
              {/* 카드 본문 */}
              <div style={{ padding: "1rem", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                {/* 날짜 + 작성자 행 */}
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <SkeletonBlock width={80} height={12} radius={6} />
                  <SkeletonBlock width={56} height={12} radius={6} />
                </div>
                {/* 제목 */}
                <SkeletonBlock width="88%" height={20} radius={6} />
                {/* 설명 */}
                <SkeletonBlock width="72%" height={14} radius={6} />
                {/* 댓글 수 */}
                <SkeletonBlock width={52} height={14} radius={6} />
              </div>
            </div>
          ))}
        </div>

        {/* 페이지네이션 */}
        <div style={{ display: "flex", justifyContent: "center", gap: "0.5rem", marginTop: "2rem" }}>
          {Array.from({ length: 5 }).map((_, i) => (
            <SkeletonBlock key={i} width={36} height={36} radius={8} />
          ))}
        </div>
      </div>
    </div>
  );
}
