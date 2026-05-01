import { SkeletonBlock } from "@/components/ui/Skeleton";

export default function PushLogsLoading() {
  return (
    <div className="min-h-screen" style={{ background: "var(--bg-base)" }}>
      <div style={{ maxWidth: 640, margin: "0 auto", padding: "2rem 1rem" }}>

        {/* 헤더: 뒤로가기 + Bell 아이콘 + 제목/부제목 + 새로고침 버튼 */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1.5rem" }}>
          <SkeletonBlock width={36} height={36} radius={10} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <SkeletonBlock width={160} height={22} radius={6} />
            <SkeletonBlock width={210} height={14} radius={6} style={{ marginTop: 4 }} />
          </div>
          <SkeletonBlock width={36} height={36} radius={10} />
        </div>

        {/* 필터 탭 — 전체 / 새 글 / 댓글 / 일정 알림 / 디버그 (5개 pill) */}
        <div style={{ display: "flex", gap: "0.375rem", flexWrap: "wrap", marginBottom: "1rem" }}>
          {[46, 52, 46, 76, 60].map((w, i) => (
            <SkeletonBlock key={i} width={w} height={28} radius={999} />
          ))}
        </div>

        {/* 로그 목록 카드 */}
        <div className="bento-card" style={{ padding: "1rem", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              style={{
                padding: "1rem",
                borderRadius: "0.75rem",
                background: "var(--bg-base)",
                border: "1px solid var(--border)",
              }}
            >
              {/* 상단 행: 타입뱃지+타임스탬프 | 발송카운트+버튼들 */}
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "0.75rem" }}>
                <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: "0.375rem" }}>
                  {/* 타입 뱃지 + 타임스탬프 */}
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <SkeletonBlock width={52} height={20} radius={999} />
                    <SkeletonBlock width={68} height={12} radius={6} />
                  </div>
                  {/* 알림 제목 */}
                  <SkeletonBlock width="78%" height={14} radius={6} />
                  {/* 알림 본문 */}
                  <SkeletonBlock width="58%" height={12} radius={6} />
                </div>
                {/* 발송/실패 카운트 + 펼치기 버튼 + 삭제 버튼 */}
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexShrink: 0 }}>
                  <SkeletonBlock width={48} height={16} radius={6} />
                  <SkeletonBlock width={26} height={26} radius={6} />
                  <SkeletonBlock width={26} height={26} radius={6} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
