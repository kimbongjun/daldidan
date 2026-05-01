import { SkeletonBlock, SkeletonText } from "@/components/ui/Skeleton";

export default function BlogPostLoading() {
  return (
    <div className="min-h-screen" style={{ background: "var(--bg-base)" }}>
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 pb-12">
        {/* Back link */}
        <div style={{ paddingTop: "2rem", marginBottom: "1.5rem" }}>
          <SkeletonBlock width={80} height={12} radius={6} />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 280px", gap: "2rem" }}>
          {/* Main content */}
          <div>
            {/* Tags */}
            <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem" }}>
              <SkeletonBlock width={60} height={24} radius={20} />
              <SkeletonBlock width={80} height={24} radius={20} />
            </div>

            {/* Title */}
            <SkeletonBlock width="90%" height={40} radius={8} style={{ marginBottom: "0.75rem" }} />
            <SkeletonBlock width="70%" height={40} radius={8} style={{ marginBottom: "1.5rem" }} />

            {/* Meta */}
            <div style={{ display: "flex", gap: "1rem", marginBottom: "1.5rem" }}>
              <SkeletonBlock width={100} height={14} />
              <SkeletonBlock width={80} height={14} />
            </div>

            {/* Thumbnail */}
            <SkeletonBlock width="100%" height={400} radius={12} style={{ marginBottom: "2rem" }} />

            {/* Body */}
            <SkeletonText lines={5} />
            <SkeletonText lines={4} lastWidth="40%" style={{ marginTop: "1.5rem" }} />
            <SkeletonText lines={3} lastWidth="75%" style={{ marginTop: "1.5rem" }} />
          </div>

          {/* Sidebar */}
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <div
              style={{
                background: "var(--bg-card)",
                border: "1px solid var(--border)",
                borderRadius: "1rem",
                padding: "1.25rem",
              }}
            >
              <SkeletonBlock width={80} height={14} style={{ marginBottom: "1rem" }} />
              {Array.from({ length: 5 }).map((_, i) => (
                <SkeletonBlock key={i} height={12} style={{ marginBottom: 8 }} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
