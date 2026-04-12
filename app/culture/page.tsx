import Image from "next/image";
import Link from "next/link";
import PageHeader from "@/components/PageHeader";
import { getCultureItems } from "@/lib/data/culture";

const ACCENT = "#F43F5E";

export const revalidate = 1800;

export default async function CulturePage() {
  const data = await getCultureItems();
  const items = data.items;

  return (
    <div className="min-h-screen" style={{ background: "var(--bg-base)" }}>
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 pb-12">
        <PageHeader title="문화생활" subtitle="상영중 영화, 예매중 공연, 진행중 전시" accentColor={ACCENT} />
        <p className="text-xs mb-5" style={{ color: "var(--text-muted)" }}>
          {data.source === "mixed-live" ? "연결된 API 기준 실데이터" : "현재는 fallback 데이터입니다. `TMDB_API_KEY`, `TICKETMASTER_API_KEY`, `SEOUL_OPEN_API_KEY`를 설정하면 실정보로 대체됩니다."}
        </p>

        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
          {items.map((item) => (
            <Link key={item.id} href={`/culture/${item.slug}`} className="bento-card overflow-hidden hover:opacity-90 transition-opacity">
              <div className="relative aspect-[16/10]" style={{ background: "var(--border)" }}>
                {item.image ? <Image src={item.image} alt={item.title} fill sizes="(max-width:768px) 100vw, 50vw" className="object-cover" unoptimized /> : null}
              </div>
              <div className="p-4 flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <span className="tag" style={{ background: ACCENT + "22", color: ACCENT }}>{item.type}</span>
                  <span className="text-xs" style={{ color: "var(--text-muted)" }}>{item.dateLabel}</span>
                </div>
                <p className="text-lg font-bold text-white">{item.title}</p>
                <p className="text-sm" style={{ color: "var(--text-muted)" }}>{item.venue}</p>
                <p className="text-sm leading-relaxed" style={{ color: "var(--text-muted)" }}>{item.summary}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
