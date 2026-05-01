import { SkeletonBlock, SkeletonText } from "@/components/ui/Skeleton";

export default function BlogPostLoading() {
  return (
    <div className="min-h-screen" style={{ background: "var(--bg-base)" }}>
      <div className="mx-auto max-w-[1100px] px-4 pb-12 sm:px-6">
        <div className="flex flex-col gap-1 pb-4 pt-6">
          <SkeletonBlock width={76} height={12} radius={6} />
          <SkeletonBlock width="46%" height={34} radius={8} style={{ marginTop: 8, maxWidth: 460 }} />
          <SkeletonBlock width={240} height={14} radius={6} style={{ marginTop: 4 }} />
        </div>

        <article className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
          <div className="flex flex-col gap-6">
            <section className="bento-card overflow-hidden">
              <div className="p-6 sm:p-8">
                <SkeletonText lines={5} />
                <SkeletonText lines={4} lastWidth="42%" style={{ marginTop: "1.5rem" }} />
                <SkeletonText lines={3} lastWidth="68%" style={{ marginTop: "1.5rem" }} />
                <SkeletonBlock width="100%" height={220} radius={18} style={{ marginTop: "1.75rem" }} />
              </div>
            </section>

            <div className="bento-card p-5">
              <SkeletonBlock width="100%" height={48} radius={14} />
            </div>

            <div className="bento-card p-5">
              <SkeletonBlock width={120} height={18} radius={6} style={{ marginBottom: "1rem" }} />
              <SkeletonBlock width="100%" height={110} radius={16} />
            </div>
          </div>

          <aside className="flex flex-col gap-4">
            <div className="bento-card flex flex-col gap-3 p-5">
              <SkeletonBlock width={90} height={14} radius={6} />
              <SkeletonBlock width="52%" height={12} radius={6} />
              <SkeletonBlock width="68%" height={12} radius={6} />
              <SkeletonBlock width="58%" height={12} radius={6} />
            </div>

            <div className="bento-card flex flex-col gap-3 p-5">
              <SkeletonBlock width="100%" height={44} radius={14} />
              <SkeletonBlock width="100%" height={44} radius={14} />
            </div>
          </aside>
        </article>
      </div>
    </div>
  );
}
