import { SkeletonBlock, SkeletonInput } from "@/components/ui/Skeleton";

export default function MyPageLoading() {
  return (
    <div className="min-h-screen" style={{ background: "var(--bg-base)" }}>
      <div style={{ maxWidth: 560, margin: "0 auto", padding: "2rem 1rem" }}>

        {/* 헤더: 뒤로가기 + 제목/부제목 + 사이트 옵션 버튼 */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "2rem" }}>
          <SkeletonBlock width={36} height={36} radius={10} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <SkeletonBlock width={110} height={22} radius={6} />
            <SkeletonBlock width={240} height={14} radius={6} style={{ marginTop: 4 }} />
          </div>
          <SkeletonBlock width={88} height={36} radius={10} />
        </div>

        {/* 메인 카드 — bento-card p-6 flex flex-col gap-6 */}
        <div className="bento-card" style={{ padding: "1.5rem", display: "flex", flexDirection: "column", gap: "1.5rem" }}>

          {/* 상단 태그 행: "프로필 편집" + "사이트 옵션으로 이동" */}
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
            <SkeletonBlock width={82} height={30} radius={999} />
            <SkeletonBlock width={116} height={30} radius={999} />
          </div>

          {/* 아바타 섹션 — rounded-3xl p-5 */}
          <div
            style={{
              borderRadius: "1.5rem", padding: "1.25rem",
              background: "linear-gradient(135deg, rgba(234,88,12,0.14), rgba(14,165,233,0.08))",
              border: "1px solid var(--border)",
              display: "flex", flexDirection: "column", gap: "1rem",
            }}
          >
            {/* 아바타 + 이름/이메일 */}
            <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
              <SkeletonBlock width={80} height={80} radius={20} />
              <div style={{ minWidth: 0 }}>
                <SkeletonBlock width={120} height={16} radius={6} />
                <SkeletonBlock width={160} height={14} radius={6} style={{ marginTop: 4 }} />
              </div>
            </div>

            {/* 아바타 업로드 섹션 — rounded-2xl p-4 */}
            <div
              style={{
                borderRadius: "1rem", padding: "1rem",
                background: "rgba(255,255,255,0.04)",
                border: "1px solid var(--border)",
                display: "flex", flexDirection: "column", gap: "0.75rem",
              }}
            >
              {/* 레이블 + 업로드 버튼 */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.75rem" }}>
                <SkeletonBlock width={120} height={14} radius={6} />
                <SkeletonBlock width={96} height={34} radius={10} />
              </div>
              {/* URL 입력 */}
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <div style={{ flex: 1 }}><SkeletonInput /></div>
              </div>
            </div>
          </div>
        </div>

        {/* 프로필 폼 — flex flex-col gap-4 */}
        <div style={{ marginTop: "1.5rem", display: "flex", flexDirection: "column", gap: "1rem" }}>

          {/* 닉네임 */}
          <div style={{ display: "flex", flexDirection: "column", gap: "0.375rem" }}>
            <SkeletonBlock width={50} height={14} radius={6} />
            <SkeletonInput />
            <SkeletonBlock width={200} height={12} radius={6} />
          </div>

          {/* 이메일 (읽기전용) */}
          <div style={{ display: "flex", flexDirection: "column", gap: "0.375rem" }}>
            <SkeletonBlock width={50} height={14} radius={6} />
            <SkeletonInput />
          </div>

          {/* 구분선 */}
          <div style={{ height: 1, background: "var(--border)" }} />

          {/* 운세 정보 섹션 */}
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            <SkeletonBlock width={80} height={14} radius={6} />
            <SkeletonBlock width={240} height={12} radius={6} />
            {/* 출생 연도 + 성별 */}
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "0.375rem" }}>
                <SkeletonBlock width={70} height={12} radius={6} />
                <SkeletonInput />
              </div>
              <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "0.375rem" }}>
                <SkeletonBlock width={36} height={12} radius={6} />
                <SkeletonInput />
              </div>
            </div>
            {/* 태어난 시 */}
            <div style={{ display: "flex", flexDirection: "column", gap: "0.375rem" }}>
              <SkeletonBlock width={100} height={12} radius={6} />
              <SkeletonInput />
            </div>
          </div>

          {/* 저장 버튼 */}
          <SkeletonBlock width="100%" height={44} radius={10} style={{ marginTop: "0.5rem" }} />
        </div>
      </div>
    </div>
  );
}
