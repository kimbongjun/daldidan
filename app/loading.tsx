import { SkeletonBentoGrid } from "@/components/ui/SkeletonWidget";

export default function Loading() {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--bg-base)",
        paddingTop: "4rem",
      }}
    >
      <SkeletonBentoGrid />
    </div>
  );
}
