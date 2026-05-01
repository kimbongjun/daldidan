import { SkeletonBlock } from "@/components/ui/Skeleton";

export default function PushDevicesLoading() {
  return (
    <div className="min-h-screen" style={{ background: "var(--bg-base)" }}>
      <div className="max-w-[720px] mx-auto px-4 sm:px-6 pb-12">
        <div style={{ paddingTop: "2rem", paddingBottom: "1.5rem" }}>
          <SkeletonBlock width={80} height={12} radius={6} />
          <SkeletonBlock width={200} height={28} radius={8} style={{ marginTop: 10 }} />
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              style={{
                background: "var(--bg-card)",
                border: "1px solid var(--border)",
                borderRadius: "0.75rem",
                padding: "1rem 1.25rem",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <SkeletonBlock width={160} height={14} />
                <SkeletonBlock width={100} height={12} />
              </div>
              <SkeletonBlock width={72} height={32} radius={8} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
