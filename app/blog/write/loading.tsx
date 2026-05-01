import { SkeletonBlock, SkeletonInput } from "@/components/ui/Skeleton";

export default function BlogWriteLoading() {
  return (
    <div className="min-h-screen" style={{ background: "var(--bg-base)" }}>
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 pb-12">
        {/* Header */}
        <div style={{ paddingTop: "2rem", paddingBottom: "1.5rem" }}>
          <SkeletonBlock width={80} height={12} radius={6} />
          <SkeletonBlock width={160} height={28} radius={8} style={{ marginTop: 10 }} />
        </div>

        {/* Title input */}
        <SkeletonBlock width="100%" height={52} radius={10} style={{ marginBottom: "1rem" }} />

        {/* Toolbar */}
        <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem" }}>
          {Array.from({ length: 8 }).map((_, i) => (
            <SkeletonBlock key={i} width={36} height={36} radius={6} />
          ))}
        </div>

        {/* Editor area */}
        <SkeletonBlock width="100%" height={400} radius={10} style={{ marginBottom: "1.5rem" }} />

        {/* Meta fields */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1.5rem" }}>
          <div>
            <SkeletonBlock width={80} height={12} style={{ marginBottom: 8 }} />
            <SkeletonInput />
          </div>
          <div>
            <SkeletonBlock width={60} height={12} style={{ marginBottom: 8 }} />
            <SkeletonInput />
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end" }}>
          <SkeletonBlock width={100} height={44} radius={10} />
          <SkeletonBlock width={100} height={44} radius={10} />
        </div>
      </div>
    </div>
  );
}
