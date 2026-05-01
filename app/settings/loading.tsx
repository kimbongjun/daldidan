import { SkeletonBlock, SkeletonInput } from "@/components/ui/Skeleton";

export default function SettingsLoading() {
  return (
    <div className="min-h-screen" style={{ background: "var(--bg-base)" }}>
      <div className="max-w-[720px] mx-auto px-4 sm:px-6 pb-12">
        {/* Header */}
        <div style={{ paddingTop: "2rem", paddingBottom: "1.5rem" }}>
          <SkeletonBlock width={60} height={12} radius={6} />
          <SkeletonBlock width={160} height={28} radius={8} style={{ marginTop: 10 }} />
        </div>

        {/* Setting sections */}
        {Array.from({ length: 3 }).map((_, s) => (
          <div
            key={s}
            style={{
              background: "var(--bg-card)",
              border: "1px solid var(--border)",
              borderRadius: "1rem",
              padding: "1.5rem",
              marginBottom: "1rem",
            }}
          >
            <SkeletonBlock width={120} height={18} radius={6} style={{ marginBottom: "1.25rem" }} />
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i}>
                  <SkeletonBlock width={90} height={12} style={{ marginBottom: 8 }} />
                  <SkeletonInput />
                </div>
              ))}
            </div>
          </div>
        ))}

        <SkeletonBlock width={140} height={44} radius={10} style={{ marginTop: "0.5rem" }} />
      </div>
    </div>
  );
}
