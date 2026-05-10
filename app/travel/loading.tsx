export default function TravelLoading() {
  return (
    <div className="min-h-screen" style={{ background: "var(--bg-base)" }}>
      <div
        style={{
          minHeight: "100vh",
          display: "grid",
          gridTemplateColumns: "minmax(0, 320px) minmax(0, 1fr)",
          gap: "1px",
          background: "var(--border)",
        }}
      >
        <div
          style={{
            background: "var(--bg-base)",
            padding: "1rem",
            display: "flex",
            flexDirection: "column",
            gap: "0.75rem",
          }}
        >
          <div className="bento-card skeleton-shimmer" style={{ height: 120 }} />
          <div className="bento-card skeleton-shimmer" style={{ height: 92 }} />
          <div className="bento-card skeleton-shimmer" style={{ flex: 1, minHeight: 260 }} />
        </div>
        <div className="skeleton-shimmer" style={{ background: "#0d1b2a", minHeight: "100vh" }} />
      </div>
    </div>
  );
}
