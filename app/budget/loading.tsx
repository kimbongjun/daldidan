import { SkeletonBlock } from "@/components/ui/Skeleton";

export default function BudgetLoading() {
  return (
    <div className="min-h-screen" style={{ background: "var(--bg-base)" }}>
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 pb-12">
        {/* Header */}
        <div style={{ paddingTop: "2rem", paddingBottom: "1.5rem" }}>
          <SkeletonBlock width={80} height={12} radius={6} />
          <SkeletonBlock width={180} height={28} radius={8} style={{ marginTop: 10 }} />
          <SkeletonBlock width={260} height={14} style={{ marginTop: 8 }} />
        </div>

        {/* Summary cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "1rem", marginBottom: "1.5rem" }}>
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              style={{
                background: "var(--bg-card)",
                border: "1px solid var(--border)",
                borderRadius: "1rem",
                padding: "1.25rem",
              }}
            >
              <SkeletonBlock width={80} height={12} />
              <SkeletonBlock width={120} height={28} radius={8} style={{ marginTop: 10 }} />
              <SkeletonBlock width={100} height={12} style={{ marginTop: 8 }} />
            </div>
          ))}
        </div>

        {/* Toolbar */}
        <div style={{ display: "flex", gap: "0.75rem", marginBottom: "1rem" }}>
          <SkeletonBlock width={140} height={40} radius={8} />
          <SkeletonBlock width={100} height={40} radius={8} />
          <div style={{ flex: 1 }} />
          <SkeletonBlock width={120} height={40} radius={8} />
        </div>

        {/* Table rows */}
        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              style={{
                background: "var(--bg-card)",
                border: "1px solid var(--border)",
                borderRadius: "0.75rem",
                padding: "1rem 1.25rem",
                display: "grid",
                gridTemplateColumns: "1fr 2fr 1fr 1fr",
                gap: "1rem",
                alignItems: "center",
                animationDelay: `${i * 0.05}s`,
              }}
            >
              <SkeletonBlock height={14} width="60%" />
              <SkeletonBlock height={14} width="80%" />
              <SkeletonBlock height={14} width="50%" />
              <SkeletonBlock height={24} width={80} radius={20} />
            </div>
          ))}
        </div>

        {/* Pagination */}
        <div style={{ display: "flex", justifyContent: "center", gap: "0.5rem", marginTop: "1.5rem" }}>
          {Array.from({ length: 5 }).map((_, i) => (
            <SkeletonBlock key={i} width={36} height={36} radius={8} />
          ))}
        </div>
      </div>
    </div>
  );
}
