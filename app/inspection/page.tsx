import Link from "next/link";
import { Plus, Building2, MapPin, LayoutGrid } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import { getInspectionRecords } from "@/lib/inspection";

const ACCENT = "#5CABF2";

export const revalidate = 0;

export default async function InspectionListPage() {
  let records: Awaited<ReturnType<typeof getInspectionRecords>> = [];
  try {
    records = await getInspectionRecords();
  } catch {
    // 테이블 미생성 시 빈 목록
  }

  return (
    <div className="min-h-screen" style={{ background: "var(--bg-base)" }}>
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 pb-12">
        <PageHeader
          title="임장기록"
          subtitle="직접 발로 뛴 현장 임장 기록을 관리합니다"
          accentColor={ACCENT}
          backHref="/"
          actions={
            <Link
              href="/inspection/write"
              className="flex items-center gap-1.5 text-sm font-bold px-4 py-2 rounded-xl transition-opacity hover:opacity-80"
              style={{ background: ACCENT, color: "#fff" }}
            >
              <Plus size={14} />
              새 임장기록
            </Link>
          }
        />

        {records.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-4 py-24"
            style={{ color: "var(--text-muted)" }}>
            <LayoutGrid size={40} style={{ opacity: 0.3 }} />
            <p className="text-sm">아직 임장기록이 없습니다.</p>
            <Link
              href="/inspection/write"
              className="flex items-center gap-1.5 text-sm font-bold px-5 py-2.5 rounded-xl transition-opacity hover:opacity-80"
              style={{ background: `${ACCENT}22`, color: ACCENT, border: `1px solid ${ACCENT}40` }}
            >
              <Plus size={14} /> 첫 임장기록 작성
            </Link>
          </div>
        ) : (
          <>
            {/* ── 데스크톱: 테이블 (sm 이상) ── */}
            <div className="hidden sm:block overflow-x-auto rounded-2xl" style={{ border: "1px solid var(--border)" }}>
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ background: "rgba(255,255,255,0.04)", borderBottom: "1px solid var(--border)" }}>
                    {["단지명", "동·호수", "주소", "평형", "연식"].map((h) => (
                      <th key={h} className="text-left px-4 py-3 font-semibold text-xs"
                        style={{ color: "var(--text-muted)", whiteSpace: "nowrap" }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {records.map((r, idx) => (
                    <tr key={r.id}
                      style={{
                        borderBottom: idx < records.length - 1 ? "1px solid var(--border)" : "none",
                        transition: "background 0.15s",
                      }}
                      className="hover:bg-white/[0.03]">
                      <td className="px-4 py-3">
                        <Link href={`/inspection/${r.id}`}
                          className="flex items-center gap-2 font-semibold transition-opacity hover:opacity-70"
                          style={{ color: ACCENT }}>
                          <Building2 size={13} />
                          {r.complex_name}
                        </Link>
                      </td>
                      <td className="px-4 py-3" style={{ color: "var(--text-primary)" }}>
                        {r.dong_ho ?? <span style={{ color: "var(--text-muted)" }}>-</span>}
                      </td>
                      <td className="px-4 py-3 max-w-[200px]">
                        <span className="flex items-center gap-1 truncate" style={{ color: "var(--text-muted)" }}>
                          {r.address ? <><MapPin size={11} />{r.address}</> : "-"}
                        </span>
                      </td>
                      <td className="px-4 py-3" style={{ color: "var(--text-primary)" }}>
                        {r.pyeong ?? <span style={{ color: "var(--text-muted)" }}>-</span>}
                      </td>
                      <td className="px-4 py-3" style={{ color: "var(--text-primary)" }}>
                        {r.year_built ? `${r.year_built}년` : <span style={{ color: "var(--text-muted)" }}>-</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* ── 모바일: 카드 리스트 (sm 미만) ── */}
            <div className="flex flex-col gap-2 sm:hidden">
              {records.map((r) => (
                <Link
                  key={r.id}
                  href={`/inspection/${r.id}`}
                  className="flex flex-col gap-2 px-4 py-3.5 rounded-2xl transition-opacity hover:opacity-80"
                  style={{ background: "rgba(255,255,255,0.04)", border: "1px solid var(--border)" }}
                >
                  {/* 단지명 — 타이틀 row */}
                  <div className="flex items-center gap-2">
                    <Building2 size={13} style={{ color: ACCENT, flexShrink: 0 }} />
                    <p className="text-sm font-bold truncate" style={{ color: ACCENT }}>
                      {r.complex_name}
                    </p>
                  </div>

                  {/* 나머지 필드 — 한 줄 column */}
                  <div className="flex items-center gap-0 overflow-hidden text-xs" style={{ color: "var(--text-muted)" }}>
                    {[
                      r.dong_ho,
                      r.address,
                      r.pyeong,
                      r.year_built ? `${r.year_built}년` : null,
                    ]
                      .filter(Boolean)
                      .map((val, i, arr) => (
                        <span key={i} className="flex items-center shrink-0">
                          <span className="truncate" style={{ maxWidth: "28vw" }}>{val}</span>
                          {i < arr.length - 1 && (
                            <span className="mx-1.5 shrink-0" style={{ opacity: 0.3 }}>|</span>
                          )}
                        </span>
                      ))}
                  </div>
                </Link>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
