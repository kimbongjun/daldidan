import { SkeletonBlock, SkeletonInput } from "@/components/ui/Skeleton";

function Divider() {
  return <div style={{ height: 1, background: "var(--border)" }} />;
}

export default function SettingsLoading() {
  return (
    <div className="min-h-screen" style={{ background: "var(--bg-base)" }}>
      <div style={{ maxWidth: 560, margin: "0 auto", padding: "2rem 1rem" }}>

        {/* 헤더: 뒤로가기 버튼 + 제목/부제목 */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "2rem" }}>
          <SkeletonBlock width={36} height={36} radius={10} />
          <div style={{ minWidth: 0 }}>
            <SkeletonBlock width={120} height={22} radius={6} />
            <SkeletonBlock width={260} height={14} radius={6} style={{ marginTop: 6 }} />
          </div>
        </div>

        {/* 푸시 알림 로그 링크 카드 */}
        <div
          style={{
            display: "flex", alignItems: "center", gap: "0.75rem",
            padding: "0.75rem 1rem", borderRadius: "0.75rem",
            background: "var(--bg-card)", border: "1px solid var(--border)",
            marginBottom: "0.5rem",
          }}
        >
          <SkeletonBlock width={28} height={28} radius={8} />
          <div style={{ flex: 1 }}>
            <SkeletonBlock width={110} height={14} radius={6} />
            <SkeletonBlock width={190} height={12} radius={6} style={{ marginTop: 4 }} />
          </div>
          <SkeletonBlock width={14} height={14} radius={4} />
        </div>

        {/* 알림 허용 디바이스 링크 카드 */}
        <div
          style={{
            display: "flex", alignItems: "center", gap: "0.75rem",
            padding: "0.75rem 1rem", borderRadius: "0.75rem",
            background: "var(--bg-card)", border: "1px solid var(--border)",
            marginBottom: "1.5rem",
          }}
        >
          <SkeletonBlock width={28} height={28} radius={8} />
          <div style={{ flex: 1 }}>
            <SkeletonBlock width={130} height={14} radius={6} />
            <SkeletonBlock width={210} height={12} radius={6} style={{ marginTop: 4 }} />
          </div>
          <SkeletonBlock width={14} height={14} radius={4} />
        </div>

        {/* 메인 카드 */}
        <div className="bento-card" style={{ padding: "1.5rem", display: "flex", flexDirection: "column", gap: "1.25rem" }}>

          {/* 화면 테마 토글 */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem" }}>
            <div>
              <SkeletonBlock width={90} height={14} radius={6} />
              <SkeletonBlock width={70} height={12} radius={6} style={{ marginTop: 4 }} />
            </div>
            <SkeletonBlock width={52} height={28} radius={999} />
          </div>

          <Divider />

          {/* 가계부 구성원 */}
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            <SkeletonBlock width={110} height={14} radius={6} />
            <SkeletonBlock width={240} height={12} radius={6} />
            <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
              {[52, 52, 52].map((w, i) => (
                <SkeletonBlock key={i} width={w} height={26} radius={999} />
              ))}
            </div>
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <div style={{ flex: 1 }}><SkeletonInput /></div>
              <SkeletonBlock width={62} height={42} radius={8} />
            </div>
          </div>

          <Divider />

          {/* 사이트 로고 */}
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            <SkeletonBlock width={75} height={14} radius={6} />
            <SkeletonBlock width={230} height={12} radius={6} />
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
              <SkeletonBlock width={40} height={40} radius={10} />
              <div style={{ flex: 1 }}><SkeletonInput /></div>
            </div>
            <SkeletonBlock width={88} height={32} radius={8} />
          </div>

          <Divider />

          {/* PWA 설정 */}
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <SkeletonBlock width={80} height={14} radius={6} />

            {/* 앱 아이콘 */}
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              <SkeletonBlock width={55} height={12} radius={6} />
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                <SkeletonBlock width={48} height={48} radius={10} />
                <div style={{ flex: 1 }}><SkeletonInput /></div>
              </div>
              <SkeletonBlock width={88} height={32} radius={8} />
            </div>

            {/* 스플래시 이미지 */}
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              <SkeletonBlock width={100} height={12} radius={6} />
              <SkeletonInput />
              <SkeletonBlock width={88} height={32} radius={8} />
            </div>
          </div>

          <Divider />

          {/* 메타 태그 */}
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <SkeletonBlock width={70} height={14} radius={6} />

            {/* 사이트 제목 */}
            <div style={{ display: "flex", flexDirection: "column", gap: "0.375rem" }}>
              <SkeletonBlock width={65} height={12} radius={6} />
              <SkeletonInput />
            </div>

            {/* 사이트 설명 (textarea) */}
            <div style={{ display: "flex", flexDirection: "column", gap: "0.375rem" }}>
              <SkeletonBlock width={65} height={12} radius={6} />
              <SkeletonBlock height={56} radius={8} />
            </div>

            {/* 파비콘 */}
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              <SkeletonBlock width={46} height={12} radius={6} />
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                <SkeletonBlock width={40} height={40} radius={8} />
                <div style={{ flex: 1 }}><SkeletonInput /></div>
              </div>
              <SkeletonBlock width={88} height={32} radius={8} />
            </div>

            {/* OG 이미지 */}
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              <SkeletonBlock width={65} height={12} radius={6} />
              <SkeletonInput />
              <SkeletonBlock width={88} height={32} radius={8} />
            </div>
          </div>

          {/* 저장 버튼 */}
          <SkeletonBlock width="100%" height={44} radius={10} />
        </div>
      </div>
    </div>
  );
}
