import Link from "next/link";
import { notFound } from "next/navigation";
import { Pencil, Trash2, Images } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import { getInspectionRecord } from "@/lib/inspection";
import InspectionDeleteButton from "@/components/inspection/InspectionDeleteButton";
import { createClient } from "@/lib/supabase/server";

const ACCENT = "#5CABF2";

export const revalidate = 0;

function Row({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <tr style={{ borderBottom: "1px solid var(--border)" }}>
      <td className="px-4 py-3 text-xs font-semibold whitespace-nowrap"
        style={{ color: "var(--text-muted)", width: "9rem", background: "rgba(255,255,255,0.02)" }}>
        {label}
      </td>
      <td className="px-4 py-3 text-sm" style={{ color: value ? "var(--text-primary)" : "var(--text-muted)" }}>
        {value || "-"}
      </td>
    </tr>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid var(--border)" }}>
      <div className="px-4 py-2.5" style={{ background: `${ACCENT}14`, borderBottom: "1px solid var(--border)" }}>
        <p className="text-xs font-bold uppercase tracking-widest" style={{ color: ACCENT }}>{title}</p>
      </div>
      <table className="w-full"><tbody>{children}</tbody></table>
    </div>
  );
}

export default async function InspectionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [record, supabase] = await Promise.all([
    getInspectionRecord(id),
    createClient(),
  ]);

  if (!record) notFound();

  const { data: { user } } = await supabase.auth.getUser();
  const isOwner = user?.id === record.user_id;

  return (
    <div className="min-h-screen" style={{ background: "var(--bg-base)" }}>
      <div className="max-w-[860px] mx-auto px-4 sm:px-6 pb-12">
        <PageHeader
          title={record.complex_name}
          subtitle={[record.dong_ho, record.address].filter(Boolean).join(" · ") || "임장기록"}
          accentColor={ACCENT}
          backHref="/inspection"
          actions={
            isOwner ? (
              <div className="flex gap-2">
                <Link href={`/inspection/${id}/edit`}
                  className="flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-lg transition-opacity hover:opacity-80"
                  style={{ background: `${ACCENT}22`, color: ACCENT, border: `1px solid ${ACCENT}40` }}>
                  <Pencil size={12} /> 수정
                </Link>
                <InspectionDeleteButton id={id} />
              </div>
            ) : null
          }
        />

        <div className="flex flex-col gap-5">

          {/* 1. 실측 사진 */}
          {record.image_urls?.length > 0 && (
            <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid var(--border)" }}>
              <div className="px-4 py-2.5 flex items-center gap-2"
                style={{ background: `${ACCENT}14`, borderBottom: "1px solid var(--border)" }}>
                <Images size={13} style={{ color: ACCENT }} />
                <p className="text-xs font-bold uppercase tracking-widest" style={{ color: ACCENT }}>실측 사진</p>
                <span className="text-xs" style={{ color: "var(--text-muted)" }}>({record.image_urls.length}장)</span>
              </div>
              <div className="p-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {record.image_urls.map((url, i) => (
                  <a key={i} href={url} target="_blank" rel="noopener noreferrer"
                    className="aspect-square rounded-xl overflow-hidden block"
                    style={{ border: "1px solid var(--border)" }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={url} alt={`임장 사진 ${i + 1}`} className="w-full h-full object-cover transition-opacity hover:opacity-80" />
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* 2. 단지 및 매물 기본 정보 */}
          <Section title="단지 및 매물 기본 정보">
            <Row label="단지명 / 동·호수" value={[record.complex_name, record.dong_ho].filter(Boolean).join(" ")} />
            <Row label="주소" value={record.address} />
            <Row label="연식 / 총 세대수" value={
              [record.year_built ? `${record.year_built}년 준공` : null, record.total_units ? `${record.total_units.toLocaleString()}세대` : null].filter(Boolean).join(" / ") || null
            } />
            <Row label="주차대수" value={record.parking_count} />
            <Row label="평형 / 구조" value={[record.pyeong, record.structure].filter(Boolean).join(" / ") || null} />
          </Section>

          {/* 3. 입지 및 교통 */}
          <Section title="입지 및 교통">
            <Row label="지하철역 접근성" value={record.subway_access} />
            <Row label="주요 업무지구 교통" value={record.major_transport} />
            <Row label="주변 경사 및 지형" value={record.terrain} />
            <Row label="유해·기피 시설" value={record.harmful_facilities} />
          </Section>

          {/* 4. 교육 및 인프라 */}
          <Section title="교육 및 인프라">
            <Row label="학세권" value={record.school_zone} />
            <Row label="편의시설" value={record.amenities} />
            <Row label="자연환경" value={record.nature_env} />
          </Section>

          {/* 5. 단지 내부 및 상태 */}
          <Section title="단지 내부 및 상태">
            <Row label="동간 거리 및 조망" value={record.building_gap} />
            <Row label="커뮤니티" value={record.community} />
            <Row label="단지 관리" value={record.maintenance} />
            <Row label="집 내부 상태" value={record.interior_condition} />
          </Section>

          {/* 6. 시세 및 매수 조건 */}
          {record.price_info?.length > 0 && (
            <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid var(--border)" }}>
              <div className="px-4 py-2.5" style={{ background: `${ACCENT}14`, borderBottom: "1px solid var(--border)" }}>
                <p className="text-xs font-bold uppercase tracking-widest" style={{ color: ACCENT }}>시세 및 매수 조건</p>
              </div>
              <table className="w-full">
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--border)", background: "rgba(255,255,255,0.02)" }}>
                    {["구분", "가격 정보", "비고"].map((h) => (
                      <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold"
                        style={{ color: "var(--text-muted)" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {record.price_info.map((r, i) => (
                    <tr key={i} style={{ borderBottom: i < record.price_info.length - 1 ? "1px solid var(--border)" : "none" }}>
                      <td className="px-4 py-3 text-xs font-semibold" style={{ color: "var(--text-muted)" }}>{r.type || "-"}</td>
                      <td className="px-4 py-3 text-sm font-bold" style={{ color: ACCENT }}>{r.price || "-"}</td>
                      <td className="px-4 py-3 text-xs" style={{ color: "var(--text-muted)" }}>{r.note || "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* 7. 총평 */}
          {record.review && (
            <div className="rounded-2xl p-4" style={{ border: "1px solid var(--border)", background: "rgba(255,255,255,0.02)" }}>
              <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: ACCENT }}>총평</p>
              <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: "var(--text-primary)" }}>
                {record.review}
              </p>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
