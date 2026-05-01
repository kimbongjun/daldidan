import { SkeletonBlock } from "./Skeleton";

const CARD: React.CSSProperties = {
  background: "var(--bg-card)",
  border: "1px solid var(--border)",
  borderRadius: "1rem",
  padding: "1.25rem",
  overflow: "hidden",
};

export function SkeletonWidget({
  height = 180,
  style,
}: {
  height?: number | string;
  style?: React.CSSProperties;
}) {
  return (
    <div style={{ ...CARD, height, ...style }}>
      <SkeletonBlock width={80} height={12} radius={6} />
      <SkeletonBlock width={140} height={28} radius={8} style={{ marginTop: 12 }} />
      <SkeletonBlock width="90%" height={14} style={{ marginTop: 10 }} />
      <SkeletonBlock width="70%" height={14} style={{ marginTop: 6 }} />
    </div>
  );
}

export function SkeletonBentoGrid() {
  const widgets = [
    { col: "span 3", row: "span 2", h: 280 },
    { col: "span 2", row: "span 1", h: 130 },
    { col: "span 1", row: "span 1", h: 130 },
    { col: "span 1", row: "span 1", h: 130 },
    { col: "span 2", row: "span 1", h: 130 },
    { col: "span 3", row: "span 1", h: 130 },
  ];

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(6, 1fr)",
        gap: "1rem",
        padding: "1rem",
      }}
    >
      {widgets.map((w, i) => (
        <div key={i} style={{ gridColumn: w.col, gridRow: w.row }}>
          <SkeletonWidget height={w.h} />
        </div>
      ))}
    </div>
  );
}
