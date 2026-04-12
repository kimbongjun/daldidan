export default function BlogLoading() {
  return (
    <div className="min-h-screen" style={{ background: "var(--bg-base)" }}>
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 pb-12">
        {/* Header skeleton */}
        <div style={{ paddingTop: "2rem", paddingBottom: "1.5rem" }}>
          <div style={{ width: 80, height: 12, borderRadius: 6, background: "var(--border)", marginBottom: 10 }} />
          <div style={{ width: 160, height: 28, borderRadius: 8, background: "var(--border)" }} />
        </div>

        {/* Card skeletons */}
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="bento-card overflow-hidden"
              style={{ animation: "pulse 1.6s ease-in-out infinite", animationDelay: `${i * 0.1}s` }}
            >
              <div style={{ aspectRatio: "16/10", background: "var(--border)" }} />
              <div style={{ padding: "1rem", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                <div style={{ height: 12, width: "60%", borderRadius: 6, background: "var(--border)" }} />
                <div style={{ height: 20, width: "90%", borderRadius: 6, background: "var(--border)" }} />
                <div style={{ height: 14, width: "75%", borderRadius: 6, background: "var(--border)" }} />
              </div>
            </div>
          ))}
        </div>
      </div>
      <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.5} }`}</style>
    </div>
  );
}
