import { SkeletonBlock } from "@/components/ui/Skeleton";

export default function BlogEditorLoading() {
  return (
    <div className="flex flex-col gap-3">
      <div
        className="rounded-[1.5rem] p-3"
        style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
      >
        <div className="flex flex-wrap gap-2">
          {Array.from({ length: 10 }).map((_, index) => (
            <SkeletonBlock key={index} width={34} height={34} radius={10} />
          ))}
        </div>
      </div>

      <div
        className="rounded-[1.5rem] overflow-hidden"
        style={{ background: "var(--bg-input)", border: "1px solid var(--border)" }}
      >
        <div className="px-5 py-4" style={{ borderBottom: "1px solid var(--border)" }}>
          <SkeletonBlock width={120} height={14} radius={6} />
        </div>
        <div className="px-5 py-5">
          <SkeletonBlock width="28%" height={20} radius={6} style={{ marginBottom: 18 }} />
          <SkeletonBlock width="100%" height={16} radius={6} style={{ marginBottom: 12 }} />
          <SkeletonBlock width="96%" height={16} radius={6} style={{ marginBottom: 12 }} />
          <SkeletonBlock width="78%" height={16} radius={6} style={{ marginBottom: 24 }} />
          <SkeletonBlock width="100%" height={180} radius={18} />
        </div>
      </div>
    </div>
  );
}
