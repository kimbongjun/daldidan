import type { CSSProperties } from "react";

const STYLE: CSSProperties = {
  background: "var(--border)",
  animation: "skel 1.6s ease-in-out infinite",
};

export function SkeletonBlock({
  width = "100%",
  height = 16,
  radius = 6,
  style,
}: {
  width?: number | string;
  height?: number | string;
  radius?: number | string;
  style?: CSSProperties;
}) {
  return (
    <>
      <div style={{ width, height, borderRadius: radius, ...STYLE, ...style }} />
      <style>{`@keyframes skel{0%,100%{opacity:1}50%{opacity:.45}}`}</style>
    </>
  );
}

export function SkeletonText({
  lines = 3,
  lastWidth = "60%",
  style,
}: {
  lines?: number;
  lastWidth?: string;
  style?: CSSProperties;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, ...style }}>
      {Array.from({ length: lines }).map((_, i) => (
        <SkeletonBlock key={i} height={14} width={i === lines - 1 ? lastWidth : "100%"} />
      ))}
    </div>
  );
}

export function SkeletonAvatar({ size = 80 }: { size?: number }) {
  return <SkeletonBlock width={size} height={size} radius="50%" />;
}

export function SkeletonInput() {
  return (
    <SkeletonBlock
      height={42}
      radius={8}
      style={{ border: "1px solid var(--border)" }}
    />
  );
}
