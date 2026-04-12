export default function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer
      className="w-full flex items-center justify-center py-4 px-6 mt-2"
      style={{ borderTop: "1px solid var(--border)" }}
    >
      <p className="text-xs" style={{ color: "var(--text-muted)" }}>
        © {year} 달디단 (Daldidan). All rights reserved.
      </p>
    </footer>
  );
}
