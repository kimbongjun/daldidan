import { SkeletonBlock } from "@/components/ui/Skeleton";

export default function PushDevicesLoading() {
  return (
    <div className="min-h-screen" style={{ background: "var(--bg-base)" }}>
      <div style={{ maxWidth: 640, margin: "0 auto", padding: "2rem 1rem" }}>

        {/* 헤더: 뒤로가기 + 제목/부제목 + 새로고침 버튼 */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1.5rem" }}>
          <SkeletonBlock width={36} height={36} radius={10} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <SkeletonBlock width={160} height={22} radius={6} />
            <SkeletonBlock width={230} height={14} radius={6} style={{ marginTop: 4 }} />
          </div>
          <SkeletonBlock width={36} height={36} radius={10} />
        </div>

        {/* DeviceCard 목록 */}
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              style={{
                display: "flex", alignItems: "center", gap: "0.75rem",
                padding: "1rem",
                borderRadius: "0.75rem",
                background: "var(--bg-base)",
                border: "1px solid var(--border)",
              }}
            >
              {/* 디바이스 아이콘 박스 (40×40) */}
              <SkeletonBlock width={40} height={40} radius={10} />

              {/* 정보 영역 */}
              <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: "0.375rem" }}>
                {/* Row 1: 디바이스 타입 뱃지 (rounded-full) + 기기명 */}
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <SkeletonBlock width={44} height={20} radius={999} />
                  <SkeletonBlock width={120} height={14} radius={6} />
                </div>
                {/* Row 2: OS 뱃지 + 브라우저 뱃지 */}
                <div style={{ display: "flex", gap: "0.375rem" }}>
                  <SkeletonBlock width={72} height={18} radius={4} />
                  <SkeletonBlock width={62} height={18} radius={4} />
                </div>
                {/* Row 3: 알림 유형 뱃지들 (새 글 / 댓글) */}
                <div style={{ display: "flex", gap: "0.375rem" }}>
                  <SkeletonBlock width={42} height={18} radius={4} />
                  <SkeletonBlock width={36} height={18} radius={4} />
                </div>
                {/* Row 4: 등록일 */}
                <SkeletonBlock width={110} height={12} radius={6} />
              </div>

              {/* 삭제 버튼 */}
              <SkeletonBlock width={32} height={32} radius={8} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
