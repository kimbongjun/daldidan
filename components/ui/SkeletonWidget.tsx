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

// 실제 DashboardShell의 7개 위젯 + 반응형 span과 동일한 구조
const WIDGET_SKELETONS = [
  { id: "fortune",    mobile: 1, tablet: 1, desktop: 1, height: 220 },
  { id: "lotto",      mobile: 1, tablet: 1, desktop: 1, height: 220 },
  { id: "blog",       mobile: 1, tablet: 1, desktop: 2, height: 260 },
  { id: "budget",     mobile: 1, tablet: 1, desktop: 1, height: 260 },
  { id: "calendar",   mobile: 1, tablet: 1, desktop: 1, height: 320 },
  { id: "stock",      mobile: 1, tablet: 2, desktop: 2, height: 200 },
  { id: "realestate", mobile: 1, tablet: 1, desktop: 1, height: 200 },
];

export function SkeletonBentoGrid() {
  return (
    <div
      style={{
        maxWidth: 1400,
        margin: "0 auto",
        padding: "0 1rem 3rem",
        width: "100%",
        boxSizing: "border-box",
      }}
    >
      {/* Header skeleton — logo + greeting + clock 영역 */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "1.25rem 0",
          marginBottom: "0.25rem",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <SkeletonBlock width={40} height={40} radius={10} />
          <div>
            <SkeletonBlock width={100} height={14} radius={6} />
            <SkeletonBlock width={170} height={20} radius={6} style={{ marginTop: 6 }} />
          </div>
        </div>
        <SkeletonBlock width={72} height={36} radius={8} />
      </div>

      {/* Bento grid — 실제 useLayoutStore widgetOrder와 동일한 1→2→3컬럼 span */}
      <style>{`
        .sk-bento-grid {
          display: grid;
          gap: 1.25rem;
          grid-template-columns: minmax(0, 1fr);
          grid-auto-flow: dense;
          align-items: stretch;
        }
        @media (min-width: 640px) {
          .sk-bento-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
        }
        @media (min-width: 1100px) {
          .sk-bento-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); }
        }
        .sk-bento-item { grid-column: span var(--sk-mobile, 1); }
        @media (min-width: 640px) { .sk-bento-item { grid-column: span var(--sk-tablet, 1); } }
        @media (min-width: 1100px) { .sk-bento-item { grid-column: span var(--sk-desktop, 1); } }
      `}</style>

      <div className="sk-bento-grid">
        {WIDGET_SKELETONS.map((w) => (
          <div
            key={w.id}
            className="sk-bento-item"
            style={{
              ["--sk-mobile" as string]: String(w.mobile),
              ["--sk-tablet" as string]: String(w.tablet),
              ["--sk-desktop" as string]: String(w.desktop),
            }}
          >
            <SkeletonWidget height={w.height} />
          </div>
        ))}
      </div>
    </div>
  );
}
