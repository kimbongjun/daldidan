import BlogEditorLoading from "@/components/blog/BlogEditorLoading";
import { SkeletonBlock, SkeletonInput } from "@/components/ui/Skeleton";

export default function BlogWriteSkeleton({
  titleWidth = 160,
}: {
  titleWidth?: number;
}) {
  return (
    <div className="min-h-screen" style={{ background: "var(--bg-base)" }}>
      <div className="mx-auto max-w-[1200px] px-4 pb-12 sm:px-6">
        <div className="flex flex-col gap-1 pb-4 pt-6">
          <SkeletonBlock width={76} height={12} radius={6} />
          <SkeletonBlock width={titleWidth} height={30} radius={8} style={{ marginTop: 8 }} />
          <SkeletonBlock width={220} height={14} radius={6} style={{ marginTop: 4 }} />
        </div>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
          <section className="bento-card flex flex-col gap-5 p-5 sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <SkeletonBlock width={92} height={12} radius={6} />
                <SkeletonBlock width={220} height={12} radius={6} style={{ marginTop: 10 }} />
              </div>
              <SkeletonBlock width={44} height={44} radius={16} />
            </div>

            <SkeletonBlock width="100%" height={56} radius={16} />
            <BlogEditorLoading />
          </section>

          <aside className="flex flex-col gap-4">
            <div className="bento-card flex flex-col gap-3 p-5">
              <SkeletonBlock width={72} height={16} radius={6} />
              <div className="flex flex-wrap gap-2">
                {["20%", "18%", "18%", "22%", "16%"].map((width, index) => (
                  <SkeletonBlock key={index} width={width} height={30} radius={12} />
                ))}
              </div>
            </div>

            <div className="bento-card flex flex-col gap-3 p-5">
              <SkeletonBlock width={68} height={16} radius={6} />
              <SkeletonInput />
              <SkeletonBlock width="72%" height={12} radius={6} />
            </div>

            <div className="bento-card flex flex-col gap-3 p-5">
              <SkeletonBlock width={74} height={16} radius={6} />
              <SkeletonBlock width="100%" height={42} radius={16} />
              <SkeletonBlock width={96} height={12} radius={6} />
              <SkeletonBlock width="100%" height={48} radius={16} />
              <SkeletonBlock width="100%" height={48} radius={16} />
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
