import { SkeletonAvatar, SkeletonBlock, SkeletonInput } from "@/components/ui/Skeleton";

export default function MyPageLoading() {
  return (
    <div className="min-h-screen" style={{ background: "var(--bg-base)" }}>
      <div className="max-w-[640px] mx-auto px-4 sm:px-6 pb-12">
        {/* Header */}
        <div style={{ paddingTop: "2rem", paddingBottom: "1.5rem" }}>
          <SkeletonBlock width={60} height={12} radius={6} />
          <SkeletonBlock width={140} height={28} radius={8} style={{ marginTop: 10 }} />
        </div>

        {/* Avatar */}
        <div style={{ display: "flex", alignItems: "center", gap: "1.5rem", marginBottom: "2rem" }}>
          <SkeletonAvatar size={80} />
          <SkeletonBlock width={120} height={36} radius={8} />
        </div>

        {/* Form fields */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          {["이메일", "표시 이름", "출생연도", "성별", "출생 시간"].map((_, i) => (
            <div key={i}>
              <SkeletonBlock width={80} height={12} style={{ marginBottom: 8 }} />
              <SkeletonInput />
            </div>
          ))}
        </div>

        {/* Save button */}
        <SkeletonBlock width="100%" height={44} radius={10} style={{ marginTop: "2rem" }} />
      </div>
    </div>
  );
}
