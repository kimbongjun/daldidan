import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import PageHeader from "@/components/PageHeader";
import { getCultureDetail } from "@/lib/data/culture";

const ACCENT = "#F43F5E";

export default async function CultureDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const detail = await getCultureDetail(slug);

  if (!detail) {
    notFound();
  }

  return (
    <div className="min-h-screen" style={{ background: "var(--bg-base)" }}>
      <div className="max-w-[1100px] mx-auto px-4 sm:px-6 pb-12">
        <PageHeader title={detail.title} subtitle={`${detail.venue} · ${detail.dateLabel}`} accentColor={ACCENT} />

        <div className="grid lg:grid-cols-[1.3fr_0.7fr] gap-6">
          <section className="bento-card overflow-hidden">
            {detail.image ? (
              <div className="relative aspect-[16/9]" style={{ background: "var(--border)" }}>
                <Image src={detail.image} alt={detail.title} fill sizes="(max-width:1024px) 100vw, 70vw" className="object-cover" unoptimized />
              </div>
            ) : null}
            <div className="p-6 flex flex-col gap-4">
              <p className="text-sm leading-relaxed" style={{ color: "var(--text-muted)" }}>{detail.description}</p>
              <div className="grid sm:grid-cols-2 gap-3">
                {[
                  { label: "상태", value: detail.status || detail.dateLabel },
                  { label: "기간", value: detail.period || detail.dateLabel },
                  { label: "장소", value: detail.address || detail.venue },
                  { label: "가격", value: detail.priceInfo || "현장/예매처 확인" },
                ].map((item) => (
                  <div key={item.label} className="rounded-xl p-3" style={{ background: "rgba(255,255,255,0.04)" }}>
                    <p className="text-xs mb-1" style={{ color: "var(--text-muted)" }}>{item.label}</p>
                    <p className="text-sm font-semibold text-white">{item.value}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <aside className="flex flex-col gap-4">
            <div className="bento-card p-5">
              <p className="text-sm font-bold text-white mb-3">태그</p>
              <div className="flex flex-wrap gap-2">
                {detail.tags.map((tag) => <span key={tag} className="tag" style={{ background: ACCENT + "22", color: ACCENT }}>{tag}</span>)}
              </div>
            </div>

            {detail.cast?.length ? (
              <div className="bento-card p-5">
                <p className="text-sm font-bold text-white mb-3">관련 정보</p>
                <div className="flex flex-col gap-2">
                  {detail.cast.map((item) => <p key={item} className="text-sm" style={{ color: "var(--text-muted)" }}>{item}</p>)}
                </div>
              </div>
            ) : null}

            <div className="bento-card p-5 flex flex-col gap-3">
              {detail.bookingUrl ? (
                <a href={detail.bookingUrl} target="_blank" rel="noopener noreferrer" className="w-full py-3 rounded-xl text-center font-bold" style={{ background: ACCENT, color: "#fff" }}>
                  예매/상세 링크 열기
                </a>
              ) : null}
              <Link href="/culture" className="w-full py-3 rounded-xl text-center font-semibold" style={{ background: "rgba(255,255,255,0.05)", color: "var(--text-primary)" }}>
                목록으로 돌아가기
              </Link>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
