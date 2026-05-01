import { SkeletonBlock } from "@/components/ui/Skeleton";

export default function PushLogsLoading() {
  return (
    <div className="min-h-screen" style={{ background: "var(--bg-base)" }}>
      <div className="max-w-[900px] mx-auto px-4 sm:px-6 pb-12">
        <div style={{ paddingTop: "2rem", paddingBottom: "1.5rem" }}>
          <SkeletonBlock width={80} height={12} radius={6} />
          <SkeletonBlock width={200} height={28} radius={8} style={{ marginTop: 10 }} />
        </div>

        {/* Filter toolbar */}
        <div style={{ display: "flex", gap: "0.75rem", marginBottom: "1rem" }}>
          <SkeletonBlock width={120} height={38} radius={8} />
          <SkeletonBlock width={120} height={38} radius={8} />
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              style={{
                background: "var(--bg-card)",
                border: "1px solid var(--border)",
                borderRadius: "0.75rem",
                padding: "0.875rem 1.25rem",
                display: "grid",
                gridTemplateColumns: "1fr 2fr 1fr 80px",
                gap: "1rem",
                alignItems: "center",
              }}
            >
              <SkeletonBlock height={12} width="70%" />
              <SkeletonBlock height={12} width="85%" />
              <SkeletonBlock height={12} width="60%" />
              <SkeletonBlock height={22} radius={12} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
